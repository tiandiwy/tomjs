const require2 = require('tomjs/handlers/require2');
const base_login = require2('tomjs/controllers/auth/base_login');
co_login = new base_login();
async function login(ctx, user_obj, long) {
    return await co_login.BuildToken(ctx, user_obj, long);
}

async function retoken(ctx, long) {
    return await co_login.ReToken(ctx, long);
}

function decode_token(token) {
    return co_login.decodeToken(token);
}

async function logout(ctx) {
    return await co_login.logout(ctx);
}

module.exports = { login, retoken, decode_token, logout };