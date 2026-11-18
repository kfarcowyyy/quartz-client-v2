const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const defaults = {
  ram: 4096,
  curseforgeKey: '',
  account: null,
  optimize: true,
  voicechat: true,
  javaPath: '',
};

const file = () => path.join(app.getPath('userData'), 'settings.json');

function get() {
  try {
    return { ...defaults, ...JSON.parse(fs.readFileSync(file(), 'utf8')) };
  } catch {
    return { ...defaults };
  }
}

function set(patch) {
  const next = { ...get(), ...patch };
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(next, null, 2));
  return next;
}

module.exports = { get, set };
