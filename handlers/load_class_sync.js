const require2 = require('tomjs/handlers/require2');
const humps = require2('humps');
const pluralize = require2('pluralize');
const path = require2('path');
const appdir = require2('tomjs/handlers/dir')();
const { isArray } = require2('tomjs/handlers/tools');
const BaseApiError = require2('tomjs/error/base_api_error');
let configs = require2('tomjs/configs')();

module.exports = (type, model_name, paths) => {
    let types = humps.decamelize(pluralize.plural(type));
    let cfg = configs[types] || configs[type];
    
    if (paths === undefined) {
        if (isArray(cfg.search.paths)) {
            paths = cfg.search.paths;
        } else if (typeof(cfg.search.paths) == "string") {
            paths = cfg.search.paths.split(',');
        }
    } else {
        if (typeof(paths) == "string") {
            paths = paths.split(',');
        }
    }
    let paths_len = paths.length;

    function load_file(filename) {
        let all_filename = undefined;
        let ob = undefined;
        for (let i = 0; i < paths_len; i++) {
            all_filename = path.join(appdir, paths[i], filename);
            try{
                ob = require(all_filename);
            }
            catch(e){}                            
        }
        return (ob === undefined)?false:ob;
    }

    function endAddFile(filename, endAdd_arr, endAdd_arr_len) {
        let re = false;
        for (let i = 0; i < endAdd_arr_len; i++) {
            if (endAdd_arr[i].length > 0 && filename.toLowerCase().endsWith(endAdd_arr[i].toLowerCase())) {
                re = load_file(filename.slice(0, 0 - endAdd_arr[i].length));
                if (re !== false) { break; }
            }
            re = load_file(filename + endAdd_arr[i]);
            if (re !== false) { break; }
        }
        return re;
    }

    let re = load_file(model_name);
    if (re === false) {
        if (!cfg[types] || !cfg[types][model_name]) {
            if (cfg.search.enabled) {
                let endAdd_arr = [''];
                if (typeof(cfg.search.end_add) == "string") {
                    endAdd_arr = cfg.search.end_add.split(',');
                } else if (isArray(cfg.search.end_add)) {
                    endAdd_arr = cfg.search.end_add;
                }
                let endAdd_arr_len = endAdd_arr.length;
                if (endAdd_arr_len <= 0) {
                    endAdd_arr = [''];
                    endAdd_arr_len = 1;
                }
                let pluralize_arr = [0]; //默认是不变
                switch (parseInt(cfg.search.pluralize, 10)) {
                    case -1:
                        { pluralize_arr = [0, 1, 2]; break; }
                    case 1:
                        { pluralize_arr = [1]; break; }
                    case 2:
                        { pluralize_arr = [2]; break; }
                };
                let pluralize_arr_len = pluralize_arr.length;
                let type_arr = [0]; //默认是不变
                if (cfg.search.type == -1) {
                    type_arr = [0, 1, 2, 3];
                } else {
                    type_arr = [parseInt(cfg.search.type, 10) % 3];
                }
                let type_len = type_arr.length;
                let filename = '';
                for (let i = 0; i < type_len; i++) {
                    switch (i) {
                        case 0:
                            { filename = model_name; break; }
                        case 1:
                            { filename = humps.decamelize(model_name); break; }
                        case 2:
                            { filename = humps.pascalize(model_name); break; }
                        case 3:
                            { filename = humps.camelize(model_name); break; }
                    }
                    for (let j = 0; j < pluralize_arr_len; j++) {
                        let re = endAddFile(
                            j == 2 ? pluralize.plural(filename) : (j == 1 ? pluralize.singular(filename) : filename),
                            endAdd_arr,
                            endAdd_arr_len
                        );
                        if (re !== false) { return re; }
                    }
                }
            }
            throw new BaseApiError(BaseApiError.DEEP_POPULATE_MODEL_FILE_NOT_FOUND_ERROR, type + ':' + model_name);
        } else {
            return require(path.join(appdir, cfg[types][model_name]));
        }
    }
    return re;
}