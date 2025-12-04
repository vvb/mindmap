import { useState, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { MindMapNode, MindMapState, NodeIcon, MindMapTheme, MindMapPreferences } from '../types/mindmap'

// Color palette for different depth levels
const LEVEL_COLORS = [
  '#FFE5B4', // Level 0 (root) - Peach (box background)
  '#E3F2FD', // Level 1 - Light Blue (box background)
  '#F3E5F5', // Level 2 - Light Purple (box background)
  '#2E7D32', // Level 3+ - Dark Green (text color, no box)
]

const getColorForDepth = (depth: number): string => {
  return LEVEL_COLORS[Math.min(depth, LEVEL_COLORS.length - 1)]
}

const PREFERENCES_STORAGE_KEY = 'mindmap.preferences.v1'
const DEFAULT_LEFT_MARGIN = 100
const TOOLBAR_HEIGHT_ESTIMATE = 64

const computeDefaultPan = () => {
  if (typeof window === 'undefined') {
    return { x: DEFAULT_LEFT_MARGIN, y: 0 }
  }

  const usableHeight = Math.max(window.innerHeight - TOOLBAR_HEIGHT_ESTIMATE, 0)
  return {
    x: DEFAULT_LEFT_MARGIN,
    y: usableHeight / 2
  }
}

const DEFAULT_PREFERENCES: MindMapPreferences = {
  theme: 'light',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: 15
}

const clampFontSize = (size: number): number => Math.max(10, Math.min(size, 28))

const loadStoredPreferences = (): MindMapPreferences => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_PREFERENCES }
  }

  try {
    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PREFERENCES }

    const parsed = JSON.parse(raw) as Partial<MindMapPreferences>

    const theme: MindMapTheme = parsed.theme === 'dark' ? 'dark' : 'light'
    const fontFamily = typeof parsed.fontFamily === 'string' && parsed.fontFamily.trim().length > 0
      ? parsed.fontFamily
      : DEFAULT_PREFERENCES.fontFamily
    const fontSize = typeof parsed.fontSize === 'number'
      ? clampFontSize(parsed.fontSize)
      : DEFAULT_PREFERENCES.fontSize

    return {
      theme,
      fontFamily,
      fontSize
    }
  } catch (error) {
    console.warn('Failed to load stored preferences, using defaults', error)
    return { ...DEFAULT_PREFERENCES }
  }
}

const persistPreferencesToStorage = (preferences: MindMapPreferences) => {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
  } catch (error) {
    console.warn('Failed to persist preferences', error)
  }
}

const createInitialNode = (): MindMapNode => ({
  id: uuidv4(),
  text: 'Root',
  x: 0,
  y: 0,
  color: getColorForDepth(0),
  children: [],
  collapsed: false,
  icon: 'none',
  manualPosition: false
})

const MAX_HISTORY = 50

export const useMindMap = () => {
  const [state, setState] = useState<MindMapState>(() => {
    const initialRoot = createInitialNode()
    const initialSnapshot = JSON.parse(JSON.stringify(initialRoot)) as MindMapNode
    const storedPreferences = loadStoredPreferences()

    return {
      root: initialRoot,
      selectedNodeId: initialRoot.id,
      history: [initialSnapshot],
      historyIndex: 0,
      zoom: 1,
      pan: computeDefaultPan(),
      preferences: storedPreferences
    }
  })

  const currentFilePathRef = useRef<string | null>(null)

  const persistPreferences = useCallback((preferences: MindMapPreferences) => {
    persistPreferencesToStorage(preferences)
  }, [])

  const saveToHistory = useCallback((newRoot: MindMapNode) => {
    setState(prev => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1)
      newHistory.push(JSON.parse(JSON.stringify(newRoot)))
      
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift()
      }

      return {
        ...prev,
        root: newRoot,
        history: newHistory,
        historyIndex: newHistory.length - 1
      }
    })
  }, [])

  const findNodeById = useCallback((node: MindMapNode, id: string): MindMapNode | null => {
    if (node.id === id) return node
    for (const child of node.children) {
      const found = findNodeById(child, id)
      if (found) return found
    }
    return null
  }, [])

  const findParentNode = useCallback((node: MindMapNode, childId: string): MindMapNode | null => {
    for (const child of node.children) {
      if (child.id === childId) return node
      const found = findParentNode(child, childId)
      if (found) return found
    }
    return null
  }, [])

  const getNodeDepth = useCallback((root: MindMapNode, nodeId: string, currentDepth: number = 0): number => {
    if (root.id === nodeId) return currentDepth
    for (const child of root.children) {
      const depth = getNodeDepth(child, nodeId, currentDepth + 1)
      if (depth !== -1) return depth
    }
    return -1
  }, [])

  const addNode = useCallback((parentId: string, text: string = 'New Node') => {
    const newRoot = JSON.parse(JSON.stringify(state.root))
    const parent = findNodeById(newRoot, parentId)

    if (parent) {
      // Calculate depth for the new node (parent depth + 1)
      const parentDepth = getNodeDepth(newRoot, parentId)
      const newNodeDepth = parentDepth + 1

      const newNode: MindMapNode = {
        id: uuidv4(),
        text,
        x: 0,
        y: 0,
        color: getColorForDepth(newNodeDepth),
        children: [],
        collapsed: false,
        icon: 'none',
        manualPosition: false
      }
      parent.collapsed = false
      parent.children.push(newNode)
      saveToHistory(newRoot)
      setState(prev => ({ ...prev, selectedNodeId: newNode.id }))
      return newNode.id
    }
    return null
  }, [state.root, findNodeById, saveToHistory, getNodeDepth])

  const addSiblingNode = useCallback((nodeId: string, text: string = 'New Node') => {
    if (nodeId === state.root.id) {
      // Can't add sibling to root, add child instead
      return addNode(nodeId, text)
    }

    const newRoot = JSON.parse(JSON.stringify(state.root))
    const parent = findParentNode(newRoot, nodeId)

    if (parent) {
      // Sibling has same depth as the current node
      const siblingDepth = getNodeDepth(newRoot, nodeId)

      const newNode: MindMapNode = {
        id: uuidv4(),
        text,
        x: 0,
        y: 0,
        color: getColorForDepth(siblingDepth),
        children: [],
        collapsed: false,
        icon: 'none',
        manualPosition: false
      }

      // Find the index of the current node and insert after it
      const currentIndex = parent.children.findIndex(child => child.id === nodeId)
      parent.children.splice(currentIndex + 1, 0, newNode)

      saveToHistory(newRoot)
      setState(prev => ({ ...prev, selectedNodeId: newNode.id }))
      return newNode.id
    }
    return null
  }, [state.root, findParentNode, saveToHistory, addNode, getNodeDepth])

  const updateNodeText = useCallback((nodeId: string, text: string) => {
    const newRoot = JSON.parse(JSON.stringify(state.root))
    const node = findNodeById(newRoot, nodeId)
    
    if (node) {
      node.text = text
      saveToHistory(newRoot)
    }
  }, [state.root, findNodeById, saveToHistory])

  const updateNodeColor = useCallback((nodeId: string, color: string) => {
    const newRoot = JSON.parse(JSON.stringify(state.root))
    const node = findNodeById(newRoot, nodeId)
    
    if (node) {
      node.color = color
      saveToHistory(newRoot)
    }
  }, [state.root, findNodeById, saveToHistory])

  const toggleNodeCollapse = useCallback((nodeId: string) => {
    const newRoot = JSON.parse(JSON.stringify(state.root))
    const node = findNodeById(newRoot, nodeId)

    if (node) {
      node.collapsed = !node.collapsed
      saveToHistory(newRoot)
    }
  }, [state.root, findNodeById, saveToHistory])

  const setNodeCollapsed = useCallback((nodeId: string, collapsed: boolean, deep: boolean = false) => {
    const newRoot = JSON.parse(JSON.stringify(state.root))
    const node = findNodeById(newRoot, nodeId)

    if (node) {
      const applyCollapse = (current: MindMapNode) => {
        current.collapsed = collapsed
        if (deep) {
          current.children.forEach(child => applyCollapse(child))
        }
      }

      applyCollapse(node)
      saveToHistory(newRoot)
    }
  }, [state.root, findNodeById, saveToHistory])

  const collapseAll = useCallback(() => {
    const newRoot = JSON.parse(JSON.stringify(state.root))

    const collapseDescendants = (node: MindMapNode) => {
      node.children.forEach(child => {
        child.collapsed = true
        collapseDescendants(child)
      })
    }

    newRoot.collapsed = false
    collapseDescendants(newRoot)
    saveToHistory(newRoot)
  }, [state.root, saveToHistory])

  const expandAll = useCallback(() => {
    const newRoot = JSON.parse(JSON.stringify(state.root))

    const expandDescendants = (node: MindMapNode) => {
      node.collapsed = false
      node.children.forEach(child => expandDescendants(child))
    }

    expandDescendants(newRoot)
    saveToHistory(newRoot)
  }, [state.root, saveToHistory])

  const updateNodeIcon = useCallback((nodeId: string, icon: NodeIcon) => {
    const newRoot = JSON.parse(JSON.stringify(state.root))
    const node = findNodeById(newRoot, nodeId)

    if (node) {
      node.icon = icon
      saveToHistory(newRoot)
    }
  }, [state.root, findNodeById, saveToHistory])

  const deleteNode = useCallback((nodeId: string) => {
    if (nodeId === state.root.id) return // Can't delete root

    const newRoot = JSON.parse(JSON.stringify(state.root))
    const parent = findParentNode(newRoot, nodeId)

    if (parent) {
      parent.children = parent.children.filter(child => child.id !== nodeId)
      saveToHistory(newRoot)
      setState(prev => ({ ...prev, selectedNodeId: parent.id }))
    }
  }, [state.root, findParentNode, saveToHistory])

  const updateNodePosition = useCallback((nodeId: string, x: number, y: number) => {
    const newRoot = JSON.parse(JSON.stringify(state.root))
    const node = findNodeById(newRoot, nodeId)

    if (node) {
      node.x = x
      node.y = y
      node.manualPosition = true
      // Don't save to history for position changes (too many history entries)
      setState(prev => ({ ...prev, root: newRoot }))
    }
  }, [state.root, findNodeById])

  const resetAllPositions = useCallback((viewportWidth?: number, viewportHeight?: number) => {
    const resetPositions = (node: MindMapNode) => {
      node.x = 0
      node.y = 0
      node.manualPosition = false
      node.children.forEach(child => resetPositions(child))
    }

    const newRoot = JSON.parse(JSON.stringify(state.root))
    resetPositions(newRoot)

    // Calculate pan offset to position root on left-center
    const hasViewport = typeof viewportWidth === 'number' && typeof viewportHeight === 'number'
    const centerPan = hasViewport
      ? { x: DEFAULT_LEFT_MARGIN, y: viewportHeight! / 2 }
      : computeDefaultPan()

    // Reset zoom and pan to centered view
    setState(prev => ({
      ...prev,
      root: newRoot,
      zoom: 1,
      pan: centerPan
    }))
  }, [state.root])

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex > 0) {
        const newIndex = prev.historyIndex - 1
        return {
          ...prev,
          root: JSON.parse(JSON.stringify(prev.history[newIndex])),
          historyIndex: newIndex
        }
      }
      return prev
    })
  }, [])

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex < prev.history.length - 1) {
        const newIndex = prev.historyIndex + 1
        return {
          ...prev,
          root: JSON.parse(JSON.stringify(prev.history[newIndex])),
          historyIndex: newIndex
        }
      }
      return prev
    })
  }, [])

  const setTheme = useCallback((theme: MindMapTheme) => {
    setState(prev => {
      const preferences = {
        ...prev.preferences,
        theme
      }
      persistPreferences(preferences)
      return {
        ...prev,
        preferences
      }
    })
  }, [persistPreferences])

  const setFontFamily = useCallback((fontFamily: string) => {
    setState(prev => {
      const preferences = {
        ...prev.preferences,
        fontFamily
      }
      persistPreferences(preferences)
      return {
        ...prev,
        preferences
      }
    })
  }, [persistPreferences])

  const setFontSize = useCallback((fontSize: number) => {
    const clamped = clampFontSize(fontSize)
    setState(prev => {
      const preferences = {
        ...prev.preferences,
        fontSize: clamped
      }
      persistPreferences(preferences)
      return {
        ...prev,
        preferences
      }
    })
  }, [persistPreferences])

  const resetMindMap = useCallback(() => {
    const initialRoot = createInitialNode()
    const snapshot = JSON.parse(JSON.stringify(initialRoot)) as MindMapNode

    setState(prev => ({
      ...prev,
      root: initialRoot,
      selectedNodeId: initialRoot.id,
      history: [snapshot],
      historyIndex: 0,
      zoom: 1,
      pan: computeDefaultPan()
    }))
  }, [])

  return {
    state,
    setState,
    addNode,
    addSiblingNode,
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
    findNodeById: (id: string) => findNodeById(state.root, id),
    findParentNode: (id: string) => findParentNode(state.root, id),
    undo,
    redo,
    currentFilePathRef,
    setTheme,
    setFontFamily,
    setFontSize,
    resetMindMap
  }
}

