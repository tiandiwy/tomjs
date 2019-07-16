
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
    return typeof(func) == "function";
}

exports.isString = function (func) {
    return typeof(func) == "string";
}

exports.clone = function (obj) {
    return Object.create(
        Object.getPrototypeOf(obj),
        Object.getOwnPropertyDescriptors(obj)
    )
}