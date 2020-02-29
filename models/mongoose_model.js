const require2 = require('tomjs/handlers/require2');
const Observable = require2('tomjs/handlers/object-observer');

const models_cfg = require2('tomjs/configs')().models;
const { isObject, camelize, decamelize, isArray, select_fields, toBool, } = require2('tomjs/handlers/tools');
const mongoose = require2('mongoose');
if (isObject(models_cfg.mongoose_set)) {
    for (const key in models_cfg.mongoose_set) {
        mongoose.set(key, models_cfg.mongoose_set[key]);
    }
}

const mongoose_delete = require2('mongoose-delete');
const mongooseHidden = require2('mongoose-hidden')()
const pluralize = require2('pluralize');
const humps = require2('humps');
const _ = require2('lodash');
const MongooseError = require2('tomjs/error/mongoose_error');
const update_at = require2('tomjs/models/mongoose_middleware/update_at');
const update_assign = require2('tomjs/models/mongoose_middleware/update_assign');
const support_sequelize = require2('tomjs/models/mongoose_middleware/support_sequelize');
const deepPopulate = require2('tomjs/models/mongoose_middleware/deep_populate')(mongoose);
const pagination = require2('tomjs/models/mongoose_middleware/pagination')(mongoose);
const auth_cfg = require2('tomjs/configs')().auth;
const Op = require2('tomjs/models/op')('mongodb');
const LoadClassSync = require2('tomjs/handlers/load_class_sync');
const system_id = "_id";
const _belongs_to_many_head = models_cfg.belongs_to_many._belongs_to_many_head;
const _all_belongs_to_many_head = models_cfg.belongs_to_many._all_belongs_to_many_head;

const type_name = 'mongodb';

