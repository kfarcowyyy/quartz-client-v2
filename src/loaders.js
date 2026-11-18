const fs = require('fs');
const path = require('path');
const { getJson } = require('./net');
const paths = require('./paths');

// Instaluje profil Fabric/Quilt do wspólnego katalogu wersji i zwraca jego id.
// Dla vanilla zwraca undefined.
async function prepare(inst) {
  if (inst.loader === 'vanilla') return undefined;
  const meta =
    inst.loader === 'fabric' ? 'https://meta.fabricmc.net/v2' : 'https://meta.quiltmc.org/v3';

  const all = await getJson(`${meta}/versions/loader/${inst.mcVersion}`);
  if (!all.length) throw new Error(`${inst.loader} nie wspiera wersji ${inst.mcVersion}`);

  const pick =
    all.find((x) => x.loader.stable === true) ||
    all.find((x) => !/beta|alpha|pre|rc/i.test(x.loader.version)) ||
    all[0];

  const profile = await getJson(
    `${meta}/versions/loader/${inst.mcVersion}/${pick.loader.version}/profile/json`
  );
  const dir = path.join(paths.shared(), 'versions', profile.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${profile.id}.json`), JSON.stringify(profile));
  return profile.id;
}

module.exports = { prepare };
