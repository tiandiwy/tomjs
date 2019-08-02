const require2 = require('tomjs/handlers/require2');
const { Store } = require2("tomjs-koa-session2");
const session_cfg = require2('tomjs/configs')().session;
const auth_config = require2('tomjs/configs')().auth;
const Cacheman = require2('cacheman');
class CahceStore extends Store {
    constructor() {
        super();
        this.type = session_cfg.type.trim().toLowerCase();
        this.token_id = session_cfg.token_id.trim().toLowerCase();
        this.cache = new Cacheman(session_cfg.prefix, session_cfg.store);
    }

    getTrueID(sid, ctx) {
        let id = undefined;
        if (this.type !== 'cookie' && ctx.state) {
            if (this.token_id == 'jwt_key_id') {
                id = ctx.auth.id();
                if (id === undefined && ctx.state[auth_config.jwt_tokenkey] !== undefined) {
                    this.token_id = 'tokenKey';
                    id = ctx.state[auth_config.jwt_tokenkey];
                }
            } else if (this.token_id == 'tokenKey') {
                if (ctx.state[auth_config.jwt_tokenkey] !== undefined) {
                    id = ctx.state[auth_config.jwt_tokenkey];
                }

            }
        }
        return (id === undefined) ? sid : id;
    }

    async get(sid, ctx) {
        let id = this.getTrueID(sid, ctx);
        return await this.cache.get(id);
    }

    async set(session, { sid = this.getID(24), maxAge = 1000000 } = {}, ctx) {
        let id = this.getTrueID(sid, ctx);
        try {
            await this.cache.set(id, session);
        } catch (e) {}
        return id;
    }

    async destroy(sid, ctx) {
        let id = this.getTrueID(sid, ctx);
        return await this.cache.del(id);
    }
}

module.exports = CahceStore;