
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
        hasBoardwalk = false,
        baseStoryHeight = 4, // minimum height for 3-tall door or 2-tall window with a space underneath plus a top border
        lastStoryHeight = 0,
        cumulativeStoryHeight = 0,
        lastStoryWidth = 0,
        newLeftColumn = leftColumn;
        if (Math.random() >= 0.5) hasBoardwalk = true;
    // generate a story for as many stories as we end up randomly selecting
    for (var i = 0; i < randomNumberOfStories; i++) {
        var storyHeightVariation = Math.round(Math.random() * (maxStoryHeightVariation - 1));
            newWidth = width;
            if (i === 1) { // second story
                // second stories can be up to as wide as the first
                newWidth = Math.max(4, lastStoryWidth - Math.round(Math.random() * width));
                if (newWidth === width) newLeftColumn = leftColumn;
                else newLeftColumn = newLeftColumn + Math.round((lastStoryWidth - newWidth) / 2) - Math.round(Math.random());
            }
            if (i > 1) { // any story above the second
                // upper stories are narrower
                newWidth = Math.max(4, lastStoryWidth - ((i - 1) * 2) - Math.round(Math.random() * width));
                newLeftColumn = newLeftColumn + Math.round((lastStoryWidth - newWidth) / 2);
            }
        generateGhostTownBuildingStory(newLeftColumn, bottomRow - cumulativeStoryHeight, newWidth, storyHeightVariation, i + 1, randomNumberOfStories, hasBoardwalk);
        lastStoryWidth = newWidth;
        lastStoryHeight = baseStoryHeight + storyHeightVariation;
        lastLeftColumn = newLeftColumn;
        cumulativeStoryHeight += lastStoryHeight;
    }
}

