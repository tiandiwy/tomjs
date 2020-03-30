const require2 = require('tomjs/handlers/require2');
const Events = require2('tomjs/handlers/events');
const authorize_fn = require2('tomjs/handlers/authorize');
const authorize_sync_fn = require2('tomjs/handlers/authorize_sync');
const auth_cfg = require2('tomjs/configs')().auth;
const { getClassName } = require2('tomjs/handlers/base_tools');

class BaseController {
    constructor(EventName) {
        this.authorize = authorize_fn;
        this.authorize_sync = authorize_sync_fn;
        if (EventName === undefined) { EventName = getClassName(this); }
        this.emitter = Events.getEventEmitter(EventName);
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
