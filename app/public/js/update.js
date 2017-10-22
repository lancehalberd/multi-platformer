
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
    if (localSprites.length === 0 && isKeyDown('F'.charCodeAt(0))) {
        //addLocalFallingSpikesSprite();
//        addHomingFireballSprite(350, 700, mainCharacter);
        addTriggerZone(0, 800, 64, 200, mainCharacter, 1, 250, -150, 0, 0, 150);
    }
        if (localSprites.length === 0 && isKeyDown('E'.charCodeAt(0))) {
        //addLocalFallingSpikesSprite();
//        addHomingFireballSprite(350, 700, mainCharacter);
        addTriggerZone(0, 800, 64, 200, mainCharacter, 0, 0, 0, 10, -10);
    }
    //updating homing fireballs, specifically. Seems like all this code shouldn't be in this file. But translplanting it directly into "updateLocalSprite" didn't work.
    for (var i = 0; i < localSprites.length; i++) {
        if (localSprites[i].name === 'homingFireball') {
            var fireballHitBox = getGlobalSpriteHitBox(localSprites[i]),
            targetHitBox = getGlobalSpriteHitBox(localSprites[i].target);
            if (rectanglesOverlap(fireballHitBox, targetHitBox)) { //WRONG: should check against all players rather than just its target
                localSprites[i].target.health--;
                localSprites[i].shouldBeRemoved = true;
            }
        }
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
    updateEditor();
    if (publicId === taggedId) {
        for (var id in otherCharacters) {
            var target = otherCharacters[id];
            if (target.untaggableUntil > now()) continue;
            if (rectanglesOverlap(getGlobalSpriteHitBox(mainCharacter), getGlobalSpriteHitBox(target))) {
                sendTaggedPlayer(id);
                break;
            }
        }
    }
}, frameMilliseconds);
