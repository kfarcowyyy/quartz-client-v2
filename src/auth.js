const crypto = require('crypto');
const { Auth } = require('msmc');
const store = require('./store');

function offlineUuid(name) {
  const h = crypto.createHash('md5').update('OfflinePlayer:' + name).digest();
  h[6] = (h[6] & 0x0f) | 0x30;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

const pub = () => {
  const a = store.get().account;
  return a ? { type: a.type, name: a.name, uuid: a.uuid } : null;
};

async function microsoft() {
  const manager = new Auth('select_account');
  const xbox = await manager.launch('electron');
  const mc = await xbox.getMinecraft();
  store.set({
    account: { type: 'microsoft', name: mc.profile.name, uuid: mc.profile.id, saved: xbox.save() },
  });
  return pub();
}

function offline(name) {
  if (!/^[A-Za-z0-9_]{3,16}$/.test(name || '')) {
    throw new Error('Nick: 3-16 znaków, litery, cyfry i _');
  }
  store.set({ account: { type: 'offline', name, uuid: offlineUuid(name) } });
  return pub();
}

function logout() {
  store.set({ account: null });
  return null;
}

// Zwraca obiekt "authorization" dla minecraft-launcher-core
async function authorization() {
  const a = store.get().account;
  if (!a) throw new Error('Najpierw zaloguj się w zakładce Konto');

  if (a.type === 'offline') {
    return {
      access_token: '0',
      client_token: '0',
      uuid: a.uuid,
      name: a.name,
      user_properties: '{}',
      meta: { type: 'mojang', demo: false },
    };
  }

  const manager = new Auth('select_account');
  const xbox = await manager.refresh(a.saved);
  const mc = await xbox.getMinecraft();
  store.set({ account: { ...a, saved: xbox.save() } });
  return mc.mclc();
}

module.exports = { microsoft, offline, logout, authorization, status: pub };
