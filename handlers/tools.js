const require2 = require('tomjs/handlers/require2');
const fs = require2('fs');
const pluralize = require2('pluralize');
const humps = require2('humps');
const _ = require2('lodash');
const system_cfg = require2('tomjs/configs')().system;
const { isObject, isArray, isClass, isFunction, isString, clone, arrDelete, arrAdd, toBool, getClassName, getClassFuncName,
    getEmitFirstValue, getEmitValue, getEmitFirstValueSetCTXBody, getEmitValueSetCTXBody } = require2('tomjs/handlers/base_tools');
exports.isObject = isObject;
exports.isArray = isArray;
exports.isClass = isClass;
exports.isFunction = isFunction;
exports.isString = isString;
exports.clone = clone;
exports.arrDelete = arrDelete;
exports.arrAdd = arrAdd;
exports.toBool = toBool;
exports.getClassName = getClassName;
exports.getClassFuncName = getClassFuncName;
exports.getEmitFirstValue = getEmitFirstValue;
exports.getEmitValue = getEmitValue;
exports.getEmitFirstValueSetCTXBody = getEmitFirstValueSetCTXBody;
exports.getEmitValueSetCTXBody = getEmitValueSetCTXBody;

exports.ObjtoArray = (obj) => {
    let arr = []
    for (let i in obj) {
        arr.push(obj[i]);
    }
    return arr;
}

exports.toUnderlineName = (str) => {
    if (str.length > 0) {
        let len = str.length
        let i = 0
        let old_chat = '_'
        let newStr = ''
        for (i = 0; i < len; i++) {
            if (str[i] >= 'A' && str[i] <= 'Z') {
                newStr += ((old_chat === '_' || old_chat === '$') ? '' : '_') + str[i].toLowerCase();
            } else {
                newStr += str[i];
            }
            old_chat = str[i];
        }
        return newStr;
    } else {
        return str;
    }
}

exports.dotToUnderlineName = (str) => {
    if (str.length > 0) {
        let len = str.length
        let i = 0
        let newStr = ''
        for (i = 0; i < len; i++) {
            if (str[i] == '/') {
                if ((i > 0) && (i < len - 1)) { newStr += '.'; }
            } else {
                newStr += str[i];
            }
        }
        return newStr;
    } else {
        return str;
    }
}

exports.decamelize = (classname, excludes, plural = true, endAdd = '') => {
    let reName = classname;
    let ex_arr = []
    if (exports.isArray(excludes)) {
        ex_arr = excludes;
    }
    if (typeof (excludes) == "string") {
        if (excludes.length > 0) {
            ex_arr = [excludes];
        }
    }

    let workName = classname.toLowerCase();
    for (let i = 0, len = ex_arr.length; i < len; i++) {
        if (workName.endsWith(ex_arr[i].toLowerCase())) {
            reName = reName.substr(0, reName.length - ex_arr[i].length)
            break;
        }
    }
    reName = exports.toUnderlineName(reName);
    if (plural) {
        reName = pluralize.plural(reName);
    }
    if (endAdd.length > 0) {
        if (!reName.toLowerCase()
            .endsWith(endAdd.toLowerCase())) {
            reName += endAdd;
        }
    }
    return reName;
}

exports.camelize = (classname, excludes, pascalize = true, singular = true, endAdd = '') => {
    let reName = classname;
    let ex_arr = []
    if (exports.isArray(excludes)) {
        ex_arr = excludes;
    }
    if (typeof (excludes) == "string") {
        if (excludes.length > 0) {
            ex_arr = [excludes];
        }
    }
    let workName = classname.toLowerCase();
    for (let i = 0, len = ex_arr.length; i < len; i++) {
        if (workName.endsWith(ex_arr[i].toLowerCase())) {
            reName = reName.substr(0, reName.length - ex_arr[i].length)
            break;
        }
    }

    if (pascalize) { reName = humps.pascalize(reName); } else { reName = humps.camelize(reName); }
    if (singular) {
        reName = pluralize.singular(reName);
    }
    if (endAdd.length > 0) {
        if (!reName.toLowerCase()
            .endsWith(endAdd.toLowerCase())) {
            reName += endAdd;
        }
    }
    return reName;
}
exports.getObjAllFuncName = function getObjAllFuncName(obj, base_name) {
    let re = {};
    if (exports.isObject(obj) && obj.constructor.name !== base_name && obj.constructor.name != "Object") {
        re = getObjAllFuncName(Object.getPrototypeOf(obj), base_name);
    } else { return {}; }
    let arr = Object.getOwnPropertyNames(obj);
    let len = arr.length;
    for (let i = 0; i < len; i++) {
        if (typeof (obj[arr[i]]) == "function" && arr[i] != "constructor") {
            re[arr[i]] = null;
        }
    }
    return re;
}

