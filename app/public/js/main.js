'use strict';

// Make sure that the map tile sets are preloaded before we initialize the game.
requireImage(twilightTiles);
requireImage(customTiles);

var gameHasBeenInitialized = false;
// Load any graphic assets needed by the game here.
function initializeGame() {
    try {
        initializePersonGraphics();
        if (cameraX + 800 < mainCharacter.x + 300) cameraX = mainCharacter.x - 500;
        if (cameraX > mainCharacter.x - 300) cameraX = mainCharacter.x - 300;
        if (cameraY + 600 < mainCharacter.y + 300) cameraY = mainCharacter.y - 300;
        if (cameraY > mainCharacter.y - 300) cameraY = mainCharacter.y - 300;
        cameraX = Math.max(0, Math.min(areaRectangle.width - mainCanvas.width, cameraX));
        cameraY = Math.max(0, Math.min(areaRectangle.height - mainCanvas.height, cameraY));

        gameHasBeenInitialized = true;
        $('.js-loading').hide();
        $('.js-gameContent').show();
    } catch (e) {
        console.log(e);
        debugger;
    }
}
