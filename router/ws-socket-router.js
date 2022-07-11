const require2 = require('tomjs/handlers/require2');
const LaravelRouter = require2('tomjs/router/main-router');

class WSSocketRouter extends LaravelRouter {
    constructor() {
        super('./websocket');
        this.auth(false, false);
    }
}
module.exports = WSSocketRouter;