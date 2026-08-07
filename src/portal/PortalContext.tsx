import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type ResultView =
  | { type: 'empty' }
  | { type: 'app'; appId: string }
  | { type: 'artifact'; artifactId: string }
  | { type: 'markdown'; title: string; body: string }

type PortalContextValue = {
  sessionId: string | null
  setSessionId: (id: string | null) => void
  result: ResultView
  showApp: (appId: string) => void
  showMarkdown: (title: string, body: string) => void
  clearResult: () => void
  chatWidth: number
  setChatWidth: (w: number) => void
}

const PortalContext = createContext<PortalContextValue | null>(null)

export function PortalProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [result, setResult] = useState<ResultView>({ type: 'empty' })
  const [chatWidth, setChatWidth] = useState(380)

  const showApp = useCallback((appId: string) => {
    setResult({ type: 'app', appId })
  }, [])

  const showMarkdown = useCallback((title: string, body: string) => {
    setResult({ type: 'markdown', title, body })
  }, [])

  const clearResult = useCallback(() => setResult({ type: 'empty' }), [])

  const value = useMemo(
    () => ({
      sessionId,
      setSessionId,
      result,
      showApp,
      showMarkdown,
      clearResult,
      chatWidth,
      setChatWidth,
    }),
    [sessionId, result, showApp, showMarkdown, clearResult, chatWidth],
  )

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

export function usePortal() {
  const ctx = useContext(PortalContext)
  if (!ctx) throw new Error('usePortal must be used within PortalProvider')
  return ctx
}
