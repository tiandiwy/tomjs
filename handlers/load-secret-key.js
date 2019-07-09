const require2 = require('tomjs/handlers/require2');
const fs = require2('fs');
const configs = require2('tomjs/configs')();
const publicKey = fs.readFileSync(configs.auth.jwt_secret);
module.exports = publicKey