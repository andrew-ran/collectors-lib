import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { useCollections } from '../api/collections'
import { useCreateItem } from '../api/items'
import { useOpenLibraryLookup } from '../api/openLibrary'
import {
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_SECONDARY,
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_LINK,
} from '../components/Admin/adminUi'

/** US-121 -- add a book either by ISBN (looked up via OpenLibrary, then
 * confirmed/edited) or fully manually (no lookup at all). Unlike US-110's
 * IGDB flow, there's no candidate list to pick from -- an ISBN lookup is a
 * single exact match or a 404 -- and no async "Scraping..." status
 * afterwards, since store() writes any metadata straight into item_metadata
 * in the same request (see ItemController::store()'s docblock). So the form
 * is just always-editable fields, optionally pre-filled by a lookup. */
export function AdminAddBookPage() {
  const { data: collections } = useCollections()
  const defaultCollectionId = collections?.find((c) => c.is_default)?.id ?? collections?.[0]?.id
  const [collectionIdOverride, setCollectionIdOverride] = useState<number | null>(null)
  const collectionId = collectionIdOverride ?? defaultCollectionId ?? null

  const [isbn, setIsbn] = useState('')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [publisher, setPublisher] = useState('')
  const [year, setYear] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)

  const lookup = useOpenLibraryLookup()
  const createItem = useCreateItem()
  const [addedTitles, setAddedTitles] = useState<string[]>([])

  function runLookup() {
    if (!isbn.trim()) return

    lookup.mutate(isbn.trim(), {
      onSuccess: (book) => {
        if (book.title) setTitle(book.title)
        if (book.author) setAuthor(book.author)
        if (book.publisher) setPublisher(book.publisher)
        if (book.year) setYear(String(book.year))
        setCoverUrl(book.cover_url)
      },
    })
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!collectionId || !title.trim()) return

    createItem.mutate(
      {
        collection_id: collectionId,
        type: 'book',
        custom_identifier: isbn.trim() || null,
        title: title.trim(),
        author: author.trim() || null,
        publisher: publisher.trim() || null,
        release_year: year.trim() ? Number(year.trim()) : null,
        cover_image_url: coverUrl,
      },
      {
        onSuccess: (item) => {
          setAddedTitles((titles) => [item.title, ...titles])
          setIsbn('')
          setTitle('')
          setAuthor('')
          setPublisher('')
          setYear('')
          setCoverUrl(null)
        },
      },
    )
  }

  const lookupNotFound =
    lookup.isError && isAxiosError(lookup.error) && lookup.error.response?.status === 404

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <p className="mb-4">
        <Link to="/admin" className={ADMIN_LINK}>
          &larr; Back
        </Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Add book</h1>

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

      <div className={`space-y-3 ${ADMIN_CARD}`}>
        <div>
          <label className={ADMIN_LABEL}>ISBN (optional)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="978..."
              className={ADMIN_INPUT}
            />
            <button
              type="button"
              onClick={runLookup}
              disabled={lookup.isPending || !isbn.trim()}
              className={ADMIN_BUTTON_SECONDARY}
            >
              {lookup.isPending ? 'Looking up...' : 'Lookup'}
            </button>
          </div>
          {lookupNotFound && (
            <p className="mt-1 text-sm text-neutral-500">
              No book found for this ISBN -- fill in the fields below manually.
            </p>
          )}
          {lookup.isError && !lookupNotFound && (
            <p className="mt-1 text-sm text-red-600">
              Lookup failed -- try again, or add manually.
            </p>
          )}
        </div>

        {coverUrl && <img src={coverUrl} alt="" width={90} className="rounded" />}

        <form onSubmit={handleSubmit} className="space-y-3">
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
            <label className={ADMIN_LABEL}>Author</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              maxLength={500}
              className={ADMIN_INPUT}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className={ADMIN_LABEL}>Publisher</label>
              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                maxLength={500}
                className={ADMIN_INPUT}
              />
            </div>
            <div className="w-28">
              <label className={ADMIN_LABEL}>Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min={0}
                max={9999}
                className={ADMIN_INPUT}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={createItem.isPending || !title.trim() || !collectionId}
            className={ADMIN_BUTTON_PRIMARY}
          >
            {createItem.isPending ? 'Adding...' : 'Add book'}
          </button>

          {createItem.isError && <p className="text-sm text-red-600">Failed to add book.</p>}
        </form>
      </div>

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
