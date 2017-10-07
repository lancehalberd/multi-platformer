
var frameMilliseconds = 20;
var areaRectangle = rectangle(0, 0, 4000, 1000);
var cameraX = areaRectangle.width / 2 - 400, cameraY = areaRectangle.height / 2 - 300;
// Store the last time we sent a playerMoved update so we don't hit the server too often with updates.
var lastUpdate = 0, mainCharacterWasMoving = false;
setInterval(() => {
    if (!gameHasBeenInitialized) {
        if (!numberOfImagesLeftToLoad)initializeGame();
        return;
    }
    areaRectangle.width = currentMap.width * currentMap.tileSize;
    areaRectangle.height = currentMap.height * currentMap.tileSize;

    for (var actor of [mainCharacter, ...Object.values(otherCharacters)]) {
        updateActor(actor);
    }

    if (cameraX + 800 < mainCharacter.x + 300) cameraX = (cameraX + mainCharacter.x - 500) / 2;
    if (cameraX > mainCharacter.x - 300) cameraX = (cameraX + (mainCharacter.x - 300)) / 2;
    if (cameraY + 600 < mainCharacter.y + 300) cameraY = (cameraY + mainCharacter.y - 300) / 2;
    if (cameraY > mainCharacter.y - 300) cameraY = (cameraY + (mainCharacter.y - 300)) / 2;

    cameraX = Math.max(0, Math.min(areaRectangle.width - mainCanvas.width, cameraX));
    cameraY = Math.max(0, Math.min(areaRectangle.height - mainCanvas.height, cameraY));

    // If the character is moving or was moving at last update, send an update to inform the server.
    if (mainCharacter.vx !== 0 || mainCharacter.vy < 0 || mainCharacterWasMoving) {
        if (now() - lastUpdate > 50) {
            sendPlayerMoved();
            lastUpdate = now();
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
        } else drawTileUnderMouse();
    } else {
        if (selectedObject && objectStartCoords) {
            var drawnRectangle = getDrawnRectangle(objectStartCoords, objectLastCoords);
            new StretchNineInstance(selectedObject, drawnRectangle).applyToMap(exampleMap);
            objectStartCoords = null;
        }
        if (rightMouseDown) selectTileUnderMouse();
    }

}, frameMilliseconds);

function getDrawnRectangle(startCoords, endCoords) {
    return rectangle(
        Math.min(startCoords[0], endCoords[0]), Math.min(startCoords[1], endCoords[1]),
        Math.abs(startCoords[0] - endCoords[0]) + 1, Math.abs(startCoords[1] - endCoords[1]) + 1
    );
}

var objectStartCoords, objectLastCoords;
var drawingObjectRectangle;
