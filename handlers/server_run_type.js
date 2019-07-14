const path = require('path');
const require2 = require('tomjs/handlers/require2');
const fs = require('fs');
const { isString } = require2('tomjs/handlers/base_tools');
const app_dir = require('tomjs/handlers/dir')();
let system_cfg = require2('tomjs/configs')().system;

if (isString(system_cfg.server_run_type)) {
    system_cfg.server_run_type = system_cfg.server_run_type.trim().toLowerCase();
    switch (system_cfg.server_run_type) {
        case 'https':
            system_cfg.server_run_type_http = false;
            system_cfg.server_run_type_https = true;
            system_cfg.server_run_type_force_https = false;
            break;
        case 'http and https':
            system_cfg.server_run_type_http = true;
            system_cfg.server_run_type_https = true;
            system_cfg.server_run_type_force_https = false;
            break;
        case 'http force https':
            system_cfg.server_run_type_http = true;
            system_cfg.server_run_type_https = true;
            system_cfg.server_run_type_force_https = true;
            break;
        case 'http':
        default:
            system_cfg.server_run_type_http = true;
            system_cfg.server_run_type_https = false;
            system_cfg.server_run_type_force_https = false;
            break;
    }
}

if (system_cfg.server_run_type_https) {
    if (system_cfg.ssl_options.key_file) {
        system_cfg.ssl_options.key = fs.readFileSync(path.join(app_dir, '../keys/', system_cfg.ssl_options.key_file));
    }
    if (system_cfg.ssl_options.cert_file) {
        system_cfg.ssl_options.cert = fs.readFileSync(path.join(app_dir, '../keys/', system_cfg.ssl_options.cert_file));
    }
}
module.exports = system_cfg;