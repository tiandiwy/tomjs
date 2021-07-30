const require2 = require('tomjs/handlers/require2');
const cfg = require2('tomjs/configs')();
const Validator = require2('validatorjs_tom');
const mongoose = require2('mongoose');
//const path = require2('path');
//const AppDir = require2('tomjs/handlers/dir');
const { isArray } = require2('tomjs/handlers/base_tools');
const Cache = require2('tomjs/cache');
const LoadClass = require2('tomjs/handlers/load_class');

let captcha_cache = Cache(cfg.captcha.cache_name, cfg.captcha.cache_options);

function buildValue(value) {
    let where = value.trim();
    if (where[0] == "{" && where[where.length - 1] == '}') {
        try { where = JSON.parse(where); }
        catch (error) { where = value; }
    }
    else { where = value; }
    return where;
}

Validator.useLang(cfg.system.Lang); //设置默认语言类型
Validator.registerAsync('unique', async function (value, attribute, value_name, passes) {
    // do your database/api checks here etc
    // then call the `passes` method where appropriate:
    //passes(); // if username is available
    let Re = false;
    let attribute_arr = attribute.split(/(?<!\{[^}]*),(?![^{]*\})/);//以逗号分割，但不包括{}中的逗号

    if (attribute_arr.length > 0) {
        let attr_arr = [undefined, undefined, undefined, undefined, undefined, undefined]; //表名，字段名，排除值（默认id字段），排除值的字段，条件字段，条件值
        let temp = '';
        for (let i = 0, len = attribute_arr.length; i < len; ++i) {
            temp = attribute_arr[i].trim();
            if (temp == 'null') {
                if (i == 1) { temp = value_name; } else { continue; }
            }
            attr_arr[i] = temp;
        }
        let collection = attr_arr[0];
        try {
            let model = undefined;
            try {
                let nModel = await LoadClass('model', collection);
                model = nModel.Model();
            } catch (e) {
                if (mongoose.modelNames()
                    .indexOf(collection) >= 0) {
                    //已经有定义了
                    model = mongoose.model(collection);
                } else { model = mongoose.model(collection, new mongoose.Schema({})); }
            }
            let field = attr_arr[1];
            let where = {};
            where[field] = value;
            if (attr_arr[2] !== undefined) {
                if (attr_arr[3] === undefined) { attr_arr[3] = '_id'; }
                where[attr_arr[3]] = { $ne: attr_arr[2] };
            }
            if ((attr_arr[4] !== undefined) && (attr_arr[5] !== undefined)) {
                where[attr_arr[4]] = buildValue(attr_arr[5]);
            }
            let outLen = 5;
            while (attr_arr.length - outLen > 2) {
                where[attr_arr[outLen + 1]] = buildValue(attr_arr[outLen + 2]);
                outLen += 2;
            }
            let data = await model.countDocuments(where);
            Re = (data <= 0);
        } catch (e) {
            Re = false;
        }
    }
    if (Re) { passes(); } else { passes(false); } // if username is not available
});

async function base_exists(value, attribute, value_name, passes) {
    // do your database/api checks here etc
    // then call the `passes` method where appropriate:
    //passes(); // if username is available
    let Re = false;
    let attribute_arr = attribute.split(/(?<!\{[^}]*),(?![^{]*\})/);//以逗号分割，但不包括{}中的逗号

    if (attribute_arr.length > 0) {
        let attr_arr = [undefined, undefined, undefined, undefined, undefined, undefined, undefined]; //表名，字段名，排除值（默认id字段），排除值的字段，条件字段，条件值
        let temp = '';
        for (let i = 0, len = attribute_arr.length; i < len; ++i) {
            temp = attribute_arr[i].trim();
            if (temp == 'null' || temp == '') {
                if (i == 1) { temp = value_name; } else { continue; }
            }
            attr_arr[i] = temp;
        }
        let collection = attr_arr[0];
        try {
            let model = undefined;
            try {
                let nModel = await LoadClass('model', collection);
                model = nModel.Model();
            } catch (e) {
                if (mongoose.modelNames()
                    .indexOf(collection) >= 0) {
                    //已经有定义了
                    model = mongoose.model(collection);
                } else { model = mongoose.model(collection, new mongoose.Schema({})); }
            }
            let field = attr_arr[1];
            let where = {};
            if (isArray(value)) {
                where['$or'] = [];
                value.forEach(value_one => {
                    let obj = {};
                    obj[field] = value_one;
                    where['$or'].push(obj);
                });
            }
            else { where[field] = value; }
            if (attr_arr[2] !== undefined) {
                if (attr_arr[3] === undefined) { attr_arr[3] = 'id'; }
                where[attr_arr[3]] = { $ne: attr_arr[2] };
            }
            if ((attr_arr[4] !== undefined) && (attr_arr[5] !== undefined)) {
                where[attr_arr[4]] = buildValue(attr_arr[5]);
            }
            let outLen = 5;
            while (attr_arr.length - outLen > 2) {
                where[attr_arr[outLen + 1]] = buildValue(attr_arr[outLen + 2]);
                outLen += 2;
            }
            let data = await model.countDocuments(where);
            if (isArray(value)) {
                Re = (data == value.length);
            }
            else {
                Re = (data > 0);
            }
        } catch (e) {
            Re = false;
        }
    }
    if (Re) { passes(); } else { passes(false); } // if username is not available
}

Validator.registerAsync('exists', async function (value, attribute, value_name, passes) {
    if (!isArray(value)) {
        return base_exists(value, attribute, value_name, passes);
    }
    else {
        passes(false);
    }
});

Validator.registerAsync('array_exists', async function (value, attribute, value_name, passes) {
    if (isArray(value)) {
        return base_exists(value, attribute, value_name, passes);
    }
    else {
        passes(false);
    }
});

Validator.registerAsync('captcha', async function (value, attribute, value_name, passes) {
    let key = value_name + ':' + attribute;
    let Re = await captcha_cache.get(key) === value.toLowerCase();
    await captcha_cache.del(key);
    if (Re) { passes(); } else { passes(false); }
});

Validator.registerAsync('nullable', function (value, attribute, value_name, passes) {
    let Re = (value === null) || (value === undefined) || (value === '') || (value === 0)
    if (Re) { passes(); } else { passes(false); }
});

Validator.PromiseValidator = (data, rules, customErrorMessages, attributeNames) => {
    let validator = new Validator(data, rules, customErrorMessages);
    if (attributeNames !== undefined) {
        validator.setAttributeNames(Object.assign({}, validator.getAttributeNames(), attributeNames));
    }
    if (validator.hasAsync) {
        return new Promise((resolve) => {
            validator.setPassesFails(function () { resolve(validator); },
                function () { resolve(validator) });
        })
    } else {
        if (validator.fails()) {
            if (validator.errorCount <= 0) { validator.errorCount = 1 }
        }
        return validator
    }
}

module.exports = Validator
