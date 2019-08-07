const require2 = require('tomjs/handlers/require2');
const { isObject } = require2('tomjs/handlers/tools');
const configs = require2('tomjs/configs')();
const __2 = require2('tomjs/handlers/__');
const UserModel = require(configs.auth.auth_model);
//提供标准的获取当前语言的全局方法

module.exports = async function (ctx, next) {
    let lang = ctx.getLocaleFromQuery(); //优先url参数    
    if (!lang) {
        lang = ctx.getLocaleFromCookie(); //否则就是Cookie设置
    }
    if (isObject(ctx.state[configs.auth.jwt_key])) { //用户已经登陆 此时有有效的session
        if (lang) { //如果cookie有设置语言类型
            if (lang != ctx.session[configs.session.language_key]) { //如果发现cookie语言类型和session不一致就 准备修改session和用户数据记录
                if (configs.system.languages.trim().split(',').indexOf(lang) >= 0) { //检测cookie的语言类型是否在范围内
                    ctx.session[configs.session.language_key] = lang;
                    let users = UserModel.Model();
                    if (users.schema.obj.language) {
                        await users.updateOne({ _id: ctx.auth.id() }, { language: lang });
                    }
                } else {
                    lang = undefined;
                }
            }
        }
        if (!lang) {
            lang = ctx.session[configs.session.language_key];
        }
    }
    if (!lang) {
        lang = ctx.getLocaleFromHeader(false); //否则看浏览器头部设置
    }
    if (typeof (lang) == "string") {
        if (configs.system.languages.trim()
            .split(',')
            .indexOf(lang) < 0) {
            lang = undefined;
        }
    }
    if (!lang) {
        lang = configs.system.Lang.trim(); //最后读取系统配置
    }
    ctx.state.lang = lang;
    ctx.lang = lang;

    //给ctx添加__翻译函数
    ctx.state.__ = function (text, lang) {
        return __2(text, (lang === undefined ? this.lang : lang));
    }
    ctx.__ = ctx.state.__;

    ctx.setlanguage = async function (lang) {
        if (isObject(ctx.state[configs.auth.jwt_key])) { //用户已经登陆 此时有有效的session
            if (lang) { //如果cookie有设置语言类型
                if (lang != ctx.session[configs.session.language_key]) { //如果发现cookie语言类型和session不一致就 准备修改session和用户数据记录
                    if (configs.system.languages.trim().split(',').indexOf(lang) >= 0) { //检测cookie的语言类型是否在范围内
                        ctx.session[configs.session.language_key] = lang;
                        let users = UserModel.Model();
                        if (users.schema.obj.language) {
                            await users.updateOne({ _id: ctx.auth.id() }, { language: lang });
                        }
                    } else {
                        lang = undefined;
                    }
                }
            }            
        }
        else {
            ctx.session[configs.session.language_key] = lang;
        }
        return lang;
    }
    return next();
};