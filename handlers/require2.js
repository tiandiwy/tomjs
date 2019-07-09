const path = require('path');
let appdir = require('tomjs/handlers/dir')();
if(appdir===undefined)
{
    appdir = require('./init_dir');
}
require_cfg = require(path.join(appdir, '../configs/require2'));
module.exports = function(path = "") {
    if (!require_cfg.canRelativePath) {
        if (path.startsWith('.')) {
            throw new error('The require2 module is configured to not support relative paths.');
        }
    }
    return require(require_cfg.files[path] || path);
}