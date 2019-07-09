const require2 = require('tomjs/handlers/require2');
const SMSClient = require2('@alicloud/sms-sdk');
const sms_cfg = require2('tomjs/configs')().sms;
const gateway_type = 'aliyunsms';

let ssender = new SMSClient({
    "accessKeyId": sms_cfg.gateways[gateway_type].access_key_id,
    "secretAccessKey": sms_cfg.gateways[gateway_type].secret_access_key
});

module.exports = (nationCode, phoneNumber, templateId, params) => {
    if (nationCode.length > 0) {
        let n_code = parseInt(nationCode, 10);
        let default_nation_code = parseInt(sms_cfg.default_nation_code, 10);
        if (n_code > 0 && n_code != default_nation_code) {
            phoneNumber = '00' + n_code + phoneNumber;
        }
    }
    return new Promise(function(resolve, reject) {
        ssender.sendSMS({
                PhoneNumbers: phoneNumber,
                SignName: sms_cfg.gateways[gateway_type].sign_name,
                TemplateCode: templateId,
                TemplateParam: JSON.stringify(params),
            })
            .then(function(res) {
                let { Code } = res
                if (Code === 'OK') {
                    resolve(res);
                } else {
                    reject(res);
                }
            })
            .catch(function(err) { reject(err); });
    });
};
