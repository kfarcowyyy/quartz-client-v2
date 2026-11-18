/* Quartz Client - interfejs */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICONS = {
  play: '<path d="M8 5v14l11-7z"/>',
  box: '<path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  down: '<path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  folder: '<path d="M3 6h6l2 2h10v11H3z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};
const icon = (n, s = 20) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;

async function api(channel, ...args) {
  const r = await quartz.invoke(channel, ...args);
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

const state = {
  page: 'play',
  instances: [],
  versions: [],
  account: null,
  settings: {},
  selected: null,
  log: [],
  status: '',
  progress: 0,
  playing: false,
  detail: { id: null, tab: 'all', items: null, q: '', rows: [] },
  browse: { provider: 'modrinth', type: 'mod', query: '', results: [], loading: false },
};

function toast(msg, err = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (err ? ' err' : '');
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

const PAGES = [
  ['play', 'Graj', 'play'],
  ['instances', 'Instancje', 'box'],
  ['browse', 'Przeglądaj', 'search'],
  ['account', 'Konto', 'user'],
  ['settings', 'Ustawienia', 'gear'],
];

function renderNav() {
  $('#nav').innerHTML = PAGES.map(
    ([id, label, ic]) =>
      `<button class="nav-btn ${state.page === id || (state.page === 'instance' && id === 'instances') ? 'active' : ''}" data-page="${id}">${icon(ic)}${label}</button>`
  ).join('');
  $('#nav').querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => go(b.dataset.page))
  );
  const a = state.account;
  $('#acct-chip').innerHTML = a
    ? `<b>${esc(a.name)}</b>${a.type === 'microsoft' ? 'Microsoft (premium)' : 'Offline'}`
    : '<b>Niezalogowano</b>Wejdź w zakładkę Konto';
}

function go(page) {
  state.page = page;
  renderNav();
  render();
}

function selectedInstance() {
  return state.instances.find((i) => i.id === state.selected) || null;
}

/* ---------- GRAJ ---------- */
function viewPlay() {
  const opts = state.instances
    .map((i) => `<option value="${esc(i.id)}" ${i.id === state.selected ? 'selected' : ''}>${esc(i.name)} - ${esc(i.mcVersion)} (${esc(i.loader)})</option>`)
    .join('');
  return `
  <div class="page">
    <section class="card hero">
      <h1>Gotowy do gry?</h1>
      <p class="sub">Wybierz instancję i uruchom. Wszystko pobierze się samo.</p>
      ${
        state.instances.length
          ? `<div class="row">
               <select id="sel-inst" class="grow">${opts}</select>
               <button class="btn primary big" id="btn-play" ${state.playing ? 'disabled' : ''}>${icon('play', 22)} Graj</button>
             </div>`
          : `<button class="btn primary" id="goto-new">${icon('plus')} Utwórz pierwszą instancję</button>`
      }
      <div class="progress"><div id="bar" style="width:${state.progress}%"></div></div>
      <div id="status">${esc(state.status)}</div>
    </section>
    <section class="card">
      <h3>Dziennik</h3>
      <pre id="log">${esc(state.log.slice(-200).join('\n'))}</pre>
    </section>
  </div>`;
}

function bindPlay() {
  const sel = $('#sel-inst');
  if (sel) sel.addEventListener('change', () => (state.selected = sel.value));
  const play = $('#btn-play');
  if (play)
    play.addEventListener('click', async () => {
      if (!state.selected) return;
      state.playing = true;
      state.progress = 0;
      play.disabled = true;
      try {
        await api('game:play', state.selected);
      } catch (e) {
        toast(e.message, true);
        state.status = '';
      }
      state.playing = false;
      if (state.page === 'play') render();
    });
  const g = $('#goto-new');
  if (g) g.addEventListener('click', () => { go('instances'); openNewInstance(); });
}

/* ---------- INSTANCJE ---------- */
function viewInstances() {
  const cards = state.instances
    .map(
      (i) => `
    <div class="inst ${i.id === state.selected ? 'sel' : ''}" data-id="${esc(i.id)}">
      <div class="name">${esc(i.name)}</div>
      <span class="tag">${esc(i.mcVersion)}</span><span class="tag pink">${esc(i.loader)}</span>
      <div class="actions">
        <button class="btn sm" data-open="${esc(i.id)}">${icon('folder', 16)} Folder</button>
        <button class="btn sm danger" data-del="${esc(i.id)}">${icon('trash', 16)} Usuń</button>
      </div>
    </div>`
    )
    .join('');
  return `
  <div class="page">
    <div class="row" style="margin-bottom:18px">
      <div class="grow"><h1>Instancje</h1><p class="sub" style="margin:0">Kliknij instancję, żeby zarządzać modami, resourcepackami i shaderami.</p></div>
      <button class="btn primary" id="new-inst">${icon('plus')} Nowa instancja</button>
    </div>
    ${state.instances.length ? `<div class="grid">${cards}</div>` : '<div class="empty">Brak instancji - utwórz pierwszą.</div>'}
  </div>`;
}

function bindInstances() {
  $('#new-inst').addEventListener('click', openNewInstance);
  document.querySelectorAll('.inst').forEach((c) =>
    c.addEventListener('click', () => openDetail(c.dataset.id))
  );
  document.querySelectorAll('[data-open]').forEach((b) =>
    b.addEventListener('click', (e) => { e.stopPropagation(); api('instances:open', b.dataset.open); })
  );
  document.querySelectorAll('[data-del]').forEach((b) =>
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Usunąć tę instancję razem z jej plikami?')) return;
      await api('instances:delete', b.dataset.del);
      await refreshInstances();
      render();
    })
  );
}

