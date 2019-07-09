const require2 = require('tomjs/handlers/require2');
const BaseApiError = require2('tomjs/error/base_api_error');

let options = () => {
    return async (ctx, next) => {
        if (ctx.request.method == "OPTIONS") {
            ctx.response.status = 200
            throw new BaseApiError(BaseApiError.OK);
        }
        return next();
    }
}
module.exports = options;
