let isEditing = false;
const updateEditor = () => {
    if (isKeyDown(KEY_SHIFT) && isKeyDown(KEY_E)) {
        isEditing = true;
    }
    if (!isEditing) return;
    var selectedObject = allMapObjects[objectIndex];
    if (mouseDown) {
        if (selectedObject) {
            if (!objectStartCoords) {
                objectStartCoords = getMouseCoords();
            }
            objectLastCoords = getMouseCoords();
        } else {
            sendTileUpdate(tileSource, getMouseCoords());
        }
    } else {
        if (selectedObject && objectStartCoords) {
            var drawnRectangle = getDrawnRectangle(objectStartCoords, objectLastCoords, selectedObject);
            sendMapObject(selectedObject, drawnRectangle);
            objectStartCoords = null;
        }
        if (rightMouseDown) selectTileUnderMouse();
    }
}

const renderEditor = () => {
    if (!isEditing) return;
    // While editing, we display a preview of the tile you are about to place, or the area
    // the object will be drawn to.
    mainContext.save();
    mainContext.translate(Math.round(-cameraX), Math.round(-cameraY));
    var selectedObject = allMapObjects[objectIndex];
    mainContext.globalAlpha = .5
    var coords = getMouseCoords();
    var targetRectangle = rectangle(coords[0] * currentMap.tileSize, coords[1] * currentMap.tileSize, currentMap.tileSize, currentMap.tileSize);
    if (selectedObject) {
        if (objectStartCoords) {
            var drawnRectangle = getDrawnRectangle(objectStartCoords, objectLastCoords, selectedObject);
            draw.fillRectangle(mainContext, scaleRectangle(drawnRectangle, currentMap.tileSize), 'red');
        } else {
            draw.fillRectangle(mainContext, targetRectangle, 'red');
        }
    } else {
        if (tileSource) {
            mainContext.translate(targetRectangle.left + currentMap.tileSize / 2, targetRectangle.top + currentMap.tileSize / 2);
            mainContext.scale(tileSource.xScale, tileSource.yScale);
            var newTarget = rectangle(-currentMap.tileSize / 2, -currentMap.tileSize / 2, currentMap.tileSize, currentMap.tileSize);
            draw.image(mainContext, requireImage(tileSource.image),
                rectangle(tileSource.size * tileSource.x, tileSource.size * tileSource.y, tileSource.size, tileSource.size),
                newTarget
            );
        } else {
            draw.fillRectangle(mainContext, targetRectangle, 'white');
        }
    }
    mainContext.restore();

    // Editing HUD displays the currently selected tile/object in the top right.
    mainContext.save();
    mainContext.translate(mainCanvas.width - 10 - 32, 10 + 32);
    draw.fillRectangle(mainContext, rectangle(-34, -34, 68, 68), 'red');
    if (selectedObject) {
        mainContext.scale((selectedObject.xScale || 1) * 2, (selectedObject.yScale || 1) * 2);
        draw.image(mainContext, requireImage(selectedObject.image),
            rectangle(selectedObject.size * selectedObject.x, selectedObject.size * selectedObject.y,
                selectedObject.size * 3, selectedObject.size * 3),
            rectangle(-currentMap.tileSize / 2, -currentMap.tileSize / 2, currentMap.tileSize, currentMap.tileSize)
        );
    } else if (tileSource) {
        mainContext.scale(2 * tileSource.xScale, 2 * tileSource.yScale);
        draw.image(mainContext, requireImage(tileSource.image),
            rectangle(tileSource.size * tileSource.x, tileSource.size * tileSource.y, tileSource.size, tileSource.size),
            rectangle(-currentMap.tileSize / 2, -currentMap.tileSize / 2, currentMap.tileSize, currentMap.tileSize)
        );
    }
    mainContext.restore();
}

const getDrawnRectangle = (startCoords, endCoords, selectedObject) => {
    var drawnRectangle = rectangle(
        Math.min(startCoords[0], endCoords[0]), Math.min(startCoords[1], endCoords[1]),
        Math.abs(startCoords[0] - endCoords[0]) + 1, Math.abs(startCoords[1] - endCoords[1]) + 1
    );
    if (selectedObject.maxWidth) {
        var right = drawnRectangle.right;
        // adjust the left hand side to include the start coord and be at most max width wide.
        drawnRectangle.left = Math.max(drawnRectangle.left, Math.min(startCoords[0], right - selectedObject.maxWidth));
        drawnRectangle.width = Math.min(selectedObject.maxWidth, right - drawnRectangle.left);
        drawnRectangle.right = drawnRectangle.left + drawnRectangle.width;
    }
    if (selectedObject.maxHeight) {
        var bottom = drawnRectangle.bottom;
        // adjust the left hand side to include the start coord and be at most max width wide.
        drawnRectangle.top = Math.max(drawnRectangle.top, Math.min(startCoords[1], bottom - selectedObject.maxHeight));
        drawnRectangle.height = Math.min(selectedObject.maxHeight, bottom - drawnRectangle.top);
        drawnRectangle.bottom = drawnRectangle.top + drawnRectangle.height;
    }
    return drawnRectangle;
};

var objectStartCoords, objectLastCoords;
var drawingObjectRectangle;

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