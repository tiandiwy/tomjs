const require2 = require('tomjs/handlers/require2');
const BaseApiError = require2('tomjs/error/base_api_error');
const SystemConfig = require2('tomjs/configs')().system;

let access_control_allow = () => {
    return async (ctx, next) => {
        if (typeof (ctx.request.header.host.split) != "function") {
            throw new BaseApiError(BaseApiError.AUTHORIZE_ERROR);
        }
        if (ctx.request.header.host.split(':')[0] === 'localhost' || ctx.request.header.host.split(':')[0] === '127.0.0.1' || process.env.NODE_ENV === 'development') {
            ctx.set('Access-Control-Allow-Origin', '*')
        } else {
            ctx.set('Access-Control-Allow-Origin', SystemConfig.server_host)
        }
        ctx.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
        ctx.set('Access-Control-Allow-Methods', 'PUT, PATCH, POST, GET, DELETE, OPTIONS')
        ctx.set('Access-Control-Allow-Credentials', true) // 允许带上 cookie            
        return next();
    }
}
module.exports = access_control_allow;
