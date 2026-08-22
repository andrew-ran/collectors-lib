import type { ItemDetail } from '../api/items'

export interface GalleryImage {
  url: string
  isPrimary: boolean
}

/** US-012 -- the cover image area's gallery: the IGDB cover (if any) plus
 * every admin-uploaded photo (US-117-120), in the same order
 * `ItemPhotoManager.tsx` shows them in the admin (IGDB cover tile first,
 * then photos by sort_order). `isPrimary` marks whichever image should be
 * shown first -- an uploaded photo if one has been set primary, the IGDB
 * cover otherwise -- matching `item.cover_url`'s own fallback logic
 * server-side (`Item::coverUrl()`).
 *
 * Kept in its own plain module (not PhotoGallery.tsx, which only exports
 * components) -- `react-refresh/only-export-components` doesn't allow a
 * component file to also export a plain function, same reasoning as
 * hooks/currency.ts vs hooks/CurrencyProvider.tsx. */
export function buildGalleryImages(
  item: Pick<ItemDetail, 'igdb_cover_url' | 'photos'>,
): GalleryImage[] {
  const images: GalleryImage[] = []
  const hasPrimaryPhoto = item.photos.some((p) => p.is_primary)

  if (item.igdb_cover_url) {
    images.push({ url: item.igdb_cover_url, isPrimary: !hasPrimaryPhoto })
  }

  for (const photo of [...item.photos].sort((a, b) => a.sort_order - b.sort_order)) {
    images.push({ url: photo.photo_url, isPrimary: photo.is_primary })
  }

  return images
}

export function primaryIndex(images: GalleryImage[]): number {
  const i = images.findIndex((img) => img.isPrimary)

  return i >= 0 ? i : 0
}