class MongooseModel {
    constructor() {
        this.Op = Op;

        this.fillable = [];
        this.guarded = undefined;
        this.is_guard = true; //默认开启守护 支持 fillable 和 guarded 两个数组属性
        this.isSoftDeletes = false; //默认不使用软删除
        this.isDeepPopulate = true;
        this.isTimestamps = false;
        this.isUpdateAssign = false;
        this.isSupportSequelize = true;
        this.find_return_one = false; //为了兼容 sequelize find函数直接返回单个对象而不是数组

        this.relationshipsVirtuals = {}; //需要建立的关联虚拟字段
        this._all_belongsToMany = {};
        this._all_belongsToMany2 = {};

        //this.populateShowFields = [];
        //this.populateHideFields = [];
        //获取Schema定义
        if (this.Schema === undefined) { //发现没有this.Schema属性就尝试对其进行初始化操作
            if (typeof (this.Init) == 'function') {
                this.Init();
            } else {
                throw new Error(this.constructor.name + ' Not find function "Init"!');
            }
        }
        if (this.Schema !== undefined) {
            //确定collection的名字
            if (this.collectionModelName === undefined) {
                this.collectionModelName = this.constructor.name; //decamelize(this.constructor.name, ["model"]);
            }
            if (this.collection === undefined) {
                this.collection = decamelize(this.constructor.name, ["model"]);
            }
            if (this.SchemaOption === undefined) {
                this.SchemaOption = { collection: this.collection };
            } else if (isObject(this.SchemaOption)) {
                if (this.SchemaOption.collection === undefined) {
                    this.SchemaOption.collection = this.collection;
                }
            }

            if (this.SchemaOption !== undefined) {
                this.BuildSchema = new mongoose.Schema(this.Schema, this.SchemaOption);
            } else { this.BuildSchema = new mongoose.Schema(this.Schema); }

            this.BuildSchema.set('toJSON', { getters: true, virtuals: true });
            this.BuildSchema.methods.getModelClassName = () => {
                return this.getModelClassName();
            };
            this.BuildSchema.methods.PopulateFields = () => {
                let populateShowFields = undefined;
                if (isArray(this.populateShowFields)) {
                    if (this.populateShowFields.length > 0) {
                        populateShowFields = this.populateShowFields;
                    }
                }
                let populateHideFields = undefined;
                if (isArray(this.populateHideFields)) {
                    populateHideFields = this.populateHideFields;
                }
                return select_fields(populateShowFields, populateHideFields);
            };
            this.BuildSchema.methods.getAllBelongsToMany = () => {
                return this._all_belongsToMany2;
            };

            let model_this = this;
            this.BuildSchema.statics.assign = function (doc) {
                let data = {};
                if (model_this.is_guard) {
                    if (isArray(model_this.fillable) && model_this.fillable.length > 0) {
                        let len = model_this.fillable.length;
                        let fieldname = undefined;
                        for (let i = 0; i < len; i++) {
                            fieldname = model_this.fillable[i];
                            if (doc[fieldname]) {
                                data[fieldname] = doc[fieldname];
                            }
                        }
                    } else {
                        data = doc;
                    }

                    if (isArray(model_this.guarded)) {
                        let len = model_this.guarded.length;
                        let fieldname = undefined;
                        for (let i = 0; i < len; i++) {
                            fieldname = model_this.guarded[i];
                            if (data[fieldname]) { delete data[fieldname]; }
                        }
                    }
                }
                else {
                    data = doc;
                }
                for (let key in data) {
                    if (!model_this.Schema[key]) { delete data[key]; }
                }
                return data;
            };

            this.BuildSchema.methods.assign = function (doc, is_guard = true) {
                let data = {};
                if (is_guard) {
                    if (isArray(model_this.fillable) && model_this.fillable.length > 0) {
                        let len = model_this.fillable.length;
                        let fieldname = undefined;
                        for (let i = 0; i < len; i++) {
                            fieldname = model_this.fillable[i];
                            if (doc[fieldname]) {
                                data[fieldname] = doc[fieldname];
                            }
                        }
                    } else {
                        data = doc;
                    }

                    if (isArray(model_this.guarded)) {
                        let len = model_this.guarded.length;
                        let fieldname = undefined;
                        for (let i = 0; i < len; i++) {
                            fieldname = model_this.guarded[i];
                            if (data[fieldname]) { delete data[fieldname]; }
                        }
                    }
                }
                else {
                    data = doc;
                }

                for (let key in data) {
                    try { this[key] = data[key]; }
                    catch (e) { delete data[key]; }
                }
                return data;
            };

            this.buildRelationshipsVirtuals(); //构建虚拟字段
            if (this.isSoftDeletes) {
                this.BuildSchema.plugin(mongoose_delete, { deletedAt: true, overrideMethods: 'all', indexFields: ['deleted'] });
            }
            pagination(this.BuildSchema);
            if (this.isDeepPopulate) { deepPopulate(this.BuildSchema); }
            if (this.isTimestamps) { new update_at(this.BuildSchema); }
            if (this.isUpdateAssign) { new update_assign(this.BuildSchema); }
            if (this.isSupportSequelize) { new support_sequelize(this.BuildSchema); }
        } else {
            throw new Error(this.constructor.name + ' Not find "Schema"!');
        };
    }

    getTypeName() {
        return type_name;
    }

    virtual_observe(current, belongsToMany, target) {
        let source = current[belongsToMany.belongs_to_many];
        let observableArr = Observable.from(target);
        observableArr.observe(async (changes) => {
            if (changes.length > 0 && changes[0].type == "delete") {
                changes.sort(function (x, y) {
                    if (x.path[0] < y.path[0]) {
                        return 1;
                    } else if (x.path[0] > y.path[0]) {
                        return -1;
                    } else {
                        return 0;
                    }
                });
            }
            for (let idx in changes) {
                let change = changes[idx];
                try {
                    if (change.path.length <= 1) {
                        let index = change.path[0];
                        switch (change.type) {
                            case "update":
                                {
                                    let sourceRecord = source[index];
                                    let { localField, foreignField } = sourceRecord.schema.virtuals[belongsToMany.populateField].options;
                                    let isChange = false;
                                    if (sourceRecord[localField] instanceof mongoose.Types.ObjectId) {
                                        isChange = mongoose.Types.ObjectId(sourceRecord[localField]).toString() != mongoose.Types.ObjectId(change.value[foreignField]).toString();
                                    } else {
                                        isChange = sourceRecord[localField] === change.value[foreignField];
                                    }
                                    if (isChange) {
                                        sourceRecord[localField] = change.value[foreignField];
                                        await sourceRecord.save();
                                    }
                                    break;
                                }
                            case "insert":
                                {
                                    let sourceRecord = undefined;
                                    let db = undefined;
                                    if (isArray(source) && source.length > 0) {
                                        db = source[0].db;
                                        sourceRecord = source[0];
                                    } else {
                                        db = source.db;
                                        sourceRecord = source;
                                    }
                                    let { localField, foreignField } = sourceRecord.schema.virtuals[belongsToMany.populateField].options;
                                    let new_rec = {};
                                    new_rec[belongsToMany.foreignField] = current[belongsToMany.localField];
                                    new_rec[localField] = change.value[foreignField];
                                    let value = await db.models[belongsToMany.ref].create(new_rec);
                                    source.splice(index, 0, value);
                                    break;
                                }
                            case "delete":
                                {
                                    let sourceRecord = source[index];
                                    await sourceRecord.delete();
                                    break;
                                }
                            default:
                                {
                                    break;
                                }
                        }
                    }
                } catch (e) {
                    if (e.name != 'TypeError') { throw e; }
                }
            }
        });
        return observableArr;
    }

