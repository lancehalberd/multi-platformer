
var fs = require('fs');
// Including tiles using eval because this is a client side js file not formatted for node exports.
eval(fs.readFileSync('./app/public/js/utils.js').toString());

var StretchNine = require('../app/public/js/StretchNine.js');
var tiles = require('../app/public/js/tiles.js');

var exampleMap = {
    objects: [
        new StretchNine(tiles.stretchNine, rectangle(10, 14, 30, 2)),
        new StretchNine(tiles.spikesDown, rectangle(10, 16, 10, 1)),
        new StretchNine(tiles.spikesDown, rectangle(20, 15, 10, 1)),
        new StretchNine(tiles.stretchNine, rectangle(10, 6, 2, 2)),
        new StretchNine(tiles.stretchNine, rectangle(15, 9, 2, 2)),
        new StretchNine(tiles.stretchNine, rectangle(1, 18, 2, 2)),
        new StretchNine(tiles.stretchNine, rectangle(3, 22, 2, 2)),
        new StretchNine(tiles.stretchNine, rectangle(0, 0, 1, 30)),
        new StretchNine(tiles.stretchNine, rectangle(49, 0, 1, 30)),
        new StretchNine(tiles.stretchNine, rectangle(0, 0, 50, 1)),
        new StretchNine(tiles.bouncyBlock, rectangle(0, 25, 50, 5)),
        new StretchNine(tiles.bouncyBlock, rectangle(20, 23, 40, 2)),
        new StretchNine(tiles.stretchNine, rectangle(25, 21, 25, 2)),
        new StretchNine(tiles.stretchNine, rectangle(35, 19, 15, 2)),
        new StretchNine(tiles.stretchNine, rectangle(42, 17, 8, 2)),
        new StretchNine(tiles.spikesUp, rectangle(6, 25, 3, 1)),
        new StretchNine(tiles.spikesRight, rectangle(0, 20, 1, 5)),
        new StretchNine(tiles.spikesLeft, rectangle(15, 23, 1, 2)),
        new StretchNine(tiles.spikesRight, rectangle(16, 23, 1, 2)),
        new StretchNine(tiles.spikesLeft, rectangle(20, 23, 1, 2)),
    ],
    tileSize: 32,
    width: 50,
    height: 30,
    composite: []
};
for (var object of exampleMap.objects) {
    object.applyToMap(exampleMap);
}

module.exports = exampleMap;
