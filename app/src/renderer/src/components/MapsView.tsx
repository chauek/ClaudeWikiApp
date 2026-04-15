import { useState, useEffect, useCallback } from 'react'
import type { HtmlMap } from '../../../shared/types'
import { MapViewer } from './MapViewer'
import { MapCreateHelp } from './MapCreateHelp'
import { useT } from '../i18n'

interface MapsViewProps {
  knowledgePath: string
}

export function MapsView({ knowledgePath }: MapsViewProps): JSX.Element {
  const t = useT()
  const [maps, setMaps] = useState<HtmlMap[]>([])
  const [selected, setSelected] = useState<HtmlMap | null>(null)
  const [html, setHtml] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  const loadList = useCallback(() => {
    window.api.listMaps(knowledgePath).then((list) => {
      setMaps(list)
      // Drop selection if it no longer exists
      if (selected && !list.find((m) => m.fsPath === selected.fsPath)) {
        setSelected(null)
        setHtml(null)
      }
    })
  }, [knowledgePath, selected])

  useEffect(() => {
    loadList()
  }, [loadList])

  // Re-scan when html files change
  useEffect(() => {
    return window.api.onWatcherChange((change) => {
      if (change.filePath.endsWith('.html')) {
        loadList()
        if (selected && change.filePath === selected.fsPath) {
          window.api.readHtml(change.filePath).then(setHtml)
        }
      }
    })
  }, [loadList, selected])

  const openMap = useCallback(async (m: HtmlMap) => {
    setSelected(m)
    const raw = await window.api.readHtml(m.fsPath)
    setHtml(raw)
  }, [])

  return (
    <div className="maps-view">
      <div className="maps-list">
        <div className="maps-list-header">
          <span className="maps-list-title">{t('maps.title')}</span>
          <div className="maps-list-header-right">
            <span className="maps-list-count">{maps.length} {t('maps.count')}</span>
            <button
              className="maps-add-btn"
              onClick={() => setShowHelp(true)}
              title={t('maps.addButtonTitle')}
              aria-label={t('maps.addButtonTitle')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>
        {maps.length === 0 ? (
          <div className="maps-list-empty">{t('maps.empty')}</div>
        ) : (
          <div className="maps-list-items">
            {maps.map((m) => (
              <button
                key={m.fsPath}
                className={`maps-list-item${selected?.fsPath === m.fsPath ? ' maps-list-item--active' : ''}`}
                onClick={() => openMap(m)}
              >
                <div className="maps-list-item-title">{m.title}</div>
                <div className="maps-list-item-path">{m.relativePath}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="maps-preview">
        <MapViewer
          html={html}
          title={selected?.title}
          relativePath={selected?.relativePath}
          fsPath={selected?.fsPath}
        />
      </div>
      {showHelp && <MapCreateHelp onClose={() => setShowHelp(false)} />}
    </div>
  )
}