function generateGhostTownBuildingStory(leftColumn, bottomRow, width, storyHeightVariation, storyNumber, numberOfStories, hasBoardwalk) {
    // WRONG: Stories should probably be able to be the same width as each other, at least for the first two or three stories.
    // WRONG: Should be a symmetry option, eventually
    // WRONG: with even-numbered widths, higher stories are always biased one to the right of center
    // WARNING: generally, when generating things like houses, we're going to have to ensure that
    //      there is room on the map to the right and above them before we start building them.
    //      Boardwalk extension of width will have to be taken into consideration, or width will have to include it.
    var boardwalkRowModifier = 0,
        baseStoryHeight = 4,
        boardwalkExtension = 0; // this is here so that it's in scope for a reference in the barrel-and-crate-adding section of this function
    // NOTE: CLEAR AREA

    // clear terrain where building will be
    //clearInsideOfBorder()
    // WRONG need to include boardwalk for clearing area. Maybe have to clear area inside of'(if (hasBoardwalk)...'
    // build a boardwalk if the building has one
    if (hasBoardwalk) {
        boardwalkRowModifier = 1;
        boardwalkExtension = 1 + Math.round(Math.random() * 2);
        if (storyNumber === 1) {
            var boardwalk = generateBoardwalk(width + boardwalkExtension * 2);
            for (var boardwalkCol = 0; boardwalkCol < width + boardwalkExtension * 2; boardwalkCol++) {
                applyTileToMap(currentMap, boardwalk[boardwalkCol], [leftColumn - boardwalkExtension + boardwalkCol, bottomRow]);
            }
        }
    }
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
        var door,
            numberOfDoors = 1 + Math.round(Math.random());
        if (width < 14) numberOfDoors = 1;
        for (var doorNumber = 0; doorNumber < numberOfDoors; doorNumber++) {
            // 3-wide door if it's a wide, multi-story building with a boardwalk
            if (width >= 13 && numberOfStories > 1 && hasBoardwalk && doorNumber === 0) door = generateGT3x3Door();
            // otherwise make a 2x3 door
            else door = generateGT2x2Door();
            var doorWidth = door[0].length,
                doorHeight = door.length,
                doorLocalLeftCol;
            // big doors go in the center
            if (doorWidth === 3) doorLocalLeftCol = Math.round((width / 2) - (doorWidth / 2)) - Math.round(Math.random()); // Seems like a should have to have two Math.round()s in here, but when I put the Math.random() inside the big Math.round(), I was always getting a placement bias to the same side.
            else {
                doorLocalLeftCol = 1 + Math.round(Math.random() * (width - doorWidth - 2));
                var doorLoopAtMostUntil = Date.now() + 2000; // if this while loop doesn't finish after 2 seconds, it's gone on way too long.
                while ( // for as long as the newly selected space for a second door and the tile to its right aren't blank, we keep selecting a random positon
                       (currentMap.composite[bottomRow - 2 - boardwalkRowModifier][leftColumn + doorLocalLeftCol] !== 0 ||
                       currentMap.composite[bottomRow - 2 - boardwalkRowModifier][leftColumn + doorLocalLeftCol + 1] !== 0) &&
                       Date.now() <= doorLoopAtMostUntil
                ) {
                    doorLocalLeftCol = 1 + Math.round(Math.random() * (width - doorWidth - 2));
                }
            }
            for (var localDoorRow = 0; localDoorRow < doorHeight; localDoorRow++) {
                for (var localDoorCol = 0; localDoorCol < doorWidth; localDoorCol++) {
                    applyTileToMap(currentMap, door[localDoorRow][localDoorCol], [leftColumn + doorLocalLeftCol + localDoorCol, bottomRow - 2 - boardwalkRowModifier + localDoorRow]);
                }
            }
        }
    }
    // add windows
    // WRONG maybe. Maybe find a way to keep two windows of the same kind from showing up next to each other.
    for (var windowCol = 1; windowCol < width - 2; windowCol++) {
        // we check each column of the story, starting with the 2nd from the left
        var window,
            windowWidth,
            windowHeight,
            maxWindowWidth = 4, // we only have 4-wide windows right now, at most
            availableWidthForWindow = 1;
        if (currentMap.composite[bottomRow - 1 - boardwalkRowModifier][leftColumn + windowCol] === 0) {
            // if the column we're checking is empty, there's a chance we'll make a window here.
            if (Math.random() >= 0.5) {
                // if we decide to make a window, we check to see how many spaces to the right of it are empty,
                //      so that we know how big a window could fit, theoretically.
                for (var winPlacementCol = 1; winPlacementCol < maxWindowWidth; winPlacementCol++) {
                    if (
                        currentMap.composite[bottomRow - 1 - boardwalkRowModifier][leftColumn + windowCol + winPlacementCol] === 0 &&
                        currentMap.composite[bottomRow - 1 - boardwalkRowModifier][leftColumn + windowCol + winPlacementCol] < leftColumn + width - 2
                    ) availableWidthForWindow++;
                    else break;
                }
                if (availableWidthForWindow > 1) { // WRONG eventually we can take this out, when we have some 1-wide windows.
                    // from within the available amount of space, we select a random value, 1 or over
                    var widthOfWindow = 1 + Math.round(Math.random() * (availableWidthForWindow - 1));
                    // and build a window using it (round windows for top stories that are story 3 or above, square or arched, otherwise)
                    if (
                        (storyNumber === numberOfStories && numberOfStories > 2) || // if it's the top story of a building three or more stories tall
                        (storyNumber === 2 && numberOfStories === 2 && Math.random() < 0.2) // or a 20% chance if it's the top floor and only the second story
                    ) window = generateGTRoundWindow(widthOfWindow); // then make a round window
                    else window = generateGTWindow(widthOfWindow);
                    // get the window's dimensions from the newly-created window
                    windowWidth = window[0].length;
                    windowHeight = window.length;
                    // build the window
                    for (var localWindowRow = 0; localWindowRow < windowHeight; localWindowRow++) {
                        for (var localWindowCol = 0; localWindowCol < windowWidth; localWindowCol++) {
                            applyTileToMap(currentMap, window[localWindowRow][localWindowCol], [leftColumn + windowCol + localWindowCol, bottomRow - 2 - boardwalkRowModifier + localWindowRow]);
                        }
                    }
                }
            }
        }
    }
    // end windows
    // TEMPORARILY REMOVED until the barrels can work as decals
    // add barrels (including explody ones)
    /*for (var barrelCol = 0; barrelCol < width + boardwalkExtension * 2; barrelCol++) {
        if (Math.random() < 0.15) applyTileToMap(currentMap, generateGTBarrel(), [leftColumn - boardwalkExtension + barrelCol, bottomRow - boardwalkRowModifier]);
    }*/
    // WRONG not taking boardwalk into account, but should
    // WRONG Crates spawning on left lower corner all the time
    /*for (var crateCol = 0; crateCol < width; crateCol++) {
        if (
            Math.random() < 0.33 && currentMap.composite[bottomRow - boardwalkRowModifier][leftColumn + crateCol] === 0 &&
            currentMap.composite[bottomRow - boardwalkRowModifier - 1][leftColumn + crateCol + 1] === 0
        ) {
            var crate = generateGT2x2Crate();
            for (var crateLocalCol = 0; crateLocalCol < crate.length; crateLocalCol++) {
                for (var crateLocalRow = 0; crateLocalRow < crate[0].length; crateLocalRow++) {
                    applyTileToMap(currentMap, crate[crateLocalRow][crateLocalCol], [leftColumn + crateLocalCol, bottomRow - boardwalkRowModifier - 1 + crateLocalRow]);
                }
            }
        }
    }*/
    // fill in blank space with siding
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
    // WRONG, a little bit: If there's a longer-than-usual section with no supports so that they don't crowd the ends, it's always on the right side.
    var boardwalk = [];
    for (var i = 0; i < length; i++) {
        if (i === 0) boardwalk.push(gTBoardwalkLeftEdge);
        if (i === length - 1) boardwalk.push(gTBoardwalkRightEdge);
        if ((((i - 1) % 3 === 0 && i > 0) || (i > length - 3)) && i !== length - 1) boardwalk.push(gTBoardwalkBlank);
        if ((i - 2) % 3 === 0 && i > 0 && i < length - 3) boardwalk.push(gTBoardwalkSupportLeft);
        if ((i % 3) === 0 && i > 0 && i < length - 2) boardwalk.push(gTBoardwalkSupportRight);
    }
    return boardwalk;
}

