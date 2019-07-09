class DatabaseConfigError extends Error {
    constructor(message, info) {
        super(message);
        this.info = info;
        this.name = "DatabaseConfigError";
    }
}

module.exports = DatabaseConfigError;