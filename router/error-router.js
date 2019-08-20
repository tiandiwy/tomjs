const require2 = require('tomjs/handlers/require2');
const BaseApiError = require2('tomjs/error/base_api_error');
const { isObject } = require2('tomjs/handlers/base_tools');
const subdomain_cfg = require2('tomjs/configs')().subdomain;
module.exports = function () {
  let path_pattern = undefined;
  let hostname_pattern = undefined;
  if (isObject(subdomain_cfg.response_api_formatter)) {
    path_pattern = subdomain_cfg.response_api_formatter.path;
    hostname_pattern = subdomain_cfg.response_api_formatter.hostname;
  }
  return function (ctx, next) {
    switch (ctx.status) {
      case 404:
        let isAPI = false;
        if (hostname_pattern) {
          let reg = new RegExp(hostname_pattern);
          isAPI = reg.test(ctx.hostname);
        }
        if (isAPI && path_pattern) {
          let reg = new RegExp(path_pattern);
          isAPI = reg.test(ctx.originalUrl);
        }
        if (isAPI) { throw new BaseApiError(BaseApiError.NOT_FOUND_ERROR); }
        break
    }
    return next()
  }
}
