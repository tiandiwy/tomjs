module.exports = function buildError(message, data, code, name) {
    let err = new Error(message);
    if (data) { err.data = data; }
    if (code) { err.data = code; }
    if (name) { err.name = name; }
    throw err;
}