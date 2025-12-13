import React, { useState, useRef, useEffect } from 'react'
import { NodeIcon, MindMapTheme } from '../types/mindmap'

interface ToolbarProps {
  onAddNode: () => void
  onDeleteNode: () => void
  onChangeColor: (color: string) => void
  onChangeTextColor: (color: string | undefined) => void
  onAutoLayout: () => void
  onHelp: () => void
  selectedNodeId: string | null
  selectedNodeHasChildren: boolean
  selectedNodeCollapsed: boolean
  onCollapseSelected: () => void
  onExpandSelected: () => void
  onCollapseAll: () => void
  onExpandAll: () => void
  onIconChange: (icon: NodeIcon) => void
  selectedNodeIcon?: NodeIcon
  selectedNodeTextColor?: string
  theme: MindMapTheme
  onToggleTheme: () => void
  fontFamily: string
  onFontFamilyChange: (font: string) => void
  fontSize: number
  onFontSizeChange: (size: number) => void
  fontOptions: Array<{ label: string; value: string }>
}

const colors = [
  { name: 'Orange', value: '#FFE8CC' },
  { name: 'Blue', value: '#D4E4FF' },
  { name: 'Green', value: '#D4F5E5' },
  { name: 'Yellow', value: '#FFF9DD' },
  { name: 'Pink', value: '#FFE5F0' },
  { name: 'Purple', value: '#F0E5FF' },
  { name: 'Red', value: '#FFE5E5' },
  { name: 'Cyan', value: '#D9F7F7' }
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

const textColors = [
  { name: 'Default', value: undefined, displayColor: '#888888' },
  { name: 'Black', value: '#000000', displayColor: '#000000' },
  { name: 'Dark Gray', value: '#374151', displayColor: '#374151' },
  { name: 'Blue', value: '#1E40AF', displayColor: '#1E40AF' },
  { name: 'Green', value: '#15803D', displayColor: '#15803D' },
  { name: 'Red', value: '#B91C1C', displayColor: '#B91C1C' },
  { name: 'Purple', value: '#7C3AED', displayColor: '#7C3AED' },
  { name: 'Orange', value: '#C2410C', displayColor: '#C2410C' }
]

export const Toolbar: React.FC<ToolbarProps> = ({
  onAddNode,
  onDeleteNode,
  onChangeColor,
  onChangeTextColor,
  onAutoLayout,
  onHelp,
  selectedNodeId,
  selectedNodeHasChildren,
  selectedNodeCollapsed,
  onCollapseSelected,
  onExpandSelected,
  onCollapseAll,
  onExpandAll,
  onIconChange,
  selectedNodeIcon,
  selectedNodeTextColor,
  theme,
  onToggleTheme,
  fontFamily,
  onFontFamilyChange,
  fontSize,
  onFontSizeChange,
  fontOptions
}) => {
  const [openPopup, setOpenPopup] = useState<'bg' | 'text' | 'icon' | null>(null)
  const bgPopupRef = useRef<HTMLDivElement>(null)
  const textPopupRef = useRef<HTMLDivElement>(null)
  const iconPopupRef = useRef<HTMLDivElement>(null)

  const activeIcon: NodeIcon = selectedNodeIcon ?? 'none'

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openPopup === 'bg' && bgPopupRef.current && !bgPopupRef.current.contains(event.target as Node)) {
        setOpenPopup(null)
      }
      if (openPopup === 'text' && textPopupRef.current && !textPopupRef.current.contains(event.target as Node)) {
        setOpenPopup(null)
      }
      if (openPopup === 'icon' && iconPopupRef.current && !iconPopupRef.current.contains(event.target as Node)) {
        setOpenPopup(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openPopup])

  const baseButtonClasses = theme === 'dark'
    ? 'text-slate-100 hover:bg-slate-800 border-slate-600'
    : 'text-gray-700 hover:bg-gray-100 border-gray-300'

  const textPrimaryClass = theme === 'dark' ? 'text-slate-100' : 'text-gray-700'
  const hoverBgClass = theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-gray-100'
  const dividerClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-300'
  const disabledClasses = 'disabled:opacity-30 disabled:cursor-not-allowed'
  const baseButton = `px-2 py-1 text-[0.86rem] font-medium rounded transition-colors ${textPrimaryClass} ${hoverBgClass}`
  const accentButton = theme === 'dark'
    ? 'text-blue-300 hover:bg-slate-800'
    : 'text-blue-700 hover:bg-blue-50'
  const iconActiveClass = theme === 'dark'
    ? 'border-blue-400 bg-slate-800 text-blue-300 shadow-inner'
    : 'border-blue-500 bg-blue-50 text-blue-700 shadow-inner'
  const iconInactiveClass = theme === 'dark'
    ? 'border-slate-700 hover:border-slate-500 text-slate-100'
    : 'border-gray-200 hover:border-gray-400 text-gray-700'
  const popupBgClass = theme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'

  return (
    <div
      className={`toolbar px-2 py-1 flex items-center gap-1 shadow-sm border-b ${
        theme === 'dark'
          ? 'bg-slate-900 border-slate-700 text-slate-100'
          : 'bg-white border-gray-200 text-slate-800'
      }`}
    >
      {/* Theme & typography */}
      <div className={`flex items-center gap-1 border-r ${dividerClass} pr-1`}>
        <button
          onClick={onToggleTheme}
          className={`px-2 py-1 text-[0.86rem] font-medium rounded transition-colors border ${baseButtonClasses}`}
          title="Toggle light/dark mode"
        >
          <span className="text-[0.94em]">{theme === 'dark' ? '🌙' : '☀️'}</span> {theme === 'dark' ? 'Dark' : 'Light'}
        </button>
        <select
          value={fontFamily}
          onChange={(event) => onFontFamilyChange(event.target.value)}
          disabled={fontOptions.length === 0}
          className={`w-32 rounded px-2.5 py-1 text-[0.86rem] font-medium transition-colors truncate ${
            theme === 'dark'
              ? 'bg-slate-800 border border-slate-600 text-slate-100'
              : 'bg-white border border-gray-300 text-gray-700'
          }`}
        >
          {fontOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={fontSize}
          onChange={(event) => onFontSizeChange(Number(event.target.value))}
          className={`w-16 rounded px-2.5 py-1 text-[0.86rem] font-medium transition-colors ${
            theme === 'dark'
              ? 'bg-slate-800 border border-slate-600 text-slate-100'
              : 'bg-white border border-gray-300 text-gray-700'
          }`}
        >
          {[10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28].map(size => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {/* Node operations */}
      <div className={`flex items-center gap-0.5 border-r ${dividerClass} pr-1`}>
        <button
          onClick={onAddNode}
          disabled={!selectedNodeId}
          className={`${baseButton} ${disabledClasses}`}
          title="Add Child Node (Tab)"
        >
          <span className="text-[0.86em]">➕</span> Add
        </button>
        <button
          onClick={onDeleteNode}
          disabled={!selectedNodeId}
          className={`${baseButton} ${disabledClasses}`}
          title="Delete Node (Delete)"
        >
          <span className="text-[0.86em]">🗑️</span> Delete
        </button>
      </div>

      {/* Structure controls */}
      <div className={`flex items-center gap-0.5 border-r ${dividerClass} pr-1`}>
        <button
          onClick={onCollapseSelected}
          disabled={!selectedNodeId || !selectedNodeHasChildren || selectedNodeCollapsed}
          className={`${baseButton} ${disabledClasses}`}
          title="Fold selected branch (Space)"
        >
          <span className="text-[0.86em]">⤵️</span> Fold
        </button>
        <button
          onClick={onExpandSelected}
          disabled={!selectedNodeId || !selectedNodeHasChildren || !selectedNodeCollapsed}
          className={`${baseButton} ${disabledClasses}`}
          title="Unfold selected branch"
        >
          <span className="text-[0.86em]">⤴️</span> Unfold
        </button>
        <button
          onClick={onCollapseAll}
          className={baseButton}
          title="Fold all branches"
        >
          <span className="text-[0.86em]">↯</span> All
        </button>
        <button
          onClick={onExpandAll}
          className={baseButton}
          title="Unfold all branches"
        >
          <span className="text-[0.86em]">☄</span> All
        </button>
      </div>

      {/* Layout operations */}
      <div className={`flex items-center gap-0.5 border-r ${dividerClass} pr-1`}>
        <button
          onClick={onAutoLayout}
          className={`px-2 py-1 text-[0.86rem] font-medium rounded transition-colors ${accentButton}`}
          title="Auto-fit and organize the mindmap"
        >
          <span className="text-[0.86em]">✨</span> Auto-fit
        </button>
      </div>

      {/* Styling controls */}
      <div className={`flex items-center gap-0.5 border-r ${dividerClass} pr-1`}>
        {/* Background Color Popup */}
        <div className="relative" ref={bgPopupRef}>
          <button
            onClick={() => selectedNodeId && setOpenPopup(openPopup === 'bg' ? null : 'bg')}
            disabled={!selectedNodeId}
            className={`px-2 py-1 text-[0.86rem] font-medium rounded transition-colors border ${baseButtonClasses} ${disabledClasses}`}
            title="Background Color"
          >
            <span className="text-[0.86em]">🎨</span> BG
          </button>
          {openPopup === 'bg' && selectedNodeId && (
            <div className={`absolute top-full mt-1 left-0 p-3 rounded shadow-lg border z-50 ${popupBgClass}`}>
              <div className="grid grid-cols-4 gap-2 w-max">
                {colors.map(color => (
                  <button
                    key={color.value}
                    onClick={() => {
                      onChangeColor(color.value)
                      setOpenPopup(null)
                    }}
                    className={`w-9 h-9 rounded border-2 transition-colors ${theme === 'dark' ? 'border-slate-600 hover:border-slate-400' : 'border-gray-300 hover:border-gray-500'}`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Text Color Popup */}
        <div className="relative" ref={textPopupRef}>
          <button
            onClick={() => selectedNodeId && setOpenPopup(openPopup === 'text' ? null : 'text')}
            disabled={!selectedNodeId}
            className={`px-2 py-1 rounded transition-colors border flex items-center gap-1 ${baseButtonClasses} ${disabledClasses}`}
            title="Text Color"
          >
            <div className="flex flex-col items-center justify-center">
              <span className="text-[0.94rem] font-bold leading-none" style={{ color: selectedNodeTextColor }}>A</span>
              <div className="w-full h-[2.5px] mt-[1px]" style={{ backgroundColor: selectedNodeTextColor }}></div>
            </div>
            <span className="text-[0.63rem]">▼</span>
          </button>
          {openPopup === 'text' && selectedNodeId && (
            <div className={`absolute top-full mt-1 left-0 p-3 rounded shadow-lg border z-50 ${popupBgClass}`}>
              <div className="grid grid-cols-4 gap-2 w-max">
                {textColors.map(color => (
                  <button
                    key={color.name}
                    onClick={() => {
                      onChangeTextColor(color.value)
                      setOpenPopup(null)
                    }}
                    className={`w-9 h-9 rounded border-2 transition-colors flex items-center justify-center ${
                      selectedNodeTextColor === color.value
                        ? (theme === 'dark' ? 'border-blue-400' : 'border-blue-600')
                        : (theme === 'dark' ? 'border-slate-600 hover:border-slate-400' : 'border-gray-300 hover:border-gray-500')
                    }`}
                    style={{
                      backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF'
                    }}
                    title={color.name}
                  >
                    <span style={{ color: color.displayColor, fontSize: '16px', fontWeight: 'bold' }}>A</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Icon Popup */}
        <div className="relative" ref={iconPopupRef}>
          <button
            onClick={() => selectedNodeId && setOpenPopup(openPopup === 'icon' ? null : 'icon')}
            disabled={!selectedNodeId}
            className={`px-2 py-1 text-[0.86rem] font-medium rounded transition-colors border ${baseButtonClasses} ${disabledClasses}`}
            title="Node Icon"
          >
            {icons.find(i => i.value === activeIcon)?.symbol || '—'} Icon
          </button>
          {openPopup === 'icon' && selectedNodeId && (
            <div className={`absolute top-full mt-1 left-0 p-3 rounded shadow-lg border z-50 ${popupBgClass}`}>
              <div className="grid grid-cols-4 gap-2 w-max">
                {icons.map(icon => (
                  <button
                    key={icon.value}
                    onClick={() => {
                      onIconChange(icon.value)
                      setOpenPopup(null)
                    }}
                    className={`w-10 h-10 text-lg rounded border transition-colors flex items-center justify-center ${activeIcon === icon.value ? iconActiveClass : iconInactiveClass}`}
                    title={icon.name}
                  >
                    {icon.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help button */}
      <div className="ml-auto">
        <button
          onClick={onHelp}
          className={baseButton}
          title="Keyboard Shortcuts & Help"
        >
          <span className="text-[0.86em]">❓</span> Help
        </button>
      </div>
    </div>
  )
}

