class SMSError extends Error {
    constructor(message, info) {
        super(message);
        this.info = info;
        this.name = "SMSError";
    }
}

module.exports = SMSError;