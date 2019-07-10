const require2 = require('tomjs/handlers/require2');
const render = require2('tomjs/handlers/render');
//提供标准的获取当前语言的全局方法

module.exports = async function (ctx, next) {
    ctx.render = async function (view_name, locals = {}, lang, root_path) {
        ctx.body = await render(view_name, Object.assign({},{ctx},locals), lang, root_path);
    }
    return next();
};