import { createContext, useContext, useMemo } from 'react'

export type Lang = 'pl' | 'en'

const translations = {
  // ── NavRail ───────────────────────────────────────────
  'nav.expandMenu':      { pl: 'Rozwiń menu',      en: 'Expand menu' },
  'nav.collapseMenu':    { pl: 'Zwiń menu',         en: 'Collapse menu' },
  'nav.knowledgeBase':   { pl: 'Baza wiedzy',       en: 'Knowledge Base' },
  'nav.tasks':           { pl: 'Zadania',           en: 'Tasks' },
  'nav.settings':        { pl: 'Ustawienia',        en: 'Settings' },

  // ── Settings ──────────────────────────────────────────
  'settings.desc':           { pl: 'Przeglądarka osobistej bazy wiedzy zarządzanej przez Claude.', en: 'Personal knowledge base browser managed by Claude.' },
  'settings.folderLabel':    { pl: 'Folder bazy wiedzy',   en: 'Knowledge base folder' },
  'settings.notConfigured':  { pl: 'Nie skonfigurowano',   en: 'Not configured' },
  'settings.changeFolder':   { pl: 'Zmień folder',         en: 'Change folder' },
  'settings.chooseFolder':   { pl: 'Wybierz folder',       en: 'Choose folder' },

  'settings.themeLabel':     { pl: 'Motyw',                 en: 'Theme' },
  'settings.themeSystem':    { pl: 'System',                en: 'System' },
  'settings.themeLight':     { pl: 'Jasny',                 en: 'Light' },
  'settings.themeDark':      { pl: 'Ciemny',                en: 'Dark' },
  'settings.languageLabel':  { pl: 'Język',                 en: 'Language' },
  'settings.close':          { pl: 'Zamknij',               en: 'Close' },

  // ── App ───────────────────────────────────────────────
  'app.selectDocument':  { pl: 'Wybierz dokument z listy', en: 'Select a document from the list' },

  // ── TodoView ──────────────────────────────────────────
  'todo.noOpen':           { pl: 'Brak otwartych zadań',           en: 'No open tasks' },
  'todo.overview':         { pl: 'Przegląd zadań',                 en: 'Task overview' },
  'todo.activeCategories': { pl: 'aktywnych · kategorii',          en: 'active · categories' },
  'todo.inProgress':       { pl: 'W toku',                         en: 'In progress' },
  'todo.pending':          { pl: 'Oczekujące',                     en: 'Pending' },
  'todo.tasksInProgress':  { pl: 'Zadań aktualnie w realizacji.',  en: 'Tasks currently in progress.' },
  'todo.tasksWaiting':     { pl: 'Zadań czeka na start.',          en: 'Tasks waiting to start.' },
  'todo.showAll':          { pl: 'POKAŻ WSZYSTKIE',                en: 'SHOW ALL' },
  'todo.inProgressShort':  { pl: 'w toku',                         en: 'in progress' },
  'todo.pendingShort':     { pl: 'oczekujących',                   en: 'pending' },
  'todo.activeTasks':      { pl: 'aktywnych zadań',                en: 'active tasks' },

  // ── DepartmentList ────────────────────────────────────
  'dept.noDepartments':  { pl: 'Brak działów',   en: 'No departments' },
  'dept.documents':      { pl: 'dokumentów',      en: 'documents' },

  // ── NodeDetail ────────────────────────────────────────
  'node.updated':      { pl: 'Zaktualizowano',  en: 'Updated' },
  'node.tasks':        { pl: 'Zadania',          en: 'Tasks' },
  'node.connections':  { pl: 'Połączenia',       en: 'Connections' },

  // ── TodoBar ───────────────────────────────────────────
  'todobar.pending':         { pl: 'oczekujące',                   en: 'pending' },
  'todobar.inProgress':      { pl: 'w toku',                       en: 'in progress' },
  'todobar.filterToNode':    { pl: 'Filtruj do aktualnego noda',   en: 'Filter to current node' },
  'todobar.onlyThisNode':    { pl: 'Tylko ten nod',                en: 'Only this node' },
  'todobar.noTodoInNode':    { pl: 'Brak TODO w tym nodzie',       en: 'No TODOs in this node' },
  'todobar.noOpenTodo':      { pl: 'Brak otwartych TODO',          en: 'No open TODOs' },

  // ── NodeViewer ────────────────────────────────────────
  'viewer.selectNode':    { pl: 'Wybierz nod z drzewa projektów',  en: 'Select a node from the project tree' },
  'viewer.update':        { pl: 'Aktualizacja',                    en: 'Updated' },
  'viewer.connections':   { pl: 'Połączenia',                      en: 'Connections' },
  'viewer.todosInNode':   { pl: 'TODO w tym nodzie',               en: 'TODOs in this node' },

  // ── TerminalView ──────────────────────────────────────
  'terminal.sessionEnded':  { pl: '[Sesja zakończona]', en: '[Session ended]' },

  // ── ProjectTree ───────────────────────────────────────
  'tree.noNodes':        { pl: 'Brak nodów',          en: 'No nodes' },
  'tree.hasOpenTodo':    { pl: 'Ma otwarte TODO',     en: 'Has open TODOs' },

  // ── NodeGrid ──────────────────────────────────────────
  'grid.noNodes':        { pl: 'Brak nodów w tym folderze',  en: 'No nodes in this folder' },
  'grid.elements':       { pl: 'elementów',                  en: 'elements' },
  'grid.hasOpenTasks':   { pl: 'Ma otwarte zadania',         en: 'Has open tasks' },

  // ── Breadcrumb ────────────────────────────────────────
  'breadcrumb.home':     { pl: 'Strona główna', en: 'Home' },
} as const

type TranslationKey = keyof typeof translations

// ── Context ─────────────────────────────────────────────

const I18nContext = createContext<Lang>('en')

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }): JSX.Element {
  return <I18nContext.Provider value={lang}>{children}</I18nContext.Provider>
}

export function useT(): (key: TranslationKey) => string {
  const lang = useContext(I18nContext)
  return useMemo(() => {
    return (key: TranslationKey) => translations[key][lang]
  }, [lang])
}

export function useLang(): Lang {
  return useContext(I18nContext)
}
