
var frameMilliseconds = 20;
var areaRectangle = rectangle(0, 0, 4000, 1000);
var cameraX = areaRectangle.width / 2 - 400, cameraY = areaRectangle.height / 2 - 300;
setInterval(() => {
    if (!gameHasBeenInitialized) {
        if (!numberOfImagesLeftToLoad)initializeGame();
        return;
    }
    areaRectangle.width = currentMap.width * currentMap.tileSize;
    areaRectangle.height = currentMap.height * currentMap.tileSize;

    for (var actor of [mainCharacter, ...otherCharacters]) {
        updateActor(actor);
    }

    if (cameraX + 800 < mainCharacter.x + 300) cameraX = (cameraX + mainCharacter.x - 500) / 2;
    if (cameraX > mainCharacter.x - 300) cameraX = (cameraX + (mainCharacter.x - 300)) / 2;
    if (cameraY + 600 < mainCharacter.y + 300) cameraY = (cameraY + mainCharacter.y - 300) / 2;
    if (cameraY > mainCharacter.y - 300) cameraY = (cameraY + (mainCharacter.y - 300)) / 2;

    cameraX = Math.max(0, Math.min(areaRectangle.width - mainCanvas.width, cameraX));
    cameraY = Math.max(0, Math.min(areaRectangle.height - mainCanvas.height, cameraY));

}, frameMilliseconds);
