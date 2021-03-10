const require2 = require('tomjs/handlers/require2');
const config = require2('tomjs/configs')().cache;
const Cacheman = require2('cacheman')
let default_cache = new Cacheman('default', config.default ? config.default : config);
let all_caches = {};

function cache(name, options) {
    if (name === undefined) {
        return default_cache;
    }
    if (all_caches[name]) {
        return all_caches[name];
    }
    else {
        if (options) {
            all_caches[name] = new Cacheman(name, options);
        }
        else {
            all_caches[name] = new Cacheman(name, config[name]);
        }
        return all_caches[name];
    }
}
module.exports = cache;
