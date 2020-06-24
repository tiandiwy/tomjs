class CronsError extends Error {
    constructor(message, info) {
        super(message);
        this.info = info;
        this.name = "CronsError";
    }
}

CronsError.FUNC_NOT_FIND_ERROR = "CronsError: onTick not find error";

module.exports = CronsError;