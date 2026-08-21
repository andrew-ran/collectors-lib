import { useRef, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import {
  useCreateGifter,
  useDeleteGifter,
  useGifters,
  useUpdateGifter,
  type Gifter,
} from '../../api/gifters'
import { ADMIN_BUTTON_PRIMARY, ADMIN_CARD, ADMIN_INPUT, ADMIN_LABEL } from './adminUi'

const ROW_BUTTON =
  'rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50'

const AVATAR_THUMB = 'h-9 w-9 rounded-full object-cover'

/** US-160/161 -- gifter profile CRUD: a list with inline rename (+ optional
 * avatar replace) and delete, plus an "add gifter" form. Same layout/style
 * conventions as CollectionsAdmin.tsx. Avatars are optional everywhere --
 * a gifter with no photo just shows a plain initial-letter circle instead of
 * a broken image. */
export function GiftersAdmin() {
  const { data: gifters } = useGifters()
  const createGifter = useCreateGifter()

  const [name, setName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleCreate(event: FormEvent) {
    event.preventDefault()

    const avatar = fileInputRef.current?.files?.[0] ?? null

    createGifter.mutate(
      { name, avatar },
      {
        onSuccess: () => {
          setName('')
          if (fileInputRef.current) fileInputRef.current.value = ''
        },
      },
    )
  }

  return (
    <div className={`mt-8 space-y-4 ${ADMIN_CARD}`}>
      <h2 className="text-lg font-semibold text-neutral-900">Gifters</h2>

      {gifters && gifters.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-medium">Avatar</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {gifters.map((gifter) => (
                <GifterRow key={gifter.id} gifter={gifter} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex items-end gap-3">
        <div className="flex-1">
          <label className={ADMIN_LABEL}>New gifter name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={255}
            className={ADMIN_INPUT}
          />
        </div>
        <div>
          <label className={ADMIN_LABEL}>Avatar (optional)</label>
          <input ref={fileInputRef} type="file" accept="image/*" className="text-sm" />
        </div>
        <button
          type="submit"
          disabled={createGifter.isPending || !name.trim()}
          className={ADMIN_BUTTON_PRIMARY}
        >
          {createGifter.isPending ? 'Adding...' : 'Add'}
        </button>
      </form>
      {createGifter.isError && <p className="text-sm text-red-600">Failed to create gifter.</p>}
    </div>
  )
}

function GifterRow({ gifter }: { gifter: Gifter }) {
  const updateGifter = useUpdateGifter(gifter.id)
  const deleteGifter = useDeleteGifter()

  // Only meaningful while `editing` is true -- seeded from `gifter` at the
  // moment Rename is clicked, not via a useState initializer tied to render
  // (same pattern as CollectionsAdmin's CollectionRow).
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState(gifter.name)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  function startEditing() {
    setNameInput(gifter.name)
    setEditing(true)
  }

  function saveEdit() {
    const avatar = editFileInputRef.current?.files?.[0] ?? null

    updateGifter.mutate({ name: nameInput, avatar }, { onSuccess: () => setEditing(false) })
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${gifter.name}"? This can't be undone.`)) return

    deleteGifter.mutate(gifter.id, {
      onError: (error) => {
        const message = isAxiosError<{ message?: string }>(error)
          ? (error.response?.data?.message ?? error.message)
          : 'Failed to delete gifter.'

        window.alert(message)
      },
    })
  }

  return (
    <tr>
      <td className="px-3 py-2">
        {gifter.avatar_url ? (
          <img src={gifter.avatar_url} alt="" className={AVATAR_THUMB} />
        ) : (
          <span
            className={`${AVATAR_THUMB} flex items-center justify-center bg-neutral-200 text-xs font-medium text-neutral-500`}
          >
            {gifter.name.charAt(0).toUpperCase()}
          </span>
        )}
      </td>
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
            <input ref={editFileInputRef} type="file" accept="image/*" className="text-xs" />
            <button
              type="button"
              onClick={saveEdit}
              disabled={updateGifter.isPending || !nameInput.trim()}
              className={ROW_BUTTON}
            >
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className={ROW_BUTTON}>
              Cancel
            </button>
          </div>
        ) : (
          <span className="font-medium text-neutral-900">{gifter.name}</span>
        )}
      </td>
      <td className="space-x-2 px-3 py-2 text-right">
        {!editing && (
          <button type="button" onClick={startEditing} className={ROW_BUTTON}>
            Rename
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteGifter.isPending}
          className={ROW_BUTTON}
        >
          Delete
        </button>
      </td>
    </tr>
  )
}
