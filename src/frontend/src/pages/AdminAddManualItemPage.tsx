import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCollections } from '../api/collections'
import { usePlatformOptions } from '../api/dictionaries'
import { useCreateItem } from '../api/items'
import {
  ADMIN_BUTTON_PRIMARY,
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_LINK,
} from '../components/Admin/adminUi'

type ManualItemType = 'console' | 'peripheral'

const TYPE_LABEL: Record<ManualItemType, string> = {
  console: 'Console',
  peripheral: 'Peripheral',
}

/** US-122 -- add a console or peripheral, fully manually: no external
 * metadata source at all, unlike US-110's IGDB search or US-121's OpenLibrary
 * lookup -- IGDB's peripheral/console data is too limited to be worth
 * scraping (see REQUIREMENTS.md). Just the bare fields every item type
 * needs regardless (collection, title, platform), same as the manual-add
 * fallback path US-110/121 already fall back to when there's no external
 * match. */
export function AdminAddManualItemPage() {
  const { data: collections } = useCollections()
  const defaultCollectionId = collections?.find((c) => c.is_default)?.id ?? collections?.[0]?.id
  const [collectionIdOverride, setCollectionIdOverride] = useState<number | null>(null)
  const collectionId = collectionIdOverride ?? defaultCollectionId ?? null

  const { data: platforms } = usePlatformOptions()

  const [type, setType] = useState<ManualItemType>('console')
  const [title, setTitle] = useState('')
  const [platformId, setPlatformId] = useState<number | null>(null)

  const createItem = useCreateItem()
  const [addedTitles, setAddedTitles] = useState<string[]>([])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!collectionId || !title.trim()) return

    createItem.mutate(
      {
        collection_id: collectionId,
        type,
        title: title.trim(),
        platform_id: platformId,
      },
      {
        onSuccess: (item) => {
          setAddedTitles((titles) => [item.title, ...titles])
          setTitle('')
          setPlatformId(null)
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <p className="mb-4">
        <Link to="/admin" className={ADMIN_LINK}>
          &larr; Back
        </Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Add console / peripheral</h1>

      <div className="mb-4">
        <label className={ADMIN_LABEL}>Adding to</label>
        <select
          value={collectionId ?? ''}
          onChange={(e) => setCollectionIdOverride(Number(e.target.value))}
          className={ADMIN_INPUT}
        >
          {collections?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-3 ${ADMIN_CARD}`}>
        <div>
          <label className={ADMIN_LABEL}>Type</label>
          <div className="flex gap-4 text-sm text-neutral-700">
            {(Object.keys(TYPE_LABEL) as ManualItemType[]).map((value) => (
              <label key={value} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="type"
                  checked={type === value}
                  onChange={() => setType(value)}
                />
                {TYPE_LABEL[value]}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className={ADMIN_LABEL}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={500}
            className={ADMIN_INPUT}
          />
        </div>

        <div>
          <label className={ADMIN_LABEL}>Platform (optional)</label>
          <select
            value={platformId ?? ''}
            onChange={(e) => setPlatformId(e.target.value ? Number(e.target.value) : null)}
            className={ADMIN_INPUT}
          >
            <option value="">None</option>
            {platforms?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={createItem.isPending || !title.trim() || !collectionId}
          className={ADMIN_BUTTON_PRIMARY}
        >
          {createItem.isPending ? 'Adding...' : `Add ${TYPE_LABEL[type].toLowerCase()}`}
        </button>

        {createItem.isError && <p className="text-sm text-red-600">Failed to add item.</p>}
      </form>

      {addedTitles.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-lg font-semibold text-neutral-900">Added this session</h2>
          <ul className="space-y-1 text-sm text-neutral-600">
            {addedTitles.map((addedTitle, i) => (
              <li key={i}>{addedTitle}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
