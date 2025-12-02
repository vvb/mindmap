import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { MindMapNode, NodeIcon, MindMapTheme } from '../types/mindmap'

interface MindMapProps {
  root: MindMapNode
  selectedNodeId: string | null
  editingNodeId: string | null
  onNodeClick: (nodeId: string) => void
  onStartEditing: (nodeId: string) => void
  onAddNode: (parentId: string) => void
  onNodePositionChange: (nodeId: string, x: number, y: number) => void
  zoom: number
  pan: { x: number; y: number }
  onZoomChange: (zoom: number) => void
  onPanChange: (pan: { x: number; y: number }) => void
  onToggleCollapse: (nodeId: string) => void
  theme: MindMapTheme
  fontFamily: string
  fontSize: number
}

interface D3Node extends d3.HierarchyPointNode<MindMapNode> {
  data: MindMapNode
}

const ICON_SYMBOLS: Record<NodeIcon, string> = {
  none: '',
  idea: '💡',
  important: '⭐',
  question: '❓',
  check: '✅',
  warning: '⚠️',
  note: '📝'
}

const LINK_COLOR_MAP: Record<string, string> = {
  '#FFE5B4': '#F59E0B', // Peach -> Amber
  '#E3F2FD': '#1976D2', // Blue -> Dark Blue
  '#E8F5E9': '#388E3C', // Green -> Green
  '#FFF9C4': '#FBC02D', // Yellow -> Dark Yellow
  '#FCE4EC': '#C2185B', // Pink -> Pink
  '#F3E5F5': '#7B1FA2', // Purple -> Purple
  '#FFF3E0': '#F57C00', // Orange -> Orange
  '#E0F7FA': '#0097A7'  // Cyan -> Cyan
}

const COLLAPSE_TOGGLE_RADIUS = 9
const AUTO_LAYOUT_HORIZONTAL_GAP = 80
const TEXT_NODE_HORIZONTAL_GAP = 40
const TEXT_LEFT_PADDING = 2
const TEXT_NODE_RIGHT_PADDING = 8

const MAX_BOX_WIDTH = 440
const MIN_BOX_WIDTH = 120
const BOX_HORIZONTAL_PADDING = 30
const MIN_BOX_HEIGHT = 50
const BOX_VERTICAL_PADDING = 24
const LINE_HEIGHT = 20

const hexToRgb = (value: string) => {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())
  if (!match) return null

  const hex = match[1].length === 3
    ? match[1].split('').map(ch => ch + ch).join('')
    : match[1]

  const num = parseInt(hex, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  }
}

const getContrastingTextColor = (background: string, isDarkTheme: boolean) => {
  const rgb = hexToRgb(background)
  if (!rgb) return isDarkTheme ? '#F8FAFC' : '#1F2937'

  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 255000

  if (brightness >= 0.75) return '#1F2937'
  if (brightness <= 0.35) return '#F8FAFC'
  return isDarkTheme ? '#F8FAFC' : '#1F2937'
}

