const require2 = require('tomjs/handlers/require2');

module.exports = async function (ctx, next) {
    ctx.all_params = Object.assign({}, ctx.query, ctx.request.body);
    return next();
};
