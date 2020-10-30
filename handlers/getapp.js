let global_app = undefined;

module.exports = (app) => {
    if (app) {
        global_app = app;
    }
    return global_app;
};