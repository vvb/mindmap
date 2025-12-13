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
  '#FFB84D': '#F97316', // Orange -> Darker Orange
  '#60A5FA': '#2563EB', // Blue -> Darker Blue
  '#4ADE80': '#16A34A', // Green -> Darker Green
  '#FCD34D': '#EAB308', // Yellow -> Darker Yellow
  '#F472B6': '#EC4899', // Pink -> Darker Pink
  '#C084FC': '#9333EA', // Purple -> Darker Purple
  '#FB7185': '#E11D48', // Red -> Darker Red
  '#22D3EE': '#06B6D4'  // Cyan -> Darker Cyan
}

const COLLAPSE_TOGGLE_RADIUS = 4
const AUTO_LAYOUT_HORIZONTAL_GAP = 80
const TEXT_NODE_HORIZONTAL_GAP = 24
const TEXT_LEFT_PADDING = 2
const TEXT_NODE_RIGHT_PADDING = 8
const COMPACT_NODE_MIN_WIDTH = 64
const COMPACT_NODE_HEIGHT = 20
const COMPACT_FONT_MIN = 11
const COMPACT_VERTICAL_NODE_SPACING = 70

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
  if (!rgb) return isDarkTheme ? '#F8FAFC' : '#111827'

  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 255000

  // Use darker text in light mode for better contrast
  if (brightness >= 0.75) return '#111827'  // Very dark gray/black for light backgrounds
  if (brightness <= 0.35) return '#F8FAFC'  // Light text for dark backgrounds
  return isDarkTheme ? '#F8FAFC' : '#111827'
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
      .nodeSize([COMPACT_VERTICAL_NODE_SPACING, 250]) // [vertical spacing between siblings, horizontal spacing to children]
      .separation((a, b) => {
        const isSameParent = a.parent === b.parent
        const maxDepth = Math.max(a.depth, b.depth)
        const minDepth = Math.min(a.depth, b.depth)

        // Keep top levels roomy while squeezing deeper branches for a compact outline effect
        if (maxDepth <= 2) {
          return isSameParent ? 1.3 : 2.8
        }

        if (minDepth <= 2) {
          return isSameParent ? 1 : 2
        }

        return isSameParent ? 0.6 : 1.1
      })

    const treeData = treeLayout(hierarchy) as D3Node

    const getRenderedFontSize = (depth: number) => {
      if (depth === 0) return fontSize + 2
      if (depth === 1) return fontSize + 1
      if (depth >= 3) return Math.max(fontSize - 2, COMPACT_FONT_MIN)
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

    const wrapTextForNode = (text: string, depth: number) => {
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
      let lineCharCount = 0
      const flushCurrentLine = () => {
        const lineText = currentLine.trim()
        const width = measureTextWidth(lineText, depth)
        lines.push(lineText)
        lineWidths.push(width)
        currentLine = ''
        lineCharCount = 0
      }

      const pushSegment = (segment: string) => {
        const textSegment = segment.trim()
        if (textSegment.length === 0) return
        const width = measureTextWidth(textSegment, depth)
        lines.push(textSegment)
        lineWidths.push(width)
        lineCharCount = 0
      }

      const maxChars = depth >= 3 ? 80 : Number.MAX_SAFE_INTEGER

      words.forEach(word => {
        const spaced = currentLine.length > 0
        const candidate = spaced ? `${currentLine} ${word}` : word
        const candidateWidth = measureTextWidth(candidate, depth)
        const spaceAdded = spaced ? 1 : 0
        const candidateChars = lineCharCount + spaceAdded + word.length
        const exceedsChars = depth >= 3 && candidateChars > maxChars

        const allowEmptyOverflow = lineCharCount === 0 && depth < 3
        if (!exceedsChars && (candidateWidth <= maxContentWidth || allowEmptyOverflow)) {
          currentLine = candidate
          lineCharCount = candidateChars
        } else {
          if (currentLine.length > 0) {
            flushCurrentLine()
          }

          let segment = ''
          for (const char of word) {
            const nextSegment = segment.length > 0 ? `${segment}${char}` : char
            const nextWidth = measureTextWidth(nextSegment, depth)
            const exceedsSegmentChars = depth >= 3 && nextSegment.length > maxChars
            if ((!exceedsSegmentChars && nextWidth <= maxContentWidth) || segment.length === 0) {
              segment = nextSegment
            } else {
              pushSegment(segment)
              segment = char
            }
          }

          currentLine = segment
          lineCharCount = segment.length
        }
      })

      if (currentLine.length > 0) {
        flushCurrentLine()
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
      if (node.depth >= 3) {
        const { lines, maxLineWidth } = wrapTextForNode(displayText, node.depth)
        const layoutWidth = Math.max(maxLineWidth + TEXT_NODE_RIGHT_PADDING, COMPACT_NODE_MIN_WIDTH)
        const hitWidth = Math.max(layoutWidth + 6, COMPACT_NODE_MIN_WIDTH)
        const lineSpacing = Math.max(COMPACT_NODE_HEIGHT, getRenderedFontSize(node.depth) + 4)
        const textHeight = Math.max(COMPACT_NODE_HEIGHT, lines.length * lineSpacing)
        metricsMap.set(node.data.id, {
          displayText,
          boxWidth: layoutWidth,
          boxHeight: textHeight,
          hitWidth,
          layoutWidth,
          lines
        })
      } else {
        const { lines, maxLineWidth } = wrapTextForNode(displayText, node.depth)
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

    // Collision detection and resolution
    const resolveCollisions = () => {
      const VERTICAL_PADDING = 8 // Minimum vertical gap between nodes
      const HORIZONTAL_OVERLAP_THRESHOLD = 50 // Only check nodes that are horizontally close
      const MAX_ITERATIONS = 10 // Prevent infinite loops

      // Helper to get all descendants of a node
      const getDescendants = (node: D3Node): D3Node[] => {
        const descendants: D3Node[] = []
        const traverse = (n: D3Node) => {
          if (n.children) {
            n.children.forEach(child => {
              descendants.push(child as D3Node)
              traverse(child as D3Node)
            })
          }
        }
        traverse(node)
        return descendants
      }

      // Helper to get horizontal bounds of a node
      const getHorizontalBounds = (node: D3Node): { left: number; right: number } => {
        const metrics = metricsMap.get(node.data.id)
        if (!metrics) return { left: node.y, right: node.y }

        if (node.depth >= 3) {
          return {
            left: node.y - TEXT_LEFT_PADDING,
            right: node.y + metrics.layoutWidth
          }
        } else {
          return {
            left: node.y - metrics.boxWidth / 2,
            right: node.y + metrics.boxWidth / 2
          }
        }
      }

      // Helper to check if two nodes overlap both vertically AND horizontally
      const nodesOverlap = (node1: D3Node, node2: D3Node): number => {
        const metrics1 = metricsMap.get(node1.data.id)
        const metrics2 = metricsMap.get(node2.data.id)

        if (!metrics1 || !metrics2) return 0

        // Check horizontal overlap first
        const bounds1 = getHorizontalBounds(node1)
        const bounds2 = getHorizontalBounds(node2)

        const horizontalOverlap = Math.min(bounds1.right, bounds2.right) - Math.max(bounds1.left, bounds2.left)

        // If they don't overlap horizontally (with some threshold), skip
        if (horizontalOverlap < -HORIZONTAL_OVERLAP_THRESHOLD) return 0

        // Now check vertical overlap
        const height1 = metrics1.boxHeight
        const height2 = metrics2.boxHeight

        const top1 = node1.x - height1 / 2
        const bottom1 = node1.x + height1 / 2
        const top2 = node2.x - height2 / 2
        const bottom2 = node2.x + height2 / 2

        // Check if they overlap vertically
        if (bottom1 + VERTICAL_PADDING > top2 && top1 < bottom2 + VERTICAL_PADDING) {
          // Return the amount of overlap
          return (bottom1 + VERTICAL_PADDING) - top2
        }

        return 0
      }

      // Helper to move a node and all its descendants
      const moveNodeAndDescendants = (node: D3Node, deltaX: number) => {
        node.x += deltaX
        const descendants = getDescendants(node)
        descendants.forEach(desc => {
          desc.x += deltaX
        })
      }

      // Sort all nodes by vertical position (x coordinate)
      const sortedNodes = [...nodes].sort((a, b) => a.x - b.x)

      // Helper to check if a line from parent to child crosses through a node
      const lineCrossesNode = (parent: D3Node, child: D3Node, node: D3Node): number => {
        // Skip if the node is part of the line
        if (node.data.id === parent.data.id || node.data.id === child.data.id) return 0

        // Skip if node is in the same lineage
        let ancestor = child.parent
        while (ancestor) {
          if (ancestor.data.id === node.data.id) return 0
          ancestor = ancestor.parent
        }
        ancestor = node.parent
        while (ancestor) {
          if (ancestor.data.id === child.data.id || ancestor.data.id === parent.data.id) return 0
          ancestor = ancestor.parent
        }

        const nodeMetrics = metricsMap.get(node.data.id)
        if (!nodeMetrics) return 0

        // Get node vertical bounds
        const nodeTop = node.x - nodeMetrics.boxHeight / 2
        const nodeBottom = node.x + nodeMetrics.boxHeight / 2

        // Get line vertical bounds (the line goes from parent.x to child.x)
        const lineTop = Math.min(parent.x, child.x)
        const lineBottom = Math.max(parent.x, child.x)

        // Get node horizontal bounds
        const nodeBounds = getHorizontalBounds(node)

        // Get line horizontal bounds (from parent's right edge to child's left edge)
        const parentMetrics = metricsMap.get(parent.data.id)
        const childMetrics = metricsMap.get(child.data.id)

        const parentRight = parent.y + (parent.depth >= 3 ? (parentMetrics?.layoutWidth || 80) : ((parentMetrics?.boxWidth || 120) / 2))
        const childLeft = child.y - (child.depth >= 3 ? TEXT_LEFT_PADDING : ((childMetrics?.boxWidth || 120) / 2))

        // Check if the node is in the horizontal path of the line
        const inHorizontalPath = nodeBounds.right > parentRight && nodeBounds.left < childLeft

        if (!inHorizontalPath) return 0

        // Check if the node is in the vertical range of the line (with padding)
        const inVerticalRange = nodeBottom > lineTop - VERTICAL_PADDING && nodeTop < lineBottom + VERTICAL_PADDING

        if (inVerticalRange) {
          // The line crosses this node - calculate how much to move the child
          // Move child below the node
          return nodeBottom - child.x + nodeMetrics.boxHeight / 2 + VERTICAL_PADDING
        }

        return 0
      }

      // Helper to get the lowest descendant of a node
      const getLowestDescendant = (node: D3Node): number => {
        const metrics = metricsMap.get(node.data.id)
        if (!metrics) return node.x

        let lowest = node.x + metrics.boxHeight / 2

        if (node.children) {
          node.children.forEach(child => {
            const childLowest = getLowestDescendant(child as D3Node)
            lowest = Math.max(lowest, childLowest)
          })
        }

        return lowest
      }

      // Helper to get the highest descendant of a node
      const getHighestDescendant = (node: D3Node): number => {
        const metrics = metricsMap.get(node.data.id)
        const baseHeight = metrics
          ? metrics.boxHeight
          : (node.depth >= 3 ? COMPACT_NODE_HEIGHT : MIN_BOX_HEIGHT)

        let highest = node.x - baseHeight / 2

        if (node.children) {
          node.children.forEach(child => {
            const childHighest = getHighestDescendant(child as D3Node)
            highest = Math.min(highest, childHighest)
          })
        }

        return highest
      }

      // Adjust sibling positions: each sibling should be below all descendants of previous siblings
      const adjustSiblings = () => {
        let hadAdjustment = false

        // Group nodes by parent
        const nodesByParent = new Map<string, D3Node[]>()
        nodes.forEach(node => {
          if (node.parent) {
            const parentId = node.parent.data.id
            if (!nodesByParent.has(parentId)) {
              nodesByParent.set(parentId, [])
            }
            nodesByParent.get(parentId)!.push(node)
          }
        })

        // For each parent's children, ensure proper vertical ordering
        nodesByParent.forEach((siblings, parentId) => {
          // Sort siblings by their current vertical position
          siblings.sort((a, b) => a.x - b.x)

          // For each sibling (starting from the second one)
          for (let i = 1; i < siblings.length; i++) {
            const currentSibling = siblings[i]
            const previousSibling = siblings[i - 1]

            // Get the lowest point of the previous sibling's entire subtree
            const previousLowest = getLowestDescendant(previousSibling)

            // Get the top of the current sibling
            const currentTop = getHighestDescendant(currentSibling)

            // If current sibling overlaps with previous sibling's subtree, move it down
            const requiredGap = VERTICAL_PADDING
            const overlap = previousLowest + requiredGap - currentTop

            if (overlap > 0) {
              moveNodeAndDescendants(currentSibling, overlap)
              hadAdjustment = true
            }
          }
        })

        return hadAdjustment
      }

      // Iteratively adjust until no more adjustments needed
      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        const hadAdjustment = adjustSiblings()
        if (!hadAdjustment) break
      }
    }

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

      // Resolve any collisions after layout
      resolveCollisions()
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
      if (node.data.id === selectedNodeId) return isDark ? '#FACC15' : '#2563EB'
      if (node.data.collapsed && node.data.children.length > 0) return '#F59E0B'
      return isDark ? '#475569' : '#6B7280'
    }

    const getTextColor = (node: D3Node) => {
      // If the node has a custom text color, use it
      if (node.data.textColor) {
        return node.data.textColor
      }

      // For level 3+ nodes (text-only nodes), use solid dark/light colors
      if (node.depth >= 3) {
        return isDark ? '#93C5FD' : '#1F2937'
      }

      const background = node.data.color || (isDark ? '#1E293B' : '#60A5FA')
      const contrast = getContrastingTextColor(background, isDark)

      // For selected nodes, use a color that contrasts with the background
      // instead of a fixed yellow/blue color
      if (node.data.id === selectedNodeId) {
        // If the background is light/yellow, use dark text
        // If the background is dark, use light text
        return contrast
      }

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
      .attr('fill', d => d.data.color || (isDark ? '#1E293B' : '#60A5FA'))
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
      .attr('height', d => {
        if (d.depth < 3) return 0
        const metrics = metricsMap.get(d.data.id)
        return metrics ? metrics.boxHeight : COMPACT_NODE_HEIGHT
      })
      .attr('x', d => (d.depth >= 3 ? -(TEXT_LEFT_PADDING + 4) : 0))
      .attr('y', d => {
        if (d.depth < 3) return -12
        const metrics = metricsMap.get(d.data.id)
        const height = metrics ? metrics.boxHeight : COMPACT_NODE_HEIGHT
        return -height / 2
      })
      .attr('fill', 'transparent')
      .style('display', d => d.depth >= 3 ? 'block' : 'none')

    // Add text labels (for non-editing nodes)
    const textSelection = nodeElements.append('text')
      .attr('class', 'node-text')
      .attr('text-anchor', d => d.depth >= 3 ? 'start' : 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dx', 0)
      .attr('fill', d => getTextColor(d))
      .style('font-family', fontFamily)
      .style('font-size', d => {
        if (d.depth === 0) return `${fontSize + 2}px`
        if (d.depth === 1) return `${fontSize + 1}px`
        if (d.depth >= 3) return `${Math.max(fontSize - 2, COMPACT_FONT_MIN)}px`
        return `${fontSize}px`
      })
      .style('font-weight', d => {
        if (d.data.id === selectedNodeId) return '700'
        if (d.data.collapsed && d.data.children.length > 0) return '600'
        return '500'
      })
      .style('text-decoration', d => (d.depth >= 3 && d.data.id === selectedNodeId ? 'underline' : 'none'))
      .style('cursor', 'pointer')
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
        const lines = metrics.lines ?? [metrics.displayText]
        const lineSpacing = Math.max(COMPACT_NODE_HEIGHT, getRenderedFontSize(d.depth) + 4)
        const offset = -((lines.length - 1) / 2) * lineSpacing
        selection.attr('dy', offset)
        selection.attr('dx', 0)
        selection.attr('x', 0)
        selection.text(null)
        lines.forEach((line, idx) => {
          selection
            .append('tspan')
            .attr('x', TEXT_LEFT_PADDING + 1)
            .attr('dy', idx === 0 ? 0 : lineSpacing)
            .text(line)
        })
        selection.attr('text-anchor', 'start')
        return
      }

      const lines = metrics.lines ?? [metrics.displayText]
      const offset = -((lines.length - 1) / 2) * LINE_HEIGHT
      selection.attr('dy', offset)
      selection.attr('dx', 0)
      selection.attr('x', 0)
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
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'baseline')
      .attr('x', 0)
      .attr('y', -COLLAPSE_TOGGLE_RADIUS - 4)
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
    let hasMoved = false
    let dragStartTime = 0
    let dragStartNode: string | null = null
    let dragStartX = 0
    let dragStartY = 0
    let accumulatedDx = 0
    let accumulatedDy = 0
    const DRAG_THRESHOLD = 10 // pixels - minimum movement to be considered a drag
    const DRAG_TIME_THRESHOLD = 120 // ms - minimum press duration before we treat movement as drag

    // Add drag behavior for nodes
    const dragBehavior = d3.drag<SVGGElement, D3Node>()
      .on('start', function(event, d) {
        isDragging = false
        hasMoved = false
        dragStartTime = Date.now()
        dragStartNode = d.data.id
        dragStartX = d.x!
        dragStartY = d.y!
        accumulatedDx = 0
        accumulatedDy = 0
        d3.select(this).raise()
        event.sourceEvent.stopPropagation()

        // Select node immediately on mousedown for instant feedback
        onNodeClick(d.data.id)
      })
      .on('drag', function(event, d) {
        // Accumulate the drag deltas
        accumulatedDx += event.dx
        accumulatedDy += event.dy

        // Calculate total distance moved from start
        const distanceFromStart = Math.sqrt(accumulatedDx * accumulatedDx + accumulatedDy * accumulatedDy)
        const elapsed = Date.now() - dragStartTime

        // Only start dragging if we've moved beyond the distance AND time thresholds
        if (!hasMoved && distanceFromStart > DRAG_THRESHOLD && elapsed > DRAG_TIME_THRESHOLD) {
          hasMoved = true
          isDragging = true
        }

        if (hasMoved) {
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
        }
      })
      .on('end', function(_event, d) {
        const dragDuration = Date.now() - dragStartTime
        const totalDistance = Math.sqrt(accumulatedDx * accumulatedDx + accumulatedDy * accumulatedDy)

        console.log('Drag end:', { hasMoved, isDragging, dragDuration, totalDistance, threshold: DRAG_THRESHOLD })

        // Only persist position if it was actually dragged (not just a click)
        if (hasMoved && isDragging && dragDuration > 100) {
          // Save the actual position (already in correct coordinates)
          console.log('Saving position for node:', d.data.id)
          onNodePositionChange(d.data.id, d.x!, d.y!)
        }

        // Always reset to start position if we didn't actually drag
        if (!hasMoved) {
          console.log('Resetting position - was just a click')
          d.x = dragStartX
          d.y = dragStartY
          d3.select(this).attr('transform', `translate(${d.y},${d.x})`)
        }

        // Reset dragging flag after a short delay to allow click to check it
        setTimeout(() => {
          isDragging = false
          hasMoved = false
          dragStartNode = null
          accumulatedDx = 0
          accumulatedDy = 0
        }, 10)
      })

    nodeElements.call(dragBehavior as any)

    // Add double-click handler for editing
    nodeElements.on('dblclick', (event, d) => {
      event.stopPropagation()
      event.preventDefault()
      if (!isDragging) {
        onStartEditing(d.data.id)
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
        return mappedColor || color || (isDark ? '#94A3B8' : '#374151')
      })
      .attr('stroke-width', 2)
      .attr('stroke-opacity', isDark ? 0.75 : 0.9)

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
      className={`w-full h-full ${isDark ? 'bg-slate-900' : 'bg-white'} transition-colors duration-200`}
      style={{ cursor: 'grab', color: isDark ? '#e2e8f0' : '#0f172a' }}
    >
      <g ref={gRef} />
    </svg>
  )
}

