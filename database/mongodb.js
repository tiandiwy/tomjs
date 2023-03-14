const require2 = require('tomjs/handlers/require2');
const configs = require2('tomjs/configs')();
const mongoose = require2('mongoose');

let createAddConn = false;
module.exports = async function (config) {
    let url = 'mongodb://localhost:27017/test';
    let options = { useNewUrlParser: true };
    if (config === undefined) { config = configs.database.mongodb; }
    if (typeof (config) == "object") {
        let host = config.host ? config.host : "localhost";
        let port = config.port ? config.port : "27017";
        let database = config.database ? config.database : "test";
        let username = config.username ? config.username : "";
        let password = config.password ? config.password : "";
        //user:password@
        let sHead = '';
        if (username.length > 0) {
            if (password.length > 0) {
                sHead = username + ":" + password + '@';
            } else {
                sHead = username + '@';
            }
        }

        let setStrictQuery = false;
        if (typeof (config.options) == 'object') {
            for (var key in config.options) {
                if (config.options[key] !== undefined) {
                    if (key != 'strictQuery') { options[key] = config.options[key]; }
                    else {
                        mongoose.set('strictQuery', config.options[key]);
                        setStrictQuery = true;
                    }
                }
            }
        }
        if (!setStrictQuery) {
            mongoose.set('strictQuery', true);
        }

        url = config.url ? config.url : `mongodb://${sHead}${host}:${port}/${database}`;
        if (config.showConnInfo) {
            console.log('mongoose.connect begin -> ', url, options);
        }
    } else {
        console.log('mongoose.connect begin -> ', url, options);
    }
    let conn = undefined;

    if (createAddConn) {
        if (config.await || configs.database.await) {
            conn = await mongoose.createConnection(url, options);
            if (config.showConnInfo) {
                console.log('new mongoose.connect ok -> ', url, options);
            }
        } else {
            conn = mongoose.createConnection(url, options);
            conn.once('open', () => {
                console.log('new mongoose.connect ok -> ', url, options);
            });
        }
    } else {
        if (config.await || configs.database.await) {
            conn = await mongoose.connect(url, options);
            createAddConn = true;
            if (config.showConnInfo) {
                console.log('mongoose.connect ok -> ', url, options);
            }
        } else {
            mongoose.connect(url, options);
            conn = mongoose.connection;
            conn.once('open', () => {
                createAddConn = true;
                console.log('mongoose.connect ok -> ', url, options);
            });
        }
    }
    return conn;
}