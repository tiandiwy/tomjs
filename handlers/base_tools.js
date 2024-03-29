const fs = require("fs");
const path = require("path");

function isObject(obj) {
    return (typeof (obj) == "object") && (!Array.isArray(obj) && obj !== null);
}

function isArray(arr) {
    return Array.isArray(arr);
}

function isClass(func_class) {
    return Object.getOwnPropertyNames(func_class.prototype).length > 1;
}

function isFunction(func) {
    return typeof (func) == "function";
}

function isString(func) {
    return typeof (func) == "string";
}

function isNumber(val) {
    if (typeof val !== 'number') {
        return false;
    }
    if (!isNaN(val)) {
        return true;
    } else {
        return false;
    }
}

function clone(obj) {
    return Object.create(
        Object.getPrototypeOf(obj),
        Object.getOwnPropertyDescriptors(obj)
    )
}

function arrDelete(arr, item, fn) {
    let idx = undefined;
    if (fn) {
        idx = arr.findIndex(fn);
    } else {
        idx = arr.indexOf(item);
    }
    if (idx >= 0) {
        arr.splice(idx, 1);
    }
    return arr;
}

function arrAdd(arr, item, fn) {
    let idx = undefined;
    if (fn) {
        idx = arr.findIndex(fn);
    } else {
        idx = arr.indexOf(item);
    }
    if (idx < 0) {
        arr.push(item);
    }
    return arr;
}

function toBool(val) {
    if (typeof (val) == 'string') {
        if (val == 'false' || val == '0') { return false; }
    } else if (val === undefined) { return undefined; }
    return val ? true : false;
}

function toObject(val) {
    if (typeof (val) == 'string') {
        try {
            val = JSON.parse(val);
        }
        catch (error) { val = undefined; }
    } else if (val === undefined) { return undefined; }
    return val;
}

function formatReplace(str) {
    const arguments_count = arguments.length;
    if (arguments.length == 1) {
        return str;
    }

    for (let i = 1; i < arguments_count; i++) {
        str = str.replace(new RegExp("\\{" + (i - 1) + "\\}", "g"), arguments[i]);
    }
    return str;
}

function getClassName(obj) {
    if (obj && obj.constructor && obj.constructor.toString()) {
        if (obj.constructor.name) {
            return obj.constructor.name;
        }
        let str = obj.constructor.toString();
        let arr;
        if (str.charAt(0) == '[') {
            arr = str.match(/\w+\s∗(\w+)\w+\s∗(\w+)/);
        } else {
            arr = str.match(/function\s*(\w+)/);
        }
        if (arr && arr.length == 2) {
            return arr[1];
        }
    }
    return undefined;
}

function getClassFuncName(regx = /\)[\w\W]*?at ([\w.]+) \(/g) {
    let callerName;
    try { throw new Error(); }
    catch (e) {
        let m = regx.exec(e.stack);
        callerName = m[1] || m[2];
    }
    return callerName;
}

function getFuncParamNames(fn) {
    let result = [];
    if (typeof fn === 'object' || typeof fn === 'function') {
        const COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        const DEFAULT_PARAMS = /=[^,)]+/mg;
        const FAT_ARROWS = /=>.*$/mg;
        let code = fn.prototype ? fn.prototype.constructor.toString() : fn.toString();
        code = code
            .replace(COMMENTS, '')
            .replace(FAT_ARROWS, '')
            .replace(DEFAULT_PARAMS, '');
        result = code.slice(code.indexOf('(') + 1, code.indexOf(')')).match(/([^\s,]+)/g);
        result === null ? [] : result;
    }
    return result;
}

function getEmitFirstValue(arr) {
    let value = undefined;
    if (isArray(arr)) {
        let len = arr.length;
        for (let i = 0; i < len; i++) {
            if (arr[i] !== undefined) {
                value = arr[i];
                break;
            }
        }
    }
    return value;
}

function getEmitFirstValueSetCTXBody(ctx, arr) {
    let newValue = getFirstValue(arr);
    if (newValue !== undefined) {
        if (!ctx.body) {
            if (!isObject(ctx)) { ctx = {}; }
        }
        ctx.body = newValue;
    }
}

function getEmitValue(arr) {
    let value = undefined;
    if (isArray(arr)) {
        let len = arr.length;
        for (let i = 0; i < len; i++) {
            if (arr[i] !== undefined) {
                if (value == undefined) {
                    value = arr[i];
                }
                else {
                    if (isObject(value)) {
                        if (isObject(arr[i])) {
                            Object.assign(value, arr[i]);
                        }
                        else {
                            value[i] = arr[i];
                        }
                    }
                    else if (isArray(value)) {
                        value.push(arr[i]);
                    }
                    else {
                        value = arr[i];
                    }
                }
            }
        }
    }
    return value;
}

function getEmitValueSetCTXBody(ctx, arr) {
    let newValue = getEmitValue(arr);
    if (newValue !== undefined) {
        if (!ctx.body) {
            if (!isObject(ctx)) { ctx = {}; }
        }
        if (isObject(newValue)) {
            ctx.body = Object.assign(JSON.parse(JSON.stringify(ctx.body)), newValue);
        }
        else {
            ctx.body = newValue;
        }
    }
}
// 递归创建目录 异步方法  
function mkdirs(dirname, callback) {
    fs.exists(dirname, function (exists) {
        if (exists) {
            callback();
        } else {
            mkdirs(path.dirname(dirname), function () {
                fs.mkdir(dirname, callback);
            });
        }
    });
}
// 递归创建目录 同步方法
function mkdirsSync(dirname) {
    if (fs.existsSync(dirname)) {
        return true;
    } else {
        if (mkdirsSync(path.dirname(dirname))) {
            fs.mkdirSync(dirname);
            return true;
        }
    }
}

module.exports = {
    isObject, isArray, isClass, isFunction, isString, isNumber, clone, arrDelete, arrAdd, toBool, toObject, getClassName, getClassFuncName, getFuncParamNames, formatReplace,
    getEmitFirstValue, getEmitValue, getEmitFirstValueSetCTXBody, getEmitValueSetCTXBody, mkdirs, mkdirsSync,
}