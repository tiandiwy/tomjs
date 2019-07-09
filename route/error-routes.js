const require2 = require('tomjs/handlers/require2');
const BaseApiError = require2('tomjs/error/base_api_error');
module.exports = function () {
  return function (ctx, next) {
    switch (ctx.status) {
      case 404:
        throw new BaseApiError(BaseApiError.NOT_FOUND_ERROR)
        break
    }
    return next()
  }
}
