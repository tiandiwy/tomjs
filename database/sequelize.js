const require2 = require('tomjs/handlers/require2');
const configs = require2('tomjs/configs')();
const Sequelize = require2('sequelize');

module.exports = async function(config) {
    let url = "";
    if (typeof(config) == "string") { url = config; }

    let options = {};
    let host = "localhost";
    let database = "";
    let username = "";
    let password = "";
    let dialect = "";
    if (typeof(config) == "object") {
        if (config.useCLS) {
            const cls = require2('continuation-local-storage');
            let namespace = cls.createNamespace(config.namespaceCLS);
            Sequelize.useCLS(namespace);
        }
        Object.assign(options, config);
        for (var key in options) {
            switch (key) {
                case 'await':
                case 'showConnInfo':
                    {
                        delete options[key];
                        break;
                    }
                case "url":
                    {
                        url = options[key];
                        delete options[key];
                        break;
                    }
                case "username":
                    {
                        username = options[key];
                        delete options[key];
                        break;
                    }
                case "password":
                    {
                        password = options[key];
                        delete options[key];
                        break;
                    }
                case "database":
                    {
                        database = options[key];
                        delete options[key];
                        break;
                    }
                case "type":
                    {
                        dialect = options[key];
                        options['dialect'] = dialect;
                        delete options[key];
                        break;
                    }
            }
        }

        if (url.length <= 0) {
            let sHead = '';
            if (username.length > 0) {
                if (password.length > 0) {
                    sHead = username + ":" + password + '@';
                } else {
                    sHead = username + '@';
                }
            }
            let sPort = options.port != undefined ? (':' + options.port) : '';
            url = `${dialect}://${sHead}${host}:${sPort}/${database}`;
        }
        if (config.showConnInfo) {
            console.log(dialect + '.connect begin -> ', url, options);
        }
    }

    if (url.length > 0) {
        console.log(dialect + '.connect begin -> ', url, options);
    }
    let sequelize = undefined;
    if (url.length > 0) {
        sequelize = new Sequelize(url);
    } else {
        sequelize = new Sequelize(database, username, password, options);
    }
    if (config.await || configs.database.await) {
        await sequelize.authenticate()
        if (config.showConnInfo) {
            console.log('new mongoose.connect ok -> ', url, options);
        }
    } else {
        sequelize
            .authenticate()
            .then(() => {
                if (config.showConnInfo) {
                    console.log('new ' + dialect + '.connect ok -> ', url, options);
                }
            })
            .catch(err => {
                console.error(dialect + ': Unable to connect to the database:', err);
            });
    }
    return sequelize;
}