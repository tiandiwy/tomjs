const require2 = require('tomjs/handlers/require2');
const QcloudSms = require2("qcloudsms_js");
const sms_cfg = require2('tomjs/configs')().sms;
const { isArray, isObject } = require2('tomjs/handlers/tools');
const gateway_type = 'qcloudsms';

// 实例化QcloudSms
let qcloudsms = QcloudSms(sms_cfg.gateways[gateway_type].app_id, sms_cfg.gateways[gateway_type].app_key);
let ssender = qcloudsms.SmsSingleSender();

module.exports = (nationCode, phoneNumber, templateId, params) => {
    let params_arr = []
    if (isArray(params)) {
        params_arr = params;
    } else {
        if (isObject(params)) {
            for (var x in params) {
                params_arr.push(params[x]);
            }
        } else {
            params_arr.push(params);
        }
    }
    return new Promise(function(resolve, reject) {
        ssender.sendWithParam(nationCode, phoneNumber, templateId, params_arr, sms_cfg.gateways[gateway_type].sign_name, "", "",
            function(err, res, resData) {
                if (err) {
                    reject(err);
                } else {
                    if (parseInt(resData.result, 10) == 0) {
                        resolve(resData);
                    } else {
                        reject(resData);
                    }
                }
            });
    });
};