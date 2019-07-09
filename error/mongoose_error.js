class MongooseError extends Error {
    constructor(message, info) {
        super(message);
        this.info = info;
        this.name = "MongooseError";
    }
}

module.exports = MongooseError;