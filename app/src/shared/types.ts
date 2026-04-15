export interface NodeFrontmatter {
  id: string
  title: string
  path: string
  tags: string[]
  todos?: TodoInNode[]
  connections?: string[]
  created: string
  updated: string
}

export type TodoPriority = 'critical' | 'high' | 'medium' | 'low' | 'someday'
export type TodoSize = 'S' | 'M' | 'L' | 'XL'

export interface TodoInNode {
  text: string
  status: 'pending' | 'in_progress' | 'done' | 'archived'
  priority?: TodoPriority
  size?: TodoSize
}

export type TreeItemType = 'md' | 'html'

export interface TreeItem {
  name: string
  fsPath: string
  relativePath: string
  isDirectory: boolean
  type?: TreeItemType
  children?: TreeItem[]
  frontmatter?: NodeFrontmatter
  // For HTML items: title extracted from <title> or <h1>, falls back to filename.
  htmlTitle?: string
}

export interface HtmlMap {
  name: string
  title: string
  fsPath: string
  relativePath: string
}

export interface TodoItem {
  id: string
  text: string
  status: 'pending' | 'in_progress' | 'done' | 'archived'
  priority?: TodoPriority
  size?: TodoSize
  nodePath: string
  nodeTitle: string
  tags: string[]
}

export interface TodosFile {
  todos: TodoItem[]
}

export interface GraphNode {
  id: string
  title: string
  path: string
  tags: string[]
  hasOpenTodos: boolean
  openTodosCount: number
}

export interface GraphEdge {
  source: string
  target: string
  reason: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface NodeContent {
  frontmatter: NodeFrontmatter
  content: string
  raw: string
}

export type WatcherEvent = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'

export interface WatcherChange {
  event: WatcherEvent
  filePath: string
}

export type ScaffoldStatus = 'missing' | 'outdated' | 'current'

export interface ScaffoldInfo {
  status: ScaffoldStatus
  appVersion: number
  dirVersion: number | null
}