function openNewInstance() {
  const root = $('#modal-root');
  root.innerHTML = `
  <div class="overlay"><div class="modal">
    <h2>Nowa instancja</h2>
    <label class="field">Nazwa<input id="n-name" placeholder="Moja instancja" /></label>
    <label class="check"><input type="checkbox" id="n-snap" /> Pokaż snapshoty</label>
    <label class="field">Wersja Minecrafta<select id="n-ver"></select></label>
    <label class="field">Loader
      <select id="n-loader">
        <option value="fabric">Fabric (mody)</option>
        <option value="quilt">Quilt (mody)</option>
        <option value="vanilla">Vanilla (bez modów)</option>
      </select>
    </label>
    <label class="check"><input type="checkbox" id="n-voice" ${state.settings.voicechat ? 'checked' : ''}/> Simple Voice Chat</label>
    <label class="check"><input type="checkbox" id="n-opt" ${state.settings.optimize ? 'checked' : ''}/> Paczka optymalizacji (Sodium, Lithium, Iris, Mod Menu...)</label>
    <div class="row" style="justify-content:flex-end;margin-top:8px">
      <button class="btn" id="n-cancel">Anuluj</button>
      <button class="btn primary" id="n-ok">Utwórz</button>
    </div>
  </div></div>`;

  const fill = () => {
    const snap = $('#n-snap').checked;
    $('#n-ver').innerHTML = state.versions
      .filter((v) => v.type === 'release' || (snap && v.type === 'snapshot'))
      .map((v) => `<option>${esc(v.id)}</option>`)
      .join('');
  };
  fill();
  $('#n-snap').addEventListener('change', fill);
  $('#n-cancel').addEventListener('click', () => (root.innerHTML = ''));
  $('#n-ok').addEventListener('click', async () => {
    const btn = $('#n-ok');
    btn.disabled = true;
    btn.textContent = 'Tworzę...';
    try {
      const inst = await api('instances:create', {
        name: $('#n-name').value.trim() || 'Instancja',
        mcVersion: $('#n-ver').value,
        loader: $('#n-loader').value,
        voicechat: $('#n-voice').checked,
        optimize: $('#n-opt').checked,
      });
      state.selected = inst.id;
      root.innerHTML = '';
      await refreshInstances();
      toast('Instancja gotowa');
      render();
    } catch (e) {
      toast(e.message, true);
      btn.disabled = false;
      btn.textContent = 'Utwórz';
    }
  });
}

/* ---------- PRZEGLĄDAJ ---------- */
const TYPE_LABELS = { mod: 'Mody', modpack: 'Modpacki', resourcepack: 'Resource packi', shader: 'Shadery' };

