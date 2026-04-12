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

export interface TodoInNode {
  text: string
  status: 'pending' | 'in_progress' | 'done'
}

export interface TreeItem {
  name: string
  fsPath: string
  relativePath: string
  isDirectory: boolean
  children?: TreeItem[]
  frontmatter?: NodeFrontmatter
}

export interface TodoItem {
  id: string
  text: string
  status: 'pending' | 'in_progress' | 'done'
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
