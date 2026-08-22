import { describe, expect, it } from 'vitest'
import { resolveReturnTo } from './resolveReturnTo'

describe('resolveReturnTo', () => {
  it('falls back to /admin when there is nowhere to return to', () => {
    expect(resolveReturnTo(undefined, false)).toBe('/admin')
    expect(resolveReturnTo(undefined, true)).toBe('/admin')
  })

  it('returns to the origin as-is after a normal save', () => {
    expect(resolveReturnTo('/collections/my-collection?item=5', false)).toBe(
      '/collections/my-collection?item=5',
    )
  })

  it('returns to the origin unchanged after delete when there was no query string', () => {
    expect(resolveReturnTo('/admin/items', true)).toBe('/admin/items')
  })

  it('strips the ?item= param after delete so the deleted item is not re-selected', () => {
    expect(resolveReturnTo('/collections/my-collection?item=5', true)).toBe(
      '/collections/my-collection',
    )
  })

  it('keeps other query params after delete, only dropping item', () => {
    expect(resolveReturnTo('/admin/items?collection_id=2&item=5', true)).toBe(
      '/admin/items?collection_id=2',
    )
  })
})
