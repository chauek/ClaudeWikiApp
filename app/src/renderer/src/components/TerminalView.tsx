import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useLang } from '../i18n'

interface TerminalViewProps {
  knowledgePath: string
  active: boolean
}

export function TerminalView({ knowledgePath, active }: TerminalViewProps): JSX.Element {
  const lang = useLang()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const initializedRef = useRef(false)
  const removeDataRef = useRef<(() => void) | null>(null)
  const removeExitRef = useRef<(() => void) | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  // Effect 1: cleanup only on unmount
  useEffect(() => {
    return () => {
      removeDataRef.current?.()
      removeExitRef.current?.()
      resizeObserverRef.current?.disconnect()
      window.api.ptyDestroy()
      termRef.current?.dispose()
    }
  }, [])

  // Effect 2: initialize once on first activation — no cleanup
  useEffect(() => {
    if (!active || initializedRef.current) return
    initializedRef.current = true

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Monaco, Menlo, "Courier New", monospace',
      theme: {
        background: '#141414', foreground: '#e8e8e8', cursor: '#e8a87c',
        selectionBackground: '#d77655',
        black: '#1a1a1a',    brightBlack: '#555555',
        red: '#e06c75',      brightRed: '#e06c75',
        green: '#98c379',    brightGreen: '#98c379',
        yellow: '#e5c07b',   brightYellow: '#e5c07b',
        blue: '#61afef',     brightBlue: '#61afef',
        magenta: '#c678dd',  brightMagenta: '#c678dd',
        cyan: '#56b6c2',     brightCyan: '#56b6c2',
        white: '#e8e8e8',    brightWhite: '#ffffff',
      }
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    termRef.current = term
    fitAddonRef.current = fitAddon

    term.open(containerRef.current!)

    removeDataRef.current = window.api.onPtyData((data) => term.write(data))
    removeExitRef.current = window.api.onPtyExit(() => {
      const endMsg = lang === 'pl' ? '[Sesja zakończona]' : '[Session ended]'
      term.write(`\r\n\x1b[90m${endMsg}\x1b[0m\r\n`)
    })
    term.onData((data) => window.api.ptyInput(data))

    requestAnimationFrame(() => requestAnimationFrame(() => {
      fitAddon.fit()
      window.api.ptyCreate(knowledgePath).then(() => {
        window.api.ptyResize(term.cols, term.rows)
      })
    }))

    const ro = new ResizeObserver(() => {
      fitAddon.fit()
      window.api.ptyResize(term.cols, term.rows)
    })
    ro.observe(wrapperRef.current!)
    resizeObserverRef.current = ro
  }, [active, knowledgePath]) // no cleanup return — handled by Effect 1

  // Effect 3: refit when returning to terminal view
  useEffect(() => {
    if (!active || !initializedRef.current || !fitAddonRef.current) return
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fitAddonRef.current?.fit()
      if (termRef.current) {
        window.api.ptyResize(termRef.current.cols, termRef.current.rows)
      }
    }))
  }, [active])

  return (
    <div ref={wrapperRef} className="terminal-wrapper" style={{ display: active ? 'flex' : 'none' }}>
      <div ref={containerRef} className="terminal-container" />
    </div>
  )
}