function viewBrowse() {
  const b = state.browse;
  const inst = selectedInstance();
  const instOpts = state.instances
    .map((i) => `<option value="${esc(i.id)}" ${i.id === state.selected ? 'selected' : ''}>${esc(i.name)} (${esc(i.mcVersion)})</option>`)
    .join('');
  const results = b.results
    .map(
      (r, idx) => `
    <div class="result" style="animation-delay:${Math.min(idx, 12) * 25}ms">
      ${r.icon ? `<img src="${esc(r.icon)}" alt="" />` : '<div class="ph"></div>'}
      <div class="meta">
        <div class="t">${esc(r.title)}</div>
        <div class="d">${esc(r.description)}</div>
        <div class="s">${esc(r.author || '')} · ${Number(r.downloads || 0).toLocaleString('pl-PL')} pobrań</div>
      </div>
      <button class="btn primary sm" data-idx="${idx}">${icon('down', 16)} ${r.type === 'modpack' ? 'Nowa instancja' : 'Zainstaluj'}</button>
    </div>`
    )
    .join('');
  const hint =
    b.type === 'modpack'
      ? 'Modpack zainstaluje się jako nowa instancja.'
      : inst
        ? `Instalacja do: ${esc(inst.name)} (${esc(inst.mcVersion)}, ${esc(inst.loader)})`
        : 'Najpierw utwórz instancję.';
  return `
  <div class="page">
    <h1>Przeglądaj</h1>
    <p class="sub">Modrinth i CurseForge w jednym miejscu.</p>
    <div class="tabs">
      ${['modrinth', 'curseforge'].map((p) => `<button class="tab ${b.provider === p ? 'active' : ''}" data-provider="${p}">${p === 'modrinth' ? 'Modrinth' : 'CurseForge'}</button>`).join('')}
      <span style="width:14px"></span>
      ${Object.entries(TYPE_LABELS).map(([t, l]) => `<button class="tab ${b.type === t ? 'active' : ''}" data-type="${t}">${l}</button>`).join('')}
    </div>
    <div class="row" style="margin-bottom:6px">
      <input id="q" class="grow" placeholder="Szukaj..." value="${esc(b.query)}" />
      <select id="b-inst">${instOpts}</select>
      <button class="btn primary" id="q-go">${icon('search', 18)} Szukaj</button>
    </div>
    <p class="sub" style="font-size:13px;margin:8px 2px 16px">${hint}</p>
    <div id="results">${b.loading ? '<div class="empty">Szukam...</div>' : results || '<div class="empty">Wpisz frazę albo kliknij Szukaj, żeby zobaczyć popularne.</div>'}</div>
  </div>`;
}

async function runSearch() {
  const b = state.browse;
  const inst = selectedInstance();
  b.loading = true;
  render();
  try {
    b.results = await api('browse:search', {
      provider: b.provider,
      type: b.type,
      query: b.query,
      mcVersion: b.type === 'modpack' ? '' : inst && inst.mcVersion,
      loader: inst && inst.loader,
    });
  } catch (e) {
    b.results = [];
    toast(e.message, true);
  }
  b.loading = false;
  if (state.page === 'browse') render();
}

function bindBrowse() {
  const b = state.browse;
  document.querySelectorAll('[data-provider]').forEach((t) =>
    t.addEventListener('click', () => { b.provider = t.dataset.provider; b.results = []; render(); })
  );
  document.querySelectorAll('[data-type]').forEach((t) =>
    t.addEventListener('click', () => { b.type = t.dataset.type; b.results = []; render(); })
  );
  $('#b-inst').addEventListener('change', (e) => { state.selected = e.target.value; });
  const input = $('#q');
  input.addEventListener('input', () => (b.query = input.value));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(); });
  $('#q-go').addEventListener('click', runSearch);

  document.querySelectorAll('[data-idx]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const project = b.results[Number(btn.dataset.idx)];
      btn.disabled = true;
      try {
        const r = await api('browse:install', {
          provider: project.provider,
          type: project.type,
          project: { id: project.id },
          instanceId: state.selected,
        });
        toast(`Zainstalowano: ${project.title}`);
        if (project.type === 'modpack') { await refreshInstances(); state.selected = r.id; }
      } catch (e) {
        toast(e.message, true);
      }
      btn.disabled = false;
    })
  );
}

