var assert = require('assert');
var {hashObject, sortObject} = require('../app/public/js/hashObject.js');
describe('sortObject', () => {
    it('should sort all keys', function() {
        assert.equal(
            JSON.stringify(['a','b','c']),
            JSON.stringify(Object.keys(sortObject({'c':1, 'b': 2, 'a': 3})))
        );
    });
    it('should sort all keys recursively', function() {
        var a = 1, b = 2, c = 3, d = 4, e = 5;
        assert.equal(
            JSON.stringify({a, b, c, o: {d, e}}),
            JSON.stringify(sortObject({o: {e, d}, c, a, b}))
        );
    });
});

describe('hashObject', () => {
    it('should match regardless of key order', function() {
        var a = 1, b = 2, c = 3, d = 4, e = 5;
        assert.equal(
            hashObject({a, b, c, o: {d, e}}),
            hashObject({o: {e, d}, c, a, b})
        );
    });
    it('should not match if objects are different', function() {
        var a = 1, b = 2, c = 3, d = 4, e = 5;
        assert.notEqual(
            hashObject({a, b, c, o: {d, e}}),
            hashObject({o: {e}, c, a, b})
        );
    });
});