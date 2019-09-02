
exports.isObject = function isObject(obj) {
    return (typeof (obj) == "object") && (!Array.isArray(obj) && obj !== null);
}

exports.isArray = (arr) => {
    return Array.isArray(arr);
}

exports.isClass = function (func_class) {
    return Object.getOwnPropertyNames(func_class.prototype).length > 1;
}

exports.isFunction = function (func) {
    return typeof (func) == "function";
}

exports.isString = function (func) {
    return typeof (func) == "string";
}

exports.clone = function (obj) {
    return Object.create(
        Object.getPrototypeOf(obj),
        Object.getOwnPropertyDescriptors(obj)
    )
}

exports.arrDelete = function (arr, item, fn) {
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

exports.arrAdd = function (arr, item, fn) {
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

exports.toBool = (val) => {
    if (typeof (val) == 'string') {
        if (val == 'false' || val == '0') { return false; }
    } else if (val === undefined) { return undefined; }
    return val ? true : false;
}