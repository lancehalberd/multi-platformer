var StretchNine = require('../app/public/js/StretchNine.js');
var Rectangle = require('../app/public/js/Rectangle.js');
var tiles = require('../app/public/js/tiles.js');


module.exports = () => {
    var emptyMap = {
        objects: [
            new StretchNine(tiles.stretchNine, new Rectangle(-1, 0, 2, 30)),
            new StretchNine(tiles.stretchNine, new Rectangle(49, 0, 2, 30)),
            new StretchNine(tiles.stretchNine, new Rectangle(0, -1, 50, 2)),
            new StretchNine(tiles.stretchNine, new Rectangle(0, 29, 50, 2)),
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
