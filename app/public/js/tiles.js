var twilightTiles = requireImage('gfx/jetrel/twilight-tiles.png');

var TILE_SOLID = 0x1;
var stretchNine = {
    image: twilightTiles,
    size: 16,
    x: 7, y:0,
    properties: TILE_SOLID,
};

class StretchNineInstance {
    constructor(source, rectangle) {
        this.source = source;
        this.rectangle = rectangle;
    }

    applyToMap(map) {
        for (var row = this.rectangle.top; row < this.rectangle.bottom; row++) {
            var dy = 1;
            if (row === this.rectangle.top) dy = 0;
            else if (row === this.rectangle.bottom - 1) dy = 2;
            map.composite[row] = map.composite[row] || [];
            for (var col = this.rectangle.left; col < this.rectangle.right; col++) {
                var dx = 1;
                if (col === this.rectangle.left) dx = 0;
                else if (col === this.rectangle.right - 1) dx = 2;
                map.composite[row][col] = {image: this.source.image, size: this.source.size, x: this.source.x + dx, y: this.source.y + dy,
                    properties: this.source.properties };
            }
        }
    }
}



var exampleMap = {
    objects: [
        new StretchNineInstance(stretchNine, rectangle(10, 14, 30, 2)),
        new StretchNineInstance(stretchNine, rectangle(0, 0, 1, 30)),
        new StretchNineInstance(stretchNine, rectangle(49, 0, 1, 30)),
        new StretchNineInstance(stretchNine, rectangle(0, 0, 50, 1)),
        new StretchNineInstance(stretchNine, rectangle(0, 25, 50, 5)),
        new StretchNineInstance(stretchNine, rectangle(15, 23, 40, 2)),
        new StretchNineInstance(stretchNine, rectangle(25, 21, 25, 2)),
        new StretchNineInstance(stretchNine, rectangle(35, 19, 15, 2)),
        new StretchNineInstance(stretchNine, rectangle(42, 17, 8, 2)),
    ],
    tileSize: 32,
    width: 50,
    height: 30,
    composite: []
};
for (var object of exampleMap.objects) {
    object.applyToMap(exampleMap);
}

var tiles = [];

var currentMap = exampleMap;