const require2 = require('tomjs/handlers/require2');
//const EventEmitter = require('events');//.EventEmitter;
const EventEmitter = require2('tomjs/handlers/eventemitter2_tom'); //.EventEmitter2
const path = require2('path');
const app_dir = require2('tomjs/handlers/dir')();
//const ListenerError = require2('tomjs/error/listener_error');
const { isObject, isArray, getObjAllFuncName, isClass } = require2('tomjs/handlers/tools');
const listener_cfg = require2('tomjs/configs')().listener;
const events_cfg = require2('tomjs/configs')().events;

let event_names = {};

class Events {
    constructor() { }

    addListenerObj(emitter, file_name, func_names = '') {
        func_names = func_names.trim();

        let listener = undefined;
        let listenerIsClass = false;
        let filename = path.join(app_dir, './listeners/', file_name);
        let listener_class = require(filename);
        listenerIsClass = isClass(listener_class);
        if (listenerIsClass) {
            listener = new listener_class(); //自动抛出出错，以便开发人员知道配置错误
        }
        else {
            listener = listener_class;
            if (func_names.length <= 0) {
                func_names = listener.name;
            }
        }
        let all_fn_name_old = getObjAllFuncName(listener, "BaseListener");
        let all_fn_name = {};
        let isOneFunc = false;
        if (func_names.length > 0) {
            let func_arr = func_names.split(',');
            if (func_arr.length == 1 && !listenerIsClass) {
                isOneFunc = true;
            }
            else {
                let all_exclude = true;
                for (let func_name of func_arr) {
                    func_name = func_name.trim();
                    if (func_name.length > 0) {
                        if (func_name[0] == '-') {
                            func_name = func_name.substr(1);
                            if (all_fn_name_old[func_name] !== undefined) {
                                delete all_fn_name_old[func_name];
                            }
                        }
                        else {
                            if (all_fn_name_old[func_name] !== undefined) {
                                all_fn_name[func_name] = null;
                                all_exclude = false;
                            }
                        }
                    }
                }
                if (all_exclude) {
                    all_fn_name = all_fn_name_old;
                }
            }
        }
        else {
            all_fn_name = all_fn_name_old;
        }
        if (isOneFunc) {
            if (func_names.length <= 0) { func_names = '*'; }
            emitter.addListener(events_cfg.wildcard ? func_names.replace(/\$/g, '*') : func_names, listenerIsClass ? listener[func_names] : listener);
        }
        else {
            for (let fn_name in all_fn_name) {
                emitter.addListener(events_cfg.wildcard ? fn_name.replace(/\$/g, '*') : fn_name, listener[fn_name]);
            }
        }
    }

    getEventEmitter(name) {
        if (!isObject(event_names[name])) {
            event_names[name] = new EventEmitter(Object.assign({}, events_cfg, { delimiter: '_' }));
            let names = [];
            if (typeof (listener_cfg[name]) == "string") {
                names = listener_cfg[name].split(';');
            } else if (isArray(listener_cfg[name])) {
                names = listener_cfg[name];
            }
            let len = names.length;
            for (let i = 0; i < len; i++) {
                let file_arr = names[i].split('@');
                this.addListenerObj(event_names[name], file_arr[0], file_arr.length > 1 ? file_arr[1] : '');
            }
        }
        return event_names[name];
    }
};
module.exports = new Events;