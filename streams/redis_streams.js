const require2 = require('tomjs/handlers/require2');
const { Writer, Consumer } = require2('redis-currents');
const { isObject } = require2('tomjs/handlers/listener_tools');

const split = ';';

let RedisStreamsWriterArr = [];//缓存所有的已经使用的Writer
//config_name 可以是配置名称、也可以直接就是一个完整配置对象,或是 redis_cfg加;加stream_name  形式的字符串
function getWriter(config) {
  //检测是否以已经有存在的Writer，如果没有就新建
  let str = ((isObject(config['server']) ? JSON.stringify(config['server']) : config['server']) + split + config['stream']).trim().toLowerCase();
  if (!RedisStreamsWriterArr[str]) {
    RedisStreamsWriterArr[str] = new Writer(config['server'], config['stream']);
  }
  return RedisStreamsWriterArr[str];
}

let RedisStreamsConsumerArr = [];//缓存所有的已经使用的Consumer
//config_name 可以是配置名称、也可以直接就是一个完整配置对象,或是 redis_cfg加;加stream_name  形式的字符串
function getConsumer(config, group_name, consumer_name) {
  //检测是否以已经有存在的Consumer，如果没有就新建
  let str = ((isObject(config['server']) ? JSON.stringify(config['server']) : config['server']) + split + config['stream'] + split + group_name + split + consumer_name).trim().toLowerCase();
  if (!RedisStreamsConsumerArr[str]) {
    RedisStreamsConsumerArr[str] = new Consumer(config['server'], config['stream'], group_name, consumer_name);
  }
  return RedisStreamsConsumerArr[str];
}
module.exports = { getWriter, getConsumer };