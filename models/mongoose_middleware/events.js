module.exports = class events_middleware {
    constructor(Schema, obj) {
        const events = ["init", "validate", "save", "remove", "count", "find", "findOne", "findOneAndRemove", "findOneAndUpdate", "update", "aggregate", "insertMany"];
        events.map((event) => {
            const HeadName = event.charAt(0).toUpperCase() + event.slice(1);
            if (obj['onPre' + HeadName]) {
                Schema.pre(event, obj['onPre' + HeadName]);
            }
            else if (Schema['onPre' + HeadName]) {
                Schema.pre(event, Schema['onPre' + HeadName]);
            };
            if (obj['onPost' + HeadName]) {
                Schema.pre(event, obj['onPost' + HeadName]);
            }
            else if (Schema['onPost' + HeadName]) {
                Schema.pre(event, Schema['onPost' + HeadName]);
            }
        })
    }
}
