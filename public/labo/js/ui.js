import { SOURCE_LABELS, VOICE_LABELS } from './store.js';

import { esc } from '../../shared/escape-html.js';
export { esc };

export const voiceKey = item => item.voiceStatus === 'estructurada'
  ? item.voices.join('+')
  : 'unstructured';

export const voiceLabel = key => key === 'unstructured'
  ? VOICE_LABELS.unstructured
  : key.split('+').map(x => VOICE_LABELS[x] || x).join(' + ');

export function tags(item) {
  const source = `<span class="tag source">${esc(SOURCE_LABELS[item.source] || item.source)}</span>`;
  const voices = item.voiceStatus === 'estructurada'
    ? item.voices.map(v => `<span class="tag ${esc(v)}">${esc(VOICE_LABELS[v] || v)}</span>`).join('')
    : '<span class="tag unstructured">Voz no estructurada</span>';
  return `${source}${voices}`;
}

export function toast(message) {
  const node = document.getElementById('toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('show'), 2600);
}

export const formatDate = iso => new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(iso));

export function downloadJson(data, name) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
