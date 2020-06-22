const require2 = require('tomjs/handlers/require2');
const Events = require2('tomjs/handlers/events');
const { getClassName } = require2('tomjs/handlers/base_tools');
const { getClassFuncName } = require2('tomjs/handlers/listener_tools');
const { getWriter } = require2('tomjs/streams');
class BaseListener {
    constructor(EventName) {
        if (EventName === undefined) { EventName = getClassName(this); }
        this.emitter = Events.getEventEmitter(EventName);
    }

    getStreamsName() {
        return getClassFuncName(/\)[\w\W]*?\.getStreamsName[\w\W]*?at ([\w.]+) \(/g);
    }
    getStreamsWriter(config) {
        let Writer = getWriter(config ? config : getClassFuncName(/\)[\w\W]*?\.getStreamsWriter[\w\W]*?at ([\w.]+) \(/g));
        return Writer;
    }
    async streamsWriter(data, config) {
        let Writer = getWriter(config ? config : getClassFuncName(/\)[\w\W]*?\.streamsWriter[\w\W]*?at ([\w.]+) \(/g));
        return await Writer.write(data);
    }
}
module.exports = BaseListener;
