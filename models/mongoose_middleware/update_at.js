class update_at_middleware {
    constructor(Schema) {
        if (Schema.obj.updated_at) {
            Schema.pre('save', function(next) {
                this.updated_at = Date.now();
                if (next) { return next(); }
            });
            Schema.pre('update', function(next) {
                this.updateMany({}, { $set: { updated_at: new Date() } });
                if (next) { return next(); }
            });
        }
    }
}

module.exports = update_at_middleware;
