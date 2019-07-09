let app_dir = undefined;
module.exports = (dir) => {
    if (dir) {
        app_dir = dir;
    }
    return app_dir;
};