function extractYouTubeVideoId(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id || null;
    }

    if (host.endsWith('youtube.com')) {
      const fromQuery = url.searchParams.get('v');
      if (fromQuery) return fromQuery;

      const segments = url.pathname.split('/').filter(Boolean);
      const shortsOrEmbedIndex = segments.findIndex((s) => s === 'shorts' || s === 'embed' || s === 'live');
      if (shortsOrEmbedIndex !== -1 && segments[shortsOrEmbedIndex + 1]) {
        return segments[shortsOrEmbedIndex + 1];
      }
    }
  } catch {
    // Not a parseable URL.
  }

  return null;
}

function extractInstagramShortcode(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '');
    if (host !== 'instagram.com') return null;

    const segments = url.pathname.split('/').filter(Boolean);
    const kindIndex = segments.findIndex((s) => s === 'p' || s === 'reel' || s === 'reels' || s === 'tv');
    if (kindIndex !== -1 && segments[kindIndex + 1]) {
      return { kind: segments[kindIndex] === 'reels' ? 'reel' : segments[kindIndex], code: segments[kindIndex + 1] };
    }
  } catch {
    // Not a parseable URL.
  }

  return null;
}

export function deriveEmbedUrl(platform, externalUrl) {
  if (platform === 'youtube') {
    const videoId = extractYouTubeVideoId(externalUrl);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }

  if (platform === 'instagram') {
    const match = extractInstagramShortcode(externalUrl);
    return match ? `https://www.instagram.com/${match.kind}/${match.code}/embed` : null;
  }

  return null;
}
