//const _ = require2('lodash');
function ArrToObj(arr) {
    let Re = {};
    let len = arr.length;

    for (let i = 0; i < len; i++) {
        Re[arr[i]] = 1;
    }
    return Re;
}

function ArrToOrderObj(arr) {
    let Re = {};
    let len = arr.length;

    let OneLen = 0;
    for (let i = 0; i < len; i++) {
        OneLen = arr[i].length;
        if (OneLen > 1) {
            Re[arr[i]] = (('' + arr[i][1]).trim().toLowerCase() == 'desc') ? -1 : 1;
        } else if (OneLen == 1) {
            Re[arr[i]] = 1;
        }

    }
    return Re;
}
class support_sequelize_middleware {
    constructor(Schema) {
        function find(next) {
            let isSequelize = true;
            if (typeof (this._conditions) == 'object') {
                let arr = ['deleted', 'where', 'attributes', 'offset', 'limit', 'include', 'order', 'group'];
                for (let idx in this._conditions) {
                    if (arr.indexOf(idx) == -1) {
                        isSequelize = false;
                        break;
                    }
                }
            }
            if (isSequelize) {
                let new_conditions = Object.assign({}, this._conditions);
                this._conditions = {};
                for (let idx in new_conditions) {
                    switch (idx) {
                        case 'where':
                            this._conditions = new_conditions[idx];
                            break;
                        case 'attributes':
                            if (Array.isArray(new_conditions[idx])) {
                                this._fields = Object.assign(ArrToObj(new_conditions[idx]), this._fields);
                            }
                            break;
                        case 'offset':
                            this.options.skip = new_conditions[idx];
                            break;
                        case 'limit':
                            this.options.limit = new_conditions[idx];
                            break;
                        case 'include':
                            this.deepPopulate(new_conditions[idx]);
                            break;
                        case 'order':
                            this.options.sort = Object.assign(ArrToOrderObj(new_conditions[idx]), this.options.sort);
                            break;
                        default:
                            break;
                    }
                }
            }
            if (next) { return next(); }
        };
        Schema.pre('find', find);
        Schema.pre('findOne', find);
    }
}

module.exports = support_sequelize_middleware;