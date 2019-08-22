class WSTimeOutRrror extends Error {
    constructor(message, info) {
        super(message);
        this.info = info;
        this.name = "WSTimeOutRrror";
    }
}

module.exports = WSTimeOutRrror;