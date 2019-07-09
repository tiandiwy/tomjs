class Eventemitter2TomError extends Error {
    constructor(message, info) {
        super(message);
        this.info = info;
        this.name = "eventemitter2_tom_error";
    }
}

module.exports = Eventemitter2TomError;