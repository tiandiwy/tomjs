const require2 = require('tomjs/handlers/require2');
const sendemail = require2('tomjs/handlers/sendemail');
const render = require2('tomjs/handlers/render');
const getTitle = require2('tomjs/handlers/gettitle');
const { isObject } = require2('tomjs/handlers/tools');

module.exports = async(receivers, view_name, locals = {}) => {
    let content = await render(view_name, locals);
    let subject = undefined;
    let type = undefined;
    if(isObject(receivers))
    {
        subject = receivers.subject;
        type = receivers.type;
    }

    if (typeof(subject) != 'string') {
        subject = getTitle(content);
    }
    if (typeof(type) != 'string') {
        type = 'html';
    }

    return await sendemail(receivers, subject, type, content);
}
