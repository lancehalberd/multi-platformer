function updateActor(actor) {
    // Friction. Air Friction is much lower than on the ground.
    if (actor.grounded) actor.vx *= 0.8;
    else actor.vx *= 0.9;
    // Main character's movement is controlled with the keyboard.
    if (actor === mainCharacter && !actor.deathTime){
        // Attack if the space key is down.
        if (isKeyDown(KEY_SPACE) && !actor.attacking) {
            actor.attacking = true;
            actor.attackTime = now();
            sendPlayerAttacked();
        }
        var dx = 0;
        if (isKeyDown(KEY_LEFT)) dx--;
        if (isKeyDown(KEY_RIGHT)) dx++;
        // Initially each frame assumes the player is standing:
        actor.crouched = false;
        actor.scale = 1.5;
        actor.hitBox = rectangle(-18, -63, 36, 63);
        actor.speed = 7.5;
        if (actor.grounded) {
            // The player can crouch by pressing down while standing on solid ground.
            if (isKeyDown(KEY_DOWN)) {
                // Crouched movement.
                // CROUCH IS MESSED UP: You can stand up even if a ceiling should prevent you from doing so.
                actor.crouched = true;
                actor.scale = 0.75;
                actor.hitBox = rectangle(-18, -31, 36, 31);
                actor.speed = 2;
            } else if (actor.jumpKeyReleased && isKeyDown(KEY_UP)) {
                // The player will attempt to jump in if they press the
                // jump key while on the ground and not crouching.
                actor.jump();
            }
            actor.vx += dx * 1;
        } else {
            //player is in the air/not grounded
            //double jump and limited air control
            if (actor.jumpKeyReleased) {
                // Once the actor releases the jump key while jumping, they can no longer
                // boost their current jump, so we set the current jump duration to the max duration.
                actor.currentJumpDuration = actor.maxJumpDuration;
                // If the actor has released the jump key since they started jumping,
                // they will attempt to jump again the next time they press the jump key.
                if (isKeyDown(KEY_UP)) actor.jump();
            } else if (isKeyDown(KEY_UP) && actor.currentJumpDuration < actor.maxJumpDuration) {
                // If the actor has not released the jump key since they started jumping,
                // there velocity will continue to increase as long as they hold the jump key
                // until they hit the maxJumpDuration.
                actor.applyJumpVelocity();
                actor.currentJumpDuration++;
            }
            actor.vx += dx / 1.5; //i.e. dx / 2 grants 1/2 of normal movement response in air control, 1.5 grants 2/3 of normal movement response in air control
        }
        actor.jumpKeyReleased = !isKeyDown(KEY_UP);
    }
    var maxSpeed = actor.speed;
    actor.vx = Math.min(Math.max(actor.vx, -maxSpeed), maxSpeed);
    // Rather than have the player get imperceptibly slower and slower, we just bring
    // them to a full stop once their speed is less than .5.
    if (Math.abs(actor.vx) < .5) actor.vx = 0;
    var targetPosition = [actor.x + 100 * actor.vx, actor.y];

    if (actor.attacking) {
        actor.attackFrame = Math.floor((now() - actor.attackTime) / 200);
        // Autojump when the mouse is higher than the character.
        // if (actor.attackFrame === 1 && targetPosition[1] < groundY - 100) actor.jump();
        if (actor.attackFrame >= actor.animation.frames.length) {
            actor.attacking = false;
        }
    }
    if (actor.vx) {
        if (actor.vx < 0) {
            moveLeft(actor, -actor.vx);
        } else {
            moveRight(actor, actor.vx);
        }
        actor.walkFrame = Math.floor(now() / 200) % actor.animation.frames.length;
    } else {
        actor.walkFrame = 0;
    }
    if (actor.vy < 0) {
        actor.grounded = false;
        moveUp(actor, -actor.vy);
    } else if (actor.vy > 0) {
        actor.grounded = false;
        moveDown(actor, actor.vy);
    }

    actor.vy++;
    if (!actor.grounded) {
        actor.walkFrame = 1;
    }
    if (!actor.attacking) {
        actor.animation = actor.walkAnimation;
        actor.currentFrame = actor.walkFrame;
        if (actor.x !== targetPosition[0]) {
            actor.xScale = (actor.x > targetPosition[0]) ? -1 : 1;
        }
    } else {
        actor.animation = actor.attackAnimation;
        actor.currentFrame = actor.attackFrame;
    }
    if (actor.health <= 0 && !actor.deathTime) {
        actor.deathTime = now();
    }
    if (!actor.deathComplete && actor.deathTime && actor.deathTime < now() - 2000) {
        actor.deathComplete = true;
        if (actor.onDeathComplete) actor.onDeathComplete();
    }
}

function isTileX(row, column, property) {
    return _.get(currentMap.composite, [row, column, 'properties']) & property;
}

