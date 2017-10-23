
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

    if (localSprites.length === 0 && isKeyDown('F'.charCodeAt(0))) {
        // addHomingFireballSprite(350, 700, mainCharacter);
        addTrigger(0, 800, 64, 200, mainCharacter, SPRITE_TYPE_FIREBALL_HOMING, 250, -150, 0, 0, 150);
    }
    if (localSprites.length === 0 && isKeyDown('E'.charCodeAt(0))) {
        addTrigger(0, 800, 64, 200, mainCharacter, 0, 0, 0, 10, -10, 0);
    }
    if (localSprites.length < 2 && isKeyDown('H'.charCodeAt(0))) {
        addPowerup(150, 750, POWERUP_TYPE_HEART, 0.6, 0.6, 0, true);
    }
    if (localSprites.length < 2 && isKeyDown('G'.charCodeAt(0))) {
        addPowerup(250, 700, POWERUP_TYPE_AIRDASH, 1, 1, 10, false);
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
