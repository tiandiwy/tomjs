const require2 = require('tomjs/handlers/require2');
const LaravelRouter = require2('tomjs/router/main-router');

class WSSocketRouter extends LaravelRouter {
    constructor() {
        super('./websocket');
    }
}
module.exports = WSSocketRouter;