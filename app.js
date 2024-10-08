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
const Subdomain = require2('koa-subdomain');
// const all_params = require2('tomjs/middleware/all_params');
const locale = require2('koa-locale');
const KoaIP = require2('koa-ip');
const session = require2("tomjs-koa-session2");
const mount = require2('koa-mount');
const unless = require('koa-unless');
const conditional = require('koa-conditional-get');
const etag = require('koa-etag');
const getApp = require2("tomjs/handlers/getapp");
const Store = require2("tomjs/session/cahce_store");
const auth_user = require2('tomjs/middleware/auth_user');
const response_formatter = require2('tomjs/middleware/response-formatter');
const render = require2('tomjs/middleware/render');
const options = require2('tomjs/middleware/options');
const access_control_allow = require2('tomjs/middleware/access_control_allow');
const ErrorRouter = require2('tomjs/router/error-router');
const setupLang = require2('tomjs/middleware/setuplang');
const { clone, isObject, isString } = require2('tomjs/handlers/base_tools');
const proxy = require('koa-proxy');
const compress = require('koa-compress');

const app_init = require(path.join(app_dir, './init/web'));//提供用户第一时间初始化app使用

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

    let app = await app_init(getApp(new Koa()));
    locale(app, configs.system.lang_cookie_key);

    if(configs.compress && configs.compress.open){
        app.use(compress(configs.compress));
    }

    if(configs.system.web_conditional_get){
        app.use(conditional());
        app.use(etag());    
    }

    if (SystemConfig.server_run_type_force_https) {
        app.use(enforceHttps({
            port: SystemConfig.server_https_port
        }));
    }
    app.use(access_control_allow());
    if (configs.log.open_koa_logger) {
        app.use(koaLogger());
    }
    //.use(mount(configs.static.target_path, KoaStatic(configs.static.source_path, configs.static.options))) // Static resource
    app.subdomainOffset = configs.subdomain.subdomain_offset;
    const subdomain_ip = new Subdomain();
    for (let idx in configs.subdomain.maps) {
        if (isObject(configs.subdomain.maps[idx].ip)) {
            subdomain_ip.use(idx, KoaIP(configs.subdomain.maps[idx].ip));
        }
    }
    app.use(subdomain_ip.routes());
    const subdomain_proxy = new Subdomain();
    for (let idx in configs.subdomain.maps) {
        if (isString(configs.subdomain.maps[idx].proxy)) {
            subdomain_proxy.use(idx, proxy({ host: configs.subdomain.maps[idx].proxy, jar: true }));
        }
    }
    app.use(subdomain_proxy.routes());
    const subdomain_static = new Subdomain();
    for (let idx in configs.subdomain.maps) {
        if (isObject(configs.subdomain.maps[idx].static)) {
            let static = configs.subdomain.maps[idx].static;
            subdomain_static.use(idx, mount(static.target_path, KoaStatic(static.source_path, static.options)));
        }
    }
    app.use(subdomain_static.routes());
    if (isObject(configs.history_api) && configs.history_api.open) {
        const { historyApiFallback } = require('koa2-connect-history-api-fallback');
        app.use(historyApiFallback(isObject(configs.history_api.options) ? configs.history_api.options : undefined));
    }
    app.use(render)
        .use(response_formatter())
        .use(options());

    app.use(auth_user);
    let koaSession = session({ key: configs.session.session_key, store: new Store() });
    if (configs.session.unless) {
        koaSession.unless = unless;
        app.use(koaSession.unless(configs.session.unless));
    }
    else { app.use(koaSession); }

    app.use(setupLang);

    let koaBody = KoaBody(configs.body);
    if (configs.body.unless) {
        koaBody.unless = unless;
        app.use(koaBody.unless(configs.body.unless));
    }
    else { app.use(koaBody); }

    // app.use(all_params);

    const subdomain = new Subdomain();
    for (let idx in configs.subdomain.maps) {
        if (configs.subdomain.maps[idx].web) {
            let route = require(path.join(app_dir, configs.subdomain.maps[idx].web));
            subdomain.use(idx, route.routes());
        }
    }
    app.use(subdomain.routes());
    app.use(ErrorRouter());

    app.on("error", async (error, ctx) => { //捕获异常记录错误日志        
        emitter.emit('error', { ctx, error });
    });

    let ws = undefined;
    let wss = undefined;
    let server_http = undefined;
    let server_https = undefined;

    if (SystemConfig.server_run_type_https) {
        if (SystemConfig.websocket_open) {
            let app_wss = clone(app);
            wss = websockify(app_wss, SystemConfig.websocket_options, SystemConfig.ssl_options);
            server_https = wss.listen(SystemConfig.server_https_port, SystemConfig.server_bind_ip);
        }
        else {
            server_https = https.createServer(SystemConfig.ssl_options, app.callback()).listen(SystemConfig.server_https_port, SystemConfig.server_bind_ip);
        }
        server_https.timeout = SystemConfig.server_timeout;
    }

    if (SystemConfig.server_run_type_http) {
        if (SystemConfig.websocket_open && (!SystemConfig.server_run_type_force_https)) {
            let app_ws = clone(app);
            ws = websockify(app_ws, SystemConfig.websocket_options);
            server_http = ws.listen(SystemConfig.server_http_port, SystemConfig.server_bind_ip);
        }
        else {
            server_http = app.listen(SystemConfig.server_http_port, SystemConfig.server_bind_ip);
        }
        server_http.timeout = SystemConfig.server_timeout;
    }

    if (SystemConfig.websocket_open) {
        let run_websocket = require2('tomjs/websocket');
        await run_websocket(ws, wss);
    }

    let crons = [];
    if (isObject(configs.cron) && configs.cron.boot_run === true) { crons = require2('tomjs/handlers/cron'); }
    return { app, server_http, server_https, crons };
}

module.exports = startRun;