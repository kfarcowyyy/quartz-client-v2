const { getJson } = require('./net');

const MANIFEST = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
let cache = null;

async function manifest() {
  if (!cache) cache = await getJson(MANIFEST);
  return cache;
}

async function list() {
  const m = await manifest();
  return m.versions.map((v) => ({ id: v.id, type: v.type, date: v.releaseTime }));
}

async function javaMajor(id) {
  const m = await manifest();
  const v = m.versions.find((x) => x.id === id);
  if (!v) return 21;
  const j = await getJson(v.url);
  return (j.javaVersion && j.javaVersion.majorVersion) || 8;
}

module.exports = { list, javaMajor };
