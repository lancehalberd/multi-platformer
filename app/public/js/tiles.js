var twilightTiles = requireImage('gfx/jetrel/twilight-tiles.png');

var TILE_SOLID_UP = 0x1;
var TILE_SOLID_DOWN = 0x2;
var TILE_SOLID_LEFT = 0x4;
var TILE_SOLID_RIGHT = 0x8;
var TILE_SOLID = TILE_SOLID_UP | TILE_SOLID_DOWN | TILE_SOLID_LEFT | TILE_SOLID_RIGHT;
var TILE_DAMAGE_UP = 0x10;
var TILE_DAMAGE_DOWN = 0x20;
var TILE_DAMAGE_LEFT = 0x40;
var TILE_DAMAGE_RIGHT = 0x80;
var TILE_DAMAGE = TILE_DAMAGE_UP | TILE_DAMAGE_DOWN | TILE_DAMAGE_LEFT | TILE_DAMAGE_RIGHT;
var TILE_BOUNCE_UP = 0x100;
var TILE_BOUNCE_DOWN = 0x200;
var TILE_BOUNCE_LEFT = 0x400;
var TILE_BOUNCE_RIGHT = 0x800;
var TILE_BOUNCE = 0xF00;

var stretchNine = {
    image: twilightTiles,
    size: 16,
    x: 7, y:0,
    properties: TILE_SOLID,
};
var bouncyBlock = {
    image: twilightTiles,
    size: 16,
    x: 7, y:6,
    properties: TILE_SOLID | TILE_BOUNCE,
};
var spikesUp = {
    image: twilightTiles,
    size: 16,
    x: 1, y: 14,
    properties: TILE_SOLID | TILE_DAMAGE_DOWN,
}
var spikesDown = {
    image: twilightTiles,
    size: 16,
    x: 1, y: 14, yScale: -1,
    properties: TILE_SOLID | TILE_DAMAGE_UP,
}
var spikesLeft = {
    image: twilightTiles,
    size: 16,
    x: 4, y: 12,
    properties: TILE_SOLID | TILE_DAMAGE_RIGHT,
}
var spikesRight = {
    image: twilightTiles,
    size: 16,
    x: 4, y: 12, xScale: -1,
    properties: TILE_SOLID | TILE_DAMAGE_LEFT,
}

var allMapObjects = [stretchNine, bouncyBlock, spikesUp, spikesDown, spikesLeft, spikesRight];

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
                map.composite[row][col] = {
                    image: this.source.image,
                    size: this.source.size,
                    x: this.source.x + dx, y: this.source.y + dy,
                    xScale: this.source.xScale || 1,
                    yScale: this.source.yScale || 1,
                    properties: this.source.properties };
            }
        }
    }
}

var exampleMap = {
    objects: [
        new StretchNineInstance(stretchNine, rectangle(10, 14, 30, 2)),
        new StretchNineInstance(spikesDown, rectangle(10, 16, 10, 1)),
        new StretchNineInstance(spikesDown, rectangle(20, 15, 10, 1)),
        new StretchNineInstance(stretchNine, rectangle(10, 6, 2, 2)),
        new StretchNineInstance(stretchNine, rectangle(15, 9, 2, 2)),
        new StretchNineInstance(stretchNine, rectangle(1, 18, 2, 2)),
        new StretchNineInstance(stretchNine, rectangle(3, 22, 2, 2)),
        new StretchNineInstance(stretchNine, rectangle(0, 0, 1, 30)),
        new StretchNineInstance(stretchNine, rectangle(49, 0, 1, 30)),
        new StretchNineInstance(stretchNine, rectangle(0, 0, 50, 1)),
        new StretchNineInstance(bouncyBlock, rectangle(0, 25, 50, 5)),
        new StretchNineInstance(bouncyBlock, rectangle(20, 23, 40, 2)),
        new StretchNineInstance(stretchNine, rectangle(25, 21, 25, 2)),
        new StretchNineInstance(stretchNine, rectangle(35, 19, 15, 2)),
        new StretchNineInstance(stretchNine, rectangle(42, 17, 8, 2)),
        new StretchNineInstance(spikesUp, rectangle(6, 25, 3, 1)),
        new StretchNineInstance(spikesRight, rectangle(0, 20, 1, 5)),
        new StretchNineInstance(spikesLeft, rectangle(15, 23, 1, 2)),
        new StretchNineInstance(spikesRight, rectangle(16, 23, 1, 2)),
        new StretchNineInstance(spikesLeft, rectangle(20, 23, 1, 2)),
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

var tileSource = null;
var getMouseCoords = () => {
    var targetPosition = relativeMousePosition(mainCanvas);
    return [Math.floor((targetPosition[0] + cameraX) / currentMap.tileSize),
            Math.floor((targetPosition[1] + cameraY) / currentMap.tileSize),
    ];
}
// Disable context menu on the main canvas
$('.js-mainCanvas').on('contextmenu', event => {
    return false;
});
var selectTileUnderMouse = () => {
    var coords = getMouseCoords();
    objectIndex = undefined;
    tileSource = currentMap.composite[coords[1]][coords[0]];
}
var drawTileUnderMouse = () => {
    var coords = getMouseCoords();
    currentMap.composite[coords[1]][coords[0]] = tileSource;
};
var objectIndex;
$(document).on('mousewheel', e => {
    e.preventDefault();
    if (!objectIndex) objectIndex = 0;
    if(e.originalEvent.wheelDelta /120 > 0) {
        objectIndex = (objectIndex + allMapObjects.length - 1) % allMapObjects.length;
    } else {
        objectIndex = (objectIndex + 1) % allMapObjects.length;
    }
});
var currentMap = exampleMap;