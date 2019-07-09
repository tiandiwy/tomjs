class ForgotpasswordError extends Error {
    constructor(message, info) {
        super(message);
        this.info = info;
        this.name = "ForgotpasswordError";
    }
}

module.exports = ForgotpasswordError;