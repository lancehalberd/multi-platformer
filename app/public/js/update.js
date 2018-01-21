
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
    // set map size
    currentMap.width = width;
    currentMap.height = height;
    // set spawn point
    currentMap.respawnPoint.x = (1.5 + 2) * currentMap.tileSize; // the 1.5 puts this at the center of the first column beside the wall from the left
    currentMap.respawnPoint.y = (height - 2 - 3) * currentMap.tileSize; // the -2 gives the first empty row above the bottom border
    // move player to spawn point
    mainCharacter.x = currentMap.respawnPoint.x;
    mainCharacter.y = currentMap.respawnPoint.y;
    // generate border
    generateBorder(width, height, stretchNine);
    // clear interior of border
    clearMapRectangle(1, 1, width, height);
    // generate content
    //generateTerrain(width, height, 5, 1, stretchNine);
    generateGhostTownBuilding(6, height - 2, 12, 2);
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

function clearMapRectangle(leftColumn, topRow, width, height) {
    for (var col = 1; col < width - 1; col++) {
        for (var row = 1; row < height - 1; row++) {
            applyTileToMap(currentMap, 0, [col, row]);
        }
    }
}

function generateTerrain(mapWidth, mapHeight, terrainMaxHeight, minStepWidth, tile) {
    var width = mapWidth,
        height = mapHeight;
    // Putting the row on the outside of the nest of row/col for loops lets rows be built up all at once (and we're doing it from the bottom up)
    // making it possible to check the entire row below for meeting building conditions for the next row.
    for (var row = height - 2; row >= height - (terrainMaxHeight + 1); row--) { // row, not including the bottom row, up to the terrain height above the bottom row
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
    if (currentMap.respawnPoint.y > terrainMaxHeight * currentMap.tileSize * (height - 1 - terrainMaxHeight)) {
        currentMap.respawnPoint.y = (height - 1 - terrainMaxHeight) * currentMap.tileSize;
    }
}

function generateGhostTownBuilding(leftColumn, bottomRow, maxWidth, maxStories) {
    // WARNING: generally, when generating things like houses, we're going to have to ensure that
    //      there is room on the map to the right and above them before we start building them.
    var width = Math.max(6 + Math.round(Math.random() * (maxWidth - 6))), // can only use 3-wide doors if this is >= 7
        boardwalkRowModifier = 0,
        baseStoryHeight = 4,
        storyHeightVariation = Math.round(Math.random() * 2);

    // NOTE: CLEAR AREA, THEN BUILD DOORS AND WINDOWS, THEN FILL IN THE REST IF IT'S BLANK AND INSIDE BUILDING BOUNDS.

    // clear terrain where building will be
    //clearInsideOfBorder()
    // generate boardwalk as foundation, possibly
    // if (Math.random() - 0.5) {
    //     boardwalkRowModifier = 1;
    //}
    // building the four bottom rows of siding of the story, beneath the top edge
    for (var localRow = boardwalkRowModifier; localRow < baseStoryHeight - 1 + storyHeightVariation + boardwalkRowModifier; localRow++) { // first story if 5 tiles tall, the minus one takes off the top row
        for (var localCol = 0; localCol < width; localCol++) {
            // building from the bottom up
            // if the left edge, apply left edge tile
            if (localCol === 0) applyTileToMap(currentMap, generateGTGreySidingLeftEdge(), [leftColumn + localCol, bottomRow - localRow]);
            // if the right edge, apply right edge tile
            else if (localCol === width - 1) applyTileToMap(currentMap, generateGTGreySidingRightEdge(), [leftColumn + localCol, bottomRow - localRow]);
            // otherwise apply normal siding
            else applyTileToMap(currentMap, generateGTGreySiding(), [leftColumn + localCol, bottomRow - localRow]);
        }
    }
    // adding the top edge of the story
    for (var localColTop = 0; localColTop < width; localColTop++) {
        // left edge
        if (localColTop === 0) applyTileToMap(currentMap, gTGreySidingTopLeftEdge, [leftColumn + localColTop, bottomRow - baseStoryHeight + 1 - storyHeightVariation - boardwalkRowModifier]);
        // right edge
        if (localColTop === width - 1) applyTileToMap(currentMap, gTGreySidingTopRightEdge, [leftColumn + localColTop, bottomRow - baseStoryHeight + 1 - storyHeightVariation - boardwalkRowModifier]);
        // blank, i.e. non-support-having tiles
        if ((localColTop + 1) % 2 === 0 && localColTop !== 0 && localColTop !== width - 1) applyTileToMap(currentMap, generateGTGreySidingTopBlank(), [leftColumn + localColTop, bottomRow - baseStoryHeight + 1- storyHeightVariation - boardwalkRowModifier]);
        // non-edge supports
        if ((localColTop + 1) % 2 !== 0 && localColTop !== 0 && localColTop !== width - 1) applyTileToMap(currentMap, generateGTGreySidingTopSupport(), [leftColumn + localColTop, bottomRow - baseStoryHeight + 1 - storyHeightVariation - boardwalkRowModifier]);
    }
    //applyTileToMap(currentMap, gTGreySiding0, [leftColumn, bottomRow]);
    // build up terrain underneath building 
}

// WRONG, MAYBE: This just return four tiles ordered: upper-left, upper-right, lower-left, lower right.
//      Putting them in the right places will still be tricky, and require more code.
function generateGT2x2Window() {
    var arrayOfWindows = [
        [gTWindow2x2_0UL, gTWindow2x2_0UR, gTWindow2x2_0LL, gTWindow2x2_0LR],
        [gTWindow2x2_1UL, gTWindow2x2_1UR, gTWindow2x2_1LL, gTWindow2x2_1LR],
        [gTWindow2x2_2UL, gTWindow2x2_2UR, gTWindow2x2_2LL, gTWindow2x2_2LR],
        [gTWindow2x2_3UL, gTWindow2x2_3UR, gTWindow2x2_3LL, gTWindow2x2_3LR]
    ],
    randomWindow = arrayOfWindows[Math.round(Math.random() * (arrayOfWindows.length - 1))];
    return randomWindow;
}

function generateGTGreySiding() {
    var sidingVariations = [
            gTGreySiding1,
            gTGreySiding2,
            gTGreySiding3
    ];
    for (var i = 0; i < 2; i++) sidingVariations.push(gTGreySiding0); // tiles with no board intersections are more common than others
    for (var j = 0; j < 2; j++) sidingVariations.push(gTGreySiding4); // tiles with no board intersections are more common than others
    for (var k = 0; k < 2; k++) sidingVariations.push(gTGreySiding5); // tiles with no board intersections are more common than others
    return sidingVariations[Math.round(Math.random() * (sidingVariations.length - 1))];
}

function generateGTGreySidingLeftEdge() {
    var sidingLeftEdgeVariations = [
            gTGreySidingLeftEdge0,
            gTGreySidingLeftEdge1,
            gTGreySidingLeftEdge2
    ];
    return sidingLeftEdgeVariations[Math.round(Math.random() * (sidingLeftEdgeVariations.length - 1))];
}

function generateGTGreySidingRightEdge() {
    var sidingRightEdgeVariations = [
            gTGreySidingRightEdge0,
            gTGreySidingRightEdge1,
            gTGreySidingRightEdge2
    ];
    return sidingRightEdgeVariations[Math.round(Math.random() * (sidingRightEdgeVariations.length - 1))];
}

function generateGTGreySidingTopBlank() {
    var sidingTopBlankVariations = [
            gTGreySidingTopBlank0,
            gTGreySidingTopBlank1,
            gTGreySidingTopBlank2
    ];
    return sidingTopBlankVariations[Math.round(Math.random() * (sidingTopBlankVariations.length - 1))];
}

function generateGTGreySidingTopSupport() {
    var sidingTopSupportVariations = [
            gTGreySidingTopSupport0,
            gTGreySidingTopSupport1
    ];
    return sidingTopSupportVariations[Math.round(Math.random() * (sidingTopSupportVariations.length - 1))];    
}
