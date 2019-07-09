class StreamsError extends Error {
    constructor(message, info) {
        super(message);
        this.info = info;
        this.name = "StreamsError";
    }
}
StreamsError.STREAM_NOT_FIND_ERROR = "StreamsError: stream not find error";
StreamsError.SERVER_CONFIG_NOT_FIND_ERROR = "StreamsError: server config not find error";
StreamsError.STREAM_NAME_NOT_FIND_ERROR = "StreamsError: stream name not find error";
StreamsError.TYPE_NOT_FIND_ERROR = "StreamsError: type not find error";

StreamsError.STREAM_CONSUMERS_NOT_FIND_ERROR = "StreamsError: consumer not find error";
StreamsError.SERVER_CONSUMERS_GROUP_NOT_FIND_ERROR = "StreamsError: consumer group not find error";
StreamsError.STREAM_CONSUMERS_NAME_NOT_FIND_ERROR = "StreamsError: consumer name not find error";
StreamsError.STREAM_CONSUMERS_FUNC_NOT_FIND_ERROR = "StreamsError: consumer func not find error";
StreamsError.STREAM_CONSUMERS_CLASS_FUNC_NOT_FIND_ERROR = "StreamsError: consumer class func not find error";
StreamsError.STREAM_CONSUMERS_FUNC_LOAD_ERROR = "StreamsError: consumer func load error";

module.exports = StreamsError;