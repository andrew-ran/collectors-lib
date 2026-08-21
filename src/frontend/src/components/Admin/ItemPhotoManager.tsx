import { useRef, useState, type DragEvent } from 'react'
import {
  useDeleteItemPhoto,
  useReorderItemPhotos,
  useSetPrimaryItemPhoto,
  useUploadItemPhotos,
} from '../../api/itemPhotos'
import type { ItemPhotoRef } from '../../api/items'
import { ADMIN_LABEL } from './adminUi'

const TILE = 'relative aspect-square overflow-hidden rounded-lg border bg-neutral-100'
const TILE_PRIMARY = 'border-neutral-900 ring-2 ring-neutral-900'
const TILE_DEFAULT = 'border-neutral-200'
const PRIMARY_BADGE =
  'absolute top-1 right-1 rounded-full bg-neutral-900 px-1.5 py-0.5 text-[10px] font-medium text-white'

interface ItemPhotoManagerProps {
  itemId: number
  igdbCoverUrl: string | null
  photos: ItemPhotoRef[]
}

/**
 * US-117/118/119/120 -- grid-of-tiles photo manager (WP media library /
 * Shopify product-photos pattern per REQUIREMENTS.md US-118). The IGDB
 * cover is always the first tile: never deletable or draggable, and only
 * carries the "Primary" badge while no uploaded photo has is_primary set
 * (i.e. it's the fallback, not an override).
 *
 * Reordering uses the native HTML5 drag-and-drop API (draggable + onDrag*)
 * rather than a library -- there's no drag-and-drop dependency anywhere
 * else in the project yet, and a plain reorder-by-drop-target is enough for
 * "dozens of photos on one item". The whole tile is the drag surface
 * (simplification vs. REQUIREMENTS' "hover reveals a drag handle" -- a
 * dedicated handle icon can be split out later if the whole-tile drag ever
 * feels error-prone in practice).
 */
export function ItemPhotoManager({ itemId, igdbCoverUrl, photos }: ItemPhotoManagerProps) {
  const uploadPhotos = useUploadItemPhotos(itemId)
  const reorderPhotos = useReorderItemPhotos(itemId)
  const setPrimaryPhoto = useSetPrimaryItemPhoto(itemId)
  const deletePhoto = useDeleteItemPhoto(itemId)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [draggedId, setDraggedId] = useState<number | null>(null)

  const hasPrimaryPhoto = photos.some((p) => p.is_primary)

  function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    uploadPhotos.mutate(Array.from(files))
  }

  function handleDropzoneDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setIsDraggingOver(false)
    uploadFiles(event.dataTransfer.files)
  }

  function handleTileDrop(targetId: number) {
    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null)

      return
    }

    const ids = photos.map((p) => p.id)
    const fromIndex = ids.indexOf(draggedId)
    const toIndex = ids.indexOf(targetId)
    ids.splice(fromIndex, 1)
    ids.splice(toIndex, 0, draggedId)

    reorderPhotos.mutate(ids)
    setDraggedId(null)
  }

  function handleDelete(photoId: number) {
    if (!window.confirm("Delete this photo? This can't be undone.")) return

    deletePhoto.mutate(photoId)
  }

  return (
    <div className="space-y-3">
      <label className={ADMIN_LABEL}>Photos</label>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        <div className={`${TILE} ${!hasPrimaryPhoto ? TILE_PRIMARY : TILE_DEFAULT}`}>
          {igdbCoverUrl ? (
            <img src={igdbCoverUrl} alt="IGDB cover" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
              No cover
            </div>
          )}
          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            IGDB cover
          </span>
          {!hasPrimaryPhoto && <span className={PRIMARY_BADGE}>Primary</span>}
        </div>

        {photos.map((photo) => (
          <div
            key={photo.id}
            draggable
            onDragStart={() => setDraggedId(photo.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleTileDrop(photo.id)}
            className={`${TILE} group cursor-move ${photo.is_primary ? TILE_PRIMARY : TILE_DEFAULT}`}
          >
            <img src={photo.photo_url} alt="" className="h-full w-full object-cover" />

            {photo.is_primary && <span className={PRIMARY_BADGE}>Primary</span>}

            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100">
              {!photo.is_primary && (
                <button
                  type="button"
                  onClick={() => setPrimaryPhoto.mutate(photo.id)}
                  disabled={setPrimaryPhoto.isPending}
                  title="Set as primary"
                  className="rounded bg-white/90 px-1.5 py-0.5 text-xs hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  &#9733;
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(photo.id)}
                disabled={deletePhoto.isPending}
                title="Delete"
                className="rounded bg-white/90 px-1.5 py-0.5 text-xs hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                &times;
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDraggingOver(true)
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDropzoneDrop}
          disabled={uploadPhotos.isPending}
          className={`${TILE} flex items-center justify-center border-dashed text-sm text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 ${
            isDraggingOver ? 'border-neutral-500 bg-neutral-100' : TILE_DEFAULT
          }`}
        >
          {uploadPhotos.isPending ? 'Uploading...' : '+ Add photos'}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          uploadFiles(e.target.files)
          e.target.value = ''
        }}
        className="hidden"
      />

      {uploadPhotos.isError && <p className="text-sm text-red-600">Failed to upload photo(s).</p>}
    </div>
  )
}
