const require2 = require('tomjs/handlers/require2');
const { isObject, isArray, isClass, isFunction, isString, getClassFuncName } = require2('tomjs/handlers/base_tools');
const auth_cfg = require2('tomjs/configs')().auth;
const streams_cfg = require2('tomjs/configs')().streams;
const StreamsError = require2('tomjs/error/streams_error');

exports.isObject = isObject;
exports.isArray = isArray;
exports.isClass = isClass;
exports.isFunction = isFunction;
exports.isString = isString;
exports.getClassFuncName = getClassFuncName;

exports.getUserIDByCTX = (ctx) => {
    let user_id = undefined;
    try { user_id = ctx.state[auth_cfg.jwt_key][auth_cfg.jwt_key_id]; }
    catch (e) { user_id = undefined; }
    return user_id;
};

exports.getStreamType = function getStreamType(type) {
    if (type == 'default' || type === undefined) {
        type = streams_cfg.type_default;
    }
    if (!streams_cfg.types[type]) {
        throw new StreamsError(StreamsError.TYPE_NOT_FIND_ERROR, type);
    }
    return require2(streams_cfg.types[type]);
};

exports.analysisConfig = function analysisConfig(config_name) {
    const nameSplit = '.';
    const stream_cfg = streams_cfg.streams;
    const stream_def_cfg = streams_cfg.stream_default;

    let config = {};
    if (isObject(config_name)) {
        config = config_name;
    }
    else if (typeof (config_name) == 'string') {
        //解读配置
        const nameArr = config_name.split(nameSplit);//将类名和函数名通过 . 区分开来
        //先处理完整函数名和配置下边名的字符替换问题
        let idxName = config_name;
        if ((streams_cfg.split != nameSplit) && (nameArr.length > 1)) {
            idxName = '';
            let len = nameArr.length;
            for (let i = 0; i < len; i++) {
                idxName += (i == 0 ? '' : streams_cfg.split) + nameArr[i];
            }
        }

        //idxName就是已经字符替换好的配置下边名
        if (isObject(stream_cfg[idxName])) {
            config = stream_cfg[idxName];
            if (config['stream'] === undefined) {
                config['stream'] = idxName;
            }
        }
        else if (isObject(stream_cfg[nameArr[0]]) && streams_cfg.can_stream_class) {
            config = stream_cfg[nameArr[0]];
            config['stream'] = idxName;
        } else if (isObject(stream_def_cfg) && streams_cfg.can_stream_default) {
            config = stream_def_cfg;
            config['stream'] = idxName;
        }
    }

    if (!config['server']) {
        throw new StreamsError(StreamsError.SERVER_CONFIG_NOT_FIND_ERROR, config_name);
    }
    if (!config['stream']) {
        throw new StreamsError(StreamsError.STREAM_NAME_NOT_FIND_ERROR, config_name);
    }

    return config;
}