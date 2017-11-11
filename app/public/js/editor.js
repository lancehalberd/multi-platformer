let isEditing = false;
var cloneStartCoords, cloneLastCoords;
const updateEditor = () => {
    if (isKeyDown(KEY_SHIFT) && isKeyDown(KEY_E, true)) {
        toggleEditing();
    }
    if (!isEditing) return;
    // Trigger brush uses the right click to set the target
    if (!mouseDown && currentBrush.type !== 'entity') {
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
                currentBrush = new CloneBrush(cloneTileGrid);
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
};

const selectBrush = (newBrush) => {
    currentBrush = newBrush;
    $('.js-zoneSelectField').toggle(currentBrush && !!currentBrush.onSelectZone);
    $('.js-checkPointSelectField').toggle(currentBrush && !!currentBrush.onSelectCheckPoint);
};

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


var selectedTrigger = null, draggingTrigger = null;
class TriggerBrush {

    constructor(sourceTrigger) {
        this.sourceTrigger = sourceTrigger;
        // I'm just using this to prevent clone brush from activating
        // when you right click while you have a trigger brush selected.
        this.type = 'entity';
        this.wasMouseDown = false;
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
            draggingTrigger = newSelectedTrigger;
            if (lastSelected === newSelectedTrigger) {
                selectedTrigger = null;
            } else if (newSelectedTrigger) {
                selectEntity(newSelectedTrigger);
                currentBrush.wasMouseDown = true;
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
                    if (!selectedTrigger) {
                        selectedTrigger = cloneEntity(this.sourceTrigger);
                        // We store the brushClass so we know what brush to use when we select this entity.
                        // Maybe we can put this as a static field on the entity class.
                        selectedTrigger.brushClass = 'TriggerBrush';
                        selectedTrigger.setTarget(pixelMouseCoords[0], pixelMouseCoords[1]);
                        selectedTrigger.hitBox = drawnRectangle.scale(currentMap.tileSize);
                        sendCreateEntity(selectedTrigger);
                    } else {
                        selectedTrigger.hitBox = drawnRectangle.scale(currentMap.tileSize);
                        sendUpdateEntity(selectedTrigger);
                    }
                }
                objectStartCoords = null;
            }
        }
        if (rightMouseDown && selectedTrigger && pointIsInLevel(pixelMouseCoords[0], pixelMouseCoords[1])) {
            selectedTrigger.setTarget(pixelMouseCoords[0], pixelMouseCoords[1]);
            sendUpdateEntity(selectedTrigger);
        }
        this.wasMouseDown = mouseDown;
    }

    renderPreview(target) {
        if (selectedTrigger) selectedTrigger.renderPreview(target, objectStartCoords, objectLastCoords);
        else this.sourceTrigger.renderPreview(target, objectStartCoords, objectLastCoords);
    }

    renderHUD(context, target) {
        this.sourceTrigger.renderHUD(context, target);
    }
}

class PointEntityBrush {

    constructor(sourceEntity) {
        this.sourceEntity = sourceEntity;
        // I'm just using this to prevent clone brush from activating
        // when you right click while you have a trigger brush selected.
        this.type = 'entity';
        this.wasMouseDown = false;
    }

    update() {
        var mouseCoords = getMouseCoords();
        var pixelMouseCoords = getPixelMouseCoords();
        if (selectedTrigger && isKeyDown(KEY_BACK_SPACE)) {
            sendDeleteEntity(selectedTrigger.id);
            selectedTrigger = null;
        }
        if (!this.wasMouseDown && mouseDown) {
            var lastSelected = selectedTrigger, newSelectedEntity;
            localSprites.filter(sprite => (sprite instanceof Entity)).forEach(sprite => {
                if (sprite.getEditingHitBox().containsPoint(pixelMouseCoords[0], pixelMouseCoords[1])) {
                    newSelectedEntity = sprite;
                    return false;
                }
            });
            draggingTrigger = newSelectedEntity;
            if (lastSelected === newSelectedEntity) {
                selectedTrigger = null;
            } else if (newSelectedEntity) {
                selectEntity(newSelectedEntity)
                currentBrush.wasMouseDown = true;
            }
        }
        if (rightMouseDown && pointIsInLevel(pixelMouseCoords[0], pixelMouseCoords[1])) {
            if (!selectedTrigger) {
                selectedTrigger = cloneEntity(this.sourceEntity);
                // We store the brushClass so we know what brush to use when we select this entity.
                // Maybe we can put this as a static field on the entity class.
                selectedTrigger.brushClass = 'PointEntityBrush';
                selectedTrigger.setTarget(pixelMouseCoords[0], pixelMouseCoords[1]);
                sendCreateEntity(selectedTrigger);
            } else {
                selectedTrigger.setTarget(pixelMouseCoords[0], pixelMouseCoords[1]);
                if (selectedTrigger.dirty) {
                    delete selectedTrigger.dirty;
                    sendUpdateEntity(selectedTrigger);
                }
            }
        }
        this.wasMouseDown = mouseDown;
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

var selectEntity = entity => {
    selectedTrigger = entity;
    var brushClass = brushClasses[entity.brushClass] || TriggerBrush;
    currentBrush = new brushClass(entity);
}

var brushClasses = {
    TriggerBrush, PointEntityBrush,
};

var getAnimationFrame = (frames, fps) => frames[Math.floor(now() * fps / 1000) % frames.length];

var objectStartCoords, objectLastCoords;
var drawingObjectRectangle;

// Default to drawing an empty tile.
var currentBrush = new TileBrush(null);
var getMouseCoords = () => {
    var targetPosition = relativeMousePosition(mainCanvas);
    return [Math.floor((targetPosition[0] + cameraX) / currentMap.tileSize),
            Math.floor((targetPosition[1] + cameraY) / currentMap.tileSize),
    ];
}
var getPixelMouseCoords = () => {
    var targetPosition = relativeMousePosition(mainCanvas);
    return [targetPosition[0] + cameraX, targetPosition[1] + cameraY];
}
// Disable context menu on the main canvas
$('.js-mainCanvas').on('contextmenu', event => {
    return false;
});
var selectTileUnderMouse = () => {
    var coords = getMouseCoords();
    tileSource = currentMap.composite[coords[1]][coords[0]];
    currentBrush = new TileBrush(tileSource);
}
var brushIndex = 0;
var dummyRectangle = new Rectangle(0, 0, 32, 32);

// Make sure all brush tile sets are preloaded.
requireImage(twilightTiles);
requireImage(customTiles);
requireImage(mansionTiles);

var brushList = [
    new ObjectBrush(stretchNine),
    new ObjectBrush(bouncyBlock),
    new ObjectBrush(spikesUp),
    new ObjectBrush(spikesDown),
    new ObjectBrush(spikesLeft),
    new ObjectBrush(spikesRight),
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
    new PointEntityBrush(new PointSpawner(getPacingFireball(CREATURE_TYPE_PACING_FIREBALL_HORIZONTAL), 0)),
    new PointEntityBrush(new CheckPoint()),
];

var selectPreviousObject = () => {
    brushIndex = ((brushIndex || 0) + brushList.length - 1) % brushList.length;
    currentBrush = brushList[brushIndex];
    selectedTrigger = null;
}
var selectNextObject = () => {
    brushIndex = ((brushIndex || 0) + 1) % brushList.length;
    currentBrush = brushList[brushIndex];
    selectedTrigger = null;
}
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
