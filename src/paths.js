const { app } = require('electron');
const path = require('path');

const base = () => app.getPath('userData');

module.exports = {
  base,
  shared: () => path.join(base(), 'shared'),
  instances: () => path.join(base(), 'instances'),
  runtime: () => path.join(base(), 'runtime'),
  instDir: (id) => path.join(base(), 'instances', id),
};
