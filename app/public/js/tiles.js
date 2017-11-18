var TILE_UP = 0x1;
var TILE_DOWN = 0x2;
var TILE_LEFT = 0x4;
var TILE_RIGHT = 0x8;
var TILE_ALL = 0xF;

var TILE_SOLID = 0x1;
var TILE_DAMAGE = 0x10;
var TILE_BOUNCE = 0x100;
var TILE_STICKY = 0x1000;
var TILE_SLIPPERY = 0x10000;

var TILE_SOLID_ALL = TILE_SOLID * TILE_ALL;
var TILE_DAMAGE_ALL = TILE_DAMAGE * TILE_ALL;
var TILE_BOUNCE_ALL = TILE_BOUNCE * TILE_ALL;
var TILE_STICKY_ALL = TILE_STICKY * TILE_ALL;
var TILE_SLIPPERY_ALL = TILE_SLIPPERY * TILE_ALL;

var twilightTiles = '/gfx/jetrel/twilight-tiles.png';
var customTiles = '/gfx/customBlocksA.png';
var mansionTiles = '/gfx/tiles/tilesMansion.png';
var desertTiles32 = '/gfx/tiles/tilesDesert32.png';
var desertTiles16 = '/gfx/tiles/tilesDesert16.png';

var stretchNine = {
    image: twilightTiles,
    size: 16,
    x: 7, y:0,
    properties: TILE_SOLID_ALL,
};
var bouncyBlock = {
    image: twilightTiles,
    size: 16,
    x: 7, y:6,
    properties: TILE_SOLID_ALL | TILE_BOUNCE_ALL,
};
var spikesUp = {
    image: twilightTiles,
    size: 16,
    x: 1, y: 14,
    maxHeight: 1,
    properties: TILE_SOLID_ALL | (TILE_DAMAGE * TILE_DOWN),
};
var spikesDown = {
    image: twilightTiles,
    size: 16,
    x: 1, y: 14, yScale: -1,
    maxHeight: 1,
    properties: TILE_SOLID_ALL | (TILE_DAMAGE * TILE_UP),
};
var spikesLeft = {
    image: twilightTiles,
    size: 16,
    x: 4, y: 12,
    maxWidth: 1,
    properties: TILE_SOLID_ALL | (TILE_DAMAGE * TILE_RIGHT),
};
var spikesRight = {
    image: twilightTiles,
    size: 16,
    x: 4, y: 12, xScale: -1,
    maxWidth: 1,
    properties: TILE_SOLID_ALL | (TILE_DAMAGE * TILE_LEFT),
};
var stickyTile = {
    image: twilightTiles,
    size: 16,
    x: 4, y: 2,
    maxWidth: 1,
    maxHeight: 1,
    properties: TILE_SOLID_ALL | TILE_STICKY_ALL,
};
var iceBlock = {
    image: customTiles,
    size: 16,
    x: 0, y: 0,
    maxWidth: 1,
    maxHeight: 1,
    properties: TILE_SOLID_ALL | TILE_SLIPPERY_ALL,
};

///////////////////////////
// MANSION TILESET 32x32 //
///////////////////////////

var panelSquareHorizMansion = {
    image: mansionTiles,
    size: 32,
    x: 1, y:0,
    properties: TILE_SOLID_ALL,
};

var panelSquareVertMansion = {
    image: mansionTiles,
    size: 32,
    x: 0, y:0,
    properties: TILE_SOLID_ALL,
};

var panelStripVertMansion = {
    image: mansionTiles,
    size: 32,
    x: 2, y:0,
};

var floorMansion = {
    image: mansionTiles,
    size: 32,
    x: 3, y:0,
    properties: TILE_SOLID_ALL,
};

var floorThinMansion = {
    image: mansionTiles,
    size: 32,
    x: 5, y:0,
    properties: TILE_SOLID_ALL,
};

var pillarDarkMansion = {
    image: mansionTiles,
    size: 32,
    x: 4, y:0,
    properties: TILE_SOLID_ALL,
};

var hedgeMansion = {
    image: mansionTiles,
    size: 32,
    x: 8, y:0,
    properties: TILE_SOLID_ALL,
};

var stonesDarkMansion = {
    image: mansionTiles,
    size: 32,
    x: 12, y:0,
    properties: TILE_SOLID_ALL,
};

var stonesDirtMansion = {
    image: mansionTiles,
    size: 32,
    x: 9, y:0,
    properties: TILE_SOLID_ALL,
};

var stonesMossLightMansion = {
    image: mansionTiles,
    size: 32,
    x: 10, y:0,
    properties: TILE_SOLID_ALL,
};

var stonesMossDarkMansion = {
    image: mansionTiles,
    size: 32,
    x: 11, y:0,
    properties: TILE_SOLID_ALL,
};

