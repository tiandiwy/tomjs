class update_at_middleware {
    constructor(Schema) {
        if (Schema.obj.updated_at) {
            Schema.pre('save', function() {
                this.updated_at = Date.now();
            });
            Schema.pre('update', function() {
                this.updateMany({}, { $set: { updated_at: new Date() } });
            });
        }
    }
}

module.exports = update_at_middleware;
