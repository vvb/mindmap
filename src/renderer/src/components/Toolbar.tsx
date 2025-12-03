import React from 'react'
import { NodeIcon, MindMapTheme } from '../types/mindmap'

interface ToolbarProps {
  onNew: () => void
  onSave: () => void
  onSaveAs: () => void
  onLoad: () => void
  onExport: () => void
  onUndo: () => void
  onRedo: () => void
  onAddNode: () => void
  onDeleteNode: () => void
  onChangeColor: (color: string) => void
  onAutoLayout: () => void
  onHelp: () => void
  canUndo: boolean
  canRedo: boolean
  selectedNodeId: string | null
  selectedNodeHasChildren: boolean
  selectedNodeCollapsed: boolean
  onCollapseSelected: () => void
  onExpandSelected: () => void
  onCollapseAll: () => void
  onExpandAll: () => void
  onIconChange: (icon: NodeIcon) => void
  selectedNodeIcon?: NodeIcon
  theme: MindMapTheme
  onToggleTheme: () => void
  fontFamily: string
  onFontFamilyChange: (font: string) => void
  fontSize: number
  onFontSizeChange: (size: number) => void
}

const colors = [
  { name: 'Peach', value: '#FFE5B4' },
  { name: 'Blue', value: '#E3F2FD' },
  { name: 'Green', value: '#E8F5E9' },
  { name: 'Yellow', value: '#FFF9C4' },
  { name: 'Pink', value: '#FCE4EC' },
  { name: 'Purple', value: '#F3E5F5' },
  { name: 'Orange', value: '#FFF3E0' },
  { name: 'Cyan', value: '#E0F7FA' }
]

const icons: Array<{ name: string; value: NodeIcon; symbol: string }> = [
  { name: 'None', value: 'none', symbol: '—' },
  { name: 'Idea', value: 'idea', symbol: '💡' },
  { name: 'Important', value: 'important', symbol: '⭐' },
  { name: 'Question', value: 'question', symbol: '❓' },
  { name: 'Complete', value: 'check', symbol: '✅' },
  { name: 'Warning', value: 'warning', symbol: '⚠️' },
  { name: 'Note', value: 'note', symbol: '📝' }
]