exports.select_fields = (only_arr = [], except_arr = [], add_fields = {}, except_value = -1) => {
    let reShowFields = {};
    let reShowFields_ok = false;
    let populateShowFields = undefined;
    let add_is_show = 0;
    let first = true;
    let add_fields_arr = [];
    for (let idx in add_fields) {
        if (first) {
            first = false;
            add_is_show = add_fields[idx];
        }
        add_fields_arr.push(idx);
    }
    if (exports.isArray(only_arr)) {
        if (only_arr.length > 0) {
            if (add_is_show == 1) {
                populateShowFields = _.intersection(add_fields_arr, only_arr); //获取交集
            } else {
                populateShowFields = only_arr;
            }
        }
    }
    let populateHideFields = undefined;
    if (exports.isArray(except_arr)) {
        if (except_arr.length > 0) {
            if (add_is_show < 0) {
                populateShowFields = _.union(add_fields_arr, except_arr); //获取合集
            } else {
                populateHideFields = except_arr;
            }
        }
    }

    if (populateShowFields === undefined) {
        if (exports.isArray(populateHideFields)) {
            let len = populateHideFields.length;
            for (let i = 0; i < len; i++) {
                reShowFields[populateHideFields[i]] = except_value;
                reShowFields_ok = true;
            }
        }
    } else if (exports.isArray(populateHideFields)) {
        let len = populateHideFields.length;
        for (let i = 0; i < len; i++) {
            let idx = populateShowFields.indexOf(populateHideFields[i]);
            if (idx >= 0) {
                populateShowFields.splice(idx, 1);
            }
        }
    }
    if (exports.isArray(populateShowFields)) {
        if (
            (populateHideFields === undefined || (exports.isArray(populateHideFields) && populateHideFields.indexOf('id') < 0)) &&
            populateShowFields.indexOf('id') < 0
        ) {
            populateShowFields.push('id');
        }
        let len = populateShowFields.length;
        for (let i = 0; i < len; i++) {
            reShowFields[populateShowFields[i]] = 1;
            reShowFields_ok = true;
        }
    }

    return reShowFields_ok ? reShowFields : (first ? undefined : add_fields);
}

exports.selectMustHave = (fields = {}, must_fields = {}) => {
    let select = true;
    for (let idx in fields) {
        if (idx != 'id') { select = (fields[idx] === 1); break; }
    }
    for (let idx in must_fields) {
        if (select) {
            if (!fields[idx]) { fields[idx] = 1; }
        } else {
            if (fields[idx]) { delete fields[idx]; }
        }
    }
}

exports.readFile = function readFile(path, options) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, options, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    })
}

exports.renameFile = function renameFile(sourceFile, destPath) {
    return new Promise((resolve, reject) => {
        fs.rename(sourceFile, destPath, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        })
    })
}

exports.valuesHideFields = function (fileds, values) {
    for (let idx in fileds) {
        if (!exports.isObject(fileds[idx])) {
            if (exports.isArray(values)) {
                let values_len = values.length;
                for (let j = 0; j < values_len; j++) {
                    if (idx in values[j]) { if (!exports.toBool(fileds[idx])) { delete values[j][idx]; } }
                }
            }
            else { if (idx in values) { if (!exports.toBool(fileds[idx])) { delete values[idx]; } } }
        }
        else {
            if (exports.isArray(values)) {
                let values_len = values.length;
                for (let j = 0; j < values_len; j++) {
                    if (idx in values[j]) { values[j][idx] = exports.valuesHideFields(fileds[idx], values[j][idx]); }
                }
            }
            else { if (idx in values) { values[idx] = exports.valuesHideFields(fileds[idx], values[idx]); } }
        }
    }
    return values;
}

//getUrlDomain 如果为false，如果服务器域名为 localhost 并且端口号为80 443 就会返回
//如果 defUrlDomain 有值 并为 string: 表示localhost 以 http:// 或 https:// 开头就是完全替换 没有就表示只替换域名部分（只替换域名部分总是生效）
exports.getUrlDomain = function (defUrlDomain) {
    let str_port = '';
    if (system_cfg.server_url_type.trimLeft().toLowerCase().startsWith('https') && (system_cfg.server_https_port != 443)) {
        str_port = ":" + system_cfg.server_https_port;
    }
    if (system_cfg.server_url_type.trimLeft().toLowerCase().startsWith('http') && (system_cfg.server_http_port != 80)) {
        str_port = ":" + system_cfg.server_http_port;
    }
    let server_host = system_cfg.server_host;
    const isAllUrl = system_cfg.server_host.trimLeft().toLowerCase().startsWith('http');
    let url = isAllUrl ? system_cfg.server_host : system_cfg.server_url_type + system_cfg.server_host;
    if (isString(defUrlDomain)) {
        if (defUrlDomain.trimLeft().toLowerCase().startsWith('https://') || defUrlDomain.trimLeft().toLowerCase().startsWith('http://')) {
            url = defUrlDomain;
        }
        else{
            url = system_cfg.server_url_type + defUrlDomain;
            server_host = defUrlDomain;
        }
    }
    else if (defUrlDomain === false) {
        url = "";
    }
    if ((str_port.length > 0 || (server_host.trim().toLowerCase() != 'localhost'))&& !isAllUrl && defUrlDomain !== false) {
        url = system_cfg.server_url_type + server_host + str_port;
    }
    return url;
}