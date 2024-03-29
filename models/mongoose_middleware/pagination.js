const require2 = require('tomjs/handlers/require2');
const { isArray, isObject, valuesHideFields } = require2('tomjs/handlers/tools');
const models_cfg = require2('tomjs/configs')().models;
module.exports = function (mongoose) {
    if (!isObject(mongoose)) {
        mongoose = require2("mongoose");
    }
    this.mongoose = mongoose;
    init();
    return paginatePlugin;

    function init() {
        if (this.mongoose.Query.prototype.paginate != null) {
            return
        }

        this.mongoose.Query.prototype.paginate = async function paginate(page_or_ctx, limit) {
            let page = 0;
            if (isObject(page_or_ctx) && isObject(page_or_ctx[models_cfg.pagination.ctx_field])) {
                if (page_or_ctx[models_cfg.pagination.ctx_field][models_cfg.pagination.pageindex]) {
                    page = parseInt(page_or_ctx[models_cfg.pagination.ctx_field][models_cfg.pagination.pageindex]);
                }
                if ((limit === null || limit === undefined)
                    && page_or_ctx[models_cfg.pagination.ctx_field][models_cfg.pagination.pagesize]
                ) { limit = parseInt(page_or_ctx[models_cfg.pagination.ctx_field][models_cfg.pagination.pagesize]); }
            }
            else { page = parseInt(page_or_ctx); }
            if (isNaN(limit)) {
                limit = models_cfg.pagination.pagesize_default;
                limit = isNaN(limit) ? 10 : limit;
            }
            const limit_min = models_cfg.pagination.pagesize_min;
            if (!isNaN(limit_min)) {
                limit = limit < limit_min ? limit_min : limit;
            }
            const limit_max = models_cfg.pagination.pagesize_max;
            if (!isNaN(limit_max)) {
                limit = limit >= limit_max ? limit_max : limit;
            }
            if (limit < 1) { limit = 1; }
            page = isNaN(page) ? 0 : page;
            page = page < 1 ? 1 : page;
            let query = this;
            const model = this.model;
            const total = await model.countDocuments(query._conditions);
            const max_page = parseInt(total / limit, 10) + (total % limit == 0 ? 0 : 1);


            const skipFrom = (page * limit) - limit;

            query = query.skip(skipFrom).limit(limit);
            this[models_cfg.pagination.pagination_info] = { page, max_page, limit, total };
            return this;
        };
    };

    function getValues(values, hideFields) {
        if (isObject(values) && typeof (values.toJSON) == "function") {
            let value = values.toJSON();
            if (isObject(hideFields)) { value = valuesHideFields(hideFields, value); }
            return value;
        } else if (isArray(values)) {
            let len = values.length;
            let one = undefined;
            let all = [];
            for (let i = 0; i < len; i++) {
                one = values[i];
                if (isObject(one) && typeof (one.toJSON) == "function") {
                    let value = one.toJSON();
                    if (isObject(hideFields)) { value = valuesHideFields(hideFields, value); }
                    all[i] = value;
                }
            }
            let re = undefined;
            if (values[models_cfg.pagination.pagination_info]) {
                re = { data: all };
                re[models_cfg.pagination.pagination_info] = values[models_cfg.pagination.pagination_info];
            } else {
                if (models_cfg.sql.all_in_data) {
                    re = { data: all };
                } else { re = all; }
            }
            return re;
        }
    }

    function end(values) {
        if (this[models_cfg.pagination.pagination_info]) {
            values[models_cfg.pagination.pagination_info] = this[models_cfg.pagination.pagination_info];
            let fun_name = models_cfg.pql.options.getValues;
            if (values[fun_name] === undefined) {
                values[fun_name] = getValues.bind(this, values);
            }
            delete this[models_cfg.pagination.pagination_info];
        }
    }

    function paginatePlugin(schema) {
        schema.post('find', end);
    }

}