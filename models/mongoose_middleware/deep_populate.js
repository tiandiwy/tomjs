const require2 = require('tomjs/handlers/require2');
const mongoose = require2("mongoose");
const { join, extname } = require2('path');
const pluralize = require2('pluralize');
const _ = require2('lodash');
const appDir = require2('tomjs/handlers/dir')();
const { isArray, isObject, select_fields, selectMustHave, readFile, valuesHideFields } = require2('tomjs/handlers/tools');
const jsonTemplate = require2('tomjs/handlers/json_templater');
const LoadClass = require2('tomjs/handlers/load_class');
const models_cfg = require2('tomjs/configs')().models;
const BaseApiError = require2('tomjs/error/base_api_error');

function myObjectAssign(target, source) {
    let tempObj = {};
    for (let idx in target) {
        if (isObject(target[idx]) && isObject(source[idx])) {
            tempObj[idx] = Object.assign(target[idx], source[idx]);
        }
    }

    return Object.assign(target, source, tempObj);
}


function PopulateOptions(path, select, match, options, model, subPopulate, justOne) {
    this.path = path;
    this.match = match;
    this.select = select;
    this.options = options;
    this.model = model;
    if (typeof subPopulate === 'object') {
        this.populate = subPopulate;
    }
    if (justOne != null) {
        this.justOne = justOne;
    }
    this._docs = {};
}

function getRef(ref) {
    if (typeof (ref) == 'function') {
        return '';
    } else { return ref; }
}

PopulateOptions.prototype.constructor = Object;

