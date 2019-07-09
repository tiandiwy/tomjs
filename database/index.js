const require2 = require('tomjs/handlers/require2');
const configs = require2('tomjs/configs')();
const DatabaseConfigError = require2('tomjs/error/database_config_error');

let database_def = undefined;
let type_def = configs.database.default;
let database_arr = {};
class DataBase {

    constructor() {}

    async build(type = undefined, config = undefined) {
        let in_config = config;
        let db_type = type ? type : configs.database.default;
        if (typeof(config) == 'string') {
            if (typeof(configs.database[config]) == 'object') {
                config = configs.database[config];
                db_type = config.type || undefined;
            }
        } else {
            if (typeof(configs.database[db_type]) == 'object') {
                config = configs.database[db_type];
                db_type = config.type || undefined;
            }
        }

        let idx = '' + type + ',' + (typeof(config) == 'object' ? JSON.stringify(config):config);
        if (database_arr[idx]) { return database_arr[idx]; }

        let require_file = db_type;
        switch (db_type) {
            case "mysql":
            case "sqlite":
            case "postgres":
            case "mssql":
                require_file = 'sequelize';
                break;
            default:
                break;
        }

        if (db_type === undefined) {
            throw new DatabaseConfigError("db type:" + db_type + " error");
        }

        let db = await require('./' + require_file)(config, db_type);
        if (type === undefined && in_config === undefined && database_def === undefined) {
            database_def = db;
            type_def = db_type;
        }
        database_arr[idx] = db;
        return db;
    }

    get() { return database_def; }
    set(db) { database_def = db; }

    getType(){return type_def;}
}
module.exports = new DataBase;