function moveLeft(sprite, amount) {
    var splits = Math.max(1, Math.ceil(2 * amount / currentMap.tileSize));
    var amount = amount / splits;
    for (var i = 0; i < splits; i++) {
        sprite.x -= amount;
        var hitBox = rectangle(
            sprite.x + sprite.hitBox.left, sprite.y + sprite.hitBox.top,
            sprite.hitBox.width, sprite.hitBox.height
        );
        var topRow = Math.floor(hitBox.top / currentMap.tileSize);
        var bottomRow = Math.floor((hitBox.bottom - 1) / currentMap.tileSize);
        var targetColumn = Math.floor(hitBox.left / currentMap.tileSize);
        for (var row = topRow; row <= bottomRow; row++) {
            if (isTileX(row, targetColumn, TILE_DAMAGE_LEFT)) {
                damageSprite(sprite, 1);
            }
            if (isTileX(row, targetColumn, TILE_SOLID_LEFT)) {
                sprite.x = (targetColumn + 1) * currentMap.tileSize - sprite.hitBox.left;
                return false;
            }
        }
    }
    return true;
}
function moveRight(sprite, amount) {
    var splits = Math.max(1, Math.ceil(2 * amount / currentMap.tileSize));
    var amount = amount / splits;
    for (var i = 0; i < splits; i++) {
        sprite.x += amount;
        var hitBox = rectangle(
            sprite.x + sprite.hitBox.left, sprite.y + sprite.hitBox.top,
            sprite.hitBox.width, sprite.hitBox.height
        );
        var topRow = Math.floor(hitBox.top / currentMap.tileSize);
        var bottomRow = Math.floor((hitBox.bottom - 1) / currentMap.tileSize);
        var targetColumn = Math.floor(hitBox.right / currentMap.tileSize);
        for (var row = topRow; row <= bottomRow; row++) {
            if (isTileX(row, targetColumn, TILE_DAMAGE_RIGHT)) {
                damageSprite(sprite, 1);
            }
            if (isTileX(row, targetColumn, TILE_SOLID_RIGHT)) {
                sprite.x = targetColumn * currentMap.tileSize - hitBox.width - sprite.hitBox.left;
                return false;
            }
        }
    }
    return true;
}

function moveUp(sprite, amount) {
    var splits = Math.max(1, Math.ceil(2 * amount / currentMap.tileSize));
    var amount = amount / splits;
    for (var i = 0; i < splits; i++) {
        sprite.y -= amount;
        var hitBox = rectangle(
            sprite.x + sprite.hitBox.left, sprite.y + sprite.hitBox.top,
            sprite.hitBox.width, sprite.hitBox.height
        );
        var leftColumn = Math.floor(hitBox.left / currentMap.tileSize);
        var rightColumn = Math.floor((hitBox.right - 1) / currentMap.tileSize);
        var targetRow = Math.floor(hitBox.top / currentMap.tileSize);
        for (var column = leftColumn; column <= rightColumn; column++) {
            if (isTileX(targetRow, column, TILE_DAMAGE_UP)) {
                damageSprite(sprite, 1);
            }
            if (isTileX(targetRow, column, TILE_SOLID_UP)) {
                sprite.vy = 0;
                sprite.y = (targetRow + 1) * currentMap.tileSize + hitBox.height;
                return false;
            }
        }
    }
    return true;
}

function moveDown(sprite, amount) {
    var splits = Math.max(1, Math.ceil(2 * amount / currentMap.tileSize));
    var amount = amount / splits;
    for (var i = 0; i < splits; i++) {
        sprite.y += amount;
        var hitBox = rectangle(
            sprite.x + sprite.hitBox.left, sprite.y + sprite.hitBox.top,
            sprite.hitBox.width, sprite.hitBox.height
        );
        var leftColumn = Math.floor(hitBox.left / currentMap.tileSize);
        var rightColumn = Math.floor((hitBox.right - 1) / currentMap.tileSize);
        var targetRow = Math.floor(hitBox.bottom / currentMap.tileSize);
        for (var column = leftColumn; column <= rightColumn; column++) {
            if (isTileX(targetRow, column, TILE_DAMAGE_DOWN)) {
                damageSprite(sprite, 1);
            }
            if (isTileX(targetRow, column, TILE_BOUNCE_DOWN)) {
                if (sprite.vy < 8) {
                    // If the sprite lands softly on a bouncy tile, then
                    // it acts just like a solid tile would.
                    sprite.vy = 0;
                    sprite.y = targetRow * currentMap.tileSize;
                    sprite.grounded = true;
                    sprite.currentNumberOfJumps = 0;
                    return;
                } else sprite.vy = Math.min(-13, -1 * sprite.vy);
                sprite.y = targetRow * currentMap.tileSize;
                // We count the bounce as a jump.
                sprite.currentNumberOfJumps = 1;
                sprite.currentJumpDuration = 0;
                return false;
            } else if (isTileX(targetRow, column, TILE_SOLID_DOWN)) {
                sprite.vy = 0;
                sprite.y = targetRow * currentMap.tileSize;
                sprite.grounded = true;
                sprite.currentNumberOfJumps = 0;
                return false;
            }
        }
    }
    return true;
}

function damageSprite(sprite, amount) {
    if (sprite.invulnerableUntil && now() < sprite.invulnerableUntil) return;
    sprite.health -= amount;
    sprite.invulnerableUntil = now() + 1000;
}
