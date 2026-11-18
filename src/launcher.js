const { Client } = require('minecraft-launcher-core');
const paths = require('./paths');

// Flagi G1GC pod klienta (wariant Aikara) - mniej przycięć
const JVM_FLAGS = [
  '-XX:+UseG1GC',
  '-XX:+ParallelRefProcEnabled',
  '-XX:MaxGCPauseMillis=200',
  '-XX:+UnlockExperimentalVMOptions',
  '-XX:+DisableExplicitGC',
  '-XX:G1NewSizePercent=30',
  '-XX:G1MaxNewSizePercent=40',
  '-XX:G1HeapRegionSize=8M',
  '-XX:G1ReservePercent=20',
  '-XX:G1HeapWastePercent=5',
  '-XX:G1MixedGCCountTarget=4',
  '-XX:InitiatingHeapOccupancyPercent=15',
  '-XX:G1MixedGCLiveThresholdPercent=90',
  '-XX:G1RSetUpdatingPauseTimePercent=5',
  '-XX:SurvivorRatio=32',
  '-XX:+PerfDisableSharedMem',
  '-XX:MaxTenuringThreshold=1',
];

function launch({ inst, authorization, javaPath, customId, ram, onLog, onProgress, onClose }) {
  return new Promise((resolve, reject) => {
    const client = new Client();
    client.on('debug', (m) => onLog(String(m)));
    client.on('data', (m) => onLog(String(m).trimEnd()));
    client.on('progress', (p) => onProgress({ task: p.task, total: p.total, type: p.type }));
    client.on('close', (code) => onClose(code));

    client
      .launch({
        authorization,
        root: paths.shared(),
        javaPath,
        version: { number: inst.mcVersion, type: 'release', custom: customId },
        memory: { max: `${ram}M`, min: '1024M' },
        overrides: { gameDirectory: paths.instDir(inst.id) },
        customArgs: JVM_FLAGS,
      })
      .then((proc) => (proc ? resolve() : reject(new Error('Gra się nie uruchomiła - sprawdź dziennik'))))
      .catch(reject);
  });
}

module.exports = { launch };
