const require2 = require('tomjs/handlers/require2');
const path = require2('path');
const appdir = require2('tomjs/handlers/dir')();
const Validator = require(path.join(appdir, './validator/validator.js'));//通过调用用户定义的validator，方便用户添加自定义验证码规则
const BaseApiError = require2('tomjs/error/base_api_error');
const { isObject, isString, isFunction } = require2('tomjs/handlers/base_tools');

let Object_Arr = {};
function getObject(path, class_name, func_name) {
    if (Object_Arr[path] === undefined) {
        if (func_name === undefined) {
            Object_Arr[path] = new class_name();
        } else {
            Object_Arr[path] = new class_name[func_name]();
        }
    }
    return Object_Arr[path];
}

module.exports = async function (ctx, rules, params) {
    let Rules = undefined;
    let RuleErrorMessages = undefined;
    let RuleAttributeNames = undefined;
    ctx.websokcet_params = params;

    //如果定义了相关参数验证规则，就对参数进行验证

    if (isString(rules)) {
        //rules处理开始
        let rules_obj = undefined;
        let rules_fnName = '';
        if (typeof (rules) == 'string') {
            let rules_arr = rules.split("@");
            let Obj_path = path.join(appdir, './rules/', rules_arr[0]);
            let fileRules = require(Obj_path);

            if (typeof (fileRules) == 'function') {
                rules_obj = getObject(Obj_path, fileRules);
            } else {
                if (fileRules.__esModule === true) {
                    if (typeof (fileRules.default) == "function") {
                        rules_obj = this.getObject(Obj_path, fileRules, 'default');
                    } else if (typeof (fileRules.default) == "object") {
                        rules_obj = fileRules.default;
                    } else {
                        rules_obj = fileRules;
                    }
                } else { rules_obj = fileRules; }
            }

            if (rules_arr.length > 1) {
                rules_fnName = rules_arr[1].trim();
            }
        }
        
        Rules = rules_obj;
        if ((rules_obj !== undefined) && rules_fnName.trim().length > 0) {
            Rules = rules_obj[rules_fnName.trim()];
        }
    }
    else if (isFunction(rules)) {
        Rules = await rules(ctx);
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
    let validator = await Validator.PromiseValidator(params, Rules, RuleErrorMessages, RuleAttributeNames);
    delete ctx.websokcet_params;
    if (validator.errorCount > 0) {
        //验证没有通过直接抛出出错信息
        throw new BaseApiError(BaseApiError.VALIDATOR_ERROR, validator.errors);
    }
    else {
        return true;
    }

}