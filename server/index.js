const serverModule = require('./dist/index.js');
const app = serverModule.default || serverModule;

module.exports = app;
module.exports.default = app;
