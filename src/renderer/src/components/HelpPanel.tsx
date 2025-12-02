import React from 'react'

interface HelpPanelProps {
  isOpen: boolean
  onClose: () => void
}

export const HelpPanel: React.FC<HelpPanelProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Keyboard Shortcuts & Help</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Node Creation</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Create child node</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">Tab</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Create sibling node</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">Enter</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Navigate to parent</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">Shift + Tab</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Start editing node</span>
                <span className="px-2 py-1 bg-gray-100 rounded border border-gray-300">Enter · F2 · Double-click</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delete node</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">Delete / Backspace</kbd>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">File Operations</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Save mindmap</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">Cmd + S</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Save mindmap as...</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">Cmd + Shift + S</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Open mindmap</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">Cmd + O</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Create new mindmap</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">Cmd + N</kbd>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Editing</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Undo</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">Cmd + Z</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Redo</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">Cmd + Shift + Z</kbd>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Structure</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Select previous / next visible node</span>
                <span className="px-2 py-1 bg-gray-100 rounded border border-gray-300">↑ / ↓</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Select parent / first child</span>
                <span className="px-2 py-1 bg-gray-100 rounded border border-gray-300">← / →</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fold / unfold selected branch</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">Space</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expand entire branch</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">Shift + Space</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fold / unfold via toolbar</span>
                <span className="px-2 py-1 bg-gray-100 rounded border border-gray-300">Fold · Unfold · Fold All · Unfold All</span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Mouse Controls</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <div>• <strong>Single-click</strong> - Select a node</div>
              <div>• <strong>Double-click</strong> - Start editing node text inline</div>
              <div>• <strong>Drag node</strong> - Reposition node freely</div>
              <div>• <strong>Scroll/Pinch</strong> - Zoom in/out</div>
              <div>• <strong>Drag canvas</strong> - Pan around</div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Tips</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <div>• Press <strong>Tab</strong> to create child nodes, <strong>Enter</strong> for siblings (like FreeMind)</div>
              <div>• Use <strong>Auto-fit</strong> button to reorganize the entire mindmap</div>
              <div>• Drag nodes to customize layout, positions are saved</div>
              <div>• Use the color &amp; icon pickers to classify topics visually</div>
              <div>• Export your mindmap as an image to share with others</div>
              <div>• Folded nodes show how many hidden ideas remain in the branch</div>
            </div>
          </section>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}

