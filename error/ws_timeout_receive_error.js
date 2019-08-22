class WSTimeOutReceiveRrror extends Error {
    constructor(message, info) {
        super(message);
        this.info = info;
        this.name = "WSTimeOutReceiveRrror";
    }
}

module.exports = WSTimeOutReceiveRrror;