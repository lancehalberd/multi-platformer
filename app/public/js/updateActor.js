function updateActor(actor) {
    if (actor.stuckUntil > now()) {
        return;
    }
    // Friction. Air Friction is much lower than on the ground.
    if (!actor.slipping) {
        if (actor.isCrouching) actor.vx *= 0.75;
        else if (actor.grounded) actor.vx *= 0.8;
        else actor.vx *= 0.9;
    }
    // User normal scaling when checking if player is under ceiling.
    actor.scale = 2;
    actor.hitBox = new Rectangle(-20, -60, 40, 60); //should player with scaling and hitBox size just a little. Would be nice to slip into 2-tile-wide openeings while falling pretty easily.
    // Main character's movement is controlled with the keyboard.
    if (actor === mainCharacter && !actor.deathTime){
        // Attack if the space key is down.
        if (isKeyDown(KEY_SPACE) && !actor.attacking) {
            actor.attacking = true;
            actor.attackTime = now();
            sendPlayerAttacked();
        }
        // Each frame we assume the player is standing at first, unless the ceiling is
        // forcing them to crouch.
        actor.isCrouching = isPlayerUnderCeiling(actor);
        if (actor.grounded) {
            //dust plume on landing
            if (actor.spawnDustOnGrounding) {
                addEffectJumpDust(actor.x, actor.y);
                actor.spawnDustOnGrounding = false;
            }
            //run dust
            if (Math.abs(actor.vx) > actor.runDustSpeed && actor.noRunDustUntil <= now()) {
                addEffectRunDust(actor.x, actor.y);
                actor.noRunDustUntil = now() + actor.msBetweenRunDustPlumes;
            }
            actor.airDashed = false;
            // The player can crouch by pressing down while standing on solid ground.
            if (isKeyDown(KEY_DOWN)) {
                actor.isCrouching = true;
            } else if (actor.jumpKeyReleased && isKeyDown(KEY_UP)) {
                // The player will attempt to jump if they press the
                // jump key while on the ground and not crouching.
                actor.jump();
                // Spawns a dust plume on jumping from a grounded state.
                addEffectJumpDust(actor.x, actor.y);
            }
        } else {
            actor.spawnDustOnGrounding = true;  //for spawning dust plume on landing
            // The player is in the air/not grounded
            if (actor.jumpKeyReleased) {
                // Once the actor releases the jump key while jumping, they can no longer
                // boost their current jump, so we set the current jump duration to the max duration.
                actor.currentJumpDuration = actor.maxJumpDuration;
                // If the actor has released the jump key since they started jumping,
                // they will attempt to jump again the next time they press the jump key.
                if (isKeyDown(KEY_UP)) {
                    // Make the actor jump away from the wall if they are stuck to it.
                    if (actor.stuck) {
                        if (isKeyDown(KEY_RIGHT)) actor.vx -= 8;
                        if (isKeyDown(KEY_LEFT))  actor.vx += 8;
                    }
                    actor.jump();
                }
            } else if (isKeyDown(KEY_UP) && actor.currentJumpDuration < actor.maxJumpDuration) {
                // If the actor has not released the jump key since they started jumping,
                // the jump velocity will continue to be applied as long as they hold the jump key
                // until they hit the maxJumpDuration.
                actor.applyJumpVelocity();
                actor.currentJumpDuration++;
            }
            //air dash
            if (isKeyDown(KEY_RIGHT) && (isKeyDown(KEY_DOWN) && !actor.airDashed && canCharacterAirDash(actor))) {
                actor.vx += 7;
                actor.vy -= 4;
                actor.airDashed = true;
            }
            if (isKeyDown(KEY_LEFT) && (isKeyDown(KEY_DOWN) && !actor.airDashed && canCharacterAirDash(actor))) {
                actor.vx -= 7;
                actor.vy -= 4;
                actor.airDashed = true;
            }
        }
        var dx = 0;
        if (isKeyDown(KEY_LEFT)) dx--;
        if (isKeyDown(KEY_RIGHT)) dx++;
        if (actor.slipping) actor.vx += 0.1 * dx;
        else if (actor.isCrouching) actor.vx += dx / 2;
        else if (actor.grounded) actor.vx += dx;
        else actor.vx += dx / 1.5;
        actor.jumpKeyReleased = !isKeyDown(KEY_UP);
    }

    if (isPlayerCompelledByOctopusTouch(actor) && actor.grounded) {
        actor.vy -= 14;
    }



    // If the character is crouching, they are drawn smaller and have a shorter hitbox.
    if (actor.isCrouching ) {
        actor.scale = 1; //normal scale is 2, so this is half normal size. This affects visual representation only.
        actor.hitBox = new Rectangle(-20, -32, 40, 32); //this represents collision. Only yScale is halved. xScale is normal.
    }
    var targetPosition = [actor.x + 100 * actor.vx, actor.y];

    if (actor.attacking) {
        actor.attackFrame = Math.floor((now() - actor.attackTime) / 100);
        // Autojump when the mouse is higher than the character.
        // if (actor.attackFrame === 1 && targetPosition[1] < groundY - 100) actor.jump();
        if (actor.attackFrame >= actor.attackAnimation.frames.length) {
            actor.attacking = false;
        }
    }
    actor.stuck = false;
    if (actor.vx) {
        if (actor.vx < 0) {
            moveSpriteInDirection(actor, actor.vx, TILE_LEFT);
        } else {
            moveSpriteInDirection(actor, actor.vx, TILE_RIGHT);
        }
        actor.walkFrame = Math.floor(now() / (actor.slipping ? 100 : 200)) % actor.walkAnimation.frames.length;
    } else {
        actor.walkFrame = 0;
    }
    actor.slipping = false;
    if (actor.vy < 0) {
        actor.grounded = false;
        moveSpriteInDirection(actor, actor.vy, TILE_UP);
    } else if (actor.vy > 0) {
        actor.grounded = false;
        moveSpriteInDirection(actor, actor.vy, TILE_DOWN);
    }

    if (actor.grounded && !actor.vx && !actor.attacking) {
        actor.animation = actor.idleAnimation;
        actor.idleFrame =  Math.floor(now() / (actor.slipping ? 100 : 200)) % actor.animation.frames.length;
        actor.currentFrame = actor.idleFrame;
    }

    // Rather than have the player get imperceptibly slower and slower, we just bring
    // them to a full stop once their speed is less than .5.
    if (!actor.slipping && Math.abs(actor.vx) < 0.5) actor.vx = 0;

    actor.vy++;
    if (!actor.grounded) {
        actor.animation = actor.walkAnimation;
        actor.currentFrame = actor.walkFrame = 2;
    }
    if (!actor.attacking) {
        if (actor.vx) {
            actor.animation = actor.walkAnimation;
            actor.currentFrame = actor.walkFrame;
        }
    } else {
        actor.animation = actor.attackAnimation;
        actor.currentFrame = actor.attackFrame;
    }
    if (actor.x !== targetPosition[0]) {
        actor.xScale = (actor.x > targetPosition[0]) ? -1 : 1;
    }
    if (actor.y - actor.hitBox.height > currentMap.tileSize * currentMap.height) {
        actor.health = 0;
    }
    if (actor === mainCharacter && actor.health <= 0 && !actor.deathTime) {
        actor.deathTime = now();
    }
    if (actor === mainCharacter && !actor.deathComplete && actor.deathTime && actor.deathTime < now() - 1000) {
        actor.deathComplete = true;
        if (actor.onDeathComplete) actor.onDeathComplete();
    }
    if (!isPlayerTouchingTeleporter(actor)) actor.canTeleport = true;
}

function isTileX(row, column, property) {
    return _.get(currentMap.composite, [row, column, 'properties']) & property;
}

var directionToBoundary = {
    [TILE_UP]: 'top', [TILE_DOWN]: 'bottom', [TILE_LEFT]: 'left', [TILE_RIGHT]: 'right'
};
var directionToCoordinate = {
    [TILE_UP]: 'y', [TILE_DOWN]: 'y', [TILE_LEFT]: 'x', [TILE_RIGHT]: 'x'
}

var getLocalSpriteHitBox = (sprite) => {
    var hitBox = sprite.hitBox;
    if (!hitBox) {
        var frame = sprite.animation.frames[sprite.currentFrame];
        hitBox = frame.hitBox || frame.moveTo(0, 0);
    }
    return hitBox;
}

var getGlobalSpriteHitBox = (sprite) => getLocalSpriteHitBox(sprite).translate(sprite.x, sprite.y);

var canCharacterAirDash = (character) => character.canAirDashUntil > now();

function isPlayerTouchingTeleporter(actor) {
    var globalHitBox = getGlobalSpriteHitBox(actor);
    // localSprites.filter(...) returns all the elements of localSprites that the function returns true for.
    var allTeleporters = localSprites.filter(sprite => sprite.type === TRIGGER_TYPE_TELEPORTER);
    // allTeleporters.some(...) returns true if any of the elements return true for the given function.
    return allTeleporters.some(teleporter => teleporter.hitBox.overlapsRectangle(globalHitBox));
}

function isPlayerCompelledByOctopusTouch(character) {
    return character.compelledByOctopusTouch > now();
}

function isPlayerUnderCeiling(player) {
    var hitBox = getGlobalSpriteHitBox(player),
        topRow = Math.floor(hitBox.top / currentMap.tileSize),
        leftColumn = Math.floor(hitBox.left / currentMap.tileSize),
        rightColumn = Math.floor((hitBox.right - 1) / currentMap.tileSize);
    if (isTileX(topRow, leftColumn, TILE_SOLID * TILE_UP) || isTileX(topRow, rightColumn, TILE_SOLID * TILE_UP)) return true;
    else return false;
}

function moveSpriteInDirection(sprite, amount, direction) {
    var splits = Math.max(1, Math.ceil(2 * amount / currentMap.tileSize));
    var amount = amount / splits;
    for (var i = 0; i < splits; i++) {
        sprite[directionToCoordinate[direction]] += amount;
        var hitBox = getGlobalSpriteHitBox(sprite);
        var leftColumn = Math.floor(hitBox.left / currentMap.tileSize);
        var rightColumn = Math.floor((hitBox.right - 1) / currentMap.tileSize);
        var topRow = Math.floor(hitBox.top / currentMap.tileSize);
        var bottomRow = Math.floor((hitBox.bottom - 1) / currentMap.tileSize);
        // When moving vertically, we only care about the row we are moving into.
        if (direction === TILE_UP || direction === TILE_DOWN) {
            topRow = bottomRow = Math.floor(hitBox[directionToBoundary[direction]] / currentMap.tileSize);
        }
        // When moving horizontally, we only care about the column we are moving into.
        if (direction === TILE_LEFT || direction === TILE_RIGHT) {
            leftColumn = rightColumn = Math.floor(hitBox[directionToBoundary[direction]] / currentMap.tileSize);
        }
        // Damage that will be taken if not prevented
        var movementDamage = 0;
        // Flag indicating that movement in this direction is blocked by the next tile.
        var stopped = false;
        // Flag indicating that the player was bounced back. Will only stay true
        // if every tile hit is bouncy
        var bounced = true;
        var slipping = true;
        var stuck = false;
        for (var row = topRow; row <= bottomRow; row++) {
            for (var column = leftColumn; column <= rightColumn; column++) {
                var isDamaging = false;
                if (isTileX(row, column, TILE_DAMAGE * direction)) {
                    // If we have already been stopped, don't update the movement damage.
                    if (!stopped) movementDamage = 1;
                    isDamaging = true;
                }
                if (isTileX(row, column, TILE_SOLID * direction)) {
                    stopped = true;
                    // If we are stopped by a tile that doesn't damage us, then we take no damage.
                    if (!isDamaging) movementDamage = 0;
                    // You only bounce if every tile you hit is bouncy.
                    if (!isTileX(row, column, TILE_BOUNCE * direction)) {
                        bounced = false;
                    }
                    if (!isTileX(row, column, TILE_SLIPPERY * direction)) {
                        slipping = false;
                    }
                }
                if (isTileX(row, column, TILE_STICKY * direction)) {
                    stuck = true;
                }
            }
        }
        // If the character is standing only on slippery surfaces, mark them as slipping.
        if (stopped && slipping && direction === TILE_DOWN) sprite.slipping = !stuck;
        if (stuck) {
            sprite.stuck = stuck;
            switch(direction) {
                case TILE_UP:
                case TILE_DOWN:
                    sprite.vx *= 0.5;
                    break;
                case TILE_LEFT:
                case TILE_RIGHT:
                    sprite.vy *= 0.5;
                    sprite.currentNumberOfJumps = 0;
                    sprite.currentJumpDuration = sprite.maxJumpDuration;
            }
        }
        if (movementDamage) {
            damageSprite(sprite, movementDamage);
        }
        // This function aligns the character to the tile they are entering,
        // which is used to press them up against solid tiles they run into.
        var alignToTile = (stop) => {
            switch(direction) {
                case TILE_UP:
                    if (stop) {
                        sprite.vy = 0;
                        sprite.currentJumpDuration = sprite.maxJumpDuration;
                    }
                    sprite.y = (topRow + 1) * currentMap.tileSize + hitBox.height;
                    break;
                case TILE_DOWN:
                    if (stop) {
                        sprite.vy = 0;
                        sprite.grounded = true;
                        sprite.currentNumberOfJumps = 0;
                    }
                    sprite.y = bottomRow * currentMap.tileSize;
                    break;
                case TILE_LEFT:
                    if (stop) sprite.vx = 0;
                    sprite.x = (leftColumn + 1) * currentMap.tileSize - getLocalSpriteHitBox(sprite).left;
                    break;
                case TILE_RIGHT:
                    if (stop) sprite.vx = 0;
                    sprite.x = rightColumn * currentMap.tileSize - hitBox.width - getLocalSpriteHitBox(sprite).left;
                    break;
            }
        }
        if (stopped && bounced) {
            // Currently bouncing is only implemented while moving down.
            switch(direction) {
                case TILE_DOWN:
                    if (sprite.vy < 8) {
                        alignToTile(true);
                        return false;
                    }
                    // Snap them to the tile, but don't stop them when they bounce.
                    alignToTile(false);
                    sprite.vy = Math.min(-13, -1 * sprite.vy);
                    // We count the bounce as a jump.
                    sprite.currentNumberOfJumps = 1;
                    sprite.currentJumpDuration = 0;
                    return false;
                case TILE_UP:
                    alignToTile(false);
                    sprite.vy = Math.max(13, -1 * sprite.vy);
                    sprite.currentJumpDuration = sprite.maxJumpDuration;
                    return false;
                case TILE_LEFT:
                case TILE_RIGHT:
                    alignToTile(false);
                    sprite.vx = -sprite.vx;
                    if (sprite.vx < 0) sprite.vx = Math.min(-13, sprite.vx);
                    else if(sprite.vx > 0) sprite.vx = Math.max(13, sprite.vx);
                    return false;
            }
        }
        if (stopped) {
            alignToTile(true);
            return false;
        }
    }
    return true;
}

function damageSprite(sprite, amount) {
    if (sprite.invulnerableUntil && now() < sprite.invulnerableUntil) return;
    sprite.health -= amount;
    sprite.invulnerableUntil = now() + 1000;
}

//localSprites.push(addHomingFireballSprite(400, 150, {x: 200, y:500}));
