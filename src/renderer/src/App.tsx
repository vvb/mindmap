import { useEffect, useState, useCallback, useRef } from 'react'
import { MindMap } from './components/MindMap'
import { Toolbar } from './components/Toolbar'
import { HelpPanel } from './components/HelpPanel'
import { useMindMap } from './hooks/useMindMap'
import { NodeIcon, MindMapNode, NODE_ICON_VALUES } from './types/mindmap'

function App(): React.JSX.Element {
  const {
    state,
    setState,
    addNode,
    updateNodeText,
    updateNodeColor,
    updateNodeIcon,
    updateNodePosition,
    resetAllPositions,
    deleteNode,
    toggleNodeCollapse,
    setNodeCollapsed,
    collapseAll,
    expandAll,
    findNodeById,
    findParentNode,
    undo,
    redo,
    currentFilePathRef,
    setTheme,
    setFontFamily,
    setFontSize,
    resetMindMap
  } = useMindMap()

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const dialogLocksRef = useRef({ load: false, saveAs: false, export: false })

  const normalizeMindMapNode = useCallback((node: MindMapNode) => {
    if (!Array.isArray(node.children)) {
      node.children = []
    }
    if (node.collapsed === undefined) {
      node.collapsed = false
    }
    if (node.manualPosition === undefined) {
      node.manualPosition = false
    }
    if (!node.icon || !NODE_ICON_VALUES.includes(node.icon)) {
      node.icon = 'none'
    }
    node.children.forEach(child => normalizeMindMapNode(child))
  }, [])

  const applyLoadedMindMap = useCallback((loadedRoot: MindMapNode, filePath?: string) => {
    normalizeMindMapNode(loadedRoot)
    const snapshot = JSON.parse(JSON.stringify(loadedRoot)) as MindMapNode

    setState(prev => ({
      ...prev,
      root: loadedRoot,
      history: [snapshot],
      historyIndex: 0,
      selectedNodeId: loadedRoot.id
    }))
    setEditingNodeId(null)
    if (filePath) {
      currentFilePathRef.current = filePath
    }
  }, [normalizeMindMapNode, setState, setEditingNodeId, currentFilePathRef])

  const selectedNode = state.selectedNodeId ? findNodeById(state.selectedNodeId) : null
  const selectedNodeHasChildren = !!(selectedNode && selectedNode.children.length > 0)
  const selectedNodeCollapsed = !!(selectedNode && selectedNode.collapsed)
  const selectedNodeIcon = selectedNode?.icon
  const { theme, fontFamily, fontSize } = state.preferences
  const isDark = theme === 'dark'

  const getVisibleNodes = useCallback((): MindMapNode[] => {
    const visible: MindMapNode[] = []

    const traverse = (node: MindMapNode) => {
      visible.push(node)
      if (!node.collapsed) {
        node.children.forEach(child => traverse(child))
      }
    }

    traverse(state.root)
    return visible
  }, [state.root])

  // Handle node click
  const handleNodeClick = useCallback((nodeId: string) => {
    setState(prev => ({ ...prev, selectedNodeId: nodeId || null }))
    setEditingNodeId(null) // Stop editing when clicking another node
  }, [setState])

  // Start editing a node
  const handleStartEditing = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId)
    setState(prev => ({ ...prev, selectedNodeId: nodeId }))
  }, [setState])

  // Listen for text update events from inline editor
  useEffect(() => {
    const handleUpdateNodeText = (e: Event) => {
      const customEvent = e as CustomEvent<{ nodeId: string; text: string }>
      updateNodeText(customEvent.detail.nodeId, customEvent.detail.text)
      setEditingNodeId(null)
    }

    window.addEventListener('updateNodeText', handleUpdateNodeText)
    return () => window.removeEventListener('updateNodeText', handleUpdateNodeText)
  }, [updateNodeText])

  useEffect(() => {
    document.body.classList.toggle('theme-dark', isDark)
    document.body.classList.toggle('theme-light', !isDark)
    document.body.style.backgroundColor = isDark ? '#0f172a' : '#ffffff'
    document.body.style.color = isDark ? '#e2e8f0' : '#111827'
  }, [isDark])

  // Save file
  const serializeMindMap = useCallback(() => JSON.stringify(state.root, null, 2), [state.root])

  const handleSave = useCallback(async () => {
    const data = serializeMindMap()
    const existingPath = currentFilePathRef.current ?? undefined

    const result = await window.api.saveFile(data, existingPath)

    if (result.success && result.filePath) {
      currentFilePathRef.current = result.filePath
      console.log('Saved to:', result.filePath)
      return
    }

    if (!result.success && existingPath) {
      const fallback = await window.api.saveFileAs(data)
      if (fallback.success && fallback.filePath) {
        currentFilePathRef.current = fallback.filePath
        console.log('Saved to new location:', fallback.filePath)
      }
    }
  }, [serializeMindMap, currentFilePathRef])

  const handleSaveAs = useCallback(async () => {
    if (dialogLocksRef.current.saveAs) return
    dialogLocksRef.current.saveAs = true
    try {
      const data = serializeMindMap()
      const result = await window.api.saveFileAs(data)
      if (result.success && result.filePath) {
        currentFilePathRef.current = result.filePath
        console.log('Saved as:', result.filePath)
      }
    } finally {
      dialogLocksRef.current.saveAs = false
    }
  }, [serializeMindMap, currentFilePathRef])

  const handleNew = useCallback(() => {
    resetMindMap()
    currentFilePathRef.current = null
    setEditingNodeId(null)
  }, [resetMindMap])

  // Load file
  const handleLoad = useCallback(async () => {
    if (dialogLocksRef.current.load) return
    dialogLocksRef.current.load = true
    try {
      const result = await window.api.loadFile()
      if (result.success && result.data) {
        try {
          const loadedRoot = JSON.parse(result.data) as MindMapNode
          applyLoadedMindMap(loadedRoot, result.filePath)
          console.log('Loaded from:', result.filePath)
        } catch (error) {
          console.error('Failed to parse mindmap file:', error)
        }
      }
    } finally {
      dialogLocksRef.current.load = false
    }
  }, [applyLoadedMindMap])

  // Reload current file
  const handleReload = useCallback(async () => {
    const currentPath = currentFilePathRef.current
    if (!currentPath) {
      console.log('No file to reload')
      return
    }

    const result = await window.api.reloadFile(currentPath)
    if (result.success && result.data) {
      try {
        const loadedRoot = JSON.parse(result.data) as MindMapNode
        applyLoadedMindMap(loadedRoot, result.filePath)
        console.log('Reloaded from:', result.filePath)
      } catch (error) {
        console.error('Failed to parse mindmap file:', error)
      }
    } else if (result.error) {
      console.error('Failed to reload file:', result.error)
    }
  }, [applyLoadedMindMap])

  // Export as image
  const handleExport = useCallback(async () => {
    if (dialogLocksRef.current.export) return
    const svg = document.querySelector('svg')
    if (!svg) return
    dialogLocksRef.current.export = true

    // Get the main group element that contains all nodes
    const mainGroup = svg.querySelector('g')
    if (!mainGroup) {
      dialogLocksRef.current.export = false
      return
    }

    try {
      // Get the bounding box of all content
      const bbox = mainGroup.getBBox()

      // Add padding around the content
      const padding = 50
      const contentWidth = bbox.width + (padding * 2)
      const contentHeight = bbox.height + (padding * 2)

      // Set a high resolution scale factor for better quality
      const scale = 2
      const exportWidth = contentWidth * scale
      const exportHeight = contentHeight * scale

      // Clone the SVG to modify it for export
      const svgClone = svg.cloneNode(true) as SVGSVGElement

      // Set explicit dimensions and viewBox on the clone
      svgClone.setAttribute('width', contentWidth.toString())
      svgClone.setAttribute('height', contentHeight.toString())
      svgClone.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${contentWidth} ${contentHeight}`)

      // Remove any transform from the main group in the clone
      const clonedGroup = svgClone.querySelector('g')
      if (clonedGroup) {
        clonedGroup.removeAttribute('transform')
      }

      // Serialize the modified SVG
      const svgData = new XMLSerializer().serializeToString(svgClone)

      // Create canvas for high-resolution export
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        dialogLocksRef.current.export = false
        return
      }

      canvas.width = exportWidth
      canvas.height = exportHeight

      const img = new Image()

      img.onload = async () => {
        try {
          // Scale the context for high resolution
          ctx.scale(scale, scale)
          ctx.drawImage(img, 0, 0, contentWidth, contentHeight)

          const dataUrl = canvas.toDataURL('image/png')
          await window.api.exportImage(dataUrl, 'mindmap.png')
        } catch (error) {
          console.error('Export failed:', error)
        } finally {
          dialogLocksRef.current.export = false
        }
      }

      img.onerror = (error) => {
        console.error('Failed to load SVG for export:', error)
        dialogLocksRef.current.export = false
      }

      // Use btoa with proper encoding for SVG
      const base64SVG = btoa(unescape(encodeURIComponent(svgData)))
      img.src = 'data:image/svg+xml;base64,' + base64SVG
    } catch (error) {
      console.error('Export failed:', error)
      dialogLocksRef.current.export = false
    }
  }, [])

  // Listen for menu events
  useEffect(() => {
    const isFocusedWindow = () => typeof document !== 'undefined' && document.hasFocus()

    const handleMenuNew = () => {
      if (!isFocusedWindow()) return
      handleNew()
    }
    const handleMenuSave = () => {
      if (!isFocusedWindow()) return
      handleSave()
    }
    const handleMenuSaveAs = () => {
      if (!isFocusedWindow()) return
      handleSaveAs()
    }
    const handleMenuExport = () => {
      if (!isFocusedWindow()) return
      handleExport()
    }

    window.electron.ipcRenderer.on('menu-new', handleMenuNew)
    window.electron.ipcRenderer.on('menu-save', handleMenuSave)
    window.electron.ipcRenderer.on('menu-save-as', handleMenuSaveAs)
    window.electron.ipcRenderer.on('menu-export', handleMenuExport)

    return () => {
      window.electron.ipcRenderer.removeListener('menu-new', handleMenuNew)
      window.electron.ipcRenderer.removeListener('menu-save', handleMenuSave)
      window.electron.ipcRenderer.removeListener('menu-save-as', handleMenuSaveAs)
      window.electron.ipcRenderer.removeListener('menu-export', handleMenuExport)
    }
  }, [handleNew, handleSave, handleSaveAs, handleExport])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If editing, only Escape stops editing (text input handles everything else)
      if (editingNodeId) {
        if (e.key === 'Escape') {
          setEditingNodeId(null)
        }
        return
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey
      const normalizedKey = e.key.toLowerCase()

      // Undo/Redo
      if (cmdOrCtrl && normalizedKey === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (cmdOrCtrl && normalizedKey === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
      }
      // Save As
      else if (cmdOrCtrl && normalizedKey === 's' && e.shiftKey) {
        e.preventDefault()
        handleSaveAs()
      }
      // Save
      else if (cmdOrCtrl && normalizedKey === 's') {
        e.preventDefault()
        handleSave()
      }
      // New
      else if (cmdOrCtrl && normalizedKey === 'n') {
        e.preventDefault()
        handleNew()
      }
      // Open
      else if (cmdOrCtrl && normalizedKey === 'o') {
        e.preventDefault()
        handleLoad()
      }
      // Reload
      else if (cmdOrCtrl && normalizedKey === 'r') {
        e.preventDefault()
        handleReload()
      }
      // Navigate to previous visible node (pre-order)
      else if (normalizedKey === 'arrowup' && state.selectedNodeId) {
        e.preventDefault()
        const nodes = getVisibleNodes()
        const index = nodes.findIndex(node => node.id === state.selectedNodeId)
        if (index > 0) {
          const target = nodes[index - 1]
          setState(prev => ({ ...prev, selectedNodeId: target.id }))
          setEditingNodeId(null)
        }
      }
      // Navigate to next visible node (pre-order)
      else if (normalizedKey === 'arrowdown' && state.selectedNodeId) {
        e.preventDefault()
        const nodes = getVisibleNodes()
        const index = nodes.findIndex(node => node.id === state.selectedNodeId)
        if (index >= 0 && index < nodes.length - 1) {
          const target = nodes[index + 1]
          setState(prev => ({ ...prev, selectedNodeId: target.id }))
          setEditingNodeId(null)
        }
      }
      // Navigate to parent
      else if (normalizedKey === 'arrowleft' && state.selectedNodeId) {
        e.preventDefault()
        const parent = findParentNode(state.selectedNodeId)
        if (parent) {
          setState(prev => ({ ...prev, selectedNodeId: parent.id }))
          setEditingNodeId(null)
        }
      }
      // Navigate to first child when expanded
      else if (normalizedKey === 'arrowright' && state.selectedNodeId) {
        e.preventDefault()
        const node = findNodeById(state.selectedNodeId)
        if (node && !node.collapsed && node.children.length > 0) {
          setState(prev => ({ ...prev, selectedNodeId: node.children[0].id }))
          setEditingNodeId(null)
        }
      }
      // Tab - add child node
      else if (normalizedKey === 'tab' && !e.shiftKey && state.selectedNodeId) {
        e.preventDefault()
        const newId = addNode(state.selectedNodeId)
        if (newId) {
          // Start editing the new node immediately
          setTimeout(() => setEditingNodeId(newId), 100)
        }
      }
      // Shift+Tab - go to parent
      else if (normalizedKey === 'tab' && e.shiftKey && state.selectedNodeId) {
        e.preventDefault()
        const parent = findParentNode(state.selectedNodeId)
        if (parent) {
          setState(prev => ({ ...prev, selectedNodeId: parent.id }))
        }
      }
      // Enter - edit selected node
      else if (normalizedKey === 'enter' && state.selectedNodeId && !cmdOrCtrl && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        handleStartEditing(state.selectedNodeId)
      }
      // F2 - start editing selected node
      else if (normalizedKey === 'f2' && state.selectedNodeId) {
        e.preventDefault()
        handleStartEditing(state.selectedNodeId)
      }
      // Space - toggle collapse (Shift + Space expands branch)
      else if ((normalizedKey === ' ' || normalizedKey === 'space') && state.selectedNodeId) {
        e.preventDefault()
        const node = findNodeById(state.selectedNodeId)
        if (node && node.children.length > 0) {
          if (e.shiftKey) {
            setNodeCollapsed(state.selectedNodeId, false, true)
          } else {
            toggleNodeCollapse(state.selectedNodeId)
          }
        }
      }
      // Delete - remove node
      else if ((normalizedKey === 'delete' || normalizedKey === 'backspace') && state.selectedNodeId) {
        e.preventDefault()
        deleteNode(state.selectedNodeId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    state.selectedNodeId,
    editingNodeId,
    addNode,
    deleteNode,
    findParentNode,
    findNodeById,
    setState,
    undo,
    redo,
    handleSave,
    handleSaveAs,
    handleNew,
    handleLoad,
    handleReload,
    handleStartEditing,
    toggleNodeCollapse,
    setNodeCollapsed,
    getVisibleNodes
  ])

  // Handle auto-fit with viewport dimensions
  const handleAutoFit = useCallback(() => {
    // Get viewport dimensions (approximate - toolbar is ~64px)
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight - 64
    resetAllPositions(viewportWidth, viewportHeight)
  }, [resetAllPositions])

  const handleCollapseSelected = useCallback(() => {
    if (state.selectedNodeId && selectedNodeHasChildren) {
      setNodeCollapsed(state.selectedNodeId, true)
      setEditingNodeId(null)
    }
  }, [state.selectedNodeId, selectedNodeHasChildren, setNodeCollapsed])

  const handleExpandSelected = useCallback(() => {
    if (state.selectedNodeId && selectedNodeHasChildren) {
      setNodeCollapsed(state.selectedNodeId, false, true)
    }
  }, [state.selectedNodeId, selectedNodeHasChildren, setNodeCollapsed])

  const handleIconChange = useCallback((icon: NodeIcon) => {
    if (state.selectedNodeId) {
      updateNodeIcon(state.selectedNodeId, icon)
    }
  }, [state.selectedNodeId, updateNodeIcon])

  const handleCollapseAll = useCallback(() => {
    collapseAll()
    setEditingNodeId(null)
  }, [collapseAll])

  const handleExpandAll = useCallback(() => {
    expandAll()
  }, [expandAll])

  const handleToggleCollapse = useCallback((nodeId: string) => {
    toggleNodeCollapse(nodeId)
    setEditingNodeId(prev => (prev ? null : prev))
  }, [toggleNodeCollapse])

  const handleToggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [setTheme, theme])

  const handleFontFamilyChange = useCallback((font: string) => {
    setFontFamily(font)
  }, [setFontFamily])

  const handleFontSizeChange = useCallback((size: number) => {
    setFontSize(size)
  }, [setFontSize])

  // Listen for files opened from outside (double-click, drag-drop, etc.)
  useEffect(() => {
    const unsubscribe = window.api.onOpenFile(({ filePath, data }) => {
      try {
        const parsed = JSON.parse(data) as MindMapNode
        applyLoadedMindMap(parsed, filePath)
        console.log('Opened file from external:', filePath)
      } catch (error) {
        console.error('Failed to parse opened file:', error)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [applyLoadedMindMap])

  return (
    <div className={`w-screen h-screen flex flex-col overflow-hidden theme-${theme}`}>
      <Toolbar
        onUndo={undo}
        onRedo={redo}
        onAddNode={() => state.selectedNodeId && addNode(state.selectedNodeId)}
        onDeleteNode={() => state.selectedNodeId && deleteNode(state.selectedNodeId)}
        onChangeColor={(color) => state.selectedNodeId && updateNodeColor(state.selectedNodeId, color)}
        onAutoLayout={handleAutoFit}
        onHelp={() => setShowHelp(true)}
        canUndo={state.historyIndex > 0}
        canRedo={state.historyIndex < state.history.length - 1}
        selectedNodeId={state.selectedNodeId}
        selectedNodeHasChildren={selectedNodeHasChildren}
        selectedNodeCollapsed={selectedNodeCollapsed}
        onCollapseSelected={handleCollapseSelected}
        onExpandSelected={handleExpandSelected}
        onCollapseAll={handleCollapseAll}
        onExpandAll={handleExpandAll}
        onIconChange={handleIconChange}
        selectedNodeIcon={selectedNodeIcon}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        fontFamily={fontFamily}
        onFontFamilyChange={handleFontFamilyChange}
        fontSize={fontSize}
        onFontSizeChange={handleFontSizeChange}
      />

      <div className="flex-1 relative">
        <MindMap
          root={state.root}
          selectedNodeId={state.selectedNodeId}
          editingNodeId={editingNodeId}
          onNodeClick={handleNodeClick}
          onStartEditing={handleStartEditing}
          onAddNode={addNode}
          onNodePositionChange={updateNodePosition}
          zoom={state.zoom}
          pan={state.pan}
          onZoomChange={(zoom) => setState(prev => ({ ...prev, zoom }))}
          onPanChange={(pan) => setState(prev => ({ ...prev, pan }))}
          onToggleCollapse={handleToggleCollapse}
          theme={theme}
          fontFamily={fontFamily}
          fontSize={fontSize}
        />
      </div>

      <HelpPanel isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}

export default App
