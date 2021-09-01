const require2 = require('tomjs/handlers/require2');
const path = require2('path');
const appdir = require2('tomjs/handlers/dir')();
const Validator = require(path.join(appdir, './validator/validator.js'));//通过调用用户定义的validator，方便用户添加自定义验证码规则
const BaseApiError = require2('tomjs/error/base_api_error');
const KoaRouter = require2('koa-router');
const { isObject, isArray, ObjToArray, toBool } = require2('tomjs/handlers/tools');
const ratelimit = require2('tomjs/middleware/ratelimit');
const auth_cfg = require2('tomjs/configs')().auth;
const router_jwt = require2('tomjs/auth/router_jwt');
const router_jwt_check = require2('tomjs/auth/router_jwt_check');

async function router_func(controller_obj, func_name, rules, ctx) {
    //合并params与query参数
    let all_params = Object.assign({}, ctx.query, ctx.request.body, ctx.params);

    if (rules !== undefined) {
        let Rules = undefined;
        let RuleErrorMessages = undefined;
        let RuleAttributeNames = undefined;

        //如果定义了相关参数验证规则，就对参数进行验证
        if (typeof (rules) == 'function') {
            Rules = await rules(ctx, ...ObjToArray(ctx.params));
        } else {
            Rules = rules;
        }

        if (isObject(Rules)) {
            if (isObject(Rules.rules)) {
                if (isObject(Rules.messages)) {
                    RuleErrorMessages = Rules.messages;
                }
                if (isObject(Rules.attributes)) {
                    RuleAttributeNames = Rules.attributes;
                }
                Rules = Rules.rules;
            } else {
                Rules = rules;
            }
        }

        Validator.useLang(ctx.lang);
        let validator = await Validator.PromiseValidator(all_params, Rules, RuleErrorMessages, RuleAttributeNames);
        if (validator.errorCount > 0) {
            //验证没有通过直接抛出出错信息
            throw new BaseApiError(BaseApiError.VALIDATOR_ERROR, validator.errors)
        }
    }
    await controller_obj[func_name](ctx, ...ObjToArray(ctx.params))
}

let Object_Arr = {};

class LaravelRouter extends KoaRouter {
    constructor(init_path) {
        super();
        this.init_path = init_path || '.';

        this.auth_def = false;
        this.auth_check_all = true;
    }

    getObject(path, controllerClass, func_name) {
        if (Object_Arr[path] === undefined) {
            if (func_name === undefined) {
                Object_Arr[path] = new controllerClass();
            } else {
                Object_Arr[path] = new controllerClass[func_name]();
            }
        }
        return Object_Arr[path];
    }

    authRoutes(controller_dir = 'auth') {
        this.get('/auth/info', controller_dir + '/login@getAuthInfo', { auth: false });
        this.get('/auth/captcha/:field_name', controller_dir + '/captcha@index', { auth: false });
        this.get('/auth/captcha/email/:field_name/:email/', controller_dir + '/captcha@email', { auth: false });
        if (auth_cfg.auth_routes_use_ratelimit) { this.use('/auth/captcha/mobile', ratelimit('mobile').web); }//访问限制中间件
        this.any('/auth/captcha/mobile/:field_name/:phoneNumber/', controller_dir + '/captcha@mobile', { auth: false });
        if (auth_cfg.auth_routes_use_ratelimit) { this.use('/auth/login', ratelimit('login').web); }//访问限制中间件
        this.post('/auth/login', controller_dir + '/login@login', { auth: false });
        this.get('/auth/retoken/:long/', controller_dir + '/login@retoken', { auth: true });
        this.any('/auth/logout', controller_dir + '/login@logout', { auth: true });
        this.post('/auth/register', controller_dir + '/register@register', { auth: false });
        this.post('/auth/resetpassword', controller_dir + '/password@resetpassword', { auth: true });
        this.post('/auth/forgotpassword', controller_dir + '/password@forgotpassword', { auth: false });
    }

    auth(auth = true, auth_check_all = true) {
        this.auth_def = auth;
        this.auth_check_all = auth_check_all;
    }

    //info: {only,except,auth,auth_check}
    buildRouter(router_type, router_str, controller_str, info = {}) {
        let router_name = info.name || '';
        let rules_str = info.rule;
        let controller_fn_config = { only: info.only, except: info.except };
        let controller_ok = false;
        let controller_arr = [];

        let auth_check = toBool(info.auth_check);
        auth_check = auth_check === undefined ? this.auth_check_all : auth_check;
        let auth = toBool(info.auth);
        auth = auth === undefined ? this.auth_def : auth;
        if (auth || auth_check) {
            super.use(router_str, router_jwt(auth_check));
            if (auth) {
                super.use(router_str, router_jwt_check);
            }
        }

        if (typeof (router_type) == 'string' && typeof (router_str) == 'string' && typeof (controller_str) == 'string') {
            controller_arr = controller_str.split("@");
            controller_ok = ((router_type == 'resource' && controller_arr.length == 1) || (controller_arr.length == 2));
            if ((!controller_ok) && (router_type != 'resource') && (controller_arr.length == 1)) {
                controller_arr.push('index');
                controller_ok = true;
            }
            if (controller_arr.length == 2) {
                controller_ok = controller_arr[1].trim()
                    .length > 0;
            }
        }

        if (controller_ok) {
            let controller_obj = {};
            let Obj_path = path.join(appdir, this.init_path + '/controllers/', controller_arr[0]);
            let Controller = require(Obj_path);
            if (typeof (Controller) == 'function') {
                controller_obj = this.getObject(Obj_path, Controller);
            } else {
                if (Controller.__esModule === true) {
                    if (typeof (Controller.default) == "function") {
                        controller_obj = this.getObject(Obj_path, Controller, 'default');
                    } else if (typeof (Controller.default) == "object") {
                        controller_obj = Controller.default;
                    } else {
                        controller_obj = Controller;
                    }
                } else { controller_obj = Controller; }
            }

            //rules处理开始
            let rules_obj = undefined;
            let rules_fnName = '';
            if (typeof (rules_str) == 'string') {
                let rules_arr = rules_str.split("@");
                let Obj_path = path.join(appdir, this.init_path + '/rules/', rules_arr[0]);
                let Rules = require(Obj_path);

                if (typeof (Rules) == 'function') {
                    rules_obj = this.getObject(Obj_path, Rules);
                } else {
                    if (Rules.__esModule === true) {
                        if (typeof (Rules.default) == "function") {
                            rules_obj = this.getObject(Obj_path, Rules, 'default');
                        } else if (typeof (Rules.default) == "object") {
                            rules_obj = Rules.default;
                        } else {
                            rules_obj = Rules;
                        }
                    } else { rules_obj = Rules; }
                }

                if (rules_arr.length > 1) {
                    rules_fnName = rules_arr[1].trim();
                }
            } else {
                try {
                    let Obj_path = path.join(appdir, this.init_path + '/rules/', controller_arr[0]);
                    let Rules = require(Obj_path);

                    if (typeof (Rules) == 'function') {
                        rules_obj = this.getObject(Obj_path, Rules);
                    } else {
                        if (Rules.__esModule === true) {
                            if (typeof (Rules.default) == "function") {
                                rules_obj = this.getObject(Obj_path, Rules, 'default');
                            } else if (typeof (Rules.default) == "object") {
                                rules_obj = Rules.default;
                            } else {
                                rules_obj = Rules;
                            }
                        } else { rules_obj = Rules; }
                    }

                    if (controller_arr.length == 2) {
                        if (controller_arr[1].trim()
                            .length > 0) {
                            rules_obj = rules_obj[controller_arr[1].trim()];
                        }
                    }
                } catch (err) {
                    if (err.code == 'MODULE_NOT_FOUND') {
                        rules_obj = undefined;
                    }
                    else {
                        throw err;
                    }

                }
            }
            let rules_end = rules_obj;
            if ((rules_obj !== undefined) && rules_fnName.trim()
                .length > 0) {
                rules_end = rules_obj[rules_fnName.trim()];
            }
            //rules处理结束

            if (isObject(rules_str) && (controller_fn_config === undefined)) {
                // if ((Object.keys(rules_str).length == 1) && (rules_str[only] || rules_str[except])) {
                //     controller_fn_config = rules_str;
                // }
                controller_fn_config = rules_str;
            }

            if (router_type == 'resource') {
                router_str = router_str.trim();
                if (router_str[router_str.length - 1] != '/') {
                    router_str += '/';
                }

                let fn_name_arr = ['index', 'create', 'show', 'store', 'edit', 'update', 'destroy'];

                let router_str_arr = {
                    'index': '',
                    'create': 'create',
                    'show': ':id',
                    'store': '',
                    'edit': ':id/edit',
                    'update': ':id',
                    'destroy': ':id'
                };

                let fn_types_arr = {
                    'index': 'get',
                    'create': 'get',
                    'show': 'get',
                    'store': 'post',
                    'edit': 'get',
                    'update': 'patch',
                    'destroy': 'delete'
                };
                let fn_name_ok_arr = [];
                let all_type = true;
                if (isObject(controller_fn_config)) {
                    if (controller_fn_config.only) {
                        all_type = false;
                        let fn_config_arr = [];

                        if (typeof (controller_fn_config.only) == 'string') {
                            fn_config_arr = controller_fn_config.only.split(',');
                        } else if (isArray(controller_fn_config.only)) {
                            [...fn_config_arr] = controller_fn_config.only;
                        }

                        for (let j = 0, len = fn_config_arr.length; j < len; j++) {
                            if (fn_name_arr.indexOf(fn_config_arr[j].trim()) >= 0) {
                                fn_name_ok_arr.push(fn_config_arr[j].trim());
                            }
                        }
                    } else if (controller_fn_config.except) {
                        all_type = false;
                        [...fn_name_ok_arr] = fn_name_arr;

                        let not_fn_config_arr = [];

                        if (typeof (controller_fn_config.except) == 'string') {
                            not_fn_config_arr = controller_fn_config.except.split(',');
                        } else if (isArray(controller_fn_config.except)) {
                            [...not_fn_config_arr] = controller_fn_config.except;
                        }

                        let index = -1;
                        for (let j = 0, len = not_fn_config_arr.length; j < len; j++) {
                            index = fn_name_ok_arr.indexOf(not_fn_config_arr[j].trim());
                            if (index > -1) {
                                fn_name_ok_arr.splice(index, 1);
                            }
                        }
                    }
                }

                if (all_type) {
                    [...fn_name_ok_arr] = fn_name_arr;
                }

                if (typeof (router_name) == 'string') {
                    if (router_name.length > 0) {
                        if (router_name[router_name.length - 1] != '.') {
                            router_name += '.';
                        }
                    }
                } else {
                    router_name = undefined;
                }

                for (let j = 0, len = fn_name_ok_arr.length; j < len; j++) {
                    let rules_end_fn = rules_end;
                    if (rules_fnName.length <= 0) {
                        if (rules_end) { rules_end_fn = rules_end[fn_name_ok_arr[j]]; }
                    }
                    if (router_name !== undefined && router_name !== '') {
                        let router_name_end = router_name + fn_name_ok_arr[j];
                        super[fn_types_arr[fn_name_ok_arr[j]]](router_name_end, router_str + router_str_arr[fn_name_ok_arr[j]], router_func.bind(this, controller_obj, fn_name_ok_arr[j], rules_end_fn));
                    } else {
                        super[fn_types_arr[fn_name_ok_arr[j]]](router_str + router_str_arr[fn_name_ok_arr[j]], router_func.bind(this, controller_obj, fn_name_ok_arr[j], rules_end_fn));
                    }
                }
            } else {
                if (router_name.length > 0) {
                    super[router_type](router_name, router_str, router_func.bind(this, controller_obj, controller_arr[1].trim(), rules_end));
                } else {
                    super[router_type](router_str, router_func.bind(this, controller_obj, controller_arr[1].trim(), rules_end));
                }

            }
        } else {
            throw "Build laravel-router params error: " + router_type + " " + router_str + " => " + controller_str + (rules_str ? (' Rules:' + rules_str) : '');
        }
        return this;
    }

    resource(router_str, controller_str, info = {}) {
        return this.buildRouter('resource', router_str, controller_str, info);
    }

    all(router_str, controller_str, info = {}) {
        return this.buildRouter('all', router_str, controller_str, info);
    }

    any(router_str, controller_str, info = {}) {
        return this.buildRouter('all', router_str, controller_str, info);
    }

    get(router_str, controller_str, info = {}) {
        return this.buildRouter('get', router_str, controller_str, info);
    }

    put(router_str, controller_str, info = {}) {
        return this.buildRouter('put', router_str, controller_str, info);
    }

    post(router_str, controller_str, info = {}) {
        return this.buildRouter('post', router_str, controller_str, info);
    }

    patch(router_str, controller_str, info = {}) {
        return this.buildRouter('patch', router_str, controller_str, info);
    }

    delete(router_str, controller_str, info = {}) {
        return this.buildRouter('delete', router_str, controller_str, info);
    }

    del(router_str, controller_str, info = {}) {
        return this.buildRouter('del', router_str, controller_str, info);
    }
}
module.exports = LaravelRouter;