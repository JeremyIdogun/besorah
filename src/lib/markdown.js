import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: false });

// Post bodies are rendered with dangerouslySetInnerHTML, so the HTML marked
// produces (which passes raw HTML through) must be sanitized first.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  // Any target (not just _blank) can open a window that gets window.opener.
  if (node.tagName === 'A' && node.hasAttribute('target')) {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function renderMarkdown(markdown) {
  if (!markdown) return '';
  return DOMPurify.sanitize(marked.parse(markdown), {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select'],
  });
}

export { estimateReadTime } from './readTime';
