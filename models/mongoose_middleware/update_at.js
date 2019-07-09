class update_at_middleware {
    constructor(Schema) {
        if (Schema.obj.updatedAt) {
            Schema.pre('save', function() {
                this.updatedAt = Date.now();
            });
            Schema.pre('update', function() {
                this.update({}, { $set: { updatedAt: new Date() } });
            });
        }
    }
}

module.exports = update_at_middleware;
