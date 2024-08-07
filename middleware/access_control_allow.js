const require2 = require('tomjs/handlers/require2');
const BaseApiError = require2('tomjs/error/base_api_error');
const SystemConfig = require2('tomjs/configs')().system;

let access_control_allow = () => {
    return async (ctx, next) => {
        if (ctx.request.header.host && typeof (ctx.request.header.host.split) != "function") {
            throw new BaseApiError(BaseApiError.AUTHORIZE_ERROR);
        }
        let set_end = false;
        if (typeof (SystemConfig.fn_server_access_control_allow_origin) == "function") {
            const allow_origin = await SystemConfig.fn_server_access_control_allow_origin(ctx);
            if (allow_origin) {
                ctx.set('Access-Control-Allow-Origin', allow_origin);
                set_end = true;
            }
        }
        if (!set_end && SystemConfig.server_access_control_allow_origin) {
            ctx.set('Access-Control-Allow-Origin', SystemConfig.server_access_control_allow_origin);
        }
        ctx.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
        ctx.set('Access-Control-Allow-Methods', 'PUT, PATCH, POST, GET, DELETE, OPTIONS')
        ctx.set('Access-Control-Allow-Credentials', true) // 允许带上 cookie            
        return next();
    }
}
module.exports = access_control_allow;