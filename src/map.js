
var fs = require('fs');
// Including tiles using eval because this is a client side js file not formatted for node exports.
eval(fs.readFileSync('./app/public/js/utils.js').toString());

var StretchNine = require('../app/public/js/StretchNine.js');
var tiles = require('../app/public/js/tiles.js');


module.exports = () => {
    var emptyMap = {
        objects: [
            new StretchNine(tiles.stretchNine, rectangle(-1, 0, 2, 30)),
            new StretchNine(tiles.stretchNine, rectangle(49, 0, 2, 30)),
            new StretchNine(tiles.stretchNine, rectangle(0, -1, 50, 2)),
            new StretchNine(tiles.stretchNine, rectangle(0, 29, 50, 2)),
        ],
        tileSize: 32,
        width: 50,
        height: 30,
        composite: []
    };
    for (var object of emptyMap.objects) {
        object.applyToMap(emptyMap);
    }
    return emptyMap;
};
