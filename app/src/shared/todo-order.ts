import type { TodoItem, TodoPriority } from './types'

export function renumberGroup(items: TodoItem[]): Array<{ id: string; sortOrder: number }> {
  return items.map((item, i) => ({ id: item.id, sortOrder: i * 100 }))
}

export function pickPriorityForDrop(
  newOrder: TodoItem[],
  movedIndex: number
): TodoPriority {
  const below = newOrder[movedIndex + 1]
  if (below) return below.priority ?? 'medium'
  const above = newOrder[movedIndex - 1]
  if (above) return above.priority ?? 'medium'
  return newOrder[movedIndex]?.priority ?? 'medium'
}
