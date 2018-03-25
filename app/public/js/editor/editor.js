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
            if (updatedTile !== mainPalette.newTile) {
                sendData({action: 'updateTilePalette', oldKey, updatedTile});
            }
        }
        return;
    }
    // This will update the palettes if necessary
    if (mainPalette.checkToUpdateBrushes(currentMap.id)) {
        mainPalette.cancelCreatingNewTile(false);
        foreignPalette.updateBrushes(true);
    }
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
            } else {
                selectTileUnderMouse();
            }
        }
    }
    if (currentBrush) currentBrush.update();
};

const toggleEditing = () => {
    isEditing = !isEditing;
    if (isEditing) {
        mainPalette.updateBrushes(true);
        foreignPalette.updateBrushes(true);
    }
    $('.pageBody').toggleClass('isEditing', isEditing);
    // This makes sure the palette buttons are in the correct state initially.
    mainPalette.cancelCreatingNewTile(true);
    $('.js-editPanel').toggle(isEditing);
    // Populate the special brush panel if this is the first time opening the edit panel.
    var $specialBrushList = $('.js-globalBrushes .js-specialBrushes');
    if (!$specialBrushList.children().length) {
        intializeTileProperties();
        for (var brush of brushList) {
            $specialBrushList.append(createBrushPreviewElement(brush));
        }
    }
    selectBrush(currentBrush);
    selectedEntity = null;
};
$('.js-brushSelectField').on('click', '.js-brushCanvas', function () {
    mainPalette.cancelCreatingNewTile(false);
    selectBrush($(this).data('brush'));
});
var previousBrush = null;

var mainPalette = new MainZonePalette($('.js-localBrushes'));
var foreignPalette = new ForeignZonePalette($('.js-foreignBrushes'));

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
    if (selectedEntity && selectedEntity.brushClass && selectedEntity.brushClass !== currentBrush.constructor.name) {
        selectedEntity = null;
    }
    if (selectedEntity && selectedEntity.zoneId) {
        $('.js-zoneSelectField select').val(selectedEntity.zoneId);
    }
    if (currentBrush && currentBrush.onSelectZone) {
        requestZoneData($('.js-zoneSelectField select').val());
    }
    mainPalette.onChangeBrush();
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
    if (updatedTile !== mainPalette.newTile) {
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
    if (selectedEntity && selectedEntity.checkPointId) {
        $locationSelect.val(selectedEntity.checkPointId);
    } else if (selectedEntity) {
        $locationSelect.val('custom');
        $('.js-locationSelectField .js-x').val(selectedEntity.targetX);
        $('.js-locationSelectField .js-y').val(selectedEntity.targetY);
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

var getTileSourceRectangle = tileSource => new Rectangle(tileSource.x, tileSource.y, 1, 1).scale(tileSource.size);




// This should be changed to selectedEntity at some point.
var selectedEntity = null, draggingEntity = null;

var selectEntity = entity => {
    selectedEntity = entity;
    // This maps class name to the class for all brush classes that can create entities.
    // This way we can select the correct brush type when a user selects an entity.
    var brushClasses = {
        EntityBrush, TriggerBrush, PointEntityBrush, DoorTriggerBrush
    };
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

var tileSources = [twilightTiles, customTiles, /*mansionTiles, desertTiles32, desertTiles16,*/desertTiles, ghostTownTiles];
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
    new TriggerBrush(new SpawnTrigger(dummyRectangle, 2, PROJECTILE_TYPE_HOMING_FIREBALL, 0, 0)),
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
    new PointEntityBrush(new PointSpawner(getCreatureDroneBomber(0, 0, RIGHT), 0)),
    new PointEntityBrush(new PointSpawner(getCreatureDroneBomber(0, 0, LEFT), 0)),
    new PointEntityBrush(new PointSpawner(getCreatureSteamTank(0, 0), 0)),
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
