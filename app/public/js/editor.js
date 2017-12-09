let isEditing = false;
var cloneStartCoords, cloneLastCoords;

$(document).on('mousedown', function (event) {
    if (
        !$(event.target).closest('.js-mouseContainer').length &&
        !$(event.target).closest('.js-previewField').length &&
        !$(event.target).closest('.js-tileSourceField').length
    ) {
        selectingTileGraphic = false;
    }
})
const updateEditor = () => {
    if (isKeyDown(KEY_SHIFT) && isKeyDown(KEY_E, true)) {
        toggleEditing();
    }
    if (!isEditing) return;
    if (selectingTileGraphic) {
        var selectedCoords;
        if (mouseDown && (selectedCoords = getTileSelectionCoords())) {
            var updatedTile = currentBrush.getTile();
            var oldKey = hashObject(updatedTile);
            updatedTile.x = selectedCoords[0];
            updatedTile.y = selectedCoords[1];
            updatedTile.image = getSelectedTileSource();
            updatedTile.size = getSelectedTileSourceSize();
            // Update this tile on the server if it is a saved tile.
            if (updatedTile !== newTile) {
                sendData({action: 'updateTilePalette', oldKey, updatedTile});
            }
        }
        return;
    }
    checkToUpdateLocalTiles();
    if (isKeyDown(KEY_SHIFT) && mouseDown) {
        var pixelCoords = getPixelMouseCoords();
        mainCharacter.x = pixelCoords[0];
        mainCharacter.y = pixelCoords[1];
        mainCharacter.canTeleport = false;
        return;
    }
    if (!mouseDown && !(currentBrush instanceof EntityBrush)) {
        // Trigger brush uses the right click to set the target
        if (rightMouseDown) {
            if (!cloneStartCoords) {
                cloneStartCoords = getMouseCoords();
                selectTileUnderMouse();
            }
            cloneLastCoords = getMouseCoords();
        } else {
            cloneStartCoords = cloneLastCoords = null;
        }
        if (cloneStartCoords) {
            var cloneRectangle = getDrawnRectangle(cloneStartCoords, cloneLastCoords);
            if (cloneRectangle.height > 1 || cloneRectangle.width > 1) {
                var cloneTileGrid = [];
                for (var row = cloneRectangle.top; row < cloneRectangle.bottom; row++) {
                    if (!onMap(row, 0)) continue;
                    cloneTileGrid[row - cloneRectangle.top] = [];
                    for (var column = cloneRectangle.left; column < cloneRectangle.right; column++) {
                        if (!pointIsInLevel(row, column)) continue;
                        cloneTileGrid[row - cloneRectangle.top][column - cloneRectangle.left]
                            = currentMap.composite[row][column];
                    }
                }
                selectBrush(new CloneBrush(cloneTileGrid, currentMap));
            }
        }
    }
    if (currentBrush) currentBrush.update();
};

var newTile = null;
const toggleEditing = () => {
    isEditing = !isEditing;
    $('.pageBody').toggleClass('isEditing', isEditing);
    cancelCreatingNewTile(true);
    $('.js-editPanel').toggle(isEditing);
    $('.js-saveTile, .js-cancelTile').hide();
    // Populate the special brush panel if this is the first time opening the edit panel.
    var $specialBrushList = $('.js-specialBrushes');
    if (!$specialBrushList.children().length) {
        intializeTileProperties();
        for (var brush of brushList) {
            $specialBrushList.append(createBrushPreviewElement(brush));
        }
    }
    selectBrush(currentBrush);
    selectedTrigger = null;
};
$('.js-brushSelectField').on('click', '.js-brushCanvas', function () {
    cancelCreatingNewTile();
    selectBrush($(this).data('brush'));
});
var previousBrush = null;
$('.js-newTile').on('click', () => {
    var currentTile = currentBrush.getTile ? currentBrush.getTile() : null;
    if (currentTile) {
        newTile = Object.assign({}, currentTile);
    } else {
        newTile = {image: getSelectedTileSource(), x:0, y:0, size:16, properties: 0};
    }
    previousBrush = currentBrush;
    selectBrush(new TileBrush(newTile));
    selectingTileGraphic = true;
    $('.js-newTile').hide();
    $('.js-saveTile, .js-cancelTile').show();
});
$('.js-saveTile').on('click', () => {
    var newKey = hashObject(newTile);
    // If the tile they attempt to save already exists, just cancel creation
    // and set the brush to match the existing tile.
    if (currentMap.hash[newKey]) {
        cancelCreatingNewTile();
        selectBrush(new TileBrush(currentMap.hash[newKey]));
        return;
    }
    sendData({action: 'addTileToPalette', newTile});
});

const cancelCreatingNewTile = (revertBrush) => {
    newTile = null;
    selectingTileGraphic = false;
    if (revertBrush && previousBrush) {
        selectBrush(previousBrush);
    }
    $('.js-saveTile, .js-cancelTile').hide();
    $('.js-newTile').show();
};
$('.js-cancelTile').on('click', cancelCreatingNewTile);

const checkToUpdateLocalTiles = () => {
    var $localTiles = $('.js-localTiles');
    if ($localTiles.data('zoneId') !== currentMap.id) {
        $localTiles.empty();
    }
    $localTiles.data('zoneId', currentMap.id);
    for (var n = $localTiles.children().length; n < currentMap.uniqueTiles.length; n++) {
        var brush = new TileBrush(n, currentMap);
        $localTiles.append(createBrushPreviewElement(brush));
        cancelCreatingNewTile(false);
    }
};

const createBrushPreviewElement = (brush) => {
    var canvas = createCanvas(32, 32, 'js-brushCanvas');
    updateBrushPreviewElement(canvas, brush);
    return canvas;
};
const updateBrushPreviewElement = (canvas, brush) => {
    var context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.save();
    context.translate(16, 16);
    draw.fillRectangle(context, new Rectangle(-16, -16, 32, 32), 'white');
    brush.renderHUD(context, new Rectangle(-16, -16, 32, 32));
    context.restore();
    $(canvas).data('brush', brush);
};

const selectBrush = (newBrush) => {
    currentBrush = newBrush;
    $('.js-zoneSelectField').toggle(currentBrush && !!currentBrush.onSelectZone);
    $('.js-locationSelectField').toggle(currentBrush && !!currentBrush.onSelectLocation);
    if (!(currentBrush instanceof TileBrush) || !currentBrush.tileSource) {
        selectingTileGraphic = false;
        $('.js-tileSourceField select').toggle(false);
    } else {
        $('.js-tileSourceField select').toggle(true);
        var tile = currentBrush.getTile();
        $('.js-tileSourceField select').val(tile && tile.image);
    }
    updateTilePropertiesPreview();

    // Unselect the current entity if it doesn't match the new brush.
    if (selectedTrigger && selectedTrigger.brushClass && selectedTrigger.brushClass !== currentBrush.constructor.name) {
        selectedTrigger = null;
    }
    if (selectedTrigger && selectedTrigger.zoneId) {
        $('.js-zoneSelectField select').val(selectedTrigger.zoneId);
    }
    if (currentBrush && currentBrush.onSelectZone) {
        requestZoneData($('.js-zoneSelectField select').val());
    }
};

const updateTilePropertiesPreview = () => {
    var tile = currentBrush.getTile && currentBrush.getTile();
    if (!tile || !(currentBrush instanceof TileBrush)) {
        $('.js-tileProperties').hide();
        return;
    }
    $('.js-tileProperties').show();

    $('.js-tileProperties canvas').each(function () {
        $(this).css('opacity', (tile.properties & $(this).data('value')) ? 1 : .3);
    });
};
var toggleTileProperty = (updatedTile, property) => {
    var oldKey = hashObject(updatedTile);
    updatedTile.properties ^= property;
    // Update this tile on the server if it is a saved tile.
    if (updatedTile !== newTile) {
        sendData({action: 'updateTilePalette', oldKey, updatedTile});
    } else {
        updateTilePropertiesPreview();
    }
};

$('.js-tileProperties').on('click', 'canvas', function () {
    toggleTileProperty(currentBrush.getTile(), $(this).data('value'));
});

const updateLocationSelect = () => {
    var zone = loadedZonesById[$('.js-zoneSelectField select').val()];
    if (!zone) return;
    var $locationSelect = $('.js-locationSelectField select');
    $locationSelect.empty();
    var index = 1;
    for (var checkPoint of (zone.entities || []).filter(entity => entity.__class__ === 'CheckPoint')) {
        $locationSelect.append($('<option />').attr('value', checkPoint.id).text(`${index}: ${checkPoint.x},${checkPoint.y}`));
        index++;
    }
    $locationSelect.append($('<option />').attr('value', 'custom').text('Custom'));
    if (selectedTrigger && selectedTrigger.checkPointId) {
        $locationSelect.val(selectedTrigger.checkPointId);
    } else if (selectedTrigger) {
        $locationSelect.val('custom');
        $('.js-locationSelectField .js-x').val(selectedTrigger.targetX);
        $('.js-locationSelectField .js-y').val(selectedTrigger.targetY);
    } else {
        // Select first option by default.
        $locationSelect.find('option:eq(0)').prop('selected', true);
    }
    updateLocationXAndYFields();
};

var previewCanvas = $('.js-previewField .js-previewCanvas')[0];
var previewContext = previewCanvas.getContext('2d');
previewContext.imageSmoothingEnabled = false;

const renderEditor = () => {
    if (!isEditing) return;
    // While editing, we display a preview of the tile you are about to place, or the area
    // the object will be drawn to.
    mainContext.save();
    mainContext.translate(Math.round(-cameraX), Math.round(-cameraY));
    mainContext.globalAlpha = .5

    if (cloneStartCoords) {
        var drawnRectangle = getDrawnRectangle(cloneStartCoords, cloneLastCoords);
        draw.fillRectangle(mainContext, drawnRectangle.scale(currentMap.tileSize), 'yellow');
    } else {
        var coords = getMouseCoords();
        var targetRectangle = new Rectangle(coords[0], coords[1], 1, 1).scale(currentMap.tileSize);
        currentBrush.renderPreview(targetRectangle);
    }
    mainContext.restore();
    // Editing HUD displays the currently selected tile/object in the top right.
    previewContext.save();
    previewContext.translate(48, 48);
    var previewTarget = new Rectangle(-48, -48, 96, 96);
    draw.fillRectangle(previewContext, previewTarget, 'white');
    currentBrush.renderHUD(previewContext, previewTarget);
    previewContext.restore();
    if (selectingTileGraphic) {
        var tileSourceImage = requireImage(getSelectedTileSource());
        mainContext.save();
        mainContext.globalAlpha = .8;
        draw.fillRectangle(mainContext, new Rectangle(0, 0, mainCanvas.width, mainCanvas.height), 'white');
        mainContext.globalAlpha = 1;
        var scale = getTileSelectionScale();
        mainContext.scale(scale, scale);
        var imageRectangle = Rectangle.defineFromImage(tileSourceImage);
        //draw.fillRectangle(mainContext, imageRectangle, 'white');
        draw.image(mainContext, tileSourceImage, imageRectangle, imageRectangle);
        var tile = currentBrush.getTile();
        if (tile) {
            var x = tile.x;
            var y = tile.y;
            var size = tile.size;
            mainContext.lineWidth = 2;
            draw.strokeRectangle(mainContext, new Rectangle(x, y, 1, 1).scale(size), 'red');
        }
        mainContext.restore();
    }
};

const getTileSelectionScale = () => {
    var tileSourceImage = requireImage(getSelectedTileSource());
    return Math.min(3, mainCanvas.width / tileSourceImage.width, mainCanvas.height / tileSourceImage.height);
};
const getTileSelectionCoords = () => {
    var tileSourceImage = requireImage(getSelectedTileSource());
    var tileSourceSize = getSelectedTileSourceSize();
    var scale = getTileSelectionScale();
    var pixelCoords = getPixelMouseCoords(0, 0);
    pixelCoords[0] /= scale;
    pixelCoords[1] /= scale;
    if (!Rectangle.defineFromImage(tileSourceImage).containsPoint(pixelCoords[0], pixelCoords[1])) return null;
    return [Math.floor(pixelCoords[0] / tileSourceSize), Math.floor(pixelCoords[1] / tileSourceSize)];
};

const getDrawnRectangle = (startCoords, endCoords, mapObject) => {
    var drawnRectangle = new Rectangle(
        Math.min(startCoords[0], endCoords[0]), Math.min(startCoords[1], endCoords[1]),
        Math.abs(startCoords[0] - endCoords[0]) + 1, Math.abs(startCoords[1] - endCoords[1]) + 1
    );
    if (mapObject && mapObject.maxWidth) {
        var right = drawnRectangle.right;
        // adjust the left hand side to include the start coord and be at most max width wide.
        drawnRectangle.left = Math.max(drawnRectangle.left, Math.min(startCoords[0], right - mapObject.maxWidth));
        drawnRectangle.width = Math.min(mapObject.maxWidth, right - drawnRectangle.left);
        drawnRectangle.right = drawnRectangle.left + drawnRectangle.width;
    }
    if (mapObject && mapObject.maxHeight) {
        var bottom = drawnRectangle.bottom;
        // adjust the left hand side to include the start coord and be at most max width wide.
        drawnRectangle.top = Math.max(drawnRectangle.top, Math.min(startCoords[1], bottom - mapObject.maxHeight));
        drawnRectangle.height = Math.min(mapObject.maxHeight, bottom - drawnRectangle.top);
        drawnRectangle.bottom = drawnRectangle.top + drawnRectangle.height;
    }
    return drawnRectangle;
};

// Send tile update only if the brush is different than what is currently on the map.
var updateTileIfDifferent = (coords, tileSource) => {
    var currentTile = currentMap.composite[coords[1]][coords[0]];
    var index = tileSource;
    if (typeof(tileSource) !== 'number') {
        var key = hashObject(tileSource);
        // This will be undefined if the is not found. That's good,
        // since it won't match the current tile, which is always a number 0-N.
        index = currentMap.hash[key];
    }
    if (index !== currentTile) {
        sendTileUpdate(tileSource, coords);
    }
};

var onMap = (row, column) => row >= 0 && row < currentMap.height && column >= 0 && column < currentMap.width;
var pointIsInLevel = (x, y) => {
    var levelRectangle = new Rectangle(0, 0, currentMap.width, currentMap.height).scale(currentMap.tileSize);
    return levelRectangle.containsPoint(x, y);
};

class CloneBrush {

    constructor(tileGrid, mapSource) {
        this.tileGrid = tileGrid;
        this.released = true;
        this.mapSource = mapSource;
    }

    forEachTile(coords, callback) {
        for (var row = 0; row < this.tileGrid.length; row++) {
            for (var column = 0; column < this.tileGrid[0].length; column++) {
                var tileIndex = this.tileGrid[row][column];
                callback(this.mapSource.uniqueTiles[tileIndex], coords[1] + row, coords[0] + column);
            }
        }
    }

    update() {
        // Send tile update only if the brush is different than what is
        // currently on the map.
        if (this.released && mouseDown) {
            this.forEachTile(getMouseCoords(), (tileSource, tileRow, tileColumn) => {
                if (onMap(tileRow, tileColumn)) {
                    updateTileIfDifferent([tileColumn, tileRow], tileSource);
                }
            });
        }
        this.released = !mouseDown;
    }

    renderPreview(target) {
        this.forEachTile(getMouseCoords(), (tileSource, tileRow, tileColumn) => {
            var target = new Rectangle(tileColumn, tileRow, 1, 1).scale(currentMap.tileSize);
            if (tileSource) {
                mainContext.save();
                mainContext.translate(target.left + currentMap.tileSize / 2, target.top + currentMap.tileSize / 2);
                mainContext.scale(tileSource.xScale, tileSource.yScale);
                draw.image(mainContext, requireImage(tileSource.image),
                    getTileSourceRectangle(tileSource),
                    new Rectangle(-1 / 2, -1 / 2, 1, 1).scale(currentMap.tileSize)
                );
                mainContext.restore();
            } else {
                draw.fillRectangle(mainContext, target, 'white');
            }
        });
    }

    renderHUD(context, target) {
        var scale = Math.min(2 / this.tileGrid.length, 2 / this.tileGrid[0].length);
        context.scale(scale, scale);
        this.forEachTile([0, 0], (tileSource, tileRow, tileColumn) => {
            var subTarget = new Rectangle(
                Math.round(target.left / scale + tileColumn * currentMap.tileSize),
                Math.round(target.top / scale + tileRow * currentMap.tileSize),
                currentMap.tileSize,
                currentMap.tileSize
            );
            if (tileSource) {
                context.save();
                context.translate(subTarget.left + currentMap.tileSize / 2, subTarget.top + currentMap.tileSize / 2);
                context.scale(tileSource.xScale || 1, tileSource.yScale || 1);
                draw.image(context, requireImage(tileSource.image), getTileSourceRectangle(tileSource),
                    new Rectangle(-1 / 2, -1 / 2, 1, 1).scale(currentMap.tileSize)
                );
                context.restore();
            }
        });
    }
}

class InsertRowBrush {
    constructor() {
        this.released = true;
        this.insertRow = this.sourceRow = null;
    }

    update() {
        this.insertRow = null;
        if (!isMouseOver($(mainCanvas))) return;
        this.sourceRow = getMouseCoords()[1];
        if (this.sourceRow < 0 || this.sourceRow >= currentMap.height) return;
        var subY = getPixelMouseCoords()[1] % currentMap.tileSize;
        if (subY < currentMap.tileSize / 2) this.insertRow = this.sourceRow;
        else this.insertRow = this.sourceRow + 1;
        if (this.released && mouseDown) {
            sendData({action: 'insertRow', insertRow: this.insertRow, sourceRow: this.sourceRow});
        }
        this.released = !mouseDown;
    }

    renderPreview(target) {
        var context = mainContext;
        if (this.insertRow === null) return;
        context.save();
        context.globalAlpha = .9;
        var height = mainCanvas.height - (this.sourceRow * currentMap.tileSize - cameraY);
        draw.image(context, mainCanvas,
            new Rectangle(0, this.sourceRow * currentMap.tileSize - cameraY, mainCanvas.width, height),
            new Rectangle(cameraX, (this.sourceRow + 1) * currentMap.tileSize, mainCanvas.width, height),
        );
        context.globalAlpha = .5;
        draw.fillRectangle(context,
            new Rectangle(cameraX, this.insertRow * currentMap.tileSize, mainCanvas.width, currentMap.tileSize), 'green'
        );
        context.restore();
    }

    renderHUD(context, target) {
        draw.fillRectangle(context, target.stretchFromCenter(1, 1 / 3), 'green');
    }
}

class InsertColumnBrush {

    constructor() {
        this.released = true;
        this.insertColumn = this.sourceColumn = null;
    }

    update() {
        this.insertColumn = null;
        if (!isMouseOver($(mainCanvas))) return;
        this.sourceColumn = getMouseCoords()[0];
        if (this.sourceColumn < 0 || this.sourceColumn >= currentMap.width) return;
        var subX = getPixelMouseCoords()[0] % currentMap.tileSize;
        if (subX < currentMap.tileSize / 2) this.insertColumn = this.sourceColumn;
        else this.insertColumn = this.sourceColumn + 1;
        if (this.released && mouseDown) {
            sendData({action: 'insertColumn', insertColumn: this.insertColumn, sourceColumn: this.sourceColumn});
        }
        this.released = !mouseDown;
    }

    renderPreview(target) {
        if (this.insertColumn === null) return;
        var context = mainContext;
        context.save();
        context.globalAlpha = .9;
        var width = mainCanvas.width - (this.sourceColumn * currentMap.tileSize - cameraX);
        draw.image(context, mainCanvas,
            new Rectangle(this.sourceColumn * currentMap.tileSize - cameraX, 0, width, mainCanvas.height),
            new Rectangle((this.sourceColumn + 1) * currentMap.tileSize, cameraY, width, mainCanvas.height),
        );
        context.globalAlpha = .5;
        draw.fillRectangle(context,
            new Rectangle(this.insertColumn * currentMap.tileSize, cameraY, currentMap.tileSize, mainCanvas.height), 'green'
        );
        context.restore();
    }

    renderHUD(context, target) {
        draw.fillRectangle(context, target.stretchFromCenter(1 / 3, 1), 'green');
    }
}

class DeleteRowBrush {
    constructor() {
        this.released = true;
    }

    update() {
        if (!isMouseOver($(mainCanvas))) return;
        var row = getMouseCoords()[1];
        if (row < 0 || row > currentMap.height) return;
        if (this.released && mouseDown) {
            sendData({action: 'deleteRow', row});
        }
        this.released = !mouseDown;
    }

    renderPreview(target) {
        if (!isMouseOver($(mainCanvas))) return;
        var context = mainContext;
        var row = getMouseCoords()[1];
        if (row < 0 || row >= currentMap.height) return;
        context.save();
        context.globalAlpha = .5;
        draw.fillRectangle(context, new Rectangle(cameraX, row * currentMap.tileSize, mainCanvas.width, currentMap.tileSize), 'red');
        context.restore();
    }

    renderHUD(context, target) {
        draw.fillRectangle(context, target.stretchFromCenter(1, 1 / 3), 'red');
    }
}

class DeleteColumnBrush {

    constructor() {
        this.released = true;
    }

    update() {
        if (!isMouseOver($(mainCanvas))) return;
        var column = getMouseCoords()[0];
        if (column < 0 || column >= currentMap.width) return;
        if (this.released && mouseDown) {
            sendData({action: 'deleteColumn', column});
        }
        this.released = !mouseDown;
    }

    renderPreview(target) {
        if (!isMouseOver($(mainCanvas))) return;
        var column = getMouseCoords()[0];
        if (column < 0 || column > currentMap.width) return;
        var context = mainContext;
        context.save();
        context.globalAlpha = .5;
        draw.fillRectangle(context,  new Rectangle(column * currentMap.tileSize, cameraY, currentMap.tileSize, mainCanvas.height), 'red');
        context.restore();
    }

    renderHUD(context, target) {
        draw.fillRectangle(context, target.stretchFromCenter(1 / 3, 1), 'red');
    }
}

var getTileSourceRectangle = tileSource => new Rectangle(tileSource.x, tileSource.y, 1, 1).scale(tileSource.size);

class TileBrush {

    constructor(tileSource, mapSource) {
        this.tileSource = tileSource;
        this.mapSource = mapSource;
    }

    update() {
        if (mouseDown) {
            updateTileIfDifferent(getMouseCoords(), this.getTile());
        }
    }

    getTile() {
        if (typeof this.tileSource === 'number') {
            // 0 is the only valid numeric tile without a source map, since the source map
            // contains the mapping of numbers to actual tiles.
            if (!this.mapSource) return 0;
            return this.mapSource.uniqueTiles[this.tileSource];
        }
        return this.tileSource;
    }

    renderPreview(target) {
        var tile = this.getTile();
        if (tile) {
            mainContext.translate(target.left + currentMap.tileSize / 2, target.top + currentMap.tileSize / 2);
            mainContext.scale(tile.xScale, tile.yScale);
            draw.image(mainContext, requireImage(tile.image),
                getTileSourceRectangle(tile),
                new Rectangle(-1 / 2, -1 / 2, 1, 1).scale(currentMap.tileSize)
            );
        } else {
            draw.fillRectangle(mainContext, target, 'white');
        }
    }

    renderHUD(context, target) {
        var tile = this.getTile();
        if (tile) {
            context.scale(tile.xScale || 1, tile.yScale || 1);
            draw.image(context, requireImage(tile.image), getTileSourceRectangle(tile), target);
        } else {
            draw.fillRectangle(context, target, 'white');
        }
    }
}

class ObjectBrush {

    constructor(mapObject) {
        this.mapObject = mapObject;
    }

    update() {
        if (mouseDown) {
            if (!objectStartCoords) objectStartCoords = getMouseCoords();
            objectLastCoords = getMouseCoords();
        } else {
            if (objectStartCoords) {
                var drawnRectangle = getDrawnRectangle(objectStartCoords, objectLastCoords, this.mapObject);
                sendMapObject(this.mapObject, drawnRectangle);
                objectStartCoords = null;
            }
        }
    }

    renderPreview(target) {
        if (objectStartCoords) {
            var drawnRectangle = getDrawnRectangle(objectStartCoords, objectLastCoords, this.mapObject);
            draw.fillRectangle(mainContext, drawnRectangle.scale(currentMap.tileSize), 'red');
        } else {
            draw.fillRectangle(mainContext, target, 'red');
        }
    }

    renderHUD(context, target) {
        var width = (this.mapObject.maxWidth || 3);
        var height = (this.mapObject.maxHeight || 3);
        context.scale(
            (this.mapObject.xScale || 1) * width / 3,
            (this.mapObject.yScale || 1) * height / 3
        );
        draw.image(context, requireImage(this.mapObject.image),
            new Rectangle(this.mapObject.x, this.mapObject.y, width, height).scale(this.mapObject.size),
            target
        );
    }
}

// This should be changed to selectedEntity at some point.
var selectedTrigger = null, draggingTrigger = null;
class EntityBrush {
    constructor(sourceEntity) {
        this.sourceEntity = sourceEntity;
        this.wasMouseDown = false;
    }

    createEntity() {
        var entity = cloneEntity(this.sourceEntity);
        // We store the brushClass so we know what brush to use when we select this entity.
        // Maybe we can put this as a static field on the entity class.
        entity.brushClass = this.constructor.name;
        return entity
    }

    update() {
        var mouseCoords = getMouseCoords();
        var pixelMouseCoords = getPixelMouseCoords();
        if (selectedTrigger && isKeyDown(KEY_BACK_SPACE)) {
            sendDeleteEntity(selectedTrigger.id);
            selectedTrigger = null;
        }
        if (!this.wasMouseDown && mouseDown) {
            var lastSelected = selectedTrigger, newSelectedTrigger;
            localSprites.filter(sprite => (sprite instanceof Entity)).forEach(sprite => {
                if (sprite.getEditingHitBox().containsPoint(pixelMouseCoords[0], pixelMouseCoords[1])) {
                    newSelectedTrigger = sprite;
                    return false;
                }
            });
            // Setting this prevents creating a new entity as a result of this mouse click
            // if they started clicking an existing entity.
            draggingTrigger = newSelectedTrigger;
            if (lastSelected === newSelectedTrigger) {
                selectedTrigger = null;
                currentBrush.wasMouseDown = true;
                return;
            } else if (newSelectedTrigger) {
                selectEntity(newSelectedTrigger);
                currentBrush.wasMouseDown = true;
                return;
            }
        }
        if (mouseDown) {
            if (!objectStartCoords && !draggingTrigger) objectStartCoords = mouseCoords;
            objectLastCoords = mouseCoords;
        } else {
            draggingTrigger = null;
            if (objectStartCoords) {
                var drawnRectangle = getDrawnRectangle(objectStartCoords, objectLastCoords, this.mapObject);
                // Don't do anything if the rectangle the selected is off screen
                if (drawnRectangle.overlapsRectangle(new Rectangle(0, 0, currentMap.width, currentMap.height), false)) {
                    this.onSelectRectangle(drawnRectangle);
                }
                objectStartCoords = null;
            }
        }
        if (rightMouseDown && pointIsInLevel(pixelMouseCoords[0], pixelMouseCoords[1])) {
            this.onSetTarget(pixelMouseCoords[0], pixelMouseCoords[1]);
        }
        this.wasMouseDown = mouseDown;
    }

    onSetTarget(pixelMouseCoords) {
        // No default behavior for setting target.
    }
    onSelectRectangle(drawnRectangle) {
        // No default behavior for selecting a rectangle.
    }
}

class TriggerBrush extends EntityBrush {

    onSelectRectangle(drawnRectangle) {
        if (!selectedTrigger) {
            selectedTrigger = this.createEntity();
            var pixelMouseCoords = getPixelMouseCoords();
            selectedTrigger.setTarget(pixelMouseCoords[0], pixelMouseCoords[1]);
            selectedTrigger.hitBox = drawnRectangle.scale(currentMap.tileSize);
            sendCreateEntity(selectedTrigger);
        } else {
            selectedTrigger.hitBox = drawnRectangle.scale(currentMap.tileSize);
            sendUpdateEntity(selectedTrigger);
        }
    }

    onSetTarget(x, y) {
        if (!selectedTrigger) return;
        selectedTrigger.setTarget(x, y);
        sendUpdateEntity(selectedTrigger);
    }

    renderPreview(target) {
        if (selectedTrigger) selectedTrigger.renderPreview(target, objectStartCoords, objectLastCoords);
        else this.sourceEntity.renderPreview(target, objectStartCoords, objectLastCoords);
    }

    renderHUD(context, target) {
        this.sourceEntity.renderHUD(context, target);
    }
}

class DoorTriggerBrush extends TriggerBrush {

    createEntity() {
        var entity = super.createEntity();
        // Use the currently selected zone Id when creating a new door.
        entity.setZoneId(getSelectedCheckPointId());
        var checkPointId = getSelectedCheckPointId();
        if (checkPointId === 'custom') entity.setCheckPointId(null);
        else entity.setCheckPointId(checkPointId);
        // Set targetX/targetY either way. If for some reason the check point is deleted
        // we can fall back to these.
        entity.setTarget(
            Number($('.js-locationSelectField .js-x').val()),
            Number($('.js-locationSelectField .js-y').val())
        );
        return entity
    }

    onSelectLocation(checkPointId, targetX, targetY) {
        if (!selectedTrigger) return;
        if (checkPointId === 'custom') selectedTrigger.setCheckPointId(null);
        else selectedTrigger.setCheckPointId(checkPointId);
        // Set targetX/targetY either way. If for some reason the check point is deleted
        // we can fall back to these.
        selectedTrigger.setTarget(targetX, targetY);
        checkToUpdateEntity(selectedTrigger);
    }

    onSelectZone(zoneId) {
        if (!selectedTrigger) return;
        selectedTrigger.setZoneId(zoneId);
        selectedTrigger.setCheckPointId(null);
        selectedTrigger.setTarget(64, 64);
        checkToUpdateEntity(selectedTrigger);
    }

    onSetTarget(x, y) {
        // Door target cannot be set on the current map, you have to use the
        // zone+checkPoint dropdowns on the right panel to set its target.
    }
}

class PointEntityBrush extends EntityBrush {

    onSetTarget(x, y) {
        if (!selectedTrigger) {
            selectedTrigger = this.createEntity();
            selectedTrigger.setTarget(x, y);
            sendCreateEntity(selectedTrigger);
        } else {
            selectedTrigger.setTarget(x, y);
            checkToUpdateEntity(selectedTrigger);
        }
    }

    renderPreview(target) {
        var pixelMouseCoords = getPixelMouseCoords();
        if (selectedTrigger) selectedTrigger.renderPreview(pixelMouseCoords[0], pixelMouseCoords[1]);
        else this.sourceEntity.renderPreview(pixelMouseCoords[0], pixelMouseCoords[1]);
    }

    renderHUD(context, target) {
        this.sourceEntity.renderHUD(context, target);
    }
}

// This is used to map entity brush class names back to the actual classes in selectEntity.
var brushClasses = {
    EntityBrush, TriggerBrush, PointEntityBrush, DoorTriggerBrush
};
var selectEntity = entity => {
    selectedTrigger = entity;
    var brushClass = brushClasses[entity.brushClass] || TriggerBrush;
    selectBrush(new brushClass(entity));
}

var objectStartCoords, objectLastCoords;
var drawingObjectRectangle;

// Default to drawing an empty tile.
var currentBrush;
selectBrush(new TileBrush(0));
var getMouseCoords = (dx = cameraX, dy = cameraY) => {
    var targetPosition = getPixelMouseCoords(dx, dy);
    return [Math.floor(targetPosition[0] / currentMap.tileSize),
            Math.floor(targetPosition[1] / currentMap.tileSize),
    ];
}
var getPixelMouseCoords = (dx = cameraX, dy = cameraY) => {
    var targetPosition = relativeMousePosition(mainCanvas);
    return [Math.round(targetPosition[0] + dx), Math.round(targetPosition[1] + dy)];
}
// Disable context menu on the main canvas
$('.js-mainCanvas').on('contextmenu', event => {
    return false;
});
var selectTileUnderMouse = () => {
    var coords = getMouseCoords();
    tileSource = currentMap.composite[coords[1]][coords[0]];
    selectBrush(new TileBrush(tileSource, currentMap));
}
var brushIndex = 0;
var dummyRectangle = new Rectangle(0, 0, 32, 32);

var tileSources = [twilightTiles, customTiles, mansionTiles, desertTiles32, desertTiles16];
// Make sure all brush tile sets are preloaded.
tileSources.forEach(tileSource => {
    requireImage(tileSource);
    var $option = $('<option>').val(tileSource).text(tileSource);
    // We could make this configurable at some point.
    $option.data('size', 16);
    $('.js-tileSourceField select').append($option);
});

var brushList = [
    new ObjectBrush(stretchNine),
    new ObjectBrush(bouncyBlock),
    new ObjectBrush(spikesUp),
    new ObjectBrush(spikesDown),
    new ObjectBrush(spikesLeft),
    new ObjectBrush(spikesRight),
    // mansion tiles 32 x 32
    new TileBrush(panelSquareHorizMansion),
    new TileBrush(panelSquareVertMansion),
    new TileBrush(panelStripVertMansion),
    new TileBrush(floorMansion),
    new TileBrush(floorThinMansion),
    new TileBrush(pillarDarkMansion),
    new TileBrush(stonesDarkMansion),
    new TileBrush(stonesDirtMansion),
    new TileBrush(stonesMossDarkMansion),
    new TileBrush(stonesMossLightMansion),
    new TileBrush(hedgeMansion),
    new TileBrush(spikesDownMansion),
    new TileBrush(spikesLeftMansion),
    new TileBrush(spikesRightMansion),
    new TileBrush(spikesUpMansionFence),
    new TileBrush(spikesUpMansionGate),
    new TileBrush(wallpaperGreenMansion),
    new TileBrush(wallpaperRedMansion),
    new TileBrush(stickyTileMansion),
    // end mansion tiles
    // desert tiles 32 x 32
    new TileBrush(spikesPearCactusDesert32),
    new TileBrush(spikesPearCactusFlowersDesert32),
    new TileBrush(spikesSaguaroCactusDesert32),
    new TileBrush(stone1Desert32),
    // end desert tiles 32 x 32
    // desert tiles 16 x 16
    new TileBrush(spikesCactusDesert16),
    new TileBrush(spikesPearCactusDesert16),
    new TileBrush(stone1Desert16),
    new TileBrush(stone2Desert16),
    new TileBrush(stone3Desert16),
    new TileBrush(stone4Desert16),
    // end desert tiles 16 x 16
    new TileBrush(stickyTile),
    new TileBrush(iceBlock),
    new TriggerBrush(new SpawnTrigger(dummyRectangle, 2,
            PROJECTILE_TYPE_HOMING_FIREBALL, 0, 0
        )),
    new TriggerBrush(new ForceTrigger(dummyRectangle, 0, FORCE_AMP, 1.15, 1.27)),
    new TriggerBrush(new ForceTrigger(dummyRectangle, 0, FORCE_AMP, 0.8, 0.8)),
    new TriggerBrush(new TeleporterTrigger(dummyRectangle, 0, 0, 0)),
    new TriggerBrush(new LifePowerup(dummyRectangle, 10)),
    new TriggerBrush(new AirDashPowerup(dummyRectangle, 10, 10)),
    new TriggerBrush(new CoinPowerup(dummyRectangle, 10)),
    new TriggerBrush(new SuperJumpPowerup(dummyRectangle, 10)),
    new TriggerBrush(new ScoreBeacon(dummyRectangle, 256, 5, BEACON_FALLOFF_CURVE_LINEAR)),
    new PointEntityBrush(new PointSpawner(getCreaturePacingFireball(CREATURE_TYPE_PACING_FIREBALL_HORIZONTAL), 0)),
    new PointEntityBrush(new PointSpawner(getCreatureHauntedMask(0, 0), 0)),
    new PointEntityBrush(new PointSpawner(getCreatureWraithHound(0, 0), 0)),
    new PointEntityBrush(new PointSpawner(getCreatureSentinelEye(0, 0), 0)),
    new PointEntityBrush(new CheckPoint()),
    new DoorTriggerBrush(new DoorTrigger(dummyRectangle)),
    new InsertRowBrush(),
    new InsertColumnBrush(),
    new DeleteRowBrush(),
    new DeleteColumnBrush()
];

var selectPreviousObject = () => {
    brushIndex = ((brushIndex || 0) + brushList.length - 1) % brushList.length;
    selectBrush(brushList[brushIndex]);
}
var selectNextObject = () => {
    brushIndex = ((brushIndex || 0) + 1) % brushList.length;
    selectBrush(brushList[brushIndex]);
}
var checkToUpdateEntity = (entity) => {
    if (entity.dirty) {
        delete entity.dirty;
        sendUpdateEntity(entity);
    }
};
$(document).on('keydown', e => {
    if (e.which === 219) selectPreviousObject(); // '['
    if (e.which === 221) selectNextObject(); // ']'
});

// Disabling mouse wheel, we don't need it with the tile select and it is annoying
// when trying to scroll.
/*
$('.js-mainGame').on('mousewheel', e => {
    if (!isEditing) return;
    e.preventDefault();
    if (e.originalEvent.wheelDelta < 0) selectPreviousObject();
    if (e.originalEvent.wheelDelta > 0) selectNextObject();
});*/

var getSelectedZoneId = () => $('.js-zoneSelectField select').val();
var getSelectedCheckPointId = () => $('.js-locationSelectField select').val();
var getSelectedTileSource = () => $('.js-tileSourceField select').val();
var getSelectedTileSourceSize = () => $('.js-tileSourceField select option:selected').data('size');
$('.js-zoneSelectField select').on('change', function () {
    var zoneId = $(this).val();
    if (currentBrush.onSelectZone) currentBrush.onSelectZone(zoneId);
    requestZoneData(zoneId);
    // If we don't do this, the select will be focused and catch keyboard input
    // which interferes with keyboard gameplay.
    $(this).blur();
});
$('.js-locationSelectField select').on('change', function () {
    // If we don't do this, the select will be focused and catch keyboard input
    // which interferes with keyboard gameplay.
    $(this).blur();
    updateLocationXAndYFields();
    onUpdateLocation();
});
$('.js-locationSelectField .js-x, .js-locationSelectField .js-y').on('change', () => {
    $('.js-locationSelectField select').val('custom');
    onUpdateLocation();
});
var selectingTileGraphic = false;
$('.js-previewField .js-previewCanvas').on('click', () => {
    console.log(currentBrush instanceof TileBrush)
    if (currentBrush instanceof TileBrush) {
        selectingTileGraphic = !selectingTileGraphic;
    }
});
var updateSaveButton = () => {
    $('.js-saveField button').toggle(currentMap.isDirty);
    $('.js-reloadField button').toggle(currentMap.isDirty);
}
$('.js-saveField button').on('click', () => {
    sendData({action: 'saveMap'});
});
$('.js-reloadField button').on('click', () => {
    sendData({action: 'reloadMap'});
});
var onUpdateLocation = () => {
    if (currentBrush.onSelectLocation) {
        currentBrush.onSelectLocation(
            getSelectedCheckPointId(),
            Number($('.js-locationSelectField .js-x').val()),
            Number($('.js-locationSelectField .js-y').val()),
        );
    }
}

var updateLocationXAndYFields = () => {
    var currentZone = loadedZonesById[$('.js-zoneSelectField select').val()];
    if (!currentZone) return;
    var checkPoint = _.find(currentZone.entities, {id: $('.js-locationSelectField select').val()});
    if (!checkPoint) return;
    $('.js-locationSelectField .js-x').val(checkPoint.x);
    $('.js-locationSelectField .js-y').val(checkPoint.y);
}

var getTileImageSource = (image, x, y, size) => {
    var rectangle = new Rectangle(x, y, 1, 1).scale(size);
    rectangle.image = image;
    return rectangle;
};
var intializeTileProperties = () => {
    var tileProperties = [
        {value: TILE_SOLID, frame: getTileImageSource(twilightTiles, 10, 3, 16)},
        {value: TILE_DAMAGE, frame: getTileImageSource(twilightTiles, 1, 14, 16)},
        {value: TILE_BOUNCE, frame: getTileImageSource(twilightTiles, 10, 9, 16)},
        {value: TILE_STICKY, frame: getTileImageSource(twilightTiles, 4, 2, 16)},
        {value: TILE_SLIPPERY, frame: getTileImageSource(customTiles, 0, 0, 16)}
    ];
    // The directions are opposite here, because top means the top of the tile,
    // but DOWN means the direction of the entity this property effects. So the top
    // of the tile being solid means it is solid when moving DOWN.
    $('.js-topTileProperties').data('value', TILE_DOWN);
    $('.js-bottomTileProperties').data('value', TILE_UP);
    $('.js-leftTileProperties').data('value', TILE_RIGHT);
    $('.js-rightTileProperties').data('value', TILE_LEFT);

    // Add a canvas for each property to each child.
    $('.js-tileProperties').children().each(function() {
        var directionValue = $(this).data('value');
        for (var tileProperty of tileProperties) {
            var canvas = createCanvas(16, 16, 'js-propertyCanvas');
            var context = canvas.getContext('2d')
            context.imageSmoothingEnabled = false;
            var frame = tileProperty.frame;
            if (typeof frame.image === 'string') {
                frame.image = requireImage(frame.image);
            }
            draw.image(context, frame.image, frame, frame.moveTo(0, 0));
            var $canvas = $(canvas);
            $(this).append($canvas);
            $canvas.data('value', directionValue * tileProperty.value);
        }
    });
};
