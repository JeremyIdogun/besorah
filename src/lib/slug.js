// Shared by the admin forms (live preview) and the API (stored value), so the
// slug a user sees is always the slug that gets saved.
export function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