module.exports = function (inmongoose) {
    if (inmongoose) { this.mongoose = inmongoose; } else {
        this.mongoose = mongoose;
        inmongoose = mongoose;
    }
    init();
    return deepPopulatePlugin;

    function DefaultOptions(_defaultDeepPopulateOptions, options) {
        if (!isObject(options)) { options = {}; }
        let _def = {};
        if (isObject(_defaultDeepPopulateOptions)) {
            _def = _defaultDeepPopulateOptions;
        } else {
            _def = models_cfg.pql.options;
        }
        if (options.max_deep === undefined) { options.max_deep = _def.max_deep === undefined ? 3 : _def.max_deep; }
        if (options.default_limit === undefined) { options.default_limit = _def.default_limit === undefined ? 10 : _def.default_limit; }
        if (options.default_limit_max === undefined) { options.default_limit_max = _def.default_limit_max === undefined ? 100 : _def.default_limit_max; }
        if (options.is_guard === undefined) { options.is_guard = _def.is_guard === undefined ? true : _def.is_guard; }
        if (options._deepPopulate_values === undefined) { options._deepPopulate_values = _def._deepPopulate_values === undefined ? '_deepPopulate_values' : _def._deepPopulate_values; }
        if (options.getValues === undefined) { options.getValues = _def.getValues === undefined ? 'getValues' : _def.getValues; }
        if (!isObject(options.locals)) { options.locals = _def.locals === undefined ? {} : _def.locals; }
        else {
            options.locals = Object.assign({}, options.locals, _def.locals);
        }
        if (options.aggregate_id === undefined) { options.aggregate_id = _def.aggregate_id === undefined ? 'id' : _def.aggregate_id; }
        return options;
    }

    async function BuildPaths(conn, super_schema, schema, path_name, paths, options, all = true, deep = 0) {
        options = options || {};
        if (options.max_deep === undefined) { options.max_deep = 3; }
        if (!isObject(options.locals)) { options.locals = {}; }
        if (deep >= options.max_deep && !options.is_pql_file) {
            return undefined;
        }

        let RE = new PopulateOptions();

        if (deep === 0) {
            let req = {}
            if (typeof (paths) == "object") {
                try {
                    if (paths.app && paths.app.constructor && paths.app.constructor.name == "Application") {
                        try {
                            req = Object.assign({}, paths.request.query ? paths.request.query : {}, paths.request.body ? paths.request.body : {});
                            if (req[models_cfg.pql.ctx_body_query_field]) {
                                paths = req[models_cfg.pql.ctx_body_query_field];
                            }
                            else {
                                paths = {};
                            }
                        } catch (error) { paths = {}; }
                    }
                }
                catch (error) { }
            }
            if (typeof (paths) == "string" && paths.trim().length > 0) {
                if (paths.trim()[0] == '{' && !models_cfg.pql.only_pql_file_mode) {
                    try {
                        paths = JSON.parse(paths);
                    } catch (err) {
                        throw new BaseApiError(BaseApiError.JSON_PARSE_ERROR, paths);
                    }
                } else {
                    try {
                        if (extname(paths.trim()).length < 1) {
                            paths += '.pql';
                        }
                        let template = await readFile(join(appDir, '..', models_cfg.pql.pql_public_path, paths), 'utf8');
                        let locals = req[models_cfg.pql.ctx_body_pql_file_values_field] ? JSON.parse(req[models_cfg.pql.ctx_body_pql_file_values_field]) : {};
                        paths = JSON.parse(jsonTemplate(template, Object.assign({}, options.locals, locals)));
                        options.is_guard = false;
                        options.is_pql_file = true;
                    } catch (err) {
                        throw new BaseApiError(BaseApiError.PQL_FILE_ERROR, 'PQL File:' + paths + " ,error:" + err.message);
                    }
                }
            }
            options.oldPaths = JSON.parse(JSON.stringify(paths));
        }
        if (options.is_guard === undefined) { options.is_guard = true; }

        for (let i in paths) {
            if (i === '$model' && typeof (paths[i]) == "string") {
                RE.model = paths[i];
            }
        }
        let model_name = RE.model ? RE.model : path_name;
        if (!schema) {
            if (!inmongoose.modelSchemas[model_name]) {
                let loadOK = true;
                try {
                    if (model_name.startsWith(models_cfg.belongs_to_many._belongs_to_many_head)) {
                        let allBelongsToMany = super_schema.methods.getAllBelongsToMany();
                        let i = _.findKey(allBelongsToMany, { belongs_to_many: model_name });
                        model_name = i ? allBelongsToMany[i].ref : model_name;
                    }
                    let mModel = await LoadClass('model', model_name);
                    let mmodel = mModel.Model(conn);
                    schema = mModel.BuildSchema;
                } catch (e) { loadOK = false; }
                if (!loadOK && super_schema) {
                    let temp_ref = undefined;
                    if (super_schema.obj[model_name]) {
                        temp_ref = getRef(super_schema.obj[model_name].ref);
                    } else if (super_schema.virtuals[model_name]) {
                        temp_ref = getRef(super_schema.virtuals[model_name].options.ref);
                    }
                    if (temp_ref) {
                        RE.model = temp_ref;
                        if (!inmongoose.modelSchemas[temp_ref]) {
                            let nModel = await LoadClass('model', temp_ref);
                            let nmodel = nModel.Model(conn);
                            schema = nModel.BuildSchema;
                        } else {
                            schema = inmongoose.modelSchemas[temp_ref];
                        }
                    }
                }
            } else {
                schema = inmongoose.modelSchemas[model_name];
            }
        }

        let only_arr = [];
        let except_arr = [];
        let have_virtual_obj = false;
        let virtual_obj = {};
        if (all) {
            for (let i in paths) {
                if (!isObject(paths[i])) {
                    if (paths[i] === 1) {
                        if (schema && schema.virtuals[i]) {
                            if (i == 'id') {
                                only_arr.push(i);
                            } else { paths[i] = {}; }
                        } else { only_arr.push(i); }
                    } else if (paths[i] < 1) {
                        except_arr.push(i);
                    }
                }
            }
        }
        if (super_schema && schema) {
            for (let idx in super_schema.virtuals) {
                if (super_schema.virtuals[idx].options.ref == schema.methods.getModelClassName()) {
                    virtual_obj[super_schema.virtuals[idx].options.foreignField] = 1; //添加 因有引用需要保留的字段
                    have_virtual_obj = true;
                }
            }
        }

        let allBelongsToMany = schema ? schema.methods.getAllBelongsToMany() : {};
        for (let i in paths) {
            if (isObject(paths[i])) {
                let dqBelongsToMany = undefined;
                switch (i) {
                    case '$match':
                        if ((all && !options.is_guard) || options.is_pql_file === true) {
                            if (deep <= 0 && models_cfg.pql.first_match_allow) {
                                RE.match = paths[i];
                                for (const key in RE.match) {
                                    if (RE.match.hasOwnProperty(key) && key.trim().toLowerCase() === '$or') {
                                        delete RE.match[key];
                                        break;
                                    }
                                }
                            }
                            else {
                                RE.match = paths[i];
                            }
                        }
                        break;
                    case '$options':
                        if (all) { RE.options = paths[i]; }
                        break;
                    default:
                        let changeBelongsToManyModel = undefined;
                        if (allBelongsToMany[i]) {
                            let toMany = {};
                            let pivot = undefined;
                            if (paths[i][models_cfg.pql.pivot]) {
                                pivot = paths[i][models_cfg.pql.pivot];
                                delete paths[i][models_cfg.pql.pivot];
                            }
                            toMany[allBelongsToMany[i].populateField] = paths[i];
                            changeBelongsToManyModel = getRef(allBelongsToMany[i].ref);

                            delete paths[i];
                            dqBelongsToMany = Object.assign({}, allBelongsToMany[i]);
                            i = allBelongsToMany[i].belongs_to_many;
                            if (pivot !== undefined) {
                                Object.assign(toMany, pivot);
                            }
                            paths[i] = toMany;
                        }
                        if (isObject(schema)) {
                            if (schema.virtuals[i]) {
                                virtual_obj[schema.virtuals[i].options.localField] = 1;
                                have_virtual_obj = true;
                            }
                        }
                        paths[i] = await BuildPaths(conn, schema, undefined, i, paths[i], options, true, deep + 1);
                        if (dqBelongsToMany) {
                            myObjectAssign(paths[i], dqBelongsToMany);
                        }
                        if (changeBelongsToManyModel) {
                            paths[i].model = changeBelongsToManyModel;
                        }
                        if (paths[i] === undefined) { delete paths[i]; } else {
                            if (deep == 0) {
                                if (!RE.populate) { RE.populate = {}; }
                                paths[i].path = i;
                                if (paths[i].model === undefined && schema) {
                                    if (schema.virtuals[i] && schema.virtuals[i].options) {
                                        paths[i].model = getRef(schema.virtuals[i].options.ref);
                                    } else if (schema.obj[i]) {
                                        paths[i].model = getRef(schema.obj[i].ref);
                                    }
                                }
                                RE.populate[i] = paths[i];
                            } else {
                                if (!RE.populate) { RE.populate = []; }
                                paths[i].path = i;
                                RE.populate.push(paths[i]);
                            }
                        }
                        break;
                }
            }
            else {
                if (i == '$must') {
                    RE.$must = paths[i];
                }
            }
        }
        if (deep !== 0 && options.default_limit && options.default_limit_max) {
            if (!isObject(RE.options)) { RE.options = {}; }
            if (RE.options.limit === undefined) { RE.options.limit = options.default_limit; }
            if (RE.options.limit > options.default_limit_max && !options.is_pql_file) { RE.options.limit = options.default_limit_max; }
        }
        if (options.is_guard) {
            if (schema) {
                RE.select = select_fields(only_arr, except_arr, schema.methods.PopulateFields());
                RE.select_old = Object.assign({}, RE.select);
                if (have_virtual_obj) { selectMustHave(RE.select, virtual_obj); }
            } else {
                RE.select = { _id: 1 };
                RE.select_old = Object.assign({}, RE.select);
            }
        } else {
            RE.select = select_fields(only_arr, except_arr);
            RE.select_old = Object.assign({}, RE.select);
            if (have_virtual_obj) { selectMustHave(RE.select, virtual_obj); }
        }
        return RE;
    }

    function init() {
        if (this.mongoose.Query.prototype.deepPopulate != null) {
            return
        }

        this.mongoose.Query.prototype.deepPopulate = function (paths, options = {}) {
            DefaultOptions(this.schema._defaultDeepPopulateOptions, options);
            this._deepPopulatePaths = { paths, options, all: true, };
            return this;
        }
        this.mongoose.Query.prototype.pql = this.mongoose.Query.prototype.deepPopulate;
    };

    function aggregateRunDeepPopulate(next) {
        let pipeline_len = this._pipeline.length;
        let paths, options;
        let have_pql = false;

        for (let i = pipeline_len - 1; i > 0; i--) {
            if (this._pipeline[i].$pql) {
                paths = this._pipeline[i].$pql;
                have_pql = true;
                this._pipeline.splice(i, 1);
                continue;
            }
            if (this._pipeline[i].$pql_options) {
                options = this._pipeline[i].$pql_options;
                this._pipeline.splice(i, 1);
            }
        }
        pipeline_len = this._pipeline.length;
        for (let i = pipeline_len - 1; i > 0; i--) {
            if (this._pipeline[i].$group) {
                let myoptions = Object.assign({}, options);
                DefaultOptions(this._model.schema._defaultDeepPopulateOptions, myoptions);
                if (this._pipeline[i].$group[myoptions.aggregate_id] === undefined) {
                    this._pipeline[i].$group[myoptions.aggregate_id] = { $min: "$_id" };
                }
            }
        }
        if (have_pql !== false) {
            this._deepPopulatePaths = { paths, options };
        }
        if (next) { return next(); }
    }

    async function runDeepPopulate(next) {
        let RE = undefined;
        if (this._deepPopulatePaths && this._deepPopulatePaths_End === undefined) {
            RE = await BuildPaths(this.model.db || this.db, undefined, this.model.schema || this.schema, '',
                this._deepPopulatePaths.paths,
                this._deepPopulatePaths.options,
                this._deepPopulatePaths.all,
                0);
            this._deepPopulatePaths_End = {};
            this._deepPopulatePaths_End.re = RE;
            this._deepPopulatePaths_End.options = this._deepPopulatePaths.options;
            delete this._deepPopulatePaths;
            if (isObject(RE.match)) { this._conditions = Object.assign(this._conditions || {}, RE.match); }
            if (isObject(RE.select)) {
                for (let idx in RE.select) {
                    RE.select[idx] = RE.select[idx] <= 0 ? 0 : 1;
                }
                this._fields = Object.assign(this._fields || {}, RE.select);
            }
            if (isObject(RE.options)) { this.options = Object.assign(this.options || {}, RE.options); }
            if (isObject(RE.populate) && isObject(this._mongooseOptions)) {
                this._mongooseOptions.populate = Object.assign(this._mongooseOptions.populate || {}, RE.populate);
            }
        }
        if (next) { next(); }
        return RE;
    };

    function field_check(EndVal, values) {
        if (isObject(EndVal.select) && isObject(values)) {
            let is_only = true;
            for (let idx in EndVal.select) {
                is_only = EndVal.select[idx] == 1;
                break;
            }
            if (is_only) {
                if (isObject(EndVal.populate)) {
                    for (let idx in EndVal.populate) {
                        EndVal.select[idx] = 1;
                        EndVal.select_old[idx] = 1;
                    }
                } else if (isArray(EndVal.populate)) {
                    let populate_len = EndVal.populate.length;
                    for (let i = 0; i < populate_len; i++) {
                        EndVal.select[EndVal.populate[i].path] = 1;
                        EndVal.select_old[EndVal.populate[i].path] = 1;
                    }
                }
            }
            for (let idx in values) {
                if (is_only) {
                    if ((!EndVal.select[idx] && !EndVal.select[models_cfg.belongs_to_many._belongs_to_many_head + idx]) ||
                        (!EndVal.select_old[idx])) {
                        delete values[idx];
                        if (values[idx] !== undefined) {
                            if (values.prototype[idx] !== undefined) { delete values.prototype[idx]; }
                            if (values.__proto__[idx] !== undefined) { delete values.__proto__[idx]; }
                        }
                    }
                } else {
                    if (EndVal.select[idx] || EndVal.select_old[idx]) {
                        delete values[idx];
                        if (values[idx] !== undefined) {
                            if (values.prototype[idx] !== undefined) { delete values.prototype[idx]; }
                            if (values.__proto__[idx] !== undefined) { delete values.__proto__[idx]; }
                        }
                    }
                }
            }
        }
        if (isObject(EndVal.populate)) {
            for (let idx in EndVal.populate) {
                if (isObject(values[idx])) {
                    field_check(EndVal.populate[idx], values[idx]);
                } else if (isArray(values[idx])) {
                    let values_len = values[idx].length;
                    for (let i = 0; i < values_len; i++) {
                        if (isObject(values[idx][i])) {
                            field_check(EndVal.populate[idx], values[idx][i]);
                        }
                    }
                }
            }
        } else if (isArray(EndVal.populate)) {
            let populate_len = EndVal.populate.length;
            for (let i = 0; i < populate_len; i++) {
                let path = undefined;
                if (EndVal.populate[i].path.startsWith(models_cfg.belongs_to_many._belongs_to_many_head)) {
                    path = EndVal.populate[i].path.substring(models_cfg.belongs_to_many._belongs_to_many_head.length);
                    if (isArray(EndVal.populate[i].populate) && EndVal.populate[i].populate.length > 0) {
                        let length = EndVal.populate[i].populate.length;
                        let singular_path = pluralize.singular(path);
                        for (let j = 0; j < length; j++) {
                            if (singular_path == pluralize.singular(EndVal.populate[i].populate[j].path)) {
                                EndVal.populate[i] = EndVal.populate[i].populate[j];
                                EndVal.populate[i].path = path;
                                break;
                            }
                        }
                    }
                } else {
                    path = EndVal.populate[i].path;
                }
                if (isArray(values[path])) {
                    let values_len = values[path].length;
                    for (let j = 0; j < values_len; j++) { field_check(EndVal.populate[i], values[path][j]); }
                } else if (isObject(values[path])) {
                    field_check(EndVal.populate[i], values[path]);
                }
            }
        }
    }

    function must_check(value, Paths) {
        if (value===null && Paths.$must) { return undefined; }
        if (value) {
            for (const key in Paths) {
                if (isObject(Paths[key]) && key[0] != '$') {
                    const populate = Paths[key];
                    if (!isArray(value[key])) {
                        if (must_check(value[key], populate) === undefined) {
                            return undefined;
                        }
                    }
                    else {
                        const len = value[key].length;
                        let have = false;
                        for (let index = 0; index < len; index++) {
                            const one = value[key][index];
                            if (must_check(one, populate) !== undefined) {
                                have = true;
                                break;
                            }
                        }
                        if (!have && Paths[key].$must) {
                            return undefined;
                        }
                    }
                }
            }
        }
        return value;
    }

    function getValues(values, EndRE, hideFields) {
        if (isObject(values) && typeof (values.toJSON) == "function") {
            let value = values.toJSON();
            field_check(EndRE, value);
            if (isObject(hideFields)) { value = valuesHideFields(hideFields, value); }
            return must_check(value, EndRE.oldPaths);
        } else if (isArray(values)) {
            let nullCount = 0;
            let len = values.length;
            let one = undefined;
            let all = [];
            for (let i = 0; i < len; i++) {
                one = values[i];
                if (isObject(one) && typeof (one.toJSON) == "function") {
                    let value = one.toJSON();
                    field_check(EndRE, value);
                    if (isObject(hideFields)) { value = valuesHideFields(hideFields, value); }
                    const val = must_check(value, EndRE.oldPaths);
                    if (val !== undefined) { all.push(val); }
                    else {
                        nullCount++;
                    }
                }
            }
            let re = undefined;
            if (values[models_cfg.pagination.pagination_info]) {
                re = { data: all };
                re[models_cfg.pagination.pagination_info] = values[models_cfg.pagination.pagination_info];
            } else {
                if (models_cfg.pql.all_in_data) {
                    re = { data: all };
                } else { re = all; }
            }
            return re;
        }
    }

    function endDeepPopulate(values) {
        if (values) {
            if (this._deepPopulatePaths_End) {
                const EndRE = this._deepPopulatePaths_End.re;
                EndRE.oldPaths = this._deepPopulatePaths_End.options.oldPaths;
                const options = this._deepPopulatePaths_End.options;
                delete this._deepPopulatePaths_End;
                if (options._deepPopulate_values) {
                    values[options._deepPopulate_values] = getValues(values, EndRE);
                    values[options.getValues] = getValues.bind(this, values, EndRE);
                }
            }
        }
    }

    async function aggregateEndDeepPopulateOne($this, doc) {
        let options = DefaultOptions($this._model.schema._defaultDeepPopulateOptions, $this._deepPopulatePaths.options);
        let model = $this._model;
        let obj = await model.findById(doc[options.aggregate_id]).pql($this._deepPopulatePaths.paths, $this._deepPopulatePaths.options);
        Object.assign(doc, obj.getValues());
    }
    async function aggregateEndDeepPopulate(values) {
        if (this._deepPopulatePaths) {
            if (isObject(this._deepPopulatePaths.paths)) {
                if (this._deepPopulatePaths.paths._id === undefined) {
                    this._deepPopulatePaths.paths._id = 1;
                }
            }
            if (isObject(values)) {
                await aggregateEndDeepPopulateOne(this, values);
            } else if (isArray(values)) {
                let len = values.length;
                for (let i = 0; i < len; i++) {
                    await aggregateEndDeepPopulateOne(this, values[i]);
                }
            }
        }
    }

    function deepPopulatePlugin(schema, defaultOptions) {
        schema._defaultDeepPopulateOptions = defaultOptions;
        schema.pre('findOne', runDeepPopulate)
            .pre('find', runDeepPopulate)
            .pre('aggregate', aggregateRunDeepPopulate)
            .post('findOne', endDeepPopulate)
            .post('find', endDeepPopulate)
            .post('aggregate', aggregateEndDeepPopulate);
        schema.methods.deepPopulate = async function (paths, options = {}) { //查询后再填充            
            DefaultOptions(schema._defaultDeepPopulateOptions, options);
            this._deepPopulatePaths = { paths, options, all: false };
            let RE = await runDeepPopulate.call(this, null);
            let values = await this.populate(_.values(RE.populate)).execPopulate();
            endDeepPopulate.call(this, values);
            return values;
        };
        schema.methods.pql = schema.methods.deepPopulate;
    };
};