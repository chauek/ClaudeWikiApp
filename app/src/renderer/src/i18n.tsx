import { createContext, useContext, useMemo } from 'react'

export type Lang = 'pl' | 'en'

const translations = {
  // ── NavRail ───────────────────────────────────────────
  'nav.expandMenu':      { pl: 'Rozwiń menu',      en: 'Expand menu' },
  'nav.collapseMenu':    { pl: 'Zwiń menu',         en: 'Collapse menu' },
  'nav.knowledgeBase':   { pl: 'Baza wiedzy',       en: 'Knowledge Base' },
  'nav.tasks':           { pl: 'Zadania',           en: 'Tasks' },
  'nav.graph':            { pl: 'Graf wiedzy',        en: 'Knowledge Graph' },
  'nav.maps':             { pl: 'Mapy',                en: 'Maps' },
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

  'settings.scaffoldMissing':  { pl: 'Brak plików szablonu bazy wiedzy.',                 en: 'Knowledge base scaffold files are missing.' },
  'settings.scaffoldOutdated': { pl: 'Pliki szablonu bazy wiedzy są nieaktualne.',        en: 'Knowledge base scaffold files are outdated.' },
  'settings.scaffoldCreate':   { pl: 'Utwórz pliki szablonu',   en: 'Create scaffold files' },
  'settings.scaffoldUpdate':   { pl: 'Aktualizuj pliki szablonu', en: 'Update scaffold files' },

  'update.checking':      { pl: 'Sprawdzam dostępność aktualizacji…',          en: 'Checking for updates…' },
  'update.upToDate':      { pl: 'Aplikacja jest aktualna (v{version}).',        en: "You're on the latest version (v{version})." },
  'update.available':     { pl: 'Dostępna aktualizacja: v{version}',            en: 'Update available: v{version}' },
  'update.download':      { pl: 'Pobierz DMG',                                  en: 'Download DMG' },
  'update.downloading':   { pl: 'Pobieram ClaudeWiki-{version}.dmg…',           en: 'Downloading ClaudeWiki-{version}.dmg…' },
  'update.downloaded':    { pl: 'Pobrano. Otwórz DMG i przeciągnij ClaudeWiki do folderu Aplikacje.', en: 'Downloaded. Open the DMG and drag ClaudeWiki to Applications.' },
  'update.reveal':        { pl: 'Pokaż w Finderze',                             en: 'Reveal in Finder' },
  'update.retry':         { pl: 'Sprawdź ponownie',                             en: 'Check again' },
  'update.tryAgain':      { pl: 'Spróbuj ponownie',                             en: 'Try again' },
  'update.errorCheck':    { pl: 'Nie udało się sprawdzić aktualizacji: {message}.', en: "Couldn't check for updates: {message}." },
  'update.errorDownload': { pl: '{message}.',                                   en: '{message}.' },
  'update.openOnGithub':  { pl: 'Otwórz na GitHubie',                           en: 'Open on GitHub' },
  'update.showNotes':     { pl: 'Pokaż pełne uwagi',                            en: 'Show full notes' },
  'update.hideNotes':     { pl: 'Ukryj uwagi',                                  en: 'Hide notes' },

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

  // ── Todo priority & size ──────────────────────────────
  'todo.priority.critical': { pl: 'Krytyczny',  en: 'Critical' },
  'todo.priority.high':     { pl: 'Wysoki',     en: 'High'     },
  'todo.priority.medium':   { pl: 'Średni',     en: 'Medium'   },
  'todo.priority.low':      { pl: 'Niski',      en: 'Low'      },
  'todo.priority.someday':  { pl: 'Kiedyś',     en: 'Someday'  },
  'todo.size':              { pl: 'Rozmiar',    en: 'Size'     },
  'todo.viewBySection':     { pl: 'Wg sekcji',  en: 'By section'  },
  'todo.viewByPriority':    { pl: 'Wg priorytetu', en: 'By priority' },
  'todo.viewArchived':      { pl: 'Zarchiwizowane', en: 'Archived'  },
  'todo.startProgress':     { pl: 'Rozpocznij',      en: 'Start progress' },
  'todo.archive':           { pl: 'Archiwizuj',      en: 'Archive'        },
  'todo.unarchive':         { pl: 'Przywróć',        en: 'Unarchive'      },
  'todo.acknowledge':       { pl: 'Potwierdź',       en: 'Acknowledge'    },
  'todo.noArchived':        { pl: 'Brak zarchiwizowanych zadań', en: 'No archived tasks' },
  'todo.status.archived':   { pl: 'Zarchiwizowane',  en: 'Archived'       },
  'todo.status.new':        { pl: 'Nowe',            en: 'New'            },
  'todo.newShort':          { pl: 'nowych',          en: 'new'            },
  'todo.goToNode':          { pl: 'Przejdź do noda',  en: 'Go to node'    },

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

  // ── GraphView ─────────────────────────────────────────
  'graph.empty':           { pl: 'Graf jest pusty — dodaj połączenia między nodami', en: 'Graph is empty — add connections between nodes' },
  'graph.overview':        { pl: 'Przegląd grafu',     en: 'Graph Overview' },
  'graph.totalNodes':      { pl: 'Węzły',              en: 'Total Nodes' },
  'graph.connections':     { pl: 'Połączenia',          en: 'Connections' },
  'graph.highConnections': { pl: 'Wysoka łączność',     en: 'High connections' },
  'graph.hasOpenTodos':    { pl: 'Ma otwarte zadania',  en: 'Has open tasks' },
  'graph.fitView':         { pl: 'Dopasuj widok',       en: 'Fit to view' },
  'graph.openNode':        { pl: 'Otwórz nod',          en: 'Open node' },
  'graph.rebuild':         { pl: 'Wygeneruj graf',       en: 'Rebuild graph' },
  'graph.rebuilding':      { pl: 'Generowanie...',       en: 'Rebuilding...' },

  // ── Maps ───────────────────────────────────────────────
  'maps.title':            { pl: 'Mapy',                  en: 'Maps' },
  'maps.empty':            { pl: 'Brak map HTML w bazie wiedzy', en: 'No HTML maps in knowledge base' },
  'maps.selectToPreview':  { pl: 'Wybierz mapę, aby ją wyświetlić', en: 'Select a map to preview' },
  'maps.openExternal':     { pl: 'Otwórz w przeglądarce', en: 'Open in browser' },
  'maps.count':            { pl: 'map',                   en: 'maps' },
  'maps.addTitle':         { pl: 'Wygeneruj nową mapę',   en: 'Generate a new map' },
  'maps.addHint':          { pl: 'Użyj zakładki Claude w bocznym pasku, aby uruchomić Claude Code w folderze bazy wiedzy, i wklej poniższy prompt. Claude utworzy plik `.html` obok powiązanych nodów, a aplikacja automatycznie go pokaże.', en: 'Open the Claude tab in the sidebar to launch Claude Code in the knowledge base folder, then paste the prompt below. Claude will create an `.html` file next to the related nodes and the app will pick it up automatically.' },
  'maps.promptLabel':      { pl: 'Sugerowany prompt',     en: 'Suggested prompt' },
  'maps.copy':             { pl: 'Kopiuj',                en: 'Copy' },
  'maps.copied':           { pl: 'Skopiowano',            en: 'Copied' },
  'maps.close':            { pl: 'Zamknij',               en: 'Close' },
  'maps.addButtonTitle':   { pl: 'Jak wygenerować mapę', en: 'How to generate a map' },
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
