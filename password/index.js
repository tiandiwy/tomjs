const require2 = require('tomjs/handlers/require2');
const auth_cfg = require2('tomjs/configs')().auth;
const Password = require('./' + auth_cfg.password_tpye);
module.exports = Password;