const FONT_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'System', value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { label: 'Inter', value: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { label: 'Roboto', value: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { label: 'Georgia', value: "'Georgia', 'Times New Roman', serif" },
  { label: 'SF Mono', value: "'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace" }
]

export const Toolbar: React.FC<ToolbarProps> = ({
  onNew,
  onSave,
  onSaveAs,
  onLoad,
  onExport,
  onUndo,
  onRedo,
  onAddNode,
  onDeleteNode,
  onChangeColor,
  onAutoLayout,
  onHelp,
  canUndo,
  canRedo,
  selectedNodeId,
  selectedNodeHasChildren,
  selectedNodeCollapsed,
  onCollapseSelected,
  onExpandSelected,
  onCollapseAll,
  onExpandAll,
  onIconChange,
  selectedNodeIcon,
  theme,
  onToggleTheme,
  fontFamily,
  onFontFamilyChange,
  fontSize,
  onFontSizeChange
}) => {
  const activeIcon: NodeIcon = selectedNodeIcon ?? 'none'

  const baseButtonClasses = theme === 'dark'
    ? 'text-slate-100 hover:bg-slate-800 border-slate-600'
    : 'text-gray-700 hover:bg-gray-100 border-gray-300'

  const textPrimaryClass = theme === 'dark' ? 'text-slate-100' : 'text-gray-700'
  const textMutedClass = theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
  const hoverBgClass = theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-gray-100'
  const dividerClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-300'
  const disabledClasses = 'disabled:opacity-30 disabled:cursor-not-allowed'
  const baseButton = `px-3 py-1.5 text-sm font-medium rounded transition-colors ${textPrimaryClass} ${hoverBgClass}`
  const accentButton = theme === 'dark'
    ? 'text-blue-300 hover:bg-slate-800'
    : 'text-blue-700 hover:bg-blue-50'
  const iconActiveClass = theme === 'dark'
    ? 'border-blue-400 bg-slate-800 text-blue-300 shadow-inner'
    : 'border-blue-500 bg-blue-50 text-blue-700 shadow-inner'
  const iconInactiveClass = theme === 'dark'
    ? 'border-slate-700 hover:border-slate-500 text-slate-100'
    : 'border-gray-200 hover:border-gray-400 text-gray-700'

  return (
    <div
      className={`toolbar px-4 py-2 flex items-center gap-2 shadow-sm border-b ${
        theme === 'dark'
          ? 'bg-slate-900 border-slate-700 text-slate-100'
          : 'bg-white border-gray-200 text-slate-800'
      }`}
    >
      {/* File operations */}
      <div className={`flex items-center gap-1 border-r ${dividerClass} pr-2`}>
        <button
          onClick={onNew}
          className={baseButton}
          title="New (Cmd+N)"
        >
          🆕 New
        </button>
        <button
          onClick={onLoad}
          className={baseButton}
          title="Open (Cmd+O)"
        >
          📂 Open
        </button>
        <button
          onClick={onSave}
          className={baseButton}
          title="Save (Cmd+S)"
        >
          💾 Save
        </button>
        <button
          onClick={onSaveAs}
          className={baseButton}
          title="Save As (Cmd+Shift+S)"
        >
          📝 Save As
        </button>
        <button
          onClick={onExport}
          className={baseButton}
          title="Export as Image (Cmd+E)"
        >
          📸 Export
        </button>
      </div>

      {/* Theme & typography */}
      <div className={`flex items-center gap-2 border-r ${dividerClass} pr-2`}>
        <button
          onClick={onToggleTheme}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors border ${baseButtonClasses}`}
          title="Toggle light/dark mode"
        >
          {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <label className={`flex items-center gap-1 text-sm ${textPrimaryClass}`}>
          <span>Font</span>
          <select
            value={fontFamily}
            onChange={(event) => onFontFamilyChange(event.target.value)}
            className={`rounded px-2 py-1 text-sm transition-colors ${
              theme === 'dark'
                ? 'bg-slate-800 border border-slate-600 text-slate-100'
                : 'bg-white border border-gray-300 text-gray-700'
            }`}
          >
            {FONT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={`flex items-center gap-1 text-sm ${textPrimaryClass}`}>
          <span>Size</span>
          <input
            type="number"
            min={10}
            max={28}
            value={fontSize}
            onChange={(event) => onFontSizeChange(Number(event.target.value))}
            className={`w-16 rounded px-2 py-1 text-sm transition-colors ${
              theme === 'dark'
                ? 'bg-slate-800 border border-slate-600 text-slate-100'
                : 'bg-white border border-gray-300 text-gray-700'
            }`}
          />
        </label>
      </div>

      {/* Edit operations */}
      <div className={`flex items-center gap-1 border-r ${dividerClass} pr-2`}>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`${baseButton} ${disabledClasses}`}
          title="Undo (Cmd+Z)"
        >
          ↶ Undo
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`${baseButton} ${disabledClasses}`}
          title="Redo (Cmd+Shift+Z)"
        >
          ↷ Redo
        </button>
      </div>

      {/* Node operations */}
      <div className={`flex items-center gap-1 border-r ${dividerClass} pr-2`}>
        <button
          onClick={onAddNode}
          disabled={!selectedNodeId}
          className={`${baseButton} ${disabledClasses}`}
          title="Add Child Node (Tab)"
        >
          ➕ Add Node
        </button>
        <button
          onClick={onDeleteNode}
          disabled={!selectedNodeId}
          className={`${baseButton} ${disabledClasses}`}
          title="Delete Node (Delete)"
        >
          🗑️ Delete
        </button>
      </div>

      {/* Structure controls */}
      <div className={`flex items-center gap-1 border-r ${dividerClass} pr-2`}>
        <button
          onClick={onCollapseSelected}
          disabled={!selectedNodeId || !selectedNodeHasChildren || selectedNodeCollapsed}
          className={`${baseButton} ${disabledClasses}`}
          title="Fold selected branch (Space)"
        >
          ⤵️ Fold
        </button>
        <button
          onClick={onExpandSelected}
          disabled={!selectedNodeId || !selectedNodeHasChildren || !selectedNodeCollapsed}
          className={`${baseButton} ${disabledClasses}`}
          title="Unfold selected branch"
        >
          ⤴️ Unfold
        </button>
        <button
          onClick={onCollapseAll}
          className={baseButton}
          title="Fold all branches"
        >
          ↯ Fold All
        </button>
        <button
          onClick={onExpandAll}
          className={baseButton}
          title="Unfold all branches"
        >
          ☄ Unfold All
        </button>
      </div>

      {/* Layout operations */}
      <div className={`flex items-center gap-1 border-r ${dividerClass} pr-2`}>
        <button
          onClick={onAutoLayout}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${accentButton}`}
          title="Auto-fit and organize the mindmap"
        >
          ✨ Auto-fit
        </button>
      </div>

      {/* Styling controls */}
      {selectedNodeId && (
        <div className={`flex items-center gap-3 border-r ${dividerClass} pr-2`}>
          <div className="flex items-center gap-1">
            <span className={`text-sm ${textMutedClass} mr-1`}>Color:</span>
            {colors.map(color => (
              <button
                key={color.value}
                onClick={() => onChangeColor(color.value)}
                className={`w-6 h-6 rounded border-2 transition-colors ${theme === 'dark' ? 'border-slate-600 hover:border-slate-400' : 'border-gray-300 hover:border-gray-500'}`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            <span className={`text-sm ${textMutedClass} mr-1`}>Icon:</span>
            {icons.map(icon => (
              <button
                key={icon.value}
                onClick={() => onIconChange(icon.value)}
                className={`px-2 py-1 text-lg rounded border transition-colors ${activeIcon === icon.value ? iconActiveClass : iconInactiveClass}`}
                title={icon.name}
              >
                {icon.symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Help button */}
      <div className="ml-auto">
        <button
          onClick={onHelp}
          className={baseButton}
          title="Keyboard Shortcuts & Help"
        >
          ❓ Help
        </button>
      </div>
    </div>
  )
}

