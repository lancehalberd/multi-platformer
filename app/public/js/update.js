
var frameMilliseconds = 20;
var areaRectangle = rectangle(0, 0, 4000, 1000);
var cameraX = areaRectangle.width / 2 - 400, cameraY = areaRectangle.height / 2 - 300;
// Store the last time we sent a playerMoved update so we don't hit the server too often with updates.
var lastUpdate = 0, mainCharacterWasMoving = false;
setInterval(() => {
    if (!gameHasBeenInitialized) {
        if (!numberOfImagesLeftToLoad && connected)initializeGame();
        return;
    }
    if (!currentMap) return;
    areaRectangle.width = currentMap.width * currentMap.tileSize;
    areaRectangle.height = currentMap.height * currentMap.tileSize;

    for (var actor of [mainCharacter, ...Object.values(otherCharacters)]) {
        updateActor(actor);
    }
    // Example code for adding a new local sprite. We add a new one any time the existing one is removed.
    /*if (!localSprites.isArray(fallingSpikesSprite)) {   //this doesn't work. Trying to just check in a fallingSpikesSprite object is in the localSprites array, and if not, add one. Then we can always have one fireball and one set of falling spikes.
        addLocalFallingSpikesSprite();
    }*/
    if (localSprites.length === 0) {
        //addLocalFallingSpikesSprite();
        addHomingFireballSprite(350, 700, mainCharacter);
    }
    for (var localSprite of localSprites) {
        updateLocalSprite(localSprite);
    }
    removeFinishedLocalSprites();

    if (cameraX + 800 < mainCharacter.x + 300) cameraX = (cameraX + mainCharacter.x - 500) / 2;
    if (cameraX > mainCharacter.x - 300) cameraX = (cameraX + (mainCharacter.x - 300)) / 2;
    if (cameraY + 600 < mainCharacter.y + 300) cameraY = (cameraY + mainCharacter.y - 300) / 2;
    if (cameraY > mainCharacter.y - 300) cameraY = (cameraY + (mainCharacter.y - 300)) / 2;

    cameraX = Math.max(0, Math.min(areaRectangle.width - mainCanvas.width, cameraX));
    cameraY = Math.max(0, Math.min(areaRectangle.height - mainCanvas.height, cameraY));

    // If the character is moving or was moving at last update, send an update to inform the server.
    if (mainCharacter.vx !== 0 || mainCharacter.vy < 0 || mainCharacterWasMoving ||
        mainCharacter.wasCrouching !== mainCharacter.isCrouching) {
        if (now() - lastUpdate > 50) {
            sendPlayerMoved();
            lastUpdate = now();
            mainCharacter.wasCrouching = mainCharacter.isCrouching;
            mainCharacterWasMoving = (mainCharacter.vx !== 0 || mainCharacter.vy < 0);
        }
    }
    // Map editing:
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

}, frameMilliseconds);

function getDrawnRectangle(startCoords, endCoords, selectedObject) {
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
}

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

