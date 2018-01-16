'use strict';

// Make sure that the map tile sets are preloaded before we initialize the game.
requireImage(twilightTiles);
requireImage(customTiles);

var gameHasBeenInitialized = false;
// Load any graphic assets needed by the game here.
function initializeGame() {
    try {
        initializePersonGraphics();

        gameHasBeenInitialized = true;
        $('.js-loading').hide();
        $('.js-gameContent').show();

        centerCameraOnPlayer();
    } catch (e) {
        console.log(e);
        debugger;
    }
}