export const MindMap: React.FC<MindMapProps> = ({
  root,
  selectedNodeId,
  editingNodeId,
  onNodeClick,
  onStartEditing,
  onNodePositionChange,
  zoom,
  pan,
  onZoomChange,
  onPanChange,
  onToggleCollapse,
  theme,
  fontFamily,
  fontSize
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const isDark = theme === 'dark'

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Render the mindmap
  useEffect(() => {
    if (!svgRef.current || !gRef.current || dimensions.width === 0) return

    const g = d3.select(gRef.current)

    // Clear previous content
    g.selectAll('*').remove()

    // Create hierarchy
    const hierarchy = d3.hierarchy(root, (node) =>
      node.collapsed ? [] : node.children
    )

    // Create horizontal tree layout (left to right like FreeMind)
    const treeLayout = d3.tree<MindMapNode>()
      .nodeSize([60, 250]) // [vertical spacing between siblings, horizontal spacing to children]
      .separation((a, b) => {
        // Increase spacing between different branches to prevent overlap
        // Siblings get 1x spacing, cousins get 2x spacing
        return a.parent === b.parent ? 1 : 2
      })

    const treeData = treeLayout(hierarchy) as D3Node

    const getRenderedFontSize = (depth: number) => {
      if (depth === 0) return fontSize + 2
      if (depth === 1) return fontSize + 1
      if (depth >= 3) return Math.max(fontSize - 1, 12)
      return fontSize
    }

    const measurementGroup = g.append('g')
      .attr('class', 'measurement-temporary')
      .attr('visibility', 'hidden')
      .style('pointer-events', 'none')

    const measureTextWidth = (text: string, depth: number) => {
      const fontPx = getRenderedFontSize(depth)
      const textElement = measurementGroup.append('text')
        .style('font-family', fontFamily)
        .style('font-size', `${fontPx}px`)
        .text(text || ' ')

      const width = textElement.node()?.getBBox().width ?? (text.length * fontPx * 0.6)
      textElement.remove()
      return width
    }

    const wrapTextForBoxNode = (text: string, depth: number) => {
      const words = text.split(/\s+/).filter(Boolean)
      if (words.length === 0) {
        return {
          lines: [''],
          maxLineWidth: 0
        }
      }

      const maxContentWidth = MAX_BOX_WIDTH - BOX_HORIZONTAL_PADDING
      const lines: string[] = []
      const lineWidths: number[] = []

      let currentLine = ''

      const pushCurrentLine = () => {
        const lineText = currentLine.trim()
        const width = measureTextWidth(lineText, depth)
        lines.push(lineText)
        lineWidths.push(width)
        currentLine = ''
      }

      const pushSegment = (segment: string) => {
        const textSegment = segment.trim()
        if (textSegment.length === 0) return
        const width = measureTextWidth(textSegment, depth)
        lines.push(textSegment)
        lineWidths.push(width)
      }

      words.forEach(word => {
        const candidate = currentLine.length > 0 ? `${currentLine} ${word}` : word
        const candidateWidth = measureTextWidth(candidate, depth)
        if (candidateWidth <= maxContentWidth || currentLine.length === 0) {
          currentLine = candidate
        } else {
          if (currentLine.length > 0) {
            pushCurrentLine()
          }

          let segment = ''
          for (const char of word) {
            const nextSegment = segment.length > 0 ? `${segment}${char}` : char
            const nextWidth = measureTextWidth(nextSegment, depth)
            if (nextWidth <= maxContentWidth || segment.length === 0) {
              segment = nextSegment
            } else {
              pushSegment(segment)
              segment = char
            }
          }

          currentLine = segment
        }
      })

      if (currentLine.length > 0) {
        pushCurrentLine()
      }

      const maxLineWidth = lineWidths.length > 0 ? Math.max(...lineWidths) : 0

      return {
        lines,
        maxLineWidth
      }
    }

    const descendantCountMap = new Map<string, number>()
    const computeDescendantCounts = (node: MindMapNode): number => {
      const total = node.children.reduce((acc, child) => acc + 1 + computeDescendantCounts(child), 0)
      descendantCountMap.set(node.id, total)
      return total
    }
    computeDescendantCounts(root)

    // Use stored positions or tree layout positions
    const nodes = treeData.descendants() as D3Node[]

    const metricsMap = new Map<string, {
      displayText: string
      boxWidth: number
      boxHeight: number
      hitWidth: number
      layoutWidth: number
      lines?: string[]
    }>()

    nodes.forEach(node => {
      const iconSymbol = node.data.icon ? ICON_SYMBOLS[node.data.icon] ?? '' : ''
      const baseText = node.data.text || ''
      const displayText = iconSymbol ? `${iconSymbol} ${baseText}` : baseText
      const textWidth = measureTextWidth(displayText, node.depth)

      if (node.depth >= 3) {
        const layoutWidth = textWidth + TEXT_NODE_RIGHT_PADDING
        const hitWidth = Math.max(layoutWidth + 12, 80)
        metricsMap.set(node.data.id, {
          displayText,
          boxWidth: layoutWidth,
          boxHeight: MIN_BOX_HEIGHT,
          hitWidth,
          layoutWidth
        })
      } else {
        const { lines, maxLineWidth } = wrapTextForBoxNode(displayText, node.depth)
        const paddedWidth = Math.max(MIN_BOX_WIDTH, Math.min(MAX_BOX_WIDTH, maxLineWidth + BOX_HORIZONTAL_PADDING))
        const boxHeight = Math.max(MIN_BOX_HEIGHT, lines.length * LINE_HEIGHT + BOX_VERTICAL_PADDING)
        metricsMap.set(node.data.id, {
          displayText,
          boxWidth: paddedWidth,
          boxHeight,
          hitWidth: paddedWidth,
          layoutWidth: paddedWidth,
          lines
        })
      }
    })

    measurementGroup.remove()

    // Helper to calculate link path
    const getRightExtent = (node: D3Node) => {
      const metrics = metricsMap.get(node.data.id)
      if (node.depth >= 3) {
        return metrics ? metrics.layoutWidth : 80
      }
      const width = metrics ? metrics.boxWidth : 120
      return width / 2
    }

    const getLeftExtent = (node: D3Node) => {
      if (node.depth >= 3) {
        return TEXT_LEFT_PADDING
      }
      const metrics = metricsMap.get(node.data.id)
      const width = metrics ? metrics.boxWidth : 120
      return width / 2
    }

    const getRightEdge = (node: D3Node) => node.y + getRightExtent(node)
    const getLeftEdge = (node: D3Node) => node.y - getLeftExtent(node)

    const getPath = (source: D3Node, target: D3Node) => {
      const sourceX = getRightEdge(source)
      const targetX = getLeftEdge(target)

      return `M ${sourceX},${source.x}
              C ${(sourceX + targetX) / 2},${source.x}
                ${(sourceX + targetX) / 2},${target.x}
                ${targetX},${target.x}`
    }

    const hasManualPositions = nodes.some(node => node.data.manualPosition)

    if (!hasManualPositions && nodes.length > 0) {
      const rootNode = nodes[0]
      rootNode.y = 0

      const assignHorizontalPositions = (node: D3Node) => {
        const gap = node.depth >= 3 ? TEXT_NODE_HORIZONTAL_GAP : AUTO_LAYOUT_HORIZONTAL_GAP
        const childBaseLeft = getRightEdge(node) + gap
        node.children?.forEach(child => {
          const childNode = child as D3Node
          const leftExtent = getLeftExtent(childNode)
          childNode.y = childBaseLeft + leftExtent
          assignHorizontalPositions(childNode)
        })
      }

      assignHorizontalPositions(rootNode)
    }

    nodes.forEach(node => {
      if (node.data.manualPosition && node.data.x !== undefined && node.data.y !== undefined) {
        node.x = node.data.x
        node.y = node.data.y
      } else {
        if (!hasManualPositions) {
          node.data.x = node.x
          node.data.y = node.y
        } else if (node.data.x !== undefined && node.data.y !== undefined) {
          node.x = node.data.x
          node.y = node.data.y
        } else {
          node.data.x = node.x
          node.data.y = node.y
        }
      }
    })

    // Don't do any automatic centering here - it causes infinite loops
    // Centering will be handled by the zoom/pan transform

    const links = treeData.links()

    const getRectStroke = (node: D3Node) => {
      if (node.data.id === selectedNodeId) return isDark ? '#FACC15' : '#4A90E2'
      if (node.data.collapsed && node.data.children.length > 0) return '#F59E0B'
      return isDark ? '#475569' : '#999'
    }

    const getTextColor = (node: D3Node) => {
      if (node.data.id === selectedNodeId) return isDark ? '#FACC15' : '#0F172A'
      if (node.depth >= 3) return node.data.color || (isDark ? '#93C5FD' : '#1B5E20')

      const background = node.data.color || (isDark ? '#1E293B' : '#E3F2FD')
      const contrast = getContrastingTextColor(background, isDark)

      if (node.data.collapsed && node.data.children.length > 0) {
        return contrast
      }

      return contrast
    }

    // Draw nodes FIRST (so they appear on top of links in export)
    const nodeGroup = g.append('g').attr('class', 'nodes')
    
    const nodeElements = nodeGroup.selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', d => `mindmap-node ${d.data.id === selectedNodeId ? 'selected' : ''}`)
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .style('cursor', 'pointer')

    // Add visible rectangles for nodes (only for levels 0-2)
    nodeElements.append('rect')
      .attr('class', 'node-box')
      .attr('width', d => {
        const metrics = metricsMap.get(d.data.id)
        return metrics ? metrics.boxWidth : 120
      })
      .attr('height', d => {
        const metrics = metricsMap.get(d.data.id)
        return metrics ? metrics.boxHeight : MIN_BOX_HEIGHT
      })
      .attr('x', d => {
        const metrics = metricsMap.get(d.data.id)
        const width = metrics ? metrics.boxWidth : 120
        return -width / 2
      })
      .attr('y', d => {
        const metrics = metricsMap.get(d.data.id)
        const height = metrics ? metrics.boxHeight : MIN_BOX_HEIGHT
        return -height / 2
      })
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', d => d.data.color || (isDark ? '#1E293B' : '#E3F2FD'))
      .attr('stroke', d => getRectStroke(d))
      .attr('stroke-width', d => d.data.id === selectedNodeId ? 3 : 2)
      .style('display', d => d.depth >= 3 ? 'none' : 'block')

    // Add invisible hit area for level 3+ nodes (for clicking and dragging)
    nodeElements.append('rect')
      .attr('class', 'node-hit-area')
      .attr('width', d => {
        if (d.depth < 3) return 0
        const metrics = metricsMap.get(d.data.id)
        return metrics ? metrics.hitWidth : 80
      })
      .attr('height', d => d.depth >= 3 ? 24 : 0)
      .attr('x', d => (d.depth >= 3 ? -6 : 0))
      .attr('y', -12)
      .attr('fill', 'transparent')
      .style('display', d => d.depth >= 3 ? 'block' : 'none')

    // Add text labels (for non-editing nodes)
    const textSelection = nodeElements.append('text')
      .attr('class', 'node-text')
      .attr('text-anchor', d => d.depth >= 3 ? 'start' : 'middle')
      .attr('dx', d => d.depth >= 3 ? TEXT_LEFT_PADDING + 1 : 0)
      .attr('fill', d => getTextColor(d))
      .style('font-family', fontFamily)
      .style('font-size', d => {
        if (d.depth === 0) return `${fontSize + 2}px`
        if (d.depth === 1) return `${fontSize + 1}px`
        if (d.depth >= 3) return `${Math.max(fontSize - 1, 12)}px`
        return `${fontSize}px`
      })
      .style('font-weight', d => {
        if (d.data.id === selectedNodeId) return '700'
        if (d.data.collapsed && d.data.children.length > 0) return '600'
        return '500'
      })
      .style('text-decoration', d => (d.depth >= 3 && d.data.id === selectedNodeId ? 'underline' : 'none'))
      .style('pointer-events', 'none')
      .style('display', d => d.data.id === editingNodeId ? 'none' : 'block')

    textSelection.each(function(d) {
      const metrics = metricsMap.get(d.data.id)
      const selection = d3.select(this)
      selection.selectAll('tspan').remove()

      if (!metrics) {
        selection.text(d.data.text)
        return
      }

      if (d.depth >= 3) {
        selection.attr('dy', 4)
        selection.text(metrics.displayText)
        return
      }

      const lines = metrics.lines ?? [metrics.displayText]
      const totalTextHeight = lines.length * LINE_HEIGHT
      const initialDy = -totalTextHeight / 2 + LINE_HEIGHT / 2
      selection.attr('dy', initialDy)
      selection.attr('dx', 0)
      selection.text(null)

      lines.forEach((line, idx) => {
        selection
          .append('tspan')
          .attr('x', 0)
          .attr('dy', idx === 0 ? 0 : LINE_HEIGHT)
          .text(line)
      })
    })

    const toggleGroups = nodeElements
      .filter(d => d.data.children.length > 0)
      .append('g')
      .attr('class', 'collapse-toggle')
      .attr('transform', d => {
        if (d.depth >= 3) {
          return `translate(${-COLLAPSE_TOGGLE_RADIUS * 2.2},0)`
        }
        const metrics = metricsMap.get(d.data.id)
        const width = metrics ? metrics.boxWidth : 120
        return `translate(${-width / 2 - COLLAPSE_TOGGLE_RADIUS * 1.6},0)`
      })
      .style('cursor', 'pointer')

    toggleGroups.append('circle')
      .attr('r', COLLAPSE_TOGGLE_RADIUS)
      .attr('fill', d => (d.data.collapsed ? '#FDE68A' : '#FFFFFF'))
      .attr('stroke', d => (d.data.collapsed ? '#F59E0B' : '#9CA3AF'))
      .attr('stroke-width', 1.2)
      .attr('opacity', d => (d.depth === 0 ? 0.85 : 1))

    toggleGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('y', 1)
      .attr('fill', '#374151')
      .style('font-size', '12px')
      .style('font-weight', '700')
      .text(d => (d.data.collapsed ? '+' : '−'))

    toggleGroups.append('text')
      .attr('class', 'collapse-count')
      .attr('text-anchor', 'start')
      .attr('dominant-baseline', 'middle')
      .attr('x', COLLAPSE_TOGGLE_RADIUS + 5)
      .attr('y', 1)
      .attr('fill', '#6B7280')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .text(d => {
        if (d.data.collapsed) {
          const count = descendantCountMap.get(d.data.id) ?? 0
          return count > 0 ? `${count}` : ''
        }
        return ''
      })

    toggleGroups
      .on('mousedown', event => {
        event.stopPropagation()
        event.preventDefault()
      })
      .on('touchstart', event => {
        event.stopPropagation()
      })
      .on('click', (event, d) => {
        event.stopPropagation()
        onToggleCollapse(d.data.id)
      })

    // Add inline editing input using foreignObject
    nodeElements.each(function(d) {
      if (d.data.id === editingNodeId) {
        const metrics = metricsMap.get(d.data.id)
        const isTextNode = d.depth >= 3
        const baseWidth = isTextNode ? (metrics?.hitWidth ?? 160) : (metrics?.boxWidth ?? 160)
        const baseHeight = isTextNode
          ? 32
          : Math.max(36, (metrics?.boxHeight ?? MIN_BOX_HEIGHT) - 20)
        const xOffset = isTextNode ? -6 : -baseWidth / 2
        const yOffset = isTextNode ? -16 : -baseHeight / 2
        const height = baseHeight

        const foreignObject = d3.select(this)
          .append('foreignObject')
          .attr('class', 'node-editor')
          .attr('x', xOffset)
          .attr('y', yOffset)
          .attr('width', isTextNode ? baseWidth + 12 : baseWidth)
          .attr('height', height)

        const container = foreignObject
          .append('xhtml:div')
          .style('width', '100%')
          .style('height', '100%')
          .style('display', 'flex')
          .style('align-items', 'center')
          .style('justify-content', isTextNode ? 'flex-start' : 'center')
          .style('padding', isTextNode ? '0 8px' : '0')

        const input = container
          .append('xhtml:input')
          .attr('type', 'text')
          .attr('value', d.data.text)
          .style('width', '100%')
          .style('height', isTextNode ? '26px' : '30px')
          .style('border', 'none')
          .style('outline', 'none')
          .style('background', 'transparent')
          .style('text-align', isTextNode ? 'left' : 'center')
          .style('font-size', '15px')
          .style('font-weight', '600')
          .style('color', '#333')
          .on('blur', function() {
            const newText = (this as HTMLInputElement).value.trim()
            if (newText) {
              const event = new CustomEvent('updateNodeText', {
                detail: { nodeId: d.data.id, text: newText }
              })
              window.dispatchEvent(event)
            }
          })
          .on('keydown', function(event: any) {
            if (event.key === 'Enter') {
              event.preventDefault()
              ;(this as HTMLInputElement).blur()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              ;(this as HTMLInputElement).blur()
            }
            event.stopPropagation()
          })

        input.each(function() {
          const element = this as HTMLInputElement
          element.focus()
          element.select()
        })
      }
    })

    // Track if we're dragging to prevent click events
    let isDragging = false
    let dragStartTime = 0

    // Add drag behavior for nodes
    const dragBehavior = d3.drag<SVGGElement, D3Node>()
      .on('start', function(event, _node) {
        isDragging = false
        dragStartTime = Date.now()
        d3.select(this).raise()
        event.sourceEvent.stopPropagation()
      })
      .on('drag', function(event, d) {
        isDragging = true

        // Update the node's display position
        d.x! += event.dy
        d.y! += event.dx

        // Update visual position
        d3.select(this).attr('transform', `translate(${d.y},${d.x})`)

        // Update all connected links in real-time
        linkGroup.selectAll('path')
          .attr('d', function(linkData: any) {
            const source = linkData.source as D3Node
            const target = linkData.target as D3Node
            return getPath(source, target)
          })
      })
      .on('end', function(_event, d) {
        const dragDuration = Date.now() - dragStartTime

        // Only persist position if it was actually dragged (not just a click)
        if (isDragging && dragDuration > 100) {
          // Save the actual position (already in correct coordinates)
          onNodePositionChange(d.data.id, d.x!, d.y!)
        }

        // Reset dragging flag after a short delay to allow click to check it
        setTimeout(() => {
          isDragging = false
        }, 10)
      })

    nodeElements.call(dragBehavior as any)

    // Add click handlers after drag behavior
    let clickTimeout: NodeJS.Timeout | null = null

    nodeElements.on('click', (event, d) => {
      event.stopPropagation()
      // Only handle click if we weren't dragging
      if (!isDragging) {
        // Use timeout to distinguish between single and double click
        if (clickTimeout) {
          clearTimeout(clickTimeout)
          clickTimeout = null
          // Double click - start editing
          onStartEditing(d.data.id)
        } else {
          // Single click - select node
          clickTimeout = setTimeout(() => {
            onNodeClick(d.data.id)
            clickTimeout = null
          }, 250)
        }
      }
    })

    // Draw links AFTER nodes (so nodes appear on top in the DOM/export)
    // Insert at the beginning of the SVG so they render behind nodes
    const linkGroup = g.insert('g', ':first-child').attr('class', 'links')

    linkGroup.selectAll('path')
      .data(links)
      .join('path')
      .attr('class', 'mindmap-link')
      .attr('d', d => {
        const source = d.source as D3Node
        const target = d.target as D3Node
        return getPath(source, target)
      })
      .attr('fill', 'none')
      .attr('stroke', d => {
        const targetNode = d.target as D3Node
        const color = targetNode.data.color
        const normalizedColor = color?.toUpperCase()
        const mappedColor = normalizedColor ? LINK_COLOR_MAP[normalizedColor] : undefined
        return mappedColor || color || (isDark ? '#94A3B8' : '#555')
      })
      .attr('stroke-width', 2)
      .attr('stroke-opacity', isDark ? 0.75 : 0.8)

  }, [root, selectedNodeId, editingNodeId, dimensions, onNodeClick, onStartEditing, onNodePositionChange, onToggleCollapse, fontFamily, fontSize, isDark])

  // Setup zoom and pan behavior (only once)
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return

    const svg = d3.select(svgRef.current)
    const g = d3.select(gRef.current)

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .filter((event) => {
        // Allow zoom/pan only when:
        // 1. Not clicking on a node (event.target is SVG, not a node element)
        // 2. Using mouse wheel (event.type === 'wheel')
        // 3. Using pinch gesture (event.type === 'touchstart' with multiple touches)
        const target = event.target as Element
        const isNode = target.closest('.mindmap-node')
        return !isNode || event.type === 'wheel'
      })
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        onZoomChange(event.transform.k)
        onPanChange({ x: event.transform.x, y: event.transform.y })
      })

    zoomBehaviorRef.current = zoomBehavior
    svg.call(zoomBehavior)
    svg.call(zoomBehavior.transform, d3.zoomIdentity.translate(pan.x, pan.y).scale(zoom))

    // Prevent double-click zoom on canvas
    svg.on('dblclick.zoom', null)

    // Add click handler to deselect nodes when clicking on empty canvas
    svg.on('click', (event) => {
      const target = event.target as Element
      // Only deselect if clicking directly on SVG (not on nodes or their children)
      if (target.tagName === 'svg') {
        onNodeClick('')  // Deselect by passing empty string
      }
    })

  }, [])

  // Apply zoom/pan changes from outside (e.g., auto-fit button)
  useEffect(() => {
    if (!svgRef.current) return

    const zoomBehavior = zoomBehaviorRef.current
    if (zoomBehavior) {
      const svg = d3.select(svgRef.current)
      svg.call(zoomBehavior.transform, d3.zoomIdentity.translate(pan.x, pan.y).scale(zoom))
    } else if (gRef.current) {
      d3.select(gRef.current).attr('transform', `translate(${pan.x},${pan.y}) scale(${zoom})`)
    }

  }, [zoom, pan.x, pan.y])

  return (
    <svg
      ref={svgRef}
      className={`w-full h-full ${isDark ? 'bg-slate-900' : 'bg-slate-100'} transition-colors duration-200`}
      style={{ cursor: 'grab', color: isDark ? '#e2e8f0' : '#0f172a' }}
    >
      <g ref={gRef} />
    </svg>
  )
}

