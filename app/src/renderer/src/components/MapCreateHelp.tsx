import { useState, useEffect, useCallback } from 'react'
import { useT } from '../i18n'

interface MapCreateHelpProps {
  onClose: () => void
}

const SUGGESTED_PROMPT = `Generate a self-contained HTML "map" (visualisation) for my knowledge base.

Rules:
- Single .html file, placed next to the related .md nodes (same folder)
- Filename: kebab-case.html
- Inline all CSS and JS — no external CDNs or network requests
  (the app preview runs the HTML in a sandboxed iframe with allow-scripts only,
  so cross-origin fetches will fail)
- Include a meaningful <title> — it is used as the display label in the app
- Style: clean, readable, matches a modern light/dark aware palette
- Works standalone when opened in a browser

Topic to visualise: <DESCRIBE THE TOPIC HERE>

Source data: <PATHS to relevant .md nodes, or "auto-discover from the knowledge base">

Preferred format: <table | diagram | flow | timeline | matrix | mind-map | your choice>

Before writing the file, briefly outline the structure you will use, then create the file.`

export function MapCreateHelp({ onClose }: MapCreateHelpProps): JSX.Element {
  const t = useT()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(SUGGESTED_PROMPT)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Fallback — highlight the textarea-style block so user can copy manually
    }
  }, [])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-card--help"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div className="modal-title">{t('maps.addTitle')}</div>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label={t('maps.close')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-hint">{t('maps.addHint')}</p>

          <div className="modal-prompt-head">
            <span className="modal-prompt-label">{t('maps.promptLabel')}</span>
            <button
              className={`modal-copy${copied ? ' modal-copy--copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? t('maps.copied') : t('maps.copy')}
            </button>
          </div>

          <pre className="modal-prompt">{SUGGESTED_PROMPT}</pre>
        </div>
      </div>
    </div>
  )
}
