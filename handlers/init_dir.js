
require('universal-dotenv');
const path = require('path');
const AppDir = require('tomjs/handlers/dir');
let appdir = path.join(__dirname, process.env.FRAMEWORK_DEVELOPMENT ? '../../..' : '../../../src');
AppDir(appdir);
module.exports = appdir;