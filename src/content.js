const fs = require('fs');
const path = require('path');
const paths = require('./paths');
const { safeJoin } = require('./net');

// typ w interfejsie -> folder w instancji
const KINDS = { mods: 'mods', resourcepacks: 'resourcepacks', shaders: 'shaderpacks' };

function folder(id, kind) {
  const sub = KINDS[kind];
  if (!sub) throw new Error('Nieznany typ: ' + kind);
  const dir = path.join(paths.instDir(id), sub);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function list(id) {
  const out = {};
  for (const kind of Object.keys(KINDS)) {
    const dir = folder(id, kind);
    out[kind] = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => !e.name.startsWith('.'))
      .map((e) => {
        const isDir = e.isDirectory();
        return {
          name: e.name,
          title: e.name.replace(/\.disabled$/, ''),
          enabled: !e.name.endsWith('.disabled'),
          size: isDir ? null : fs.statSync(path.join(dir, e.name)).size,
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title, 'pl', { sensitivity: 'base' }));
  }
  return out;
}

function target(id, kind, name) {
  if (path.basename(name) !== name) throw new Error('Niepoprawna nazwa pliku');
  return safeJoin(folder(id, kind), name);
}

// Wyłączenie = dopisanie .disabled (Minecraft takich plików nie ładuje)
function toggle(id, kind, name) {
  const from = target(id, kind, name);
  const to = name.endsWith('.disabled') ? from.slice(0, -'.disabled'.length) : from + '.disabled';
  fs.renameSync(from, to);
}

function remove(id, kind, name) {
  fs.rmSync(target(id, kind, name), { recursive: true, force: true });
}

function importFiles(id, kind, files) {
  const dir = folder(id, kind);
  let n = 0;
  for (const f of files) {
    fs.copyFileSync(f, path.join(dir, path.basename(f)));
    n++;
  }
  return n;
}

module.exports = { folder, list, toggle, remove, importFiles };
