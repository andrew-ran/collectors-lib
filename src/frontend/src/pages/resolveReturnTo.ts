/** Where "Save"/"Delete" should return to: wherever the admin came from --
 * the collection view (AdminEditLink) or AdminItemsPage (its own Edit
 * link), both of which pass their URL as router state -- or `/admin` if
 * this page was reached some other way (e.g. typed directly). Deleting the
 * item first strips its `?item=` param, if any -- navigating back to a URL
 * that still points at the now-deleted item would otherwise ask
 * CollectionItemViewPage to select something that no longer exists.
 *
 * Plain module, not exported from AdminEditItemPage.tsx itself -- same
 * react-refresh/only-export-components reasoning as hooks/currency.ts:
 * a component-exporting file can only export components, so this needs
 * its own file to be both used by the page and unit-tested directly. */
export function resolveReturnTo(from: string | undefined, afterDelete: boolean): string {
  if (!from) return '/admin'
  if (!afterDelete) return from

  const [path, search] = from.split('?')
  if (!search) return from

  const params = new URLSearchParams(search)
  params.delete('item')
  const query = params.toString()

  return query ? `${path}?${query}` : path
}
