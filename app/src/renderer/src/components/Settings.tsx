import { useState, useEffect } from 'react'
import type { Theme } from '../App'

interface TerminalOption {
  id: string
  name: string
  appPath: string
}

interface SettingsProps {
  currentPath: string | null
  onPathSet: (path: string) => void
  onCancel?: () => void
  theme: Theme
  onThemeChange: (theme: Theme) => void
  terminalId: string
  onTerminalChange: (id: string) => void
}

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light',  label: 'Jasny' },
  { value: 'dark',   label: 'Ciemny' }
]

export function Settings({ currentPath, onPathSet, onCancel, theme, onThemeChange, terminalId, onTerminalChange }: SettingsProps): JSX.Element {
  const [terminals, setTerminals] = useState<TerminalOption[]>([])

  useEffect(() => {
    window.api.detectTerminals().then(setTerminals)
  }, [])

  const handleChooseFolder = async (): Promise<void> => {
    const path = await window.api.openFolderDialog()
    if (path) {
      await window.api.setSetting('knowledgePath', path)
      onPathSet(path)
    }
  }

  const handleTerminalChange = async (id: string): Promise<void> => {
    onTerminalChange(id)
    await window.api.setSetting('terminalId', id)
  }

  return (
    <div className="settings-screen">
      <div className="settings-card">
        <div className="settings-brand">
          <div className="settings-brand-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <h1 className="settings-brand-name">ClaudeWiki</h1>
        </div>

        <p className="settings-desc">
          Przeglądarka osobistej bazy wiedzy zarządzanej przez Claude.
        </p>

        <div className="settings-section">
          <label className="settings-label">Folder bazy wiedzy</label>
          <div className={`settings-path-box${!currentPath ? ' settings-path-box--empty' : ''}`}>
            {currentPath ?? 'Nie skonfigurowano'}
          </div>
          <button className="settings-btn" onClick={handleChooseFolder}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            {currentPath ? 'Zmień folder' : 'Wybierz folder'}
          </button>
        </div>

        {terminals.length > 0 && (
          <div className="settings-section">
            <label className="settings-label">Terminal dla Claude</label>
            <div className="theme-picker">
              {terminals.map((t) => (
                <button
                  key={t.id}
                  className={`theme-btn${terminalId === t.id ? ' theme-btn--active' : ''}`}
                  onClick={() => handleTerminalChange(t.id)}
                >
                  <span className="theme-btn-icon"><IconTerminal /></span>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="settings-section">
          <label className="settings-label">Motyw</label>
          <div className="theme-picker">
            {THEMES.map((t) => (
              <button
                key={t.value}
                className={`theme-btn${theme === t.value ? ' theme-btn--active' : ''}`}
                onClick={() => onThemeChange(t.value)}
              >
                <span className="theme-btn-icon">
                  {t.value === 'system' ? <IconSystem /> : t.value === 'light' ? <IconLight /> : <IconDark />}
                </span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {onCancel && (
          <button className="settings-cancel" onClick={onCancel}>
            Zamknij
          </button>
        )}
      </div>
    </div>
  )
}

function IconSystem(): JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

function IconLight(): JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function IconTerminal(): JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  )
}

function IconDark(): JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}