var wallpaperRedMansion = {
    image: mansionTiles,
    size: 32,
    x: 7, y:0,
};

var wallpaperGreenMansion = {
    image: mansionTiles,
    size: 32,
    x: 6, y:0,
};

var stickyTileMansion = {
    image: mansionTiles,
    size: 32,
    x: 19, y: 0,
    maxWidth: 1,
    maxHeight: 1,
    properties: TILE_SOLID_ALL | TILE_STICKY_ALL,
};

var spikesUpMansionFence = {
    image: mansionTiles,
    size: 32,
    x: 13, y: 0,
    maxHeight: 1,
    properties: TILE_SOLID_ALL | (TILE_DAMAGE * TILE_DOWN),
};

var spikesUpMansionGate = {
    image: mansionTiles,
    size: 32,
    x: 14, y: 0,
    maxHeight: 1,
    properties: TILE_SOLID_ALL | (TILE_DAMAGE * TILE_DOWN),
};

var spikesDownMansion = {
    image: mansionTiles,
    size: 32,
    x: 15, y: 0, yScale: -1,
    maxHeight: 1,
    properties: TILE_SOLID_ALL | (TILE_DAMAGE * TILE_UP),
};

var spikesLeftMansion = {
    image: mansionTiles,
    size: 32,
    x: 16, y: 0,
    maxWidth: 1, xScale: -1,
    properties: TILE_SOLID_ALL | (TILE_DAMAGE * TILE_RIGHT),
};

var spikesRightMansion = {
    image: mansionTiles,
    size: 32,
    x: 16, y: 0,
    maxWidth: 1,
    properties: TILE_SOLID_ALL | (TILE_DAMAGE * TILE_LEFT),
};

///////////////////////////////
// END MANSION TILESET 32x32 //
///////////////////////////////

//////////////////////////
// DESERT TILESET 32x32 //
//////////////////////////

var stone1Desert32 = {
    image: desertTiles32,
    size: 32,
    x: 0, y:0,
    properties: TILE_SOLID_ALL,
};

var spikesPearCactusDesert32 = {
    image: desertTiles32,
    size: 32,
    x: 1, y: 0,
    maxWidth: 1,
    properties: TILE_SOLID_ALL | (TILE_DAMAGE * TILE_UP) | (TILE_DAMAGE * TILE_LEFT) | (TILE_DAMAGE * TILE_DOWN)
};

var spikesPearCactusFlowersDesert32 = {
    image: desertTiles32,
    size: 32,
    x: 2, y: 0,
    maxWidth: 1,
    properties: TILE_SOLID_ALL | TILE_DAMAGE_ALL
};

var spikesSaguaroCactusDesert32 = {
    image: desertTiles32,
    size: 32,
    x: 3, y: 0,
    maxWidth: 1,
    properties: TILE_SOLID_ALL | (TILE_DAMAGE * TILE_UP) | (TILE_DAMAGE * TILE_LEFT) | (TILE_DAMAGE * TILE_DOWN)
};

//////////////////////////////
// END DESERT TILESET 32x32 //
//////////////////////////////

//////////////////////////
// DESERT TILESET 16x16 //
//////////////////////////

var spikesCactusDesert16 = {
    image: desertTiles16,
    size: 16,
    x: 0, y: 0,
    maxWidth: 1,
    properties: TILE_SOLID_ALL | (TILE_DAMAGE * TILE_UP) | (TILE_DAMAGE * TILE_LEFT) | (TILE_DAMAGE * TILE_DOWN)
};

var spikesPearCactusDesert16 = {
    image: desertTiles16,
    size: 16,
    x: 1, y: 0,
    maxWidth: 1,
    properties: TILE_SOLID_ALL | (TILE_DAMAGE * TILE_UP) | (TILE_DAMAGE * TILE_LEFT) | (TILE_DAMAGE * TILE_DOWN)
};

var stone1Desert16 = {
    image: desertTiles16,
    size: 16,
    x: 2, y: 0,
    maxWidth: 1,
    properties: TILE_SOLID_ALL
};

var stone2Desert16 = {
    image: desertTiles16,
    size: 16,
    x: 3, y: 0,
    maxWidth: 1,
    properties: TILE_SOLID_ALL
};

var stone3Desert16 = {
    image: desertTiles16,
    size: 16,
    x: 4, y: 0,
    maxWidth: 1,
    properties: TILE_SOLID_ALL
};

var stone4Desert16 = {
    image: desertTiles16,
    size: 16,
    x: 5, y: 0,
    maxWidth: 1,
    properties: TILE_SOLID_ALL
};

//////////////////////////////
// END DESERT TILESET 32x32 //
//////////////////////////////

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