/* ---------- KONTO ---------- */
function viewAccount() {
  const a = state.account;
  return `
  <div class="page">
    <h1>Konto</h1>
    <p class="sub">${a ? `Zalogowano jako <b>${esc(a.name)}</b> (${a.type === 'microsoft' ? 'Microsoft' : 'offline'})` : 'Wybierz sposób logowania.'}</p>
    <section class="card">
      <h3>Konto Microsoft / Xbox (premium)</h3>
      <p class="sub" style="margin-bottom:14px">Logowanie kontem Xbox lub Microsoft - to to samo konto. Pełne wejście na serwery premium.</p>
      <button class="btn primary" id="ms-login">Zaloguj przez Xbox / Microsoft</button>
    </section>
    <section class="card">
      <h3>Tryb offline</h3>
      <p class="sub" style="margin-bottom:14px">Wpisz sam nick. Działa na serwerach z wyłączonym online-mode i w grze jednoosobowej.</p>
      <div class="row">
        <input id="off-name" placeholder="Nick" maxlength="16" value="${a && a.type === 'offline' ? esc(a.name) : ''}" />
        <button class="btn" id="off-login">Użyj nicku</button>
      </div>
    </section>
    ${a ? '<button class="btn danger" id="logout">Wyloguj</button>' : ''}
  </div>`;
}

function bindAccount() {
  $('#ms-login').addEventListener('click', async (e) => {
    e.target.disabled = true;
    try { state.account = await api('auth:microsoft'); toast('Zalogowano'); }
    catch (err) { toast(err.message, true); }
    renderNav(); render();
  });
  $('#off-login').addEventListener('click', async () => {
    try { state.account = await api('auth:offline', $('#off-name').value.trim()); toast('Zapisano nick'); }
    catch (err) { toast(err.message, true); }
    renderNav(); render();
  });
  const lo = $('#logout');
  if (lo) lo.addEventListener('click', async () => { state.account = await api('auth:logout'); renderNav(); render(); });
}

/* ---------- USTAWIENIA ---------- */
function viewSettings() {
  const s = state.settings;
  return `
  <div class="page">
    <h1>Ustawienia</h1>
    <p class="sub">Zapisują się automatycznie.</p>
    <section class="card">
      <label class="field">Pamięć RAM: <b id="ram-val">${s.ram} MB</b>
        <input type="range" id="ram" min="1024" max="16384" step="512" value="${s.ram}" />
      </label>
      <label class="check"><input type="checkbox" id="s-voice" ${s.voicechat ? 'checked' : ''}/> Automatycznie dodawaj Simple Voice Chat (każda instancja i modpack)</label>
      <label class="check"><input type="checkbox" id="s-opt" ${s.optimize ? 'checked' : ''}/> Paczka optymalizacji domyślnie przy nowych instancjach</label>
    </section>
    <section class="card">
      <label class="field">Klucz API CurseForge (darmowy z console.curseforge.com)
        <input id="s-cf" type="password" value="${esc(s.curseforgeKey)}" placeholder="$2a$10$..." />
      </label>
      <label class="field">Własna ścieżka Javy (puste = automatycznie)
        <input id="s-java" value="${esc(s.javaPath)}" placeholder="C:\\Program Files\\Java\\bin\\javaw.exe" />
      </label>
    </section>
  </div>`;
}

function bindSettings() {
  const save = async (patch) => { state.settings = await api('settings:set', patch); };
  const ram = $('#ram');
  ram.addEventListener('input', () => ($('#ram-val').textContent = ram.value + ' MB'));
  ram.addEventListener('change', () => save({ ram: Number(ram.value) }));
  $('#s-voice').addEventListener('change', (e) => save({ voicechat: e.target.checked }));
  $('#s-opt').addEventListener('change', (e) => save({ optimize: e.target.checked }));
  $('#s-cf').addEventListener('change', (e) => save({ curseforgeKey: e.target.value.trim() }));
  $('#s-java').addEventListener('change', (e) => save({ javaPath: e.target.value.trim() }));
}

