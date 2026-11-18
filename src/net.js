const fs = require('fs');
const path = require('path');

const UA = 'QuartzClient/0.1 (launcher)';

async function getJson(url, headers = {}) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
  if (!r.ok) throw new Error(`HTTP ${r.status} dla ${url}`);
  return r.json();
}

async function download(url, dest, headers = {}) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const r = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
  if (!r.ok) throw new Error(`HTTP ${r.status} dla ${url}`);
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  return dest;
}

// Zwraca bezpieczną ścieżkę wewnątrz katalogu (blokuje ../ w paczkach)
function safeJoin(root, rel) {
  const full = path.resolve(root, rel);
  if (full !== path.resolve(root) && !full.startsWith(path.resolve(root) + path.sep)) {
    throw new Error(`Niebezpieczna ścieżka w paczce: ${rel}`);
  }
  return full;
}

module.exports = { getJson, download, safeJoin };
