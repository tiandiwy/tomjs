const require2 = require('tomjs/handlers/require2');
let all_configs = [];
let def_config = undefined;

module.exports = function(dir) {
    if (dir === undefined) {
        if (def_config === undefined) {
            const path = require2('path');
            const appdir = require2('tomjs/handlers/dir')();
            let cfg_dir = undefined;
            if(appdir===undefined)
            {
                cfg_dir = path.join(__dirname, '../../../../configs')
            }
            else{
                cfg_dir = path.join(appdir, '../configs')
            }
            all_configs[dir] = require(cfg_dir);
            def_config = all_configs[dir];
        }
        return def_config;
    } else if (all_configs[dir]) {
        return all_configs[dir];
    } else {
        all_configs[dir] = require(dir);
        if (def_config === undefined) { def_config = all_configs[dir]; }
        return all_configs[dir];
    }
}