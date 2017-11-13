let isEditing = false;
var cloneStartCoords, cloneLastCoords;
const updateEditor = () => {
    if (isKeyDown(KEY_SHIFT) && isKeyDown(KEY_E, true)) {
        toggleEditing();
    }
    if (!isEditing) return;
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
                selectBrush(new CloneBrush(cloneTileGrid));
            }
        }
    }
    currentBrush.update();
};

const toggleEditing = () => {
    isEditing = !isEditing;
    $('.js-editPanel').toggle(isEditing);
    // Populate the brush panel if this is the first time opening the edit panel.
    var $brushList = $('.js-brushSelectField');
    if (!$brushList.children().length) {
        for (var brush of brushList) {
            var canvas = createCanvas(32, 32, 'js-brushCanvas');
            var context = canvas.getContext('2d');
            context.save();
            context.translate(16, 16);
            draw.fillRectangle(context, new Rectangle(-16, -16, 32, 32), 'white');
            brush.renderHUD(context, new Rectangle(-16, -16, 32, 32));
            context.restore();
            $brushList.append(canvas);
            $(canvas).data('brush', brush);
        }
        $brushList.on('click', '.js-brushCanvas', function () {
            selectBrush($(this).data('brush'));
        });
    }
    selectBrush(currentBrush);
    selectedTrigger = null;
};

const selectBrush = (newBrush) => {
    currentBrush = newBrush;
    $('.js-zoneSelectField').toggle(currentBrush && !!currentBrush.onSelectZone);
    $('.js-locationSelectField').toggle(currentBrush && !!currentBrush.onSelectLocation);

    // Unselect the current entity if it doesn't match the new brush.
    if (selectedTrigger && selectedTrigger.brushClass !== currentBrush.constructor.name) {
        selectedTrigger = null;
    }
    if (selectedTrigger && selectedTrigger.zoneId) {
        $('.js-zoneSelectField select').val(selectedTrigger.zoneId);
    }
    if (currentBrush.onSelectZone) {
        requestZoneData($('.js-zoneSelectField select').val());
    }
}

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
}

var previewCanvas = $('.js-previewField .js-canvas')[0];
var previewContext = previewCanvas.getContext('2d');

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
    var different = currentTile !== tileSource;
    if (currentTile !== null && tileSource !== null) {
        different = false;
        for (var key in tileSource) {
            if (tileSource[key] !== currentTile[key]) {
                different = true;
                break;
            }
        }
    }
    if (different) {
        sendTileUpdate(tileSource, coords);
    }
};

var onMap = (row, column) => row >= 0 && row < currentMap.height && column >= 0 && column < currentMap.width;
var pointIsInLevel = (x, y) => {
    var levelRectangle = new Rectangle(0, 0, currentMap.width, currentMap.height).scale(currentMap.tileSize);
    return levelRectangle.containsPoint(x, y);
};

class CloneBrush {

    constructor(tileGrid) {
        this.tileGrid = tileGrid;
        this.released = true;
    }

    forEachTile(coords, callback) {
        for (var row = 0; row < this.tileGrid.length; row++) {
            for (var column = 0; column < this.tileGrid[0].length; column++) {
                callback(this.tileGrid[row][column], coords[1] + row, coords[0] + column);
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

var getTileSourceRectangle = tileSource => new Rectangle(tileSource.x, tileSource.y, 1, 1).scale(tileSource.size);

class TileBrush {

    constructor(tileSource) {
        this.tileSource = tileSource;
    }

    update() {
        if (mouseDown) {
            updateTileIfDifferent(getMouseCoords(), this.tileSource);
        }
    }

    renderPreview(target) {
        if (this.tileSource) {
            mainContext.translate(target.left + currentMap.tileSize / 2, target.top + currentMap.tileSize / 2);
            mainContext.scale(this.tileSource.xScale, this.tileSource.yScale);
            draw.image(mainContext, requireImage(this.tileSource.image),
                getTileSourceRectangle(this.tileSource),
                new Rectangle(-1 / 2, -1 / 2, 1, 1).scale(currentMap.tileSize)
            );
        } else {
            draw.fillRectangle(mainContext, target, 'white');
        }
    }

    renderHUD(context, target) {
        if (this.tileSource) {
            context.scale(this.tileSource.xScale || 1, this.tileSource.yScale || 1);
            draw.image(context, requireImage(this.tileSource.image), getTileSourceRectangle(this.tileSource), target);
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
selectBrush(new TileBrush(null));
var getMouseCoords = () => {
    var targetPosition = relativeMousePosition(mainCanvas);
    return [Math.floor((targetPosition[0] + cameraX) / currentMap.tileSize),
            Math.floor((targetPosition[1] + cameraY) / currentMap.tileSize),
    ];
}
var getPixelMouseCoords = () => {
    var targetPosition = relativeMousePosition(mainCanvas);
    return [Math.round(targetPosition[0] + cameraX), Math.round(targetPosition[1] + cameraY)];
}
// Disable context menu on the main canvas
$('.js-mainCanvas').on('contextmenu', event => {
    return false;
});
var selectTileUnderMouse = () => {
    var coords = getMouseCoords();
    tileSource = currentMap.composite[coords[1]][coords[0]];
    selectBrush(new TileBrush(tileSource));
}
var brushIndex = 0;
var dummyRectangle = new Rectangle(0, 0, 32, 32);

// Make sure all brush tile sets are preloaded.
requireImage(twilightTiles);
requireImage(customTiles);
requireImage(mansionTiles);
requireImage(desertTiles32);

var brushList = [
    new ObjectBrush(stretchNine),
    new ObjectBrush(bouncyBlock),
    new ObjectBrush(spikesUp),
    new ObjectBrush(spikesDown),
    new ObjectBrush(spikesLeft),
    new ObjectBrush(spikesRight),
    // mansion tiles
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
    // desert tiles
    new TileBrush(spikesPearCactusDesert32),
    new TileBrush(spikesPearCactusFlowersDesert32),
    new TileBrush(spikesSaguaroCactusDesert32),
    new TileBrush(stone1Desert32),
    //end desert tiles
    new TileBrush(stickyTileMansion),
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
    new PointEntityBrush(new CheckPoint()),
    new DoorTriggerBrush(new DoorTrigger(dummyRectangle)),
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

$('.js-mainGame').on('mousewheel', e => {
    if (!isEditing) return;
    e.preventDefault();
    if (e.originalEvent.wheelDelta < 0) selectPreviousObject();
    if (e.originalEvent.wheelDelta > 0) selectNextObject();
});

var getSelectedZoneId = () => $('.js-zoneSelectField select').val();
var getSelectedCheckPointId = () => $('.js-locationSelectField select').val();
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
