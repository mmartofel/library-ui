import { describe, expect, it } from 'vitest'
import type { ResourceKey } from '@/manifest'
import { fixtureResource } from '@/test/fixtures'
import { relatedSubtitleFields } from './relatedFields'

describe('relatedSubtitleFields', () => {
  it('leaves out the relation column that points back to the record being shown', () => {
    // A person's tasks: every task's assignee is that person, so repeating it on each row adds nothing.
    expect(relatedSubtitleFields(fixtureResource('tasks'), 'persons' as ResourceKey)).toEqual([
      'done',
      'priority',
      'dueDate',
    ])
  })

  it('keeps relation columns that point to another resource', () => {
    expect(relatedSubtitleFields(fixtureResource('tasks'), 'orders' as ResourceKey)).toEqual([
      'done',
      'priority',
      'dueDate',
      'assignee',
    ])
  })
})
