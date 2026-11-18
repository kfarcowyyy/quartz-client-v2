const fs = require('fs');
const path = require('path');
const paths = require('./paths');

function file(id) {
  return path.join(paths.instDir(id), 'instance.json');
}

function list() {
  const root = paths.instances();
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .map((id) => get(id))
    .filter(Boolean)
    .sort((a, b) => b.created - a.created);
}

function get(id) {
  try {
    return JSON.parse(fs.readFileSync(file(id), 'utf8'));
  } catch {
    return null;
  }
}

function create({ name, mcVersion, loader = 'vanilla' }) {
  if (!name || !mcVersion) throw new Error('Podaj nazwę i wersję');
  if (!['vanilla', 'fabric', 'quilt'].includes(loader)) {
    throw new Error('Ten loader dojdzie w etapie 2 (Forge/NeoForge)');
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'instancja';
  const id = `${slug}-${Date.now().toString(36)}`;
  const inst = { id, name, mcVersion, loader, created: Date.now() };
  fs.mkdirSync(paths.instDir(id), { recursive: true });
  fs.writeFileSync(file(id), JSON.stringify(inst, null, 2));
  return inst;
}

function remove(id) {
  const dir = paths.instDir(id);
  if (!path.resolve(dir).startsWith(path.resolve(paths.instances()) + path.sep)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

module.exports = { list, get, create, remove };