/* ---------- SZCZEGÓŁY INSTANCJI ---------- */
const KIND_LABEL = { mods: 'Mods', resourcepacks: 'Resourcepacks', shaders: 'Shaders' };
const KIND_BROWSE = { mods: 'mod', resourcepacks: 'resourcepack', shaders: 'shader' };

const fmtSize = (b) =>
  b == null ? 'folder' : b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

async function openDetail(id) {
  state.selected = id;
  state.detail = { id, tab: 'all', items: null, q: '', rows: [] };
  state.page = 'instance';
  renderNav();
  render();
  await loadDetail();
}

async function loadDetail(partial) {
  try {
    state.detail.items = await api('content:list', state.detail.id);
  } catch (e) {
    toast(e.message, true);
    state.detail.items = { mods: [], resourcepacks: [], shaders: [] };
  }
  if (state.page !== 'instance') return;
  if (partial) {
    $('#files').innerHTML = fileRowsHtml(false);
    bindFiles();
  } else {
    render();
  }
}

function detailRows() {
  const d = state.detail;
  if (!d.items) return [];
  const kinds = d.tab === 'all' ? Object.keys(KIND_LABEL) : [d.tab];
  const q = d.q.trim().toLowerCase();
  return kinds
    .flatMap((k) => d.items[k].map((it) => ({ ...it, kind: k })))
    .filter((it) => !q || it.title.toLowerCase().includes(q));
}

function fileRowsHtml(animate) {
  const d = state.detail;
  if (!d.items) return '<div class="empty">Wczytuję...</div>';
  d.rows = detailRows();
  if (!d.rows.length) {
    return `<div class="empty">${d.q ? 'Nic nie znaleziono.' : 'Tu jeszcze nic nie ma. Dodaj plik albo znajdź coś online.'}</div>`;
  }
  return d.rows
    .map(
      (it, i) => `
    <div class="file ${it.enabled ? '' : 'off'} ${animate ? '' : 'no-anim'}" style="animation-delay:${animate ? Math.min(i, 14) * 22 : 0}ms">
      <div class="fi k-${it.kind}">${KIND_LABEL[it.kind][0]}</div>
      <div class="meta">
        <div class="t">${esc(it.title)}</div>
        <div class="s">${KIND_LABEL[it.kind]} · ${fmtSize(it.size)}${it.enabled ? '' : ' · wyłączony'}</div>
      </div>
      <label class="switch"><input type="checkbox" data-sw="${i}" ${it.enabled ? 'checked' : ''} /><span></span></label>
      <button class="btn sm danger" data-rm="${i}">${icon('trash', 16)}</button>
    </div>`
    )
    .join('');
}

function viewInstance() {
  const d = state.detail;
  const inst = state.instances.find((i) => i.id === d.id);
  if (!inst) return '<div class="page"><div class="empty">Nie znaleziono instancji.</div></div>';
  const n = (k) => (d.items ? d.items[k].length : 0);
  const tabs = [
    ['all', 'Wszystko', n('mods') + n('resourcepacks') + n('shaders')],
    ['mods', 'Mods', n('mods')],
    ['resourcepacks', 'Resourcepacks', n('resourcepacks')],
    ['shaders', 'Shaders', n('shaders')],
  ]
    .map(([id, label, c]) => `<button class="tab ${d.tab === id ? 'active' : ''}" data-tab="${id}">${label} <span class="count">${c}</span></button>`)
    .join('');
  return `
  <div class="page">
    <button class="btn sm" id="back">&larr; Instancje</button>
    <div class="row" style="margin:16px 0 18px">
      <div class="grow">
        <h1>${esc(inst.name)}</h1>
        <span class="tag">${esc(inst.mcVersion)}</span><span class="tag pink">${esc(inst.loader)}</span>
      </div>
      <button class="btn" id="d-folder">${icon('folder', 18)} Otwórz folder</button>
      <button class="btn primary" id="d-play">${icon('play', 18)} Graj</button>
    </div>
    <div class="tabs">${tabs}</div>
    <div class="row" style="margin-bottom:14px">
      <input id="fq" class="grow" placeholder="Szukaj w plikach..." value="${esc(d.q)}" />
      ${d.tab !== 'all' ? `<button class="btn" id="d-add">${icon('plus', 18)} Dodaj plik</button><button class="btn" id="d-find">${icon('search', 18)} Znajdź online</button>` : ''}
    </div>
    <div id="files">${fileRowsHtml(true)}</div>
  </div>`;
}

