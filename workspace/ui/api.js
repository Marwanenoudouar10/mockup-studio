// The workspace server: project listing, layout.json / notes.json writes, live change events (SSE).
async function json(url, opts) {
  const r = await fetch(url, { cache: 'no-store', ...opts });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || `${r.status} ${url}`);
  return body;
}

const post = (url, data) => json(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export const api = {
  projects: () => json('/api/projects'),
  project: (slug) => json(`/api/project/${encodeURIComponent(slug)}`),
  layout: (slug, patch) => post('/api/layout', { slug, ...patch }).then((r) => r.layout),
  notes: (slug, op, note) => post('/api/notes', { slug, op, note }).then((r) => r.notes),
};

// onChange({ slug, kinds, files }); onStatus(true | false)
export function listen(onChange, onStatus) {
  const es = new EventSource('/api/events');
  es.onopen = () => onStatus(true);
  es.onerror = () => onStatus(false);
  es.onmessage = (ev) => {
    try {
      onChange(JSON.parse(ev.data));
    } catch {
      // a malformed event is ignored
    }
  };
  return es;
}
