import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(markdown) {
  if (!markdown) return '';
  return marked.parse(markdown);
}

export function estimateReadTime(markdown, wordsPerMinute = 200) {
  const plain = String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  const wordCount = plain.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / wordsPerMinute));
}
