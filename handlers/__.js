const require2 = require('tomjs/handlers/require2');
const system_cfg = require2('tomjs/configs')().system;
const path = require2('path');
const AppDir = require2('tomjs/handlers/dir');
//text 要翻译的文本
//lang 指定语言 string 

function __(text, lang) {
    let sLang = system_cfg.Lang;

    if (lang !== undefined) {
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
            if (_lang[text]) { return _lang[text]; } else { return text; }
        } catch (e) { return text; }
    } else { return text; }
}
module.exports = __;