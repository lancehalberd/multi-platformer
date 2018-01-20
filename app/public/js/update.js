
var frameMilliseconds = 20;
var areaRectangle = new Rectangle(0, 0, 4000, 1000);
var cameraX = 0, cameraY = 0;
// Store the last time we sent a playerMoved update so we don't hit the server too often with updates.
var lastUpdate = 0, mainCharacterWasMoving = false;
setInterval(() => {
    if (!gameHasBeenInitialized) {
        if (!numberOfImagesLeftToLoad && connected)initializeGame();
        return;
    }
    if (!currentMap) return;
    if (isKeyDown(KEY_SHIFT) && isKeyDown(KEY_G, true)) {
        regenerateMap(25, 19);
    }
    // Update all the sprites that the game keeps track of
    for (var sprite of
        [
            // The character for this client.
            mainCharacter,
            // All the characters from other clients.
            ...Object.values(otherCharacters),
            // Other sprite objects like fireballs, particles, explosions and triggers.
            ...localSprites,
        ]
    ) {
        sprite.update(sprite);
    }
    if (localSprites.length === 0 && isKeyDown('R'.charCodeAt(0))) {
        addCreature(250, 350, mainCharacter, CREATURE_TYPE_HAUNTED_MASK);
    }
    removeFinishedLocalSprites();

    if (!isEditing) {
        if (cameraX + 800 < mainCharacter.x + 300) cameraX = (cameraX + mainCharacter.x - 500) / 2;
        if (cameraX > mainCharacter.x - 300) cameraX = (cameraX + (mainCharacter.x - 300)) / 2;
        if (cameraY + 600 < mainCharacter.y + 300) cameraY = (cameraY + mainCharacter.y - 300) / 2;
        if (cameraY > mainCharacter.y - 300) cameraY = (cameraY + (mainCharacter.y - 300)) / 2;
    } else {
        var cameraSpeed =  16;
        if (isKeyDown(KEY_UP)) cameraY -= cameraSpeed;
        if (isKeyDown(KEY_DOWN)) cameraY += cameraSpeed;
        if (isKeyDown(KEY_LEFT)) cameraX -= cameraSpeed;
        if (isKeyDown(KEY_RIGHT)) cameraX += cameraSpeed;
    }

    boundCameraToMap();

    // If the character is moving or was moving at last update, send an update to inform the server.
    if (mainCharacter.x !== mainCharacter.lastX || mainCharacter.y !== mainCharacter.lastY || mainCharacterWasMoving ||
        mainCharacter.wasCrouching !== mainCharacter.isCrouching) {
        if (now() - lastUpdate > 50) {
            sendPlayerMoved();
            lastUpdate = now();
            mainCharacter.wasCrouching = mainCharacter.isCrouching;
            mainCharacterWasMoving = (mainCharacter.vx !== 0 || mainCharacter.vy < 0);
            mainCharacter.lastX = mainCharacter.x;
            mainCharacter.lastY = mainCharacter.y;
        }
    }
    updateEditor();
    TagGame.update();
}, frameMilliseconds);

var centerCameraOnPlayer = () => {
    cameraX = mainCharacter.x - 400;
    cameraY = mainCharacter.y - 300;
    boundCameraToMap();
};

var boundCameraToMap = () => {
    if (!currentMap) return;
    areaRectangle = new Rectangle(0, 0, currentMap.width, currentMap.height).scale(currentMap.tileSize);
    // Normally we don't let the camera go past the edges of the map, but when the map is too
    // short or narrow to do this, we center the map vertically/horizontally.
    if (areaRectangle.width >= mainCanvas.width) {
        cameraX = Math.max(0, Math.min(areaRectangle.width - mainCanvas.width, cameraX));
    } else {
        cameraX = -(mainCanvas.width - areaRectangle.width) / 2;
    }
    if (areaRectangle.height >= mainCanvas.height) {
        cameraY = Math.max(0, Math.min(areaRectangle.height - mainCanvas.height, cameraY));
    } else {
        cameraY = -(mainCanvas.height - areaRectangle.height) / 2;
    }
};

function regenerateMap(width, height) {
    // set size and spawn point, and move character to spawn point
    currentMap.width = width;
    currentMap.height = height;
    currentMap.respawnPoint.x = (1.5 + 2) * currentMap.tileSize; // the 1.5 puts this at the center of the first column beside the wall from the left
    currentMap.respawnPoint.y = (height - 2 - 3) * currentMap.tileSize; // the -2 gives the first empty row above the bottom border
    //mainCharacter.originalX = currentMap.tileSize * 1.5;
    //mainCharacter.originalY = currentMap.height - 2 - 3 * currentMap.tileSize; // the -2 gives the first empty row above the bottom border
    mainCharacter.x = currentMap.respawnPoint.x;
    mainCharacter.y = currentMap.respawnPoint.y;
    generateBorder(width, height, stretchNine);
    clearInsideOfBorder(width, height);
    generateTerrain(width, height, 5, 1, stretchNine);
}

function generateBorder(mapWidth, mapHeight, tile) {
    for (var col = 0; col < mapWidth; col++) {
        applyTileToMap(currentMap, tile, [col, 0]);
        applyTileToMap(currentMap, tile, [col, mapHeight - 1]);
    }
    for (var row = 0; row < mapHeight; row++) {
        applyTileToMap(currentMap, tile, [0, row]);
        applyTileToMap(currentMap, tile, [mapWidth - 1, row]);
    }
}

function clearInsideOfBorder(mapWidth, mapHeight) {
    for (var col = 1; col < mapWidth - 1; col++) {
        for (var row = 1; row < mapHeight - 1; row++) {
            applyTileToMap(currentMap, 0, [col, row]);
        }
    }
}

function generateTerrain(mapWidth, mapHeight, terrainHeight, minStepWidth, tile) {
    var width = mapWidth,
        height = mapHeight;
    
    // WRONG/BROKEN: Since I moved making the border and clearing the map to different functions, spaces are appearing underneath
    // some tiles, and the bottommost row (excluding the border) is being completely filled in.
    // UPDATE: possibly fixed the 'holes' problem.
    
    // Putting the row on the outside of the nest of row/col for loops lets rows be built up all at once (and we're doing it from the bottom up)
    // making it possible to check the entire row below for meeting building conditions for the next row.
    for (var row = height - 2; row >= height - (terrainHeight + 2); row--) { // row, not including the bottom row, up to the terrain height above the bottom row
        // WRONG, eventulally/NOTE: things that are just !== 0 right now will need to be TILE_SOLID_ALL or something later,
        //      unless this function is alway run on a blank map.
        // working from the bottom up so that terrain can be built up, checking for anything solid  underneath
         for (var col = 1; col < width - 2; col++) { // columns, excluding the border columns
            // making some height variations in the bottom four rows
            if (
                currentMap.composite[row + 1][col] !== 0 && // if the tile beneath isn't empty
                ( // the tiles below and to the left and right for <minStepWidth> aren't empty
                    currentMap.composite[row + 1][col + minStepWidth] !== 0 && // could put an || here, which is why these two are in parentheses
                    currentMap.composite[row + 1][col - minStepWidth] !== 0
                ) // if both of the tiles below and to the sides aren't empty
            ) {
                // if the tile to the left (added from left to right) isn't empty, then increased likelihood
                // of drawing another one next to it. Trying to get smooth, larger-scale groups.
                if (currentMap.composite[row][col - 1] !== 0 && col > 1) { // don't apply increased chance to column 1, because it will always have the left wall next to it.
                    if (Math.random() < 0.85) applyTileToMap(currentMap, tile, [col, row]); // if non-left-wall tile to the left isn't empty, bigger chance of spawning a tile
                } else if (Math.random() < 0.4) applyTileToMap(currentMap, tile, [col, row]); // else, smaller chance
            }
        }
    }
    // setting a spawn point above the generated terrain
    // WRONG. Eventually this will probably be done by a function like findValidSpawnPoint(preferredCriterion, perferredCriterion...) that
    //      is run after the entire map has been generated.
    if (currentMap.respawnPoint.y > terrainHeight * currentMap.tileSize * (height - 2 - terrainHeight)) {
        currentMap.respawnPoint.y = (height - 2 - terrainHeight) * currentMap.tileSize; // the -2 gives the first empty row above the bottom border
    }
}
