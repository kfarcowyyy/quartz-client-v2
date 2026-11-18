const path = require('path');
const { getJson, download } = require('./net');
const paths = require('./paths');

const API = 'https://api.modrinth.com/v2';
const FOLDER = { mod: 'mods', resourcepack: 'resourcepacks', shader: 'shaderpacks' };

async function search({ query, type, mcVersion, loader }) {
  const facets = [[`project_type:${type}`]];
  if (mcVersion) facets.push([`versions:${mcVersion}`]);
  if (loader && loader !== 'vanilla' && (type === 'mod' || type === 'modpack')) {
    facets.push([`categories:${loader}`]);
  }
  const url =
    `${API}/search?query=${encodeURIComponent(query || '')}&limit=24` +
    `&facets=${encodeURIComponent(JSON.stringify(facets))}`;
  const d = await getJson(url);
  return d.hits.map((h) => ({
    provider: 'modrinth',
    id: h.project_id,
    slug: h.slug,
    title: h.title,
    description: h.description,
    icon: h.icon_url,
    downloads: h.downloads,
    author: h.author,
    type,
  }));
}

async function versionsFor(project, { mcVersion, loader, type }) {
  const q = new URLSearchParams();
  if (mcVersion) q.set('game_versions', JSON.stringify([mcVersion]));
  if (type === 'mod' && loader && loader !== 'vanilla') {
    // Quilt potrafi ładować mody Fabric
    q.set('loaders', JSON.stringify(loader === 'quilt' ? ['quilt', 'fabric'] : [loader]));
  }
  return getJson(`${API}/project/${project}/version?${q}`);
}

// Instaluje projekt (z wymaganymi zależnościami dla modów) do instancji
async function installFile(project, inst, type, seen = new Set()) {
  if (seen.has(project)) return null;
  seen.add(project);

  const versions = await versionsFor(project, {
    mcVersion: inst.mcVersion,
    loader: inst.loader,
    type,
  });
  const v = versions[0];
  if (!v) throw new Error(`Brak wersji dla ${inst.mcVersion} (${inst.loader})`);

  const f = v.files.find((x) => x.primary) || v.files[0];
  await download(f.url, path.join(paths.instDir(inst.id), FOLDER[type], f.filename));

  if (type === 'mod') {
    for (const dep of v.dependencies || []) {
      if (dep.dependency_type === 'required' && dep.project_id) {
        try {
          await installFile(dep.project_id, inst, 'mod', seen);
        } catch {
          /* zależność bez wersji - pomijamy */
        }
      }
    }
  }
  return f.filename;
}

async function latestModpackFile(project) {
  const versions = await getJson(`${API}/project/${project}/version`);
  const v = versions[0];
  if (!v) throw new Error('Modpack nie ma żadnej wersji');
  const f = v.files.find((x) => x.primary) || v.files[0];
  return f;
}

module.exports = { search, installFile, latestModpackFile };