    buildRelationshipsVirtuals() {
        let _this = this;
        let virtual_field;
        let hidden_info = {};
        for (let idx in this.relationshipsVirtuals) {
            this.BuildSchema.virtual(idx, this.relationshipsVirtuals[idx]);
            if (this._all_belongsToMany[idx]) {
                hidden_info[idx] = 'hideJSON';
                let belongsToMany = this._all_belongsToMany[idx];
                virtual_field = this.BuildSchema.virtual(belongsToMany.fieldName);
                virtual_field.get(function () {
                    if (this[_all_belongs_to_many_head + belongsToMany.fieldName] === undefined) {
                        if (isArray(this[idx])) {
                            let new_arr = [];
                            let len = this[idx].length;
                            for (let i = 0; i < len; i++) {
                                if (isObject(this[idx][i][belongsToMany.populateField])) {
                                    this[idx][i][belongsToMany.populateField][models_cfg.belongs_to_many.pivot] = this[idx][i];
                                }
                                new_arr.push(this[idx][i][belongsToMany.populateField]);
                            }
                            this[_all_belongs_to_many_head + belongsToMany.fieldName] = _this.virtual_observe(this, belongsToMany, new_arr);
                        } else if (isObject(this[idx])) {
                            this[_all_belongs_to_many_head + belongsToMany.fieldName] = this[idx][belongsToMany.populateField];
                        }
                    }
                    return this[_all_belongs_to_many_head + belongsToMany.fieldName];
                });
                //virtual_field.set(function(val) {});//应该用不到 设置虚拟属性的值，可以直接对象其提供对象即可。
            }
        }
        this.BuildSchema.plugin(mongooseHidden, { virtuals: hidden_info });
    }

    baseHas(field_name = "", { ref, localField, foreignField, justOne, match, select, options } = {}) {
        if (field_name.length <= 0) {
            throw new MongooseError("field_name is empty");
        }
        if (!ref) {
            ref = camelize(field_name, null, true, true, 'Model') //如果未有效定义ref 就采用field_name的复数形式
        }
        if (!localField) { localField = system_id; }
        if (!foreignField) { foreignField = pluralize.singular(field_name) + system_id; }
        justOne = justOne ? true : false;
        this.relationshipsVirtuals[field_name] = { ref, localField, foreignField, justOne, match, select, options };
    }

    hasOne(field_name = "", options = {}) {
        if (field_name.length <= 0) {
            throw new MongooseError("hasOne field_name is empty");
        }
        options.justOne = true;
        this.baseHas(field_name, options);
    }

    hasMany(field_name = "", options = {}) {
        if (field_name.length <= 0) {
            throw new MongooseError("hasMany field_name is empty");
        }
        options.justOne = false;
        if (!options['foreignField']) {
            let field = this.collection;
            if (field === undefined) {
                field = decamelize(this.constructor.name, ["model"], false);
            }
            options.foreignField = field + system_id;
        }
        this.baseHas(field_name, options);
    }

    baseBelongs(field_name = "", { ref, localField, foreignField, justOne, match, select, options } = {}) {
        if (field_name.length <= 0) {
            throw new MongooseError("field_name is empty");
        }
        if (!ref) {
            ref = camelize(field_name, null, true, true, 'Model'); //如果未有效定义ref 就采用field_name的复数形式
        }
        if (!localField) { localField = pluralize.singular(field_name) + system_id; }
        if (!foreignField) { foreignField = system_id; }
        justOne = justOne ? true : false;
        this.relationshipsVirtuals[field_name] = { ref, localField, foreignField, justOne, match, select, options };
    }

    belongsTo(field_name = "", options = {}) {
        if (field_name.length <= 0) {
            throw new MongooseError("hasOne field_name is empty");
        }
        options.justOne = true;
        this.baseBelongs(field_name, options);
    }

    //fieldName: groups
    //ref: EmpGroupModel
    //localField: _id
    //foreignField: emp_id//EmpGroupModel.
    //populateField: group//EmpGroupModel
    belongsToMany(fieldName = "", { ref, localField, foreignField, populateField, match, select, options } = {}) {
        if (fieldName.length <= 0) {
            throw new MongooseError("belongsToMany fieldName is empty");
        }

        let fromNameMe = decamelize(this.constructor.name, ["model"], false);
        let fromNameTo = pluralize.singular(fieldName);
        if (!ref) {
            ref = _.join([humps.pascalize(fromNameMe), humps.pascalize(fromNameTo)].sort(), '') + 'Model'; //如果未有效定义ref 就采用field_name的复数形式
        }
        if (!localField) { localField = system_id; }
        if (!foreignField) { foreignField = fromNameMe + system_id; }
        if (!populateField) { populateField = fromNameTo; }
        let belongs_to_many = _belongs_to_many_head + fieldName;
        this.hasMany(belongs_to_many, { ref, localField, foreignField, match, select, options });
        this._all_belongsToMany[belongs_to_many] = { belongs_to_many, fieldName, ref, localField, foreignField, populateField, match, select, options };
        this._all_belongsToMany2[fieldName] = this._all_belongsToMany[belongs_to_many];
    }

    hasManyThrough(fieldName = "", through = "", { localField, foreignField, populateField, match, select, options } = {}) {
        this.belongsToMany(fieldName, { ref: through, localField, foreignField, populateField, match, select, options });
    }

    morphTo(fieldName = "", { localField = "", modelField = "", foreignField, justOne, match, select, options } = {}) {
        let ref = undefined;

        if (fieldName.length <= 0) {
            throw new MongooseError("fieldName is empty");
        }
        if (localField.length <= 0) {
            localField = decamelize(fieldName, '', false) + system_id;
        }

        if (typeof (modelField) == 'string') {
            if (modelField.length <= 0) {
                modelField = decamelize(fieldName, '', false) + '_type';
            }
            let idx = modelField;
            ref = function () {
                let model_name = this[idx];
                if (!mongoose.models[model_name]) {
                    let model = LoadClassSync('model', model_name);
                    let model_object = model.Model();
                }
                return model_name;
            };
        } else if (typeof (modelField) == 'function') {
            ref = modelField;
        }
        if (ref === undefined) {
            throw new MongooseError("modelField type error");
        }
        if (!foreignField) { foreignField = system_id; }
        justOne = toBool(justOne || true);
        this.relationshipsVirtuals[fieldName] = { ref, localField, foreignField, justOne, match, select, options };
    }

    morphMany(fieldName = "", { ref = "", model = "", modelField = "", localField, foreignField, match, select, options } = {}) {
        if (fieldName.length <= 0) {
            throw new MongooseError("fieldName is empty");
        }
        if (ref.length <= 0) {
            ref = camelize(fieldName, null, true, true, 'Model');
        }
        if (model.length <= 0) {
            model = this.getModelClassName();
        }
        if (model.length > 0) {
            let object = {};
            if (!modelField) {
                modelField = decamelize(ref, 'model', false) + '_type';
            }
            object[modelField] = model;
            if (isObject(match)) { match = Object.assign(match, object); } else {
                match = object;
            }
        }
        if (!foreignField) {
            foreignField = decamelize(ref, 'model', false) + '_id';
        }
        let justOne = false;
        return this.baseHas(fieldName, { ref, localField, foreignField, justOne, match, select, options });
    }

