const require2 = require('tomjs/handlers/require2');
const app_dir = require2('tomjs/handlers/dir')();
const configs = require2('tomjs/configs')();
const path = require2('path');
const database = require2('tomjs/database'); //根据配置连接数据库
const koaLogger = require2('koa-logger');
const Koa = require2('koa');
const websockify = require2('koa-websocket');
const KoaBody = require2('koa-body');
const KoaStatic = require2('koa-static');
const locale = require2('koa-locale');
const session = require2("koa-session2");
const mount = require2('koa-mount');
const Store = require2("tomjs/session/cahce_store");
const auth_jwt = require2('tomjs/auth/auth_jwt');
const auth_jwt_check = require2('tomjs/auth/auth_jwt_check');
const auth_user = require2('tomjs/middleware/auth_user');
const response_formatter = require2('tomjs/middleware/response-formatter');
const render = require2('tomjs/middleware/render');
const options = require2('tomjs/middleware/options');
const access_control_allow = require2('tomjs/middleware/access_control_allow');
const ErrorRoutes = require2('tomjs/route/error-routes');
const setupLang = require2('tomjs/middleware/setuplang');
const { clone } = require2('tomjs/handlers/base_tools');
const Events = require2('tomjs/handlers/events');
if (configs.streams.boot_run_consumers) {
    require2('tomjs/handlers/run_consumer');
}

//https
const https = require('https');
const { default: enforceHttps } = require('koa-sslify');
const SystemConfig = require2('tomjs/handlers/server_run_type');

async function startRun() {
    let emitter = Events.getEventEmitter('app');
    if (configs.database.await) {
        const [mongoose] = await Promise.all([database.build()]); //需要并行处理的初始化项目，例如数据库连接，读取配置文件等
    } else {
        database.build();
    }

    let app = new Koa();

    locale(app, configs.system.lang_cookie_key);

    if (SystemConfig.server_run_type_force_https) {
        app.use(enforceHttps({
            port: SystemConfig.server_https_port
        }));
    }
    app.use(access_control_allow())
        .use(koaLogger())
        .use(mount(configs.static.target_path, KoaStatic(configs.static.source_path, configs.static.options))) // Static resource
        .use(render)
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
    });

    let ws = undefined;
    let wss = undefined;

    if (SystemConfig.server_run_type_https) {
        if (SystemConfig.websocket_open) {
            let app_wss = clone(app);
            wss = websockify(app_wss, SystemConfig.websocket_options, SystemConfig.ssl_options);
            let server = wss.listen(SystemConfig.server_https_port, SystemConfig.server_bind_ip);
            server.timeout = SystemConfig.server_timeout;
        }
        else {
            let server = https.createServer(SystemConfig.ssl_options, app.callback()).listen(SystemConfig.server_https_port, SystemConfig.server_bind_ip);
            server.timeout = SystemConfig.server_timeout;
        }
    }

    if (SystemConfig.server_run_type_http) {
        if (SystemConfig.websocket_open && (!SystemConfig.server_run_type_force_https)) {
            let app_ws = clone(app);
            ws = websockify(app_ws, SystemConfig.websocket_options);
            let server = ws.listen(SystemConfig.server_http_port, SystemConfig.server_bind_ip);
            server.timeout = SystemConfig.server_timeout;
        }
        else {
            let server = app.listen(SystemConfig.server_http_port, SystemConfig.server_bind_ip);
            server.timeout = SystemConfig.server_timeout;
        }
    }

    if (SystemConfig.websocket_open) {
        let run_websocket = require(path.join(app_dir, 'websocket'));
        await run_websocket(ws, wss);
    }

    return app;
}

module.exports = startRun;