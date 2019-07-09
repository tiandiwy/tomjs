const require2 = require('tomjs/handlers/require2');
const { analysisConfig, getStreamType } = require2('tomjs/handlers/listener_tools');
function getWriter(config_name) {
    const config = analysisConfig(config_name);
    let stream = getStreamType(config.type);
    return stream.getWriter(config);
}
function getConsumer(config_name, group_name, consumer_name) {
    const config = analysisConfig(config_name);
    let stream = getStreamType(config.type);
    return stream.getConsumer(config, group_name, consumer_name);
}
module.exports = { getWriter, getConsumer };