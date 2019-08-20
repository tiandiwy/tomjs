class WSRouterRrror extends Error {
    constructor(message, info) {
        super(message);
        this.info = info;
        this.name = "WSRouterRrror";
    }
}

module.exports = WSRouterRrror;