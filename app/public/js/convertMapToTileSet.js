
if (typeof(require) !== 'undefined') var {hashObject} = require('./hashObject.js');

var convertMapToTileSet = (map) => {
    // ignore conversion for maps already converted.
    if (map.uniqueTiles) return map;
    map.hash = {0: 0};
    map.uniqueTiles = [0];
    for (var row = 0; row < map.height; row++) {
        var tileRow = map.composite[row] || [];
        for (var col = 0; col < map.width; col++) {
            setMapTile(map, row, col, tileRow[col]);
        }
    }
    return map;
};

// Sets a tile on the map given either a unique tile index, or a fully defined tile.
// If the defined tile is not already used on the map, it will be added to the array
// of unique tiles.
var setMapTile = (map, row, col, tile) => {
    if (row < 0 || row >= map.height || col < 0 || col >= map.width) return;
    if (!map.composite[row]) map.composite[row] = [];
    tile = tile || 0;
    if (typeof(tile) === 'number') {
        if (map.uniqueTiles[tile]) map.composite[row][col] = tile;
        else map.composite[row][col] = 0;
        return;
    }
    var key = hashObject(tile);
    if (!map.hash[key]) {
        map.hash[key] = map.uniqueTiles.length;
        map.uniqueTiles.push(tile);
    }
    map.composite[row][col] = map.hash[key];
};

var updateTilePalette = (map, oldKey, newTile) => {
    var newKey = hashObject(newTile);
    if (newKey === oldKey) return;
    var index = map.hash[oldKey];
    delete map.hash[oldKey];
    map.uniqueTiles[index] = newTile;
    map.hash[newKey] = index;
};

var addTileToPalette = (map, newTile) => {
    var newKey = hashObject(newTile);
    if (map.hash[newKey]) return;
    map.hash[newKey] = map.uniqueTiles.length;
    map.uniqueTiles.push(newTile);
};

if (typeof(module) !== 'undefined') {
    module.exports = {
        addTileToPalette,
        convertMapToTileSet,
        setMapTile,
        updateTilePalette,
    };
};

