// Kept free of browser-only dependencies so the API can import it to store
// read_time_minutes when a post is saved.
export function estimateReadTime(markdown, wordsPerMinute = 200) {
  const plain = String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  const wordCount = plain.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / wordsPerMinute));
}
