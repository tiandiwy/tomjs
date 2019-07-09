const require2 = require('tomjs/handlers/require2');
const XRegExp = require2('xregexp');
const regex = require2('vamtiger-regex-html-title').default;
module.exports = function (input) {
  let arr = XRegExp.exec(input, regex);
  return (arr.length>1)?arr[1]:undefined;
};