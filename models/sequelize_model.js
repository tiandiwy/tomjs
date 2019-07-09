const require2 = require('tomjs/handlers/require2');
const Observable = require2('tomjs/handlers/object-observer');
const database = require2('tomjs/database');

const Sequelize = require2('sequelize');
const pluralize = require2('pluralize');
const humps = require2('humps');
const _ = require2('lodash');
const MongooseError = require2('tomjs/error/mongoose_error');
const { isObject, camelize, decamelize, isArray, select_fields } = require2('tomjs/handlers/tools');
const auth_cfg = require2('tomjs/configs')().auth;
const models_cfg = require2('tomjs/configs')().models;
const system_id = "_id";

const type_name = 'sequelize';

class SequelizeModel {
    constructor() {
        this.Op = Sequelize.Op;

        this.fillable = [];
        this.guarded = undefined;
        this.is_guard = true; //默认开启守护 支持 fillable 和 guarded 两个数组属性
        this.isDeepPopulate = true;

        //this.populateShowFields = [];
        //this.populateHideFields = [];
        //获取Schema定义
        if (this.Schema === undefined) { //发现没有this.Schema属性就尝试对其进行初始化操作
            if (typeof(this.Init) == 'function') {
                this.Init();
            } else {
                throw new Error(this.constructor.name + ' Not find function "Init"!');
            }
        }
        if (this.Schema !== undefined) {
            //确定collection的名字
            if (this.collectionModelName === undefined) {
                this.collectionModelName = this.constructor.name;
            }
            if (this.collection === undefined) {
                this.collection = decamelize(this.constructor.name, ["model"]);
            }
            if (this.SchemaOption === undefined) {
                this.SchemaOption = { tableName: this.collection };
            } else if (isObject(this.SchemaOption)) {
                if (this.SchemaOption.collection === undefined) {
                    this.SchemaOption.collection = this.collection;
                }
            }

        } else {
            throw new Error(this.constructor.name + ' Not find "Schema"!');
        };
    }

    getTypeName() {
        return type_name;
    }

    timestamps() {
        this.isTimestamps = true;
    }

    softDeletes() {
        this.isSoftDeletes = true; //标记启用软删除
    }

    tokenVersion() {
        this.Schema[auth_cfg.jwt_key_token_version] = {
            type: Sequelize.INTEGER,
            defaultValue: 0,
            validate: { min: 0 },
        };
    }

    language() {
        this.fillable.push('language');
        this.Schema['language'] = {
            type: Sequelize.STRING,
            defaultValue: '',
        };
    }

    getModelClassName() {
        return this.constructor.name;
    }

    Model(sequelize, collectionModelName) {
        if (sequelize === undefined) {
            sequelize = database.get();
            if (sequelize === undefined) {
                throw new Error(this.constructor.name + ' Parameter sequelize is undefined!');
            }
        }
        if (collectionModelName === undefined) { collectionModelName = this.collectionModelName; }


        if (this.isSoftDeletes) {
            if (this.SchemaOption !== undefined) {
                this.SchemaOption.paranoid = true;
            } else { this.SchemaOption = { paranoid: true }; }
        }
        if (!this.isTimestamps) {
            if (this.SchemaOption !== undefined) {
                this.SchemaOption.timestamps = false;
            } else { this.SchemaOption = { timestamps: false }; }
        }

        // this.BuildSchema.methods.getModelClassName = () => {
        //     return this.getModelClassName();
        // };
        // this.BuildSchema.methods.PopulateFields = () => {
        //     let populateShowFields = undefined;
        //     if (isArray(this.populateShowFields)) {
        //         if (this.populateShowFields.length > 0) {
        //             populateShowFields = this.populateShowFields;
        //         }
        //     }
        //     let populateHideFields = undefined;
        //     if (isArray(this.populateHideFields)) {
        //         populateHideFields = this.populateHideFields;
        //     }
        //     return select_fields(populateShowFields, populateHideFields);
        // };

        //if (this.isDeepPopulate) { deepPopulate(this.BuildSchema); }

        let model_obj = undefined;
        if (this.SchemaOption !== undefined) {
            model_obj = sequelize.define(this.collectionModelName, this.Schema, this.SchemaOption);
        } else { model_obj = sequelize.define(this.collectionModelName, this.Schema); }

        let model_this = this;
        model_obj.Op = Sequelize.Op;
        model_obj.getModelClassName = () => {
            return this.getModelClassName();
        };
        let old_create = model_obj.create;
        model_obj.CreateNotGuard = function(doc, options, callback) {
            return old_create.apply(this, arguments);
        }
        model_obj.create = function(doc, options, callback) {
            if (model_this.is_guard == true) {
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
        if(typeof(this.modelAfter)=='function')
        {
            let obj = this.modelAfter(model_obj);
            if(isObject(obj)){model_obj = obj;}
        }
        return model_obj;
    }
}
module.exports = SequelizeModel;