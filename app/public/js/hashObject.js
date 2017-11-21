
var hashObject = (object) => {
    return JSON.stringify(sortObject(object));
};

var sortObject = (object) => {
    var sorted = {};
    var keys = Object.keys(object);
    keys.sort();
    for (var key of keys) {
        var value = object[key];
        if (typeof(value) === 'object' && !(value instanceof Array)) {
            sorted[key] = sortObject(value);
        } else {
            sorted[key] = value;
        }
    }
    return sorted;
};

if (typeof(module) !== 'undefined') {
    module.exports = {
        hashObject,
        sortObject,
    };
}
