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

var twilightTiles = 'gfx/jetrel/twilight-tiles.png';
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
    maxHeight: 1,
    properties: TILE_SOLID | TILE_DAMAGE_DOWN,
}
var spikesDown = {
    image: twilightTiles,
    size: 16,
    x: 1, y: 14, yScale: -1,
    maxHeight: 1,
    properties: TILE_SOLID | TILE_DAMAGE_UP,
}
var spikesLeft = {
    image: twilightTiles,
    size: 16,
    x: 4, y: 12,
    maxWidth: 1,
    properties: TILE_SOLID | TILE_DAMAGE_RIGHT,
}
var spikesRight = {
    image: twilightTiles,
    size: 16,
    x: 4, y: 12, xScale: -1,
    maxWidth: 1,
    properties: TILE_SOLID | TILE_DAMAGE_LEFT,
}

var allMapObjects = [stretchNine, bouncyBlock, spikesUp, spikesDown, spikesLeft, spikesRight];


function applyObjectToMap(map, object, coordinates) {
    if (typeof(module) !== 'undefined') {
        StretchNine = require('./StretchNine.js');
    }
    new StretchNine(object, coordinates).applyToMap(map);
}
function applyTileToMap(map, tile, position) {
    if (position[1] < 0 || position[1] >= map.height) return;
    if (!map.composite[position[1]]) map.composite[position[1]] = [];
    if (position[0] < 0 || position[0] >= map.width) return;
    map.composite[position[1]][position[0]] = tile;
}

if (typeof(module) !== 'undefined') {
    module.exports = {
        twilightTiles,
        stretchNine, bouncyBlock, spikesUp, spikesDown, spikesLeft, spikesRight,
        applyObjectToMap,
        applyTileToMap
    };
}

