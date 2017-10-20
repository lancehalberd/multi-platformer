let isEditing = false;
const updateEditor = () => {
    if (isKeyDown(KEY_SHIFT) && isKeyDown(KEY_E)) {
        isEditing = true;
    }
    if (!isEditing) return;
    if (!mouseDown && rightMouseDown) selectTileUnderMouse();
    currentBrush.update();
}

const renderEditor = () => {
    if (!isEditing) return;
    // While editing, we display a preview of the tile you are about to place, or the area
    // the object will be drawn to.
    mainContext.save();
    mainContext.translate(Math.round(-cameraX), Math.round(-cameraY));
    mainContext.globalAlpha = .5
    var coords = getMouseCoords();
    var targetRectangle = rectangle(coords[0] * currentMap.tileSize, coords[1] * currentMap.tileSize, currentMap.tileSize, currentMap.tileSize);
    currentBrush.renderPreview(targetRectangle);
    mainContext.restore();
    // Editing HUD displays the currently selected tile/object in the top right.
    mainContext.save();
    mainContext.translate(mainCanvas.width - 10 - 32, 10 + 32);
    draw.fillRectangle(mainContext, rectangle(-34, -34, 68, 68), 'red');
    currentBrush.renderHUD(rectangle(-32, -32, 64, 64));
    mainContext.restore();
}

const getDrawnRectangle = (startCoords, endCoords, mapObject) => {
    var drawnRectangle = rectangle(
        Math.min(startCoords[0], endCoords[0]), Math.min(startCoords[1], endCoords[1]),
        Math.abs(startCoords[0] - endCoords[0]) + 1, Math.abs(startCoords[1] - endCoords[1]) + 1
    );
    if (mapObject.maxWidth) {
        var right = drawnRectangle.right;
        // adjust the left hand side to include the start coord and be at most max width wide.
        drawnRectangle.left = Math.max(drawnRectangle.left, Math.min(startCoords[0], right - mapObject.maxWidth));
        drawnRectangle.width = Math.min(mapObject.maxWidth, right - drawnRectangle.left);
        drawnRectangle.right = drawnRectangle.left + drawnRectangle.width;
    }
    if (mapObject.maxHeight) {
        var bottom = drawnRectangle.bottom;
        // adjust the left hand side to include the start coord and be at most max width wide.
        drawnRectangle.top = Math.max(drawnRectangle.top, Math.min(startCoords[1], bottom - mapObject.maxHeight));
        drawnRectangle.height = Math.min(mapObject.maxHeight, bottom - drawnRectangle.top);
        drawnRectangle.bottom = drawnRectangle.top + drawnRectangle.height;
    }
    return drawnRectangle;
};

class TileBrush {

    constructor(tileSource) {
        this.tileSource = tileSource;
    }

    update() {
        // Send tile update only if the brush is different than what is
        // currently on the map.
        if (mouseDown) {
            var coords = getMouseCoords();
            var currentTile = currentMap.composite[coords[1]][coords[0]];
            var different = currentTile !== this.tileSource;
            if (currentTile !== null && this.tileSource !== null) {
                different = false;
                for (var key in this.tileSource) {
                    if (this.tileSource[key] !== currentTile[key]) {
                        different = true;
                        break;
                    }
                }
            }
            if (different) {
                sendTileUpdate(this.tileSource, coords);
            }
        }
    }

    sourceRectangle() {
        return rectangle(
            this.tileSource.size * this.tileSource.x, this.tileSource.size * this.tileSource.y,
            this.tileSource.size, this.tileSource.size
        );
    }

    renderPreview(target) {
        if (this.tileSource) {
            mainContext.translate(target.left + currentMap.tileSize / 2, target.top + currentMap.tileSize / 2);
            mainContext.scale(this.tileSource.xScale, this.tileSource.yScale);
            draw.image(mainContext, requireImage(this.tileSource.image),
                this.sourceRectangle(),
                rectangle(-currentMap.tileSize / 2, -currentMap.tileSize / 2, currentMap.tileSize, currentMap.tileSize)
            );
        } else {
            draw.fillRectangle(mainContext, target, 'white');
        }
    }

    renderHUD(target) {
        if (this.tileSource) {
            mainContext.scale(this.tileSource.xScale || 1, this.tileSource.yScale || 1);
            draw.image(mainContext, requireImage(this.tileSource.image), this.sourceRectangle(), target);
        } else {
            draw.fillRectangle(mainContext, target, 'white');
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
            draw.fillRectangle(mainContext, scaleRectangle(drawnRectangle, currentMap.tileSize), 'red');
        } else {
            draw.fillRectangle(mainContext, target, 'red');
        }
    }

    renderHUD(target) {
        var width = (this.mapObject.maxWidth || 3);
        var height = (this.mapObject.maxHeight || 3);
        mainContext.scale(
            (this.mapObject.xScale || 1) * width / 3,
            (this.mapObject.yScale || 1) * height / 3
        );
        draw.image(mainContext, requireImage(this.mapObject.image),
            rectangle(
                this.mapObject.size * this.mapObject.x,
                this.mapObject.size * this.mapObject.y,
                this.mapObject.size * width,
                this.mapObject.size * height
            ),
            target
        );
    }
}

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
var brushList = [
    new ObjectBrush(stretchNine),
    new ObjectBrush(bouncyBlock),
    new ObjectBrush(spikesUp),
    new ObjectBrush(spikesDown),
    new ObjectBrush(spikesLeft),
    new ObjectBrush(spikesRight),
    new TileBrush(stickyTile),
    new TileBrush(iceBlock),
];
var selectPreviousObject = () => {
    brushIndex = ((brushIndex || 0) + brushList.length - 1) % brushList.length;
    currentBrush = brushList[brushIndex];
}
var selectNextObject = () => {
    brushIndex = ((brushIndex || 0) + 1) % brushList.length;
    currentBrush = brushList[brushIndex];
}
$(document).on('keydown', e => {
    if (e.which === 219) selectPreviousObject(); // '['
    if (e.which === 221) selectNextObject(); // ']'
});

$(document).on('mousewheel', e => {
    e.preventDefault();
    if (e.originalEvent.wheelDelta < 0) selectPreviousObject();
    if (e.originalEvent.wheelDelta > 0) selectNextObject();
});
