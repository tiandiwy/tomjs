const require2 = require('tomjs/handlers/require2');
const randomize = require2('randomatic');
const pbkdf2 = require2('pbkdf2');
const auth_cfg = require2('tomjs/configs')().auth;

class Password {
    //将密码明文通过bcrypt方法生成hash值
    static hash(password, salt, digest) {
        return new Promise(function(resolve, reject) {
            if (!salt) { salt = randomize('Aa0', auth_cfg.password_salt_length); }
            if (!digest) { digest = auth_cfg.password_digest; }
            pbkdf2.pbkdf2(password, salt, 1, 32, digest, function(err, derivedKey) {
                if (err) { reject(err); } else {
                    resolve('pbkdf2:' + digest + '$' + salt + '$' + derivedKey.toString('hex'));
                }
            });
        });
    }

    //将密码明文(password)和密码hash进行对比，查看是否一致
    static async compare(password, hash) {
        let re = false;
        if (hash[0] === 'p') {
            let hash_arr = hash.split('$');
            if (hash_arr.length == 3) {
                let digest_arr = hash_arr[0].split(':');
                if (digest_arr.length == 2) {
                    if (digest_arr[0] == 'pbkdf2') {
                        let digest = digest_arr[1];
                        let salt = hash_arr[1];
                        re = (hash == await Password.hash(password, salt, digest));
                    }
                }
            }
        } else {
            let pbkdf2 = require('./bcrypt');
            re = await pbkdf2.compare(password, hash);
        }
        return re;
    }
}

module.exports = Password;
