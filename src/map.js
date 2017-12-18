var StretchNine = require('../app/public/js/editor/StretchNine.js');
var Rectangle = require('../app/public/js/Rectangle.js');
var tiles = require('../app/public/js/tiles.js');


module.exports = (width = 50, height = 30) => {
    width = width || 50;
    height = height || 30;
    if (width * height > 10000) throw new Error("Maximum tile limit (10,000) exceeded");
    var emptyMap = {
        tileSize: 32,
        hash: {'0': 0},
        uniqueTiles: [0],
        width: width,
        height: height,
        composite: [],
        // Spawn in the bottom left corner until we add actual spawners to maps.
        respawnPoint: {
            x: 32 * 2,
            y: 32 * (height - 5),
        }
    };
    // Add floor, ceiling and walls by default.
    var objects = [
        new StretchNine(tiles.stretchNine, new Rectangle(-1, 0, 2, height)),
        new StretchNine(tiles.stretchNine, new Rectangle(width - 1, 0, 2, height)),
        new StretchNine(tiles.stretchNine, new Rectangle(0, -1, width, 2)),
        new StretchNine(tiles.stretchNine, new Rectangle(0, height - 1, width, 2)),
    ];
    for (var object of objects) {
        object.applyToMap(emptyMap);
    }
    return emptyMap;
};
