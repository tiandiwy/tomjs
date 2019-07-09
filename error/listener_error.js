class ListenerError extends Error {
    constructor(message, info) {
        super(message);
        this.info = info;
        this.name = "ListenerError";
    }
}

module.exports = ListenerError;