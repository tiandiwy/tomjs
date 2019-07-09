const require2 = require('tomjs/handlers/require2');
const nodemailer = require2('nodemailer');
const { isObject } = require2('tomjs/handlers/tools');
const email_cfg = require2('tomjs/configs')().email;

// 发送Email（目前使用的是阿里云SMTP发送邮件）
// receivers 目标邮箱，可以用英文逗号分隔多个。（我没试过） 也可是对象 包含属性:from、to、subject、html、text
// subject 邮件标题
// type 内容类型text或html
// content 邮件内容
// 返回 info 失败抛出异常

module.exports = (receivers, subject = '', type = 'text', content = '') => {
    return new Promise(function(resolve, reject) {
        let tran_obj = {};
        let receivers_isObj = isObject(receivers);
        if (receivers_isObj) {
            Object.assign(tran_obj, email_cfg, receivers);
        }
        else{
            tran_obj = email_cfg;
        }
        let transporter = nodemailer.createTransport(tran_obj);

        let mailOptions = {
            from: tran_obj.sender_address, // sender address
        };

        if (receivers_isObj) {
            Object.assign(mailOptions, receivers); //合并参数
            if (subject.length > 0) {
                mailOptions.subject = subject;
            }
            if (mailOptions.type === undefined || type !== 'text') {
                mailOptions.type = type;
            }
            if (content.length > 0) {
                if ((mailOptions.type.length == 4) && ((mailOptions.type == 'html') || (mailOptions.type == 'text'))) {
                    mailOptions[mailOptions.type] = content;
                } else {
                    mailOptions.text = content;
                }
            }
        } else {
            // setup e-mail data with unicode symbols
            mailOptions['to'] = receivers;
            mailOptions['subject'] = subject;
            if ((type.length == 4) && ((type == 'html') || (type == 'text'))) {
                mailOptions[type] = content;
            } else {
                mailOptions['text'] = type;
            }
        }

        transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
                reject(error);
            } else {
                resolve(info);
            }
        });
    });
}
