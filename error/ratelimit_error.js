class RatelimitError extends Error {
    constructor(message, info) {
        super(message);
        this.info = info;
        this.name = "RatelimitError";
    }
}

module.exports = RatelimitError;