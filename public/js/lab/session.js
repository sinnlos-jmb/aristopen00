export function readSession(key, fallback) {
  try { return JSON.parse(sessionStorage.getItem(`agora.lab.${key}`)) ?? fallback; }
  catch { return fallback; }
}

export function writeSession(key, value) {
  try { sessionStorage.setItem(`agora.lab.${key}`, JSON.stringify(value)); return true; }
  catch { return false; }
}

export function downloadJSON(value, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyJSON(value) {
  const text = JSON.stringify(value, null, 2);
  if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return; }
  const area = document.createElement('textarea');
  area.value = text;
  document.body.appendChild(area);
  area.select();
  const copied = document.execCommand('copy');
  area.remove();
  if (!copied) throw new Error('No se pudo copiar. Usá la exportación JSON.');
}
