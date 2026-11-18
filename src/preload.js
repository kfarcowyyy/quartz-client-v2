const { contextBridge, ipcRenderer } = require('electron');

const INVOKE = new Set([
  'versions:list',
  'instances:list',
  'instances:create',
  'instances:delete',
  'instances:open',
  'content:list',
  'content:toggle',
  'content:delete',
  'content:import',
  'auth:status',
  'auth:microsoft',
  'auth:offline',
  'auth:logout',
  'settings:get',
  'settings:set',
  'browse:search',
  'browse:install',
  'game:play',
]);
const EVENTS = new Set(['log', 'status', 'progress', 'closed']);

contextBridge.exposeInMainWorld('quartz', {
  invoke: (channel, ...args) => {
    if (!INVOKE.has(channel)) throw new Error('Niedozwolony kanał: ' + channel);
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel, cb) => {
    if (!EVENTS.has(channel)) throw new Error('Niedozwolony kanał: ' + channel);
    const fn = (_e, data) => cb(data);
    ipcRenderer.on(channel, fn);
    return () => ipcRenderer.removeListener(channel, fn);
  },
});
