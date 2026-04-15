import type { Theme } from '../App'
import type { Lang } from '../i18n'
import type { ScaffoldInfo, UpdateStatus } from '../../../shared/types'
import { useT } from '../i18n'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface SettingsProps {
  currentPath: string | null
  onPathSet: (path: string) => void
  onCancel?: () => void
  theme: Theme
  onThemeChange: (theme: Theme) => void
  lang: Lang
  onLangChange: (lang: Lang) => void
  scaffoldInfo: ScaffoldInfo | null
  onScaffoldInstall: () => void
  updateStatus: UpdateStatus
  onUpdateCheck: () => void
  onUpdateDownload: () => void
  onUpdateReveal: () => void
}

const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'pl', label: 'Polski' }
]

export function Settings({
  currentPath, onPathSet, onCancel, theme, onThemeChange, lang, onLangChange,
  scaffoldInfo, onScaffoldInstall,
  updateStatus, onUpdateCheck, onUpdateDownload, onUpdateReveal
}: SettingsProps): JSX.Element {
  const t = useT()

  const THEMES: { value: Theme; label: string }[] = [
    { value: 'system', label: t('settings.themeSystem') },
    { value: 'light',  label: t('settings.themeLight') },
    { value: 'dark',   label: t('settings.themeDark') }
  ]

  const fmt = (template: string, vars: Record<string, string>): string =>
    template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

  const [notesOpen, setNotesOpen] = useState(false)

  const handleChooseFolder = async (): Promise<void> => {
    const path = await window.api.openFolderDialog()
    if (path) {
      await window.api.setSetting('knowledgePath', path)
      onPathSet(path)
    }
  }

  return (
    <div className="settings-screen">
      <span className="settings-version">v{__APP_VERSION__}</span>
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
          {t('settings.desc')}
        </p>

        <div className="settings-section">
          <label className="settings-label">{t('settings.folderLabel')}</label>
          <div className={`settings-path-box${!currentPath ? ' settings-path-box--empty' : ''}`}>
            {currentPath ?? t('settings.notConfigured')}
          </div>
          <button className="settings-btn" onClick={handleChooseFolder}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            {currentPath ? t('settings.changeFolder') : t('settings.chooseFolder')}
          </button>

          {currentPath && scaffoldInfo && scaffoldInfo.status !== 'current' && (
            <div className={`scaffold-notice scaffold-notice--${scaffoldInfo.status}`}>
              <div className="scaffold-notice-text">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>
                  {scaffoldInfo.status === 'missing'
                    ? t('settings.scaffoldMissing')
                    : t('settings.scaffoldOutdated')}
                  {scaffoldInfo.status === 'outdated' && (
                    <span className="scaffold-notice-version">
                      {' '}v{scaffoldInfo.dirVersion ?? '?'} → v{scaffoldInfo.appVersion}
                    </span>
                  )}
                </span>
              </div>
              <button className="scaffold-notice-btn" onClick={onScaffoldInstall}>
                {scaffoldInfo.status === 'missing'
                  ? t('settings.scaffoldCreate')
                  : t('settings.scaffoldUpdate')}
              </button>
            </div>
          )}
        </div>

        <div className="settings-section">
          <label className="settings-label">Updates</label>
          <UpdateNotice
            status={updateStatus}
            t={t}
            fmt={fmt}
            notesOpen={notesOpen}
            onToggleNotes={() => setNotesOpen((v) => !v)}
            onCheck={onUpdateCheck}
            onDownload={onUpdateDownload}
            onReveal={onUpdateReveal}
          />
        </div>

        <div className="settings-section">
          <label className="settings-label">{t('settings.themeLabel')}</label>
          <div className="theme-picker">
            {THEMES.map((th) => (
              <button
                key={th.value}
                className={`theme-btn${theme === th.value ? ' theme-btn--active' : ''}`}
                onClick={() => onThemeChange(th.value)}
              >
                <span className="theme-btn-icon">
                  {th.value === 'system' ? <IconSystem /> : th.value === 'light' ? <IconLight /> : <IconDark />}
                </span>
                {th.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <label className="settings-label">{t('settings.languageLabel')}</label>
          <div className="theme-picker">
            {LANGS.map((l) => (
              <button
                key={l.value}
                className={`theme-btn${lang === l.value ? ' theme-btn--active' : ''}`}
                onClick={() => onLangChange(l.value)}
              >
                <span className="theme-btn-icon"><IconLang /></span>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {onCancel && (
          <button className="settings-cancel" onClick={onCancel}>
            {t('settings.close')}
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

function IconDark(): JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function IconLang(): JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

interface UpdateNoticeProps {
  status: UpdateStatus
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: any) => string
  fmt: (template: string, vars: Record<string, string>) => string
  notesOpen: boolean
  onToggleNotes: () => void
  onCheck: () => void
  onDownload: () => void
  onReveal: () => void
}

function UpdateNotice({
  status, t, fmt, notesOpen, onToggleNotes,
  onCheck, onDownload, onReveal
}: UpdateNoticeProps): JSX.Element | null {
  if (status.state === 'idle') return null

  if (status.state === 'checking') {
    return (
      <div className="update-notice update-notice--info">
        <span className="update-notice-text">{t('update.checking')}</span>
      </div>
    )
  }

  if (status.state === 'up-to-date') {
    return (
      <div className="update-notice update-notice--ok">
        <span className="update-notice-text">
          {fmt(t('update.upToDate'), { version: __APP_VERSION__ })}
        </span>
        <button className="update-notice-btn" onClick={onCheck}>
          {t('update.retry')}
        </button>
      </div>
    )
  }

  if (status.state === 'available') {
    const { latest } = status
    return (
      <div className="update-notice update-notice--available">
        <div className="update-notice-text">
          {fmt(t('update.available'), { version: latest.version })}
        </div>
        {latest.notes && (
          <div className={`update-notice-notes${notesOpen ? ' update-notice-notes--open' : ''}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {latest.notes}
            </ReactMarkdown>
            <button
              className="update-notice-notes-toggle"
              onClick={onToggleNotes}
            >
              {notesOpen ? t('update.hideNotes') : t('update.showNotes')}
            </button>
          </div>
        )}
        <div className="update-notice-actions">
          <button className="update-notice-btn update-notice-btn--primary"
                  onClick={onDownload}>
            {t('update.download')}
          </button>
          <button
            className="update-notice-btn"
            onClick={() => { void window.api.openExternal(latest.htmlUrl) }}
          >
            {t('update.openOnGithub')}
          </button>
        </div>
      </div>
    )
  }

  if (status.state === 'downloading') {
    const pct = status.total
      ? Math.floor((status.received / status.total) * 100)
      : 0
    return (
      <div className="update-notice update-notice--available">
        <div className="update-notice-text">
          {fmt(t('update.downloading'), { version: status.latest.version })}
        </div>
        <div className="update-progress">
          <div
            className="update-progress-bar"
            style={{ width: `${pct}%` }}
          />
          <span className="update-progress-label">
            {(status.received / 1_000_000).toFixed(1)} /
            {' '}
            {(status.total / 1_000_000).toFixed(1)} MB
          </span>
        </div>
      </div>
    )
  }

  if (status.state === 'downloaded') {
    return (
      <div className="update-notice update-notice--ok">
        <div className="update-notice-text">{t('update.downloaded')}</div>
        <div className="update-notice-actions">
          <button className="update-notice-btn update-notice-btn--primary"
                  onClick={onReveal}>
            {t('update.reveal')}
          </button>
          <button className="update-notice-btn" onClick={onCheck}>
            {t('update.retry')}
          </button>
        </div>
      </div>
    )
  }

  // status.state === 'error'
  const template = status.phase === 'check'
    ? t('update.errorCheck')
    : t('update.errorDownload')
  return (
    <div className="update-notice update-notice--error">
      <span className="update-notice-text">
        {fmt(template, { message: status.message })}
      </span>
      <button className="update-notice-btn" onClick={onCheck}>
        {t('update.tryAgain')}
      </button>
    </div>
  )
}
