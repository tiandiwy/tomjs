const require2 = require('tomjs/handlers/require2');
const database = require2('tomjs/database'); //根据配置连接数据库
const Sequelize = require2('sequelize');
const Sequelize_Op = Sequelize.Op;
const MongoDB_Op = {
    eq: Symbol('$eq'),
    ne: Symbol('$ne'),
    gte: Symbol('$gte'),
    gt: Symbol('$gt'),
    lte: Symbol('$lte'),
    lt: Symbol('$lt'),
    not: Symbol('$not'),
    //is: Symbol.for('is'),
    in: Symbol('$in'),
    notIn: Symbol('$nin'),
    //like: Symbol.for('like'),
    //notLike: Symbol.for('notLike'),
    //iLike: Symbol.for('iLike'),
    //notILike: Symbol.for('notILike'),
    regexp: Symbol('$regex'),
    //notRegexp: Symbol.for('notRegexp'),
    //iRegexp: Symbol.for('iRegexp'),
    //notIRegexp: Symbol.for('notIRegexp'),
    //between: Symbol.for('between'),
    //notBetween: Symbol.for('notBetween'),
    //overlap: Symbol.for('overlap'),
    //contains: Symbol.for('contains'),
    //contained: Symbol.for('contained'),
    //adjacent: Symbol.for('adjacent'),
    //strictLeft: Symbol.for('strictLeft'),
    //strictRight: Symbol.for('strictRight'),
    //noExtendRight: Symbol.for('noExtendRight'),
    //noExtendLeft: Symbol.for('noExtendLeft'),
    and: Symbol('$and'),
    or: Symbol('$or'),
    nor: Symbol('$nor'),

    exists: Symbol('$exists'),
    type: Symbol('$type'),

    expr: Symbol('$expr'),

    all: Symbol('$all'),

    //any: Symbol.for('any'),
    //all: Symbol.for('all'),
    //values: Symbol.for('values'),
    //col: Symbol.for('col'),
    //placeholder: Symbol.for('placeholder'),
    //join: Symbol.for('join'),
    //raw: Symbol.for('raw') //deprecated remove by v5.0
};

//返回Sequelize中MongoDB也支持的操作符
// Sequelize and MongoDB Operators intersection for Sequelize 
const All_Op = { 
    eq: Sequelize_Op.eq,
    ne: Sequelize_Op.ne,
    gte: Sequelize_Op.gte,
    gt: Sequelize_Op.gt,
    lte: Sequelize_Op.lte,
    lt: Sequelize_Op.lt,
    not: Sequelize_Op.not,
    //is: Symbol.for('is'),
    in: Sequelize_Op.in,
    notIn: Sequelize_Op.nin,
    //like: Symbol.for('like'),
    //notLike: Symbol.for('notLike'),
    //iLike: Symbol.for('iLike'),
    //notILike: Symbol.for('notILike'),
    regexp: Sequelize_Op.regex,
    //notRegexp: Symbol.for('notRegexp'),
    //iRegexp: Symbol.for('iRegexp'),
    //notIRegexp: Symbol.for('notIRegexp'),
    //between: Symbol.for('between'),
    //notBetween: Symbol.for('notBetween'),
    //overlap: Symbol.for('overlap'),
    //contains: Symbol.for('contains'),
    //contained: Symbol.for('contained'),
    //adjacent: Symbol.for('adjacent'),
    //strictLeft: Symbol.for('strictLeft'),
    //strictRight: Symbol.for('strictRight'),
    //noExtendRight: Symbol.for('noExtendRight'),
    //noExtendLeft: Symbol.for('noExtendLeft'),
    and: Sequelize_Op.and,
    or: Sequelize_Op.or,
    nor: Sequelize_Op.nor,

    exists: Sequelize_Op.exists,
    type: Sequelize_Op.type,

    expr: Sequelize_Op.expr,

    all: Sequelize_Op.all,

    //any: Symbol.for('any'),
    //all: Symbol.for('all'),
    //values: Symbol.for('values'),
    //col: Symbol.for('col'),
    //placeholder: Symbol.for('placeholder'),
    //join: Symbol.for('join'),
    //raw: Symbol.for('raw') //deprecated remove by v5.0
};

module.exports = function(type) {
    let Op;
    type = type.trim().toLowerCase();
    if (!type && type !== '') { type = database.getType(); }
    switch (type) {
        case '':
            Op = All_Op;
            break;
        case 'mongodb':
            Op = MongoDB_Op;
            break;

        default:
            Op = Sequelize_Op;
            break;
    }
    return Op;
};