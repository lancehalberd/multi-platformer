
if (typeof(require) !== 'undefined') var {hashObject} = require('./hashObject.js');

var convertMapToTileSet = (map) => {
    // ignore conversion for maps already converted, but create map.hash
    // from scratch each time so that map.uniqueTiles is the single source of truth.
    // Otherwise errors may cause the two to get out of sync.
    map.hash = {0: 0};
    // Older maps may still not have the brushes array set on them.
    if (!map.brushes) {
        map.brushes = [];
        for (var brush of map.brushes) {
            if (brush.type) {
                brush.brushClass = brush.type;
                delete brush.type;
            }
        }
    }
    if (map.uniqueTiles) {
        for (var i = 1; i < map.uniqueTiles.length; i++) {
            var key = hashObject(map.uniqueTiles[i]);
            map.hash[key] = i;
        }
        return map;
    }
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

// Add a tile to the palette if it is missing, and returns the current or new index of the tile.
var addTileToPalette = (map, newTile) => {
    var newKey = hashObject(newTile);
    if (map.hash[newKey]) return map.hash[newKey];
    map.hash[newKey] = map.uniqueTiles.length;
    map.uniqueTiles.push(newTile);
    return map.uniqueTiles.length - 1;
};

// Will return true only if the tile was actually found and deleted from the palette.
var deleteTileFromPalette = (map, uniqueTileIndex) => {
    if (!uniqueTileIndex) {
        console.log(new Error("Cannot delete the blank tile from a zone."));
        return false;
    }
    if (map.uniqueTiles.length <= uniqueTileIndex) {
        console.log(new Error(`No tile to delete at index ${uniqueTileIndex}`));
        return false;
    }
    var key = hashObject(map.uniqueTiles[uniqueTileIndex]);
    delete map.hash[key];
    // Update the unique indexes stored in the mapping of tile hash -> unique tile index
    for (var key in map.hash) {
        if (map.hash[key] >= uniqueTileIndex) map.hash[key]--;
    }
    // Update any unique indexes used by brushes in this palette. (Just clone brushes for now.)
    for (var brushData of (map.brushes || [])) {
        switch (brushData.brushClass) {
            case 'CloneBrush':
                spliceUniqueTileFromGrid(brushData.tileGrid, uniqueTileIndex);
        }
    }
    // Remove the unique tile from the array of unique tiles
    map.uniqueTiles.splice(uniqueTileIndex, 1);
    // Update the unique indexes of the tile grid for the map itself.
    spliceUniqueTileFromGrid(map.composite, uniqueTileIndex);
    return true;
};

// Update the unique tile indexes of a grid to account for the removal of a uniqueTileIndex from the palette.
var spliceUniqueTileFromGrid = (grid, uniqueTileIndex) => {
    for (var row = 0; row < grid.length; row++) {
        var tileRow = grid[row] || [];
        for (var col = 0; col < tileRow.length; col++) {
            // Replace the deleted tile with the empty tile.
            if (tileRow[col] === uniqueTileIndex) {
                tileRow[col] = 0;
            } else if (tileRow[col] > uniqueTileIndex) {
                // The index of all tiles with index greater than the removed tile
                // will be reduced by one.
                tileRow[col]--;
            }
        }
    }
};

var addBrushToPalette = (map, brushData) => {
    // Some brushes cannot be stored as they are originally defined, so we transform them to the format
    // we need to store them in and then save that. We don't want to do this in place because we pass the
    // original data back to other clients for performing the update.
    var storedBrushData = {brushClass: brushData.brushClass};
    switch (brushData.brushClass) {
        case 'CloneBrush':
            // Add any new tiles from this clone brush to the palette and convert them to
            // the local indexes for this map.
            var tileGrid = [];
            for (var row = 0; row < brushData.tileGrid.length; row++) {
                tileGrid[row] = [];
                for (var column = 0; column < brushData.tileGrid[row].length; column++) {
                    tileGrid[row][column] = addTileToPalette(map, brushData.tileGrid[row][column]);
                }
            }
            storedBrushData.tileGrid = tileGrid;
            break;
    }
    map.brushes.push(storedBrushData);
};

var removeBrushFromPalette = (map, brushIndex) => {
    map.brushes.splice(brushIndex, 1);
};

if (typeof(module) !== 'undefined') {
    module.exports = {
        addBrushToPalette,
        addTileToPalette,
        convertMapToTileSet,
        deleteTileFromPalette,
        removeBrushFromPalette,
        setMapTile,
        updateTilePalette,
    };
};

