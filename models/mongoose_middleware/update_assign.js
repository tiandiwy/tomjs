class update_assign_middleware {
    constructor(Schema) {
        Schema.pre('updateOne', this.assign);
        Schema.pre('updateMany', this.assign);
    }

    assign(next) {
        if (this._update.$set) {
            this._update.$set = this.schema.statics.assign(this._update.$set);
        }
        if (next) { return next(); }
    }
}

module.exports = update_assign_middleware;
