import { useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import {
  useCollections,
  useCreateCollection,
  useDeleteCollection,
  useUpdateCollection,
  type Collection,
} from '../../api/collections'
import { ADMIN_BUTTON_PRIMARY, ADMIN_CARD, ADMIN_INPUT, ADMIN_LABEL } from './adminUi'

const ROW_BUTTON =
  'rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50'

/** US-130/131/132/133 -- simple list + inline rename/wishlist-toggle/delete,
 * plus a small "add collection" form. The server is the source of truth for
 * the default-collection guards (can't rename/delete "My Collection" or
 * "Wishlist") -- this just also hides the now-pointless Rename/Delete
 * buttons on those rows rather than showing a control that would always
 * fail. Minimal Tailwind pass, see components/Admin/adminUi.ts. */
export function CollectionsAdmin() {
  const { data: collections } = useCollections()
  const createCollection = useCreateCollection()

  const [name, setName] = useState('')
  const [isWishlist, setIsWishlist] = useState(false)

  function handleCreate(event: FormEvent) {
    event.preventDefault()

    createCollection.mutate(
      { name, description: null, is_wishlist: isWishlist },
      {
        onSuccess: () => {
          setName('')
          setIsWishlist(false)
        },
      },
    )
  }

  return (
    <div className={`mt-8 space-y-4 ${ADMIN_CARD}`}>
      <h2 className="text-lg font-semibold text-neutral-900">Collections</h2>

      {collections && collections.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Wishlist-type</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {collections.map((collection) => (
                <CollectionRow key={collection.id} collection={collection} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex items-end gap-3">
        <div className="flex-1">
          <label className={ADMIN_LABEL}>New collection name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={255}
            className={ADMIN_INPUT}
          />
        </div>
        <label className="flex items-center gap-1.5 pb-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={isWishlist}
            onChange={(e) => setIsWishlist(e.target.checked)}
          />
          Wishlist-type
        </label>
        <button
          type="submit"
          disabled={createCollection.isPending || !name.trim()}
          className={ADMIN_BUTTON_PRIMARY}
        >
          {createCollection.isPending ? 'Adding...' : 'Add'}
        </button>
      </form>
      {createCollection.isError && (
        <p className="text-sm text-red-600">Failed to create collection.</p>
      )}
    </div>
  )
}

function CollectionRow({ collection }: { collection: Collection }) {
  const updateCollection = useUpdateCollection(collection.id)
  const deleteCollection = useDeleteCollection()

  // Only meaningful while `editing` is true -- seeded from `collection` at
  // the moment Rename is clicked (see startEditing), not via a useState
  // initializer tied to render, so there's nothing to keep in sync with
  // fresh query data afterward.
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState(collection.name)

  function startEditing() {
    setNameInput(collection.name)
    setEditing(true)
  }

  function saveName() {
    updateCollection.mutate(
      {
        name: nameInput,
        description: collection.description,
        is_wishlist: collection.is_wishlist,
      },
      { onSuccess: () => setEditing(false) },
    )
  }

  function toggleWishlist() {
    updateCollection.mutate({
      name: collection.name,
      description: collection.description,
      is_wishlist: !collection.is_wishlist,
    })
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${collection.name}"? This can't be undone.`)) return

    // Surfaced directly rather than a persistent error element -- deleting
    // a non-empty collection is rejected server-side (see
    // CollectionController::destroy(): items.collection_id cascades on
    // delete, so this guards against silently wiping out every item in it)
    // and is expected to be rare/self-explanatory once the admin reads it.
    deleteCollection.mutate(collection.id, {
      onError: (error) => {
        const message = isAxiosError<{ message?: string }>(error)
          ? (error.response?.data?.message ?? error.message)
          : 'Failed to delete collection.'

        window.alert(message)
      },
    })
  }

  return (
    <tr>
      <td className="px-3 py-2">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={255}
              className={ADMIN_INPUT}
            />
            <button
              type="button"
              onClick={saveName}
              disabled={updateCollection.isPending || !nameInput.trim()}
              className={ROW_BUTTON}
            >
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className={ROW_BUTTON}>
              Cancel
            </button>
          </div>
        ) : (
          <span className="font-medium text-neutral-900">
            {collection.name}
            {collection.is_default && (
              <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-normal text-neutral-500">
                Default
              </span>
            )}
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        <input type="checkbox" checked={collection.is_wishlist} onChange={toggleWishlist} />
      </td>
      <td className="space-x-2 px-3 py-2 text-right">
        {!editing && !collection.is_default && (
          <button type="button" onClick={startEditing} className={ROW_BUTTON}>
            Rename
          </button>
        )}
        {!collection.is_default && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteCollection.isPending}
            className={ROW_BUTTON}
          >
            Delete
          </button>
        )}
      </td>
    </tr>
  )
}
