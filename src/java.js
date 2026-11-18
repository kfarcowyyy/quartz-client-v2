const fs = require('fs');
const os = require('os');
const path = require('path');
const AdmZip = require('adm-zip');
const { download } = require('./net');
const paths = require('./paths');
const versions = require('./versions');
const store = require('./store');

function findJava(dir) {
  if (!fs.existsSync(dir)) return null;
  for (const d of fs.readdirSync(dir)) {
    const p = path.join(dir, d, 'bin', 'javaw.exe');
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Pobiera właściwą Javę (Adoptium) pod daną wersję Minecrafta, jeśli jej nie ma
async function ensureJava(mcVersion, onStatus) {
  const custom = store.get().javaPath;
  if (custom) return custom;
  if (process.platform !== 'win32') return 'java';

  const major = await versions.javaMajor(mcVersion);
  const dir = path.join(paths.runtime(), String(major));
  const existing = findJava(dir);
  if (existing) return existing;

  onStatus && onStatus(`Pobieram Javę ${major}...`);
  const zipPath = path.join(os.tmpdir(), `quartz-jre-${major}.zip`);
  await download(
    `https://api.adoptium.net/v3/binary/latest/${major}/ga/windows/x64/jre/hotspot/normal/eclipse`,
    zipPath
  );
  fs.mkdirSync(dir, { recursive: true });
  new AdmZip(zipPath).extractAllTo(dir, true);
  fs.rmSync(zipPath, { force: true });

  const found = findJava(dir);
  if (!found) throw new Error('Nie udało się zainstalować Javy');
  return found;
}

module.exports = { ensureJava };