function generateGT2WideWindow() {
    var arrayOfWindows = [
        [[gTWindow2x2_0UL, gTWindow2x2_0UR], [gTWindow2x2_0LL, gTWindow2x2_0LR]], // the width and height used to build the window are stored as the array's last two items
        [[gTWindow2x2_1UL, gTWindow2x2_1UR], [gTWindow2x2_1LL, gTWindow2x2_1LR]],
        [[gTWindow2x2_2UL, gTWindow2x2_2UR], [gTWindow2x2_2LL, gTWindow2x2_2LR]],
        [[gTWindow2x2_3UL, gTWindow2x2_3UR], [gTWindow2x2_3LL, gTWindow2x2_3LR]],
        [[gTWindow2x2ShutteredUL, gTWindow2x2ShutteredUR], [gTWindow2x2ShutteredLL, gTWindow2x2ShutteredLR]]
    ],
    randomWindow = arrayOfWindows[Math.round(Math.random() * (arrayOfWindows.length - 1))];
    return randomWindow;
}

function generateGT3WideWindow() {
    var arrayOfWindows = [
        [[gTWindow3x2HalfShuttered0UL, gTWindow3x2HalfShuttered0UM, gTWindow3x2HalfShuttered0UR], [gTWindow3x2HalfShuttered0LL, gTWindow3x2HalfShuttered0LM, gTWindow3x2HalfShuttered0LR]],
        [[gTWindow3x2HalfShuttered1UL, gTWindow3x2HalfShuttered1UM, gTWindow3x2HalfShuttered1UR], [gTWindow3x2HalfShuttered1LL, gTWindow3x2HalfShuttered1LM, gTWindow3x2HalfShuttered1LR]],
        [[gTWindow3x3Arched0UL, gTWindow3x3Arched0UM, gTWindow3x3Arched0UR], [gTWindow3x3Arched0ML, gTWindow3x3Arched0MM, gTWindow3x3Arched0MR], [gTWindow3x3Arched0LL, gTWindow3x3Arched0LM, gTWindow3x3Arched0LR]]
    ],
    randomWindow = arrayOfWindows[Math.round(Math.random() * (arrayOfWindows.length - 1))];
    return randomWindow;
}

function generateGT4WideWindow() {
    var arrayOfWindows = [
        [[gTWindow4x2ShuttersOpen0UL, gTWindow4x2ShuttersOpen0UML, gTWindow4x2ShuttersOpen0UMR, gTWindow4x2ShuttersOpen0UR], [gTWindow4x2ShuttersOpen0LL, gTWindow4x2ShuttersOpen0LML, gTWindow4x2ShuttersOpen0LMR, gTWindow4x2ShuttersOpen0LR]],
        [[gTWindow4x2ShuttersOpen1UL, gTWindow4x2ShuttersOpen1UML, gTWindow4x2ShuttersOpen1UMR, gTWindow4x2ShuttersOpen1UR], [gTWindow4x2ShuttersOpen1LL, gTWindow4x2ShuttersOpen1LML, gTWindow4x2ShuttersOpen1LMR, gTWindow4x2ShuttersOpen1LR]]
    ],
    randomWindow = arrayOfWindows[Math.round(Math.random() * (arrayOfWindows.length - 1))];
    return randomWindow;
}

function generateGT2WideRoundWindow() {
    var arrayOfWindows = [ // this is an array so that it's easy to add more windows, even though there's only one for now.
        [[gTWindow2x2RoundUL, gTWindow2x2RoundUR], [gTWindow2x2RoundLL, gTWindow2x2RoundLR]] // ordered all the way across the top row, then all the way across the top row -1 etc.
    ],
    randomWindow = arrayOfWindows[Math.round(Math.random() * (arrayOfWindows.length - 1))];
    return randomWindow;
}

function generateGTRoundWindow(widthOfWindow) {
    var window;
    if (widthOfWindow === 1) window = generateGT2WideRoundWindow(); // later will be generate 1xN window
    if (widthOfWindow >= 2) window = generateGT2WideRoundWindow();
    // later will need a 3W window
    return window;
}

function generateGTWindow(widthOfWindow) {
    var window;
    if (widthOfWindow === 1) {
         if (Math.random() <= 1) window = generateGT2WideWindow(); // WRONG needs to be 1xN
    }    
    if (widthOfWindow === 2) {
        if (Math.random() <= 1) window = generateGT2WideWindow();
    }
    if (widthOfWindow === 3) {
        if (Math.random() <= 1) window = generateGT3WideWindow();
    }
    if (widthOfWindow >= 4) { // could make this === 4 if we have bigger windows available
        if (Math.random() <= 1) window = generateGT4WideWindow(); // later could use the random element to select 4x1 or 4x3 windows
    }
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
        [[gTDoor2x3_0UL, gTDoor2x3_0UR], [gTDoor2x3_0ML, gTDoor2x3_0MR], [gTDoor2x3_0LL, gTDoor2x3_0LR]]
    ];
    randomDoor = arrayOfDoors[Math.round(Math.random() * (arrayOfDoors.length - 1))];
    return randomDoor;
}

function generateGT3x3Door() {
    var arrayOfDoors = [ // might add more doors later
        [[gTSaloonDoor3x3_0UL, gTSaloonDoor3x3_0UM, gTSaloonDoor3x3_0UR], [gTSaloonDoor3x3_0ML, gTSaloonDoor3x3_0MM, gTSaloonDoor3x3_0MR], [gTSaloonDoor3x3_0LL, gTSaloonDoor3x3_0LM, gTSaloonDoor3x3_0LR]]
    ];
    randomDoor = arrayOfDoors[Math.round(Math.random() * (arrayOfDoors.length - 1))];
    return randomDoor;
}

function generateGT2x2Crate() {
    var arrayOfCrates = [ // might add more doors later
        [[gTCrate2x2_0UL, gTCrate2x2_0UR], [gTCrate2x2_0LL, gTCrate2x2_0LR]]
    ];
    randomCrate = arrayOfCrates[Math.round(Math.random() * (arrayOfCrates.length - 1))];
    return randomCrate;
}

function generateGTBarrel() {
    var arrayOfBarrels = [gTBarrel0, gTBarrel1];
    randomBarrel = arrayOfBarrels[Math.round(Math.random() * (arrayOfBarrels.length - 1))];
    return randomBarrel;
}
