export function parse(hash = location.hash) {
  const raw = hash.replace(/^#\/?/, '');
  const q = raw.indexOf('?');
  const path = q < 0 ? raw : raw.slice(0, q);
  const query = new URLSearchParams(q < 0 ? '' : raw.slice(q + 1));
  return { section: path.split('/').filter(Boolean)[0] || 'buscar', query };
}

export function href(section, params = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''));
  return `#/${section}${q.size ? `?${q}` : ''}`;
}
