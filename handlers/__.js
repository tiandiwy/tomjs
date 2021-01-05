const require2 = require('tomjs/handlers/require2');
const system_cfg = require2('tomjs/configs')().system;
const path = require2('path');
const AppDir = require2('tomjs/handlers/dir');
const { isString } = require2('tomjs/handlers/base_tools');
//text 要翻译的文本
//lang 指定语言 string 

function __(text, lang) {
    let sLang = system_cfg.Lang;

    if (isString(lang) && lang.length > 0) {
        sLang = lang;
    }

    let loadOK = false;
    let _lang = undefined;
    try {
        _lang = require(path.join(AppDir(), './language/') + sLang);
        loadOK = true;
    } catch (e) { loadOK = false; }
    if (loadOK) {
        try {
            let arr = text.split(".", 2);
            if (arr.length < 2) {
                arr = ["default", text];
            }
            if (_lang[arr[0]][arr[1]]!==undefined) { return _lang[arr[0]][arr[1]]; } else { return text; }
        } catch (e) { return text; }
    } else { return text; }
}
module.exports = __;