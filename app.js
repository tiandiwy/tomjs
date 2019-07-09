const require2 = require('tomjs/handlers/require2');
const app_dir = require2('tomjs/handlers/dir')();
const configs = require2('tomjs/configs')();
const path = require2('path');
const database = require2('tomjs/database'); //根据配置连接数据库
const koaLogger = require2('koa-logger');
const Koa = require2('koa');
const KoaBody = require2('koa-body');
const KoaStatic = require2('koa-static');
const locale = require2('koa-locale');
const session = require2("koa-session2");
const mount = require('koa-mount');
const Store = require2("tomjs/session/cahce_store");
const auth_jwt = require2('tomjs/auth/auth_jwt');
const auth_jwt_check = require2('tomjs/auth/auth_jwt_check');
const auth_user = require2('tomjs/middleware/auth_user');
const response_formatter = require2('tomjs/middleware/response-formatter');
const options = require2('tomjs/middleware/options');
const access_control_allow = require2('tomjs/middleware/access_control_allow');
const ErrorRoutes = require2('tomjs/route/error-routes');
const setupLang = require2('tomjs/middleware/setuplang');
const Events = require2('tomjs/handlers/events');
if (configs.streams.boot_run_consumers) {
    require2('tomjs/handlers/run_consumer');
}

const SystemConfig = configs.system;
async function startRun() {
    let emitter = Events.getEventEmitter('app');
    if (configs.database.await) {
        const [mongoose] = await Promise.all([database.build()]); //需要并行处理的初始化项目，例如数据库连接，读取配置文件等
    } else {
        database.build();
    }

    const app = new Koa();
    locale(app, configs.system.lang_cookie_key);
    app.use(access_control_allow())
        .use(koaLogger())
        .use(KoaStatic(configs.static.path, configs.static.options)) // Static resource
        .use(response_formatter(configs.routes.response_api_formatter_path))
        .use(options());
    if (configs.auth.jwt_work_path) {
        app.use(mount(configs.auth.jwt_work_path, auth_jwt));
        if (configs.auth.jwt_auth_all_path) {
            app.use(mount(configs.auth.jwt_work_path, auth_jwt_check));
        }
    } else {
        app.use(auth_jwt);
        if (configs.auth.jwt_auth_all_path) {
            app.use(auth_jwt_check);
        }
    }
    app.use(auth_user)
        .use(session({ key: configs.session.session_key, store: new Store() }))
        .use(setupLang)
        .use(KoaBody(configs.body)); // Processing request
    // .use(PluginLoader(SystemConfig.System_plugin_path))
    for (let idx in configs.routes.maps) {
        let route = require(path.join(app_dir, configs.routes.maps[idx]));
        route.prefix(idx);
        app.use(route.routes()).use(route.allowedMethods());
    }
    app.use(ErrorRoutes());

    if (SystemConfig.NODE_ENV === 'development') { // logger
        app.use((ctx, next) => {
            const start = new Date();
            return next()
                .then(() => {
                    const ms = new Date() - start;
                    console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
                })
        })
    }

    app.on("error", async (error, ctx) => { //捕获异常记录错误日志        
        emitter.emit('error', { ctx, error });
    })
    return app;
}

module.exports = startRun;