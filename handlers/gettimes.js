const require2 = require('tomjs/handlers/require2');
const ms = require2('ms');

module.exports = function(time, deflaut = 0,is_millisecond = false) {
    if (typeof time === 'string') {
        var milliseconds = ms(time);
        if (typeof milliseconds === 'undefined') {
            return deflaut;
        }
        return is_millisecond ? milliseconds : (milliseconds / 1000);
    } else if (typeof time === 'number') {
        return time;
    } else {
        return deflaut;
    }
};
