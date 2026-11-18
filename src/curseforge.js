const path = require('path');
const { getJson, download } = require('./net');
const paths = require('./paths');

const API = 'https://api.curseforge.com/v1';
const CLASS = { mod: 6, resourcepack: 12, shader: 6552 };
const LOADER = { forge: 1, fabric: 4, quilt: 5, neoforge: 6 };
const FOLDER = { mod: 'mods', resourcepack: 'resourcepacks', shader: 'shaderpacks' };

function headers(key) {
  if (!key) throw new Error('Wklej klucz API CurseForge w Ustawieniach');
  return { 'x-api-key': key, Accept: 'application/json' };
}

async function search({ query, type, mcVersion, loader }, key) {
  if (!CLASS[type]) throw new Error('Modpacki szukaj na Modrinth (CurseForge: mody, resource packi, shadery)');
  const q = new URLSearchParams({
    gameId: '432',
    classId: String(CLASS[type]),
    pageSize: '24',
    sortField: '2',
    sortOrder: 'desc',
  });
  if (query) q.set('searchFilter', query);
  if (mcVersion) q.set('gameVersion', mcVersion);
  if (type === 'mod' && LOADER[loader]) q.set('modLoaderType', String(LOADER[loader]));

  const d = await getJson(`${API}/mods/search?${q}`, headers(key));
  return d.data.map((m) => ({
    provider: 'curseforge',
    id: m.id,
    slug: m.slug,
    title: m.name,
    description: m.summary,
    icon: m.logo && m.logo.thumbnailUrl,
    downloads: m.downloadCount,
    author: m.authors && m.authors[0] && m.authors[0].name,
    type,
  }));
}

async function installFile(modId, inst, type, key) {
  const q = new URLSearchParams({ pageSize: '15' });
  if (inst.mcVersion) q.set('gameVersion', inst.mcVersion);
  if (type === 'mod' && LOADER[inst.loader]) q.set('modLoaderType', String(LOADER[inst.loader]));

  const d = await getJson(`${API}/mods/${modId}/files?${q}`, headers(key));
  if (!d.data.length) throw new Error(`Brak wersji dla ${inst.mcVersion}`);
  const f = d.data.find((x) => x.downloadUrl);
  if (!f) throw new Error('Autor zablokował pobieranie poza stroną CurseForge');

  await download(f.downloadUrl, path.join(paths.instDir(inst.id), FOLDER[type], f.fileName));
  return f.fileName;
}

module.exports = { search, installFile };
