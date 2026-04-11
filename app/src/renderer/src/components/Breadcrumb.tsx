import { useT } from '../i18n'

interface BreadcrumbItem {
  label: string
  onClick?: () => void
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  onRoot: () => void
}

export function Breadcrumb({ items, onRoot }: BreadcrumbProps): JSX.Element {
  const t = useT()
  return (
    <nav className="breadcrumb">
      <button className="breadcrumb-home" onClick={onRoot} title={t('breadcrumb.home')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </button>
      {items.map((item, i) => (
        <span key={i} className="breadcrumb-segment">
          <span className="breadcrumb-sep">/</span>
          {item.onClick ? (
            <button className="breadcrumb-link" onClick={item.onClick}>
              {item.label}
            </button>
          ) : (
            <span className="breadcrumb-current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
