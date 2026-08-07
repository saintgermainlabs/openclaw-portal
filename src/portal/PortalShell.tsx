import { useCallback, useRef, useState } from 'react'
import { PortalProvider, usePortal } from './PortalContext'
import ChatPane from './ChatPane'
import ResultPane from './ResultPane'

export default function PortalShell() {
  return (
    <PortalProvider>
      <PortalFrames />
    </PortalProvider>
  )
}

function PortalFrames() {
  const { chatWidth, setChatWidth } = usePortal()
  const dragging = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return
      const next = Math.min(560, Math.max(280, e.clientX))
      setChatWidth(next)
    },
    [setChatWidth],
  )

  const onPointerUp = useCallback(() => {
    dragging.current = false
    setIsDragging(false)
  }, [])

  return (
    <div className="h-dvh w-screen overflow-hidden flex" style={{ backgroundColor: 'var(--background)' }}>
      <aside className="h-full shrink-0" style={{ width: chatWidth }}>
        <ChatPane />
      </aside>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize chat pane"
        className="w-1.5 h-full cursor-col-resize shrink-0 relative z-10"
        style={{
          backgroundColor: isDragging ? 'var(--primary)' : 'var(--border)',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />

      <main className="h-full flex-1 min-w-0">
        <ResultPane />
      </main>
    </div>
  )
}
