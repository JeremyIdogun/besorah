import { useEffect } from 'react';

const DEFAULT_DESCRIPTION =
  'Discover Christian sermons curated by theme. Find preaching that speaks to where you are.';

function setMeta(name, content, property = false) {
  if (!content) return;
  const attr = property ? 'property' : 'name';
  const selector = `meta[${attr}="${name}"]`;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function useMeta({ title, description, image, url } = {}) {
  useEffect(() => {
    const pageTitle = title
      ? `${title} | Besorah`
      : 'Besorah — Good News, Organised by Theme';
    const desc = description || DEFAULT_DESCRIPTION;

    document.title = pageTitle;
    setMeta('description', desc);
    setMeta('og:title', pageTitle, true);
    setMeta('og:description', desc, true);
    setMeta('og:type', 'website', true);
    if (image) setMeta('og:image', image, true);
    if (url) setMeta('og:url', url, true);
    setMeta('twitter:card', image ? 'summary_large_image' : 'summary');
    setMeta('twitter:title', pageTitle);
    setMeta('twitter:description', desc);
    if (image) setMeta('twitter:image', image);
  }, [title, description, image, url]);
}
