const fs = require('fs');
const path = require('path');
const modrinth = require('./modrinth');
const paths = require('./paths');

// Paczka "Quartz Boost": wydajność + lista modów w grze (Mod Menu)
const BOOST = [
  'sodium',
  'lithium',
  'ferrite-core',
  'entityculling',
  'immediatelyfast',
  'modernfix',
  'iris',
  'modmenu',
];

function installedMods(inst) {
  const dir = path.join(paths.instDir(inst.id), 'mods');
  return fs.existsSync(dir) ? fs.readdirSync(dir).map((n) => n.toLowerCase()) : [];
}

async function tryInstall(slug, inst, log) {
  try {
    await modrinth.installFile(slug, inst, 'mod');
  } catch (e) {
    log && log(`[extras] ${slug}: ${e.message}`);
  }
}

const isModded = (inst) => inst.loader === 'fabric' || inst.loader === 'quilt';

// Simple Voice Chat - sprawdzany przy KAŻDYM starcie, więc działa też w modpackach
async function ensureVoiceChat(inst, log) {
  if (!isModded(inst)) return;
  if (installedMods(inst).some((n) => n.includes('voicechat'))) return;
  await tryInstall('fabric-api', inst, log);
  await tryInstall('simple-voice-chat', inst, log);
}

// Przy tworzeniu nowej instancji
async function applyDefaults(inst, { optimize, voicechat }, log) {
  if (!isModded(inst)) return;
  await tryInstall('fabric-api', inst, log);
  if (voicechat) await tryInstall('simple-voice-chat', inst, log);
  if (optimize) for (const slug of BOOST) await tryInstall(slug, inst, log);
}

module.exports = { ensureVoiceChat, applyDefaults };
