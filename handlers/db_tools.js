const require2 = require('tomjs/handlers/require2');
const BaseApiError = require2('tomjs/error/base_api_error');
exports.getDBObjByID = async (mode, id, pql = undefined) => {
    let obj = undefined;
    try {
        if (pql === undefined) { obj = await mode.findById(id); }
        else {
            obj = await mode.findById(id).pql(pql);
        }

    } catch (error) {
        if (error instanceof BaseApiError) {
            throw error;
        }
        else{
            throw new BaseApiError(BaseApiError.DB_ERROR, { id: id, message: error.message });
        }
        
    }
    if (obj == null) {
        throw new BaseApiError(BaseApiError.DB_NOT_FOUND_ERROR, { id: id });
    }
    return obj;
}

exports.existsDBObjByID = async (mode, id, not_exists_throw = true) => {
    let obj = undefined;
    try { obj = await mode.findById(id).select('_id'); } catch (e) {
        throw new BaseApiError(BaseApiError.DB_ERROR, { id: id, message: e.message });
    }
    let re = (obj !== null);
    if (not_exists_throw && !re) {
        throw new BaseApiError(BaseApiError.DB_NOT_FOUND_ERROR, { id: id });
    }
    return re;
}
