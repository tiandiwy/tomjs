const require2 = require('tomjs/handlers/require2');
const bcrypt = require2('bcrypt');
const auth_cfg = require2('tomjs/configs')().auth;

class Password {
    //将密码明文通过bcrypt方法生成hash值
    static async hash(password) {
        return await bcrypt.hash(password, await bcrypt.genSalt(auth_cfg.password_salt_length));
    }

    //将密码明文(password)和密码hash进行对比，查看是否一致
    static async compare(password, hash) {
        let re = false;
        try {
            if (hash[0] === '$') {
                re = await bcrypt.compare(password, hash);
            } else {
                let pbkdf2 = require('./pbkdf2');
                re = await pbkdf2.compare(password, hash);
            }
        } catch (e) { re = false; }
        return re;
    }
}

module.exports = Password;