    morphedByMany(fieldName = "", through = "", model = "", { modelField = "", localField, foreignField, populateField, match, select, options } = {}) {
        if (model.length > 0) {
            let object = {};
            if (modelField.length <= 0) {
                modelField = decamelize(through, 'model', false) + '_type';
            }
            object[modelField] = model;
            if (isObject(match)) { match = Object.assign(match, object); } else {
                match = object;
            }
        }
        if (!populateField && (typeof (through) == "string")) {
            populateField = decamelize(through, 'Model', false);
        }
        return this.hasManyThrough(fieldName, through, { localField, foreignField, populateField, match, select, options });
    }

    morphToMany(fieldName = "", through = "", { model = "", modelField, localField, foreignField, populateField, match, select, options } = {}) {
        if (fieldName.length <= 0) {
            throw new MongooseError("fieldName is empty");
        }
        if (through.length <= 0) {
            throw new MongooseError("through is empty");
        }
        if (model.length <= 0) {
            model = this.getModelClassName();
        }
        if (model.length > 0) {
            let object = {};
            if (!modelField) {
                modelField = decamelize(through, 'model', false) + '_type';
            }
            object[modelField] = model;
            if (isObject(match)) { match = Object.assign(match, object); } else {
                match = object;
            }
        }
        if (!populateField && (typeof (fieldName) == "string")) {
            populateField = pluralize.singular(fieldName);
        }
        if (!foreignField) {
            foreignField = decamelize(through, 'model', false) + '_id';
        }
        return this.hasManyThrough(fieldName, through, { localField, foreignField, populateField, match, select, options });
    }

    timestamps() {
        this.isTimestamps = true;
        this.Schema['createdAt'] = {
            type: Date,
            default: Date.now,
        };
        this.Schema['updatedAt'] = {
            type: Date,
            default: null,
        };
    }

    updateAssign() {
        this.isUpdateAssign = true;
    }

    softDeletes() {
        this.isSoftDeletes = true; //标记启用软删除
    }

    tokenVersion() {
        this.Schema[auth_cfg.jwt_key_token_version] = {
            type: Number,
            default: 0,
            min: 0,
        };
    }

    language() {
        this.fillable.push('language');
        this.Schema['language'] = {
            type: String,
            default: '',
        };
    }

    getModelClassName() {
        return this.constructor.name;
    }

    Model(conn, collectionModelName) {
        if (conn === undefined) { conn = mongoose; }
        if (collectionModelName === undefined) { collectionModelName = this.collectionModelName; }
        let model_obj = conn.model(collectionModelName, this.BuildSchema);
        model_obj.Op = Op;

        let model_this = this;
        model_obj.getModelClassName = () => {
            return this.getModelClassName();
        };
        let old_create = model_obj.create;
        model_obj.CreateNotGuard = function (doc, options, callback) {
            return old_create.apply(this, arguments);
        }
        let old_find = model_obj.find;
        model_obj.find = function () {
            return old_find.apply(this, arguments).where('undefined').ne(true);
        }
        model_obj.findAll = function () {
            return model_obj.find.apply(this, arguments);
        }
        if (this.find_return_one) {
            model_obj.find = function () {
                return model_obj.findOne.apply(this, arguments);
            }
        }
        
        model_obj.create = function (doc, options, callback) {
            if (this.is_guard == true) {
                let data = {};
                if (isArray(model_this.fillable) && model_this.fillable.length > 0) {
                    let len = model_this.fillable.length;
                    let fieldname = undefined;
                    for (let i = 0; i < len; i++) {
                        fieldname = model_this.fillable[i];
                        if (doc[fieldname]) {
                            data[fieldname] = doc[fieldname];
                        }
                    }
                } else {
                    data = doc;
                }

                if (isArray(model_this.guarded)) {
                    let len = model_this.guarded.length;
                    let fieldname = undefined;
                    for (let i = 0; i < len; i++) {
                        fieldname = model_this.guarded[i];
                        if (data[fieldname]) { delete data[fieldname]; }
                    }
                }
                arguments[0] = data;
            }
            return old_create.apply(this, arguments);
        };
        if (typeof (this.modelAfter) == 'function') {
            let obj = this.modelAfter(model_obj);
            if (isObject(obj)) { model_obj = obj; }
        }
        return model_obj;
    }
}
module.exports = MongooseModel;