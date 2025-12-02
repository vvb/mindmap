export type NodeIcon =
  | 'none'
  | 'idea'
  | 'important'
  | 'question'
  | 'check'
  | 'warning'
  | 'note'

export interface MindMapNode {
  id: string
  text: string
  x: number
  y: number
  color: string
  children: MindMapNode[]
  collapsed?: boolean
  icon?: NodeIcon
  manualPosition?: boolean
}

export const NODE_ICON_VALUES: readonly NodeIcon[] = [
  'none',
  'idea',
  'important',
  'question',
  'check',
  'warning',
  'note'
] as const

export type MindMapTheme = 'light' | 'dark'

export interface MindMapPreferences {
  theme: MindMapTheme
  fontFamily: string
  fontSize: number
}

export interface MindMapState {
  root: MindMapNode
  selectedNodeId: string | null
  history: MindMapNode[]
  historyIndex: number
  zoom: number
  pan: { x: number; y: number }
  preferences: MindMapPreferences
}

export interface NodePosition {
  id: string
  x: number
  y: number
}