function bindFiles() {
  const d = state.detail;
  document.querySelectorAll('[data-sw]').forEach((cb) =>
    cb.addEventListener('change', async () => {
      const it = d.rows[Number(cb.dataset.sw)];
      try {
        await api('content:toggle', d.id, it.kind, it.name);
        await loadDetail(true);
      } catch (e) {
        toast(e.message, true);
      }
    })
  );
  document.querySelectorAll('[data-rm]').forEach((b) =>
    b.addEventListener('click', async () => {
      const it = d.rows[Number(b.dataset.rm)];
      if (!confirm(`Usunąć "${it.title}"?`)) return;
      try {
        await api('content:delete', d.id, it.kind, it.name);
        await loadDetail();
      } catch (e) {
        toast(e.message, true);
      }
    })
  );
}

function bindInstance() {
  const d = state.detail;
  const back = $('#back');
  if (!back) return;
  back.addEventListener('click', () => go('instances'));
  document.querySelectorAll('[data-tab]').forEach((t) =>
    t.addEventListener('click', () => {
      d.tab = t.dataset.tab;
      render();
    })
  );
  const q = $('#fq');
  q.addEventListener('input', () => {
    d.q = q.value;
    $('#files').innerHTML = fileRowsHtml(false);
    bindFiles();
  });
  $('#d-folder').addEventListener('click', () =>
    api('instances:open', d.id, d.tab === 'all' ? undefined : d.tab).catch((e) => toast(e.message, true))
  );
  $('#d-play').addEventListener('click', () => {
    state.selected = d.id;
    go('play');
  });
  const add = $('#d-add');
  if (add) {
    add.addEventListener('click', async () => {
      try {
        const n = await api('content:import', d.id, d.tab);
        if (n) toast(`Dodano plików: ${n}`);
        await loadDetail();
      } catch (e) {
        toast(e.message, true);
      }
    });
    $('#d-find').addEventListener('click', () => {
      state.browse.type = KIND_BROWSE[d.tab];
      state.browse.results = [];
      go('browse');
    });
  }
  bindFiles();
}

/* ---------- render ---------- */
const VIEWS = {
  play: [viewPlay, bindPlay],
  instances: [viewInstances, bindInstances],
  instance: [viewInstance, bindInstance],
  browse: [viewBrowse, bindBrowse],
  account: [viewAccount, bindAccount],
  settings: [viewSettings, bindSettings],
};

function render() {
  const [view, bind] = VIEWS[state.page];
  const main = $('#view');
  const keep = main.scrollTop;
  main.innerHTML = view();
  bind();
  main.scrollTop = keep;
}

async function refreshInstances() {
  state.instances = await api('instances:list');
  if (!state.instances.find((i) => i.id === state.selected)) {
    state.selected = state.instances[0] ? state.instances[0].id : null;
  }
}

function liveUpdate() {
  quartz.on('log', (t) => {
    state.log.push(String(t));
    const el = $('#log');
    if (el) { el.textContent = state.log.slice(-200).join('\n'); el.scrollTop = el.scrollHeight; }
  });
  quartz.on('status', (t) => {
    state.status = t;
    const el = $('#status');
    if (el) el.textContent = t;
  });
  quartz.on('progress', (p) => {
    state.progress = p.total ? Math.min(100, Math.round((p.task / p.total) * 100)) : 0;
    const el = $('#bar');
    if (el) el.style.width = state.progress + '%';
  });
  quartz.on('closed', (code) => {
    state.playing = false;
    state.progress = 0;
    toast(`Gra zamknięta (kod ${code})`);
    if (state.page === 'play') render();
  });
}

(async function init() {
  liveUpdate();
  try {
    [state.settings, state.account] = await Promise.all([api('settings:get'), api('auth:status')]);
    await refreshInstances();
    api('versions:list').then((v) => (state.versions = v)).catch((e) => toast('Lista wersji: ' + e.message, true));
  } catch (e) {
    toast(e.message, true);
  }
  renderNav();
  render();
})();
