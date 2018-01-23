
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
    generateGhostTownBuilding(4, height - 2, 18, 3, 2);
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

function generateGhostTownBuilding(leftColumn, bottomRow, maxWidth, maxStories, maxStoryHeightVariation) {
    // WRONG need protection from going up out of the map (and out the side)
    var randomNumberOfStories = 1 + Math.round(Math.random() * (maxStories - 1)),
        width = 6 + Math.round(Math.random() * (maxWidth - 6)),
        boardwalk = false,
        baseStoryHeight = 4, // minimum height for 3-tall door or 2-tall window with a space underneath plus a top border
        lastStoryHeight = 0,
        cumulativeStoryHeight = 0,
        lastStoryWidth = 0,
        newLeftColumn = leftColumn;
        if (Math.random() >= 0.5) boardwalk = true;
    // generate a story for as many stories as we end up randomly selecting
    for (var i = 0; i < randomNumberOfStories; i++) {
        var storyHeightVariation = Math.round(Math.random() * (maxStoryHeightVariation - 1));
            newWidth = width;
            if (i > 0) { // any story above the first
                newWidth = Math.max(4, lastStoryWidth - i * 2 - Math.round(Math.random() * width));
                newLeftColumn = newLeftColumn + Math.round((lastStoryWidth - newWidth) / 2);
            }
        generateGhostTownBuildingStory(newLeftColumn, bottomRow - cumulativeStoryHeight, newWidth, storyHeightVariation, i + 1, boardwalk);
        lastStoryWidth = newWidth;
        lastStoryHeight = baseStoryHeight + storyHeightVariation;
        lastLeftColumn = newLeftColumn;
        cumulativeStoryHeight += lastStoryHeight;
    }
}

function generateGhostTownBuildingStory(leftColumn, bottomRow, width, storyHeightVariation, storyNumber, boardwalkTrueOrFalse) {
    // WRONG: Should be a symmetry option, eventually
    // WARNING: generally, when generating things like houses, we're going to have to ensure that
    //      there is room on the map to the right and above them before we start building them.
    //      Boardwalk extension of width will have to be taken into consideration, or width will have to include it.
    var boardwalkRowModifier = 0,
        baseStoryHeight = 4;
    // build a boardwalk if the building has one
    if (boardwalkTrueOrFalse) {
        boardwalkRowModifier = 1;
        var boardwalkExtension = 1 + Math.round(Math.random() * 2);
        if (storyNumber === 1) {
            var boardwalk = generateBoardwalk(width + boardwalkExtension * 2);
            for (var boardwalkCol = 0; boardwalkCol < width + boardwalkExtension * 2; boardwalkCol++) {
                applyTileToMap(currentMap, boardwalk[boardwalkCol], [leftColumn - boardwalkExtension + boardwalkCol, bottomRow]);
            }
        }
    }
    // NOTE: CLEAR AREA, THEN BUILD DOORS AND WINDOWS, THEN FILL IN THE REST IF IT'S BLANK AND INSIDE BUILDING BOUNDS.

    // clear terrain where building will be
    //clearInsideOfBorder()
    // outlining the building ()
    // building the left and right edges
    for (var localRow = boardwalkRowModifier; localRow < baseStoryHeight - 1 + storyHeightVariation + boardwalkRowModifier; localRow++) { // first story if 5 tiles tall, the minus one takes off the top row
        for (var localCol = 0; localCol < width; localCol++) {
            // building from the bottom up
            // if the left edge, apply left edge tile
            if (localCol === 0) applyTileToMap(currentMap, generateGTGreySidingLeftEdge(), [leftColumn + localCol, bottomRow - localRow]);
            // if the right edge, apply right edge tile
            else if (localCol === width - 1) applyTileToMap(currentMap, generateGTGreySidingRightEdge(), [leftColumn + localCol, bottomRow - localRow]);
            // otherwise apply normal siding
            //else applyTileToMap(currentMap, generateGTGreySiding(), [leftColumn + localCol, bottomRow - localRow]);
        }
    }
    // building the top edge of the story
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
    // add a door if this is the first story
    if (storyNumber === 1) {
        var door = generateGTDoor(),
            doorWidth,
            doorHeight = 3,
            doorLocalLeftCol,
            doorTileIndex = 0;
        if (door.length === 9) doorWidth = 3;
        if (door.length === 6) doorWidth = 2;
        doorLocalLeftCol = 1 + Math.round(Math.random() * (width - doorWidth - 2));
        for (var localDoorRow = 0; localDoorRow < doorHeight; localDoorRow++) {
            for (var localDoorCol = 0; localDoorCol < doorWidth; localDoorCol++) {
                applyTileToMap(currentMap, door[doorTileIndex], [leftColumn + doorLocalLeftCol + localDoorCol, bottomRow - 2 - boardwalkRowModifier + localDoorRow]);
                doorTileIndex++;
            }
        }
    }
    // add windows
    // WRONG maybe. Maybe find a way to keep two windows of the same kind from showing up next to each other.
    for (var windowCol = 1; windowCol < width - 2; windowCol++) {
        var window = generateGTWindow(),
            windowWidth,
            windowHeight,
            windowTileIndex = 0;
        if (window.length === 9) {
            windowWidth = 3;
            windowHeight = 3;
        }
        if (window.length === 4) {
            windowWidth = 2;
            windowHeight = 2;
        }
        if ( // kludgy because it the second and third lines below here do the same thing for a 2x2 window,
            //      and for anything larger than a 3-wide window, some tiles won't get checked for emptiness
            currentMap.composite[bottomRow - 1 - boardwalkRowModifier][windowCol + leftColumn] === 0 &&
            currentMap.composite[bottomRow - 1 - boardwalkRowModifier][windowCol + leftColumn + 1] === 0 &&
            currentMap.composite[bottomRow - 1 - boardwalkRowModifier][windowCol + leftColumn + windowWidth - 1] === 0 &&
            Math.random() < 0.5
        ) {
            for (var localWindowRow = 0; localWindowRow < windowHeight; localWindowRow++) {
                for (var localWindowCol = 0; localWindowCol < windowWidth; localWindowCol++) {
                    applyTileToMap(currentMap, window[windowTileIndex], [leftColumn + windowCol + localWindowCol, bottomRow - 2 - boardwalkRowModifier + localWindowRow]);
                    windowTileIndex++;
                }
            }
        }
    }
    // fill in blank space with siding (and/or eventually barrels and/or crates, incl. explody ones)
    
    for (var blankCol = 1; blankCol < width - 1; blankCol++) {
        for (var blankRow = 0; blankRow < storyHeightVariation + baseStoryHeight - 1; blankRow++) {
            if (currentMap.composite[bottomRow - boardwalkRowModifier - blankRow][leftColumn + blankCol] === 0) {
                applyTileToMap(currentMap, generateGTGreySiding(), [leftColumn + blankCol, bottomRow - boardwalkRowModifier - blankRow]);
            }
        }
    }
    // build up terrain underneath building 
}

function generateBoardwalk(length) {
    var boardwalk = [];
    for (var i = 0; i < length; i++) {
        if (i === 0) boardwalk.push(gTBoardwalkLeftEdge);
        if (i === length - 1) boardwalk.push(gTBoardwalkRightEdge);
        if ((i - 1) % 3 === 0 && i > 0 && i !== length - 1) boardwalk.push(gTBoardwalkBlank);
        if ((i - 2) % 3 === 0 && i > 0 && i !== length - 1) boardwalk.push(gTBoardwalkSupportLeft);
        if ((i % 3) === 0 && i > 0 && i !== length - 1) boardwalk.push(gTBoardwalkSupportRight);
    }
    return boardwalk;
}

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

function generateGT3x3Window() {
    
}

function generateGTWindow() {
    var window;
    if (Math.random() < 0.00) window = generateGT3x3Window(); // can be < 0.33 or something when there's a 3x3 window available
    else window = generateGT2x2Window();
    return window;
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

function generateGT2x2Door() {
    var arrayOfDoors = [ // might add more doors later
        [gTDoor2x3_0UL, gTDoor2x3_0UR, gTDoor2x3_0ML, gTDoor2x3_0MR, gTDoor2x3_0LL, gTDoor2x3_0LR]
    ],
    randomDoor = arrayOfDoors[Math.round(Math.random() * (arrayOfDoors.length - 1))];
    return randomDoor;
}

function generateGT3x3Door() {
    
}


function generateGTDoor() {
    var door;
    if (Math.random() < 0.00) door = generateGT3x3Door(); // can make this < 0.33 once we have some 3x3 door code in place
    else door = generateGT2x2Door();
    return door;
}
