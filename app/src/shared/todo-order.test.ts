import { describe, expect, it } from 'vitest'
import { renumberGroup, pickPriorityForDrop } from './todo-order'
import type { TodoItem, TodoPriority } from './types'

function mkTodo(id: string, priority: TodoPriority = 'medium', sortOrder?: number): TodoItem {
  return {
    id,
    text: id,
    status: 'pending',
    priority,
    nodePath: 'knowledge/x',
    nodeTitle: 'X',
    tags: [],
    sortOrder,
  }
}

describe('renumberGroup', () => {
  it('assigns 0, 100, 200, ... in order', () => {
    const items = [mkTodo('a'), mkTodo('b'), mkTodo('c')]
    const out = renumberGroup(items)
    expect(out).toEqual([
      { id: 'a', sortOrder: 0 },
      { id: 'b', sortOrder: 100 },
      { id: 'c', sortOrder: 200 },
    ])
  })

  it('handles a single-item group', () => {
    const out = renumberGroup([mkTodo('only')])
    expect(out).toEqual([{ id: 'only', sortOrder: 0 }])
  })

  it('handles an empty group', () => {
    expect(renumberGroup([])).toEqual([])
  })
})

describe('pickPriorityForDrop', () => {
  it('returns the priority of the item below the drop position', () => {
    const ordered = [mkTodo('A', 'high'), mkTodo('moved', 'low'), mkTodo('B', 'medium')]
    expect(pickPriorityForDrop(ordered, 1)).toBe('medium')
  })

  it('falls back to the priority of the item above when dropped at the very bottom', () => {
    const ordered = [mkTodo('A', 'high'), mkTodo('B', 'medium'), mkTodo('moved', 'low')]
    expect(pickPriorityForDrop(ordered, 2)).toBe('medium')
  })

  it('returns the moved item own priority if it is the only item', () => {
    const ordered = [mkTodo('moved', 'low')]
    expect(pickPriorityForDrop(ordered, 0)).toBe('low')
  })

  it('uses below-wins even when above and moved share a priority', () => {
    const ordered = [mkTodo('A', 'high'), mkTodo('moved', 'high'), mkTodo('B', 'low')]
    expect(pickPriorityForDrop(ordered, 1)).toBe('low')
  })
})
