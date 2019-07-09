const require2 = require('tomjs/handlers/require2');
const SMSError = require2('tomjs/error/sms_error');
const sms_cfg = require2('tomjs/configs')().sms;
const { isArray, isObject } = require2('tomjs/handlers/tools');
const Events = require2('tomjs/handlers/events');

function PhoneNumber(nationCode, phoneNumber) {
    return { nationCode, phoneNumber };
}

//提供事件(send_sms_end):
//sent 事件 参数: info { 'gateway': gateway, 'nationCode': nationCode, 'phoneNumber': phoneNumber, 'error': undefined, 'res': res }
//error 事件 参数: info = { 'gateway': gateway, 'nationCode': nationCode, 'phoneNumber': phoneNumber, 'error': err }
//all_error 事件 参数: re_arr
//gateways_error 事件 参数: gateways

let SendSMS = async(phoneNum, templateId, params, gateways) => {
    let nationCode = sms_cfg.default_nation_code;
    let phoneNumber = "";
    if (isObject(phoneNum)) {
        if (phoneNum.nationCode) { nationCode = phoneNum.nationCode; }
        phoneNumber = phoneNum.phoneNumber;
    } else {
        phoneNumber = phoneNum;
    }

    let re_arr = [];

    let gateway_ok = false;
    if (!isArray(gateways)) {
        if (typeof(gateways) == "string") {
            if (gateways.trim().length > 0) {
                gateways = gateways.split(',');
                gateway_ok = true;
            }
        }
    } else { gateway_ok = true; }

    if (!gateway_ok) {
        if (isArray(sms_cfg.send_sequence)) {
            gateways = sms_cfg.send_sequence;
        } else if (typeof(sms_cfg.send_sequence) == "string") {
            gateways = sms_cfg.send_sequence.split(',');
        } else { gateways = []; }
    }

    emitter = Events.getEventEmitter('send_sms_end');

    let len = gateways.length;
    let send_ok = false;
    for (let i = 0; i < len; i++) {
        let gateway = gateways[i].trim();
        if (sms_cfg.gateways[gateway].driver) {
            try {
                let send_sms = require(sms_cfg.gateways[gateway].driver);
                let res = await send_sms(nationCode, phoneNumber, templateId, params);
                let info = { 'gateway': gateway, 'nationCode': nationCode, 'phoneNumber': phoneNumber, 'error': undefined, 'res': res };
                emitter.emit('sent', info);
                re_arr.push(info);
                send_ok = true;
                break;
            } catch (err) {
                let info = { 'gateway': gateway, 'nationCode': nationCode, 'phoneNumber': phoneNumber, 'error': err };
                emitter.emit('error', info);
                re_arr.push(info);
            }
        }
    }

    if (re_arr.length > 0) {
        if (send_ok) {
            return re_arr;
        } else {
            emitter.emit('error_all', re_arr);
            throw new SMSError('send sms all gateways fail', re_arr);
        }
    } else {
        emitter.emit('error_gateways', gateways);
        throw new SMSError('sms gateways error', gateways);
    }

};

module.exports = { "PhoneNumber": PhoneNumber, "SendSMS": SendSMS };
