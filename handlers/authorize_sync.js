const require2 = require('tomjs/handlers/require2');
const path = require2('path');
const models_cfg = require2('tomjs/configs')().models;
const BaseApiError = require2('tomjs/error/base_api_error');
const { isObject } = require2('tomjs/handlers/tools');
const appdir = require2('tomjs/handlers/dir')();

let policy_all = {};
module.exports = async function (ctx, ability, model, err_throw = true) {
    if ((isObject(model) && typeof (model.getModelClassName) == "function") || typeof (model) == "string") {
        let modeClassName = isObject(model) ? model.getModelClassName() : model;
        let policyName = models_cfg.policies[modeClassName];
        if (policyName) {
            let policy = undefined;
            if (!policy_all[policyName]) {
                policy = require(path.join(appdir, policyName));
                if (typeof (policy) == "function") {
                    policy = new policy();
                }
                if (isObject(policy)) {
                    policy_all[policyName] = policy;
                }
            }
            else {
                policy = policy_all[policyName];
            }
            let re = undefined;
            if (isObject(policy)) {
                if (typeof (policy.before) == "function") {
                    re = await policy.before(ctx, ability);
                    if (re === true) {
                        return true;
                    } else if (re === false) {
                        if (err_throw) { throw new BaseApiError(BaseApiError.VALIDATOR_ERROR); }
                        else { return false; }
                    }
                }
                if (typeof (policy[ability]) == "function") {
                    let model_info = ability.trim().toLowerCase() == "create" ? modeClassName : model;
                    re = await policy[ability](ctx, model_info);
                    if (re === true) {
                        if (typeof (policy.after) == "function") {
                            re = await policy.after(ctx, ability);
                            if (re === true) {
                                return true;
                            } else if (re === false) {
                                if (err_throw) { throw new BaseApiError(BaseApiError.VALIDATOR_ERROR); }
                                else { return false; }
                            }
                        }
                        else { return true; }
                    } else if (re === false) {
                        if (err_throw) { throw new BaseApiError(BaseApiError.VALIDATOR_ERROR); }
                        else { return false; }
                    }
                }
            }
        }
    }
    if (err_throw) { throw new BaseApiError(BaseApiError.AUTHORIZE_ERROR); }
    else { return false; }
}