const require2 = require('tomjs/handlers/require2');
const configs = require2('tomjs/configs')();
const views_cfg = configs.views;
const system_cfg = configs.system;
const path = require2('path');
//const debug = require2('debug')('koa-views');
const consolidate = require2('consolidate');
const getPaths = require2('get-paths');
const pretty = require2('pretty');
const __js = require2('tomjs/handlers/__');

//module.exports = viewsMiddleware
let engineSource = consolidate;
let extension = views_cfg.extension;
let options = views_cfg.options;
let map = undefined;
if (views_cfg.map !== undefined) {
    map = views_cfg.map;
}

function __2(lang, text) {
    return __js(text, lang);
}
//view_name 是指明模板的名称 用.来表示目录层次 文件的扩展名
//locals 是带入模板的变量 其中 locals.lang 是指定语言(未设置会自动用配置的默认语言) locals.__ 翻译函数 如果未设置会自动添加上
module.exports = async function(view_name, locals = {}, lang, root_path) {
    let paths = undefined;
    let err = undefined;
    root_path = root_path === undefined ? views_cfg.path : root_path
    try {
        paths = await getPaths(root_path, path.join(...view_name.split('.')), extension);
    } catch (e) { err = e; }
    if (err != undefined) {
        let arr = view_name.split('.');
        let len = arr.length - 1;
        if (len > 0) {
            let ext = arr[len];
            arr.splice(len, 1);
            try {
                paths = await getPaths(views_cfg.path, path.join(...arr), ext);
            } catch (e) { throw err; }
        } else { throw err; }
    }
    const suffix = paths.ext;
    const state = Object.assign(locals, options || {});
    if (state.lang === undefined) {
        state.lang = (lang === undefined ? system_cfg.Lang : lang);
    }
    if (state.__ === undefined) {
        state.__ = __2.bind(this, state.lang);
    }
    // deep copy partials
    state.partials = Object.assign({}, options.partials || {});
    //debug('render `%s` with %j', paths.rel, state);

    const engineName = map && map[suffix] ? map[suffix] : suffix;

    const render = engineSource[engineName];

    if (!engineName || !render) { return Promise.reject(new Error(`Engine not found for the ".${suffix}" file extension`)); }
    let html = await render(path.resolve(root_path, paths.rel), state);
    if (locals.pretty) {
        html = pretty(html);
    }
    return html;
}
