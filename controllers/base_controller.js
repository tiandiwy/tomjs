const require2 = require('tomjs/handlers/require2');
const authorize_fn = require2('tomjs/handlers/authorize');
const auth_cfg = require2('tomjs/configs')().auth;

class BaseController {
    constructor() {
        this.authorize = authorize_fn;
    }

    isMyId(ctx, id) {
        if (ctx.state[auth_cfg.jwt_key] && ctx.state[auth_cfg.jwt_key][auth_cfg.jwt_key_id]) {
            return ctx.state[auth_cfg.jwt_key][auth_cfg.jwt_key_id] == id;
        } else {
            return false;
        }
    }
};
module.exports = BaseController;
