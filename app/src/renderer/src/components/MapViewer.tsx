import { useT } from '../i18n'

interface MapViewerProps {
  html: string | null
  title?: string
  relativePath?: string
  fsPath?: string
}

export function MapViewer({ html, title, relativePath, fsPath }: MapViewerProps): JSX.Element {
  const t = useT()

  if (html == null) {
    return (
      <div className="map-viewer map-viewer--empty">
        <span>{t('maps.selectToPreview')}</span>
      </div>
    )
  }

  return (
    <div className="map-viewer">
      <div className="map-viewer-header">
        <div className="map-viewer-header-text">
          {title && <div className="map-viewer-title">{title}</div>}
          {relativePath && <div className="map-viewer-path">{relativePath}</div>}
        </div>
        {fsPath && (
          <button
            className="map-viewer-open"
            onClick={() => window.api.openExternal('file://' + fsPath)}
            title={t('maps.openExternal')}
          >
            {t('maps.openExternal')}
          </button>
        )}
      </div>
      <iframe
        className="map-viewer-iframe"
        sandbox="allow-scripts"
        srcDoc={html}
        title={title || 'Map'}
      />
    </div>
  )
}
