var CHARACTER_VICTORIA = 'victoriaCharacter';
var CHARACTER_COWBOT = 'cowbotCharacter';
var CHARACTER_MYSTERY = 'mysteryCharacter';
var CHARACTER_ALIEN = 'alienCharacter';



function updateActor(actor) {
    beaconsToMainCharacterArray();  // running this every loop isn't necessary right now, but if 'beacons' come to include things that can spawn and die (which they may well), then this is a good place for this function call.
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
    // scale is set in character defintion area now
    //actor.scale = actor.scale;
    actor.hitBox = new Rectangle(-20, -60, 40, 60); //Would be nice to slip into 2-tile-wide openeings while falling pretty easily.
    // Main character's movement is controlled with the keyboard.
    // change character
    if (TagGame.taggedId === actor.id /*|| true*/) { // un-comment-out "|| true" to play as Alien
        // Have the "IT" player render as the alien.
        changeCharacterToAlien(actor);
        // Give IT better jumping/speed advantage.
        actor.jumpScaling = [1.1, 0.8];
    } else {
        // Non "IT" characters render as...
        //changeCharacterToMystery(actor);
        //changeCharacterToVictoria(actor);
        changeCharacterToCowbot(actor);
        actor.jumpScaling = [1, 0.7];
    }
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
            // falling damage
            if (actor.fallingUncontrolled) {
                damageSprite(actor, 1);
                actor.fallingUncontrolled = false;
            }
            //dust plume on landing
            if (actor.spawnDustOnGrounding) {
                addEffectJumpDust(actor.x, actor.y, actor.dustScale, actor.dustFps, 0);
                actor.spawnDustOnGrounding = false;
            }
            //run dust
            if (Math.abs(actor.vx) > actor.runDustSpeed && actor.noRunDustUntil <= now()) {
                addEffectRunDust(actor.x, actor.y);
                actor.noRunDustUntil = now() + actor.msBetweenRunDustPlumes;
            }
            if (actor.type === CHARACTER_COWBOT) {
                // cowbot's steam plume
                if (actor.noSteamPlumeUntil <= now() || !actor.noSteamPlumeUntil) { // the '|| !actor.SteamPlumeUntil' accomodates the first time this line is encountered, before actor.noSteamPlumeUntil is defined. Alternatively, it could be defined in the "changeCharacterTo..." function, but for now that's being called every frame, so that doesn't work.
                    var scale = Math.abs(actor.vx) + 2.33 / 4,
                    animationSpeedInFPS = 30 / scale,
                    steamVy = -Math.abs(actor.vx),
                    steamVx = 0;
                    addEffectSteamPlume(actor.x, actor.y - 66, steamVx, steamVy, scale, animationSpeedInFPS);    // WRONG: this should actor's sprite height instead of '66,' but I'm not sure how to call that. // WRONG: I'd like to be able to store this effect to be spawned on/as a parameter of the actor (defined in the changeCharacterTo... function), then just call that parameter here.
                    actor.msBetweenSteamPlumes = actor.msBetweenSteamPlumesBase / ((Math.abs(actor.vx) / 2.5) + 1);
                    actor.noSteamPlumeUntil = now() + actor.msBetweenSteamPlumes;
                }
            }
            // airDash resets on grounding
            actor.airDashed = false;
            actor.currentAirDashDuration = 0;
            actor.superJumped = false;
            // The player can crouch by pressing down while standing on solid ground.
            if (isKeyDown(KEY_DOWN)) {
                actor.isCrouching = true;
            } else if (actor.jumpKeyReleased && isKeyDown(KEY_UP)) {
                // The player will attempt to jump if they press the
                // jump key while on the ground and not crouching.
                actor.jump();
                // Spawns a dust plume on jumping from a grounded state.
                addEffectJumpDust(actor.x, actor.y, 2.5, 10, 0); // full-sized plume for ground jump
                if (actor.type === CHARACTER_COWBOT) addEffectSteamPlume(actor.x, actor.y - 66, 0, -10, 3, 7); // WRONG the '66' should be actor.hitBox.height, which I don't know how to call right now
            }
        } else {
            if (actor.vy >= actor.landingDustVyThreshold) actor.spawnDustOnGrounding = true;  //if the player's airborne vy exceeds 16, they'll spawn a dust plume on landing.
            if (actor.vy < actor.landingDustVyThreshold) actor.spawnDustOnGrounding = false; //if the player slows down again before touching down (i.e. double jumps to slow themselves), they don't spawn the plume.
            if (actor.vy >= actor.uncontrolledFallVyThreshold) actor.fallingUncontrolled = true;
            if (actor.vy < actor.uncontrolledFallVyThreshold) actor.fallingUncontrolled = false;
            actor.dustScale = (actor.vy + 9) / 10; // aiming for 2.5 when actor.vy = 16, and getting larger with higher vys
            actor.dustFps = (48 / actor.vy) + 7; //aiming for 10 when actor.vy = 16, and getting smaller with higher vys
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
                     // smaller, shorter-lived plume effect for air jump
                     // BROKEN: trying to fix bug where a plume spawns on triple-jump, even if there's no jump.
                     //     But if currentJumps < maxJumps, nothing spawns even on double jump,
                     //         and if currentJumps <= maxJumps, a plume spawns on triple jump.
                    if (actor.currentNumberOfJumps <= actor.maxJumps) addEffectJumpDust(actor.x, actor.y, 1.5, 15, 0);
                    if (actor.type === CHARACTER_COWBOT) addEffectSteamPlume(actor.x, actor.y - 66, 0, -10, 1.5, 11); // WRONG the '66' should be actor.hitBox.height, which I don't know how to call right now

                }
            } else if (isKeyDown(KEY_UP) && actor.currentJumpDuration < actor.maxJumpDuration) {
                // If the actor has not released the jump key since they started jumping,
                // the jump velocity will continue to be applied as long as they hold the jump key
                // until they hit the maxJumpDuration.
                actor.applyJumpVelocity();
                actor.currentJumpDuration++;
            }
            //air dash
            if (isKeyDown(KEY_RIGHT) && isKeyDown(KEY_SHIFT) && actor.currentAirDashDuration < actor.maxAirDashDuration && canCharacterAirDash(actor)) {
                actor.vx += actor.airDashMagnitude;
                actor.vy = 0;
                actor.currentAirDashDuration++;
                //addEffectJumpDust(actor.x - (actor.hitBox.width / 2), actor.x + (actor.hitBox.height / 2), 1.75, 15, 90); // BROKEN: trying to add horizontal dust plume to air dash, but neither the positioning nor rotation are working, and it's not too important, so I'm not worrying about it right now.
            }
            if (isKeyDown(KEY_LEFT) && isKeyDown(KEY_SHIFT) && actor.currentAirDashDuration < actor.maxAirDashDuration && canCharacterAirDash(actor)) {
                actor.vx -= actor.airDashMagnitude;
                actor.vy = 0;
                actor.currentAirDashDuration++;
            }
        }
        // super jump
            // super jump charging phase
        if (isKeyDown(KEY_SHIFT) && canCharacterSuperJump(actor) && actor.currentSuperJumpMagnitude < actor.maxSuperJumpMagnitude) {
            actor.superJumpCharged = true;
            actor.currentSuperJumpMagnitude++;
            actor.isCrouching = true;   // WRONG: this I think is overriding the .vx = 0, letting you move a little bit while charging. Maybe ok?
            actor.vy = 0;
            actor.vx = 0;
            var chargeEffectScale = 2 + (actor.currentSuperJumpMagnitude / 65);
            if (!doesArrayContainSuperJumpChargeWind(localSprites)) addEffectJumpWind(actor.x, actor.y, chargeEffectScale); //BROKEN: need to make this only happen when the last-spawned instance of this dies.
            if (actor.noSuperJumpChargeRingUntil <= now() || !actor.noSuperJumpChargeRingUntil) {
                addEffectJumpDust(actor.x, actor.y, 2.5, 9, 0);
                actor.noSuperJumpChargeRingUntil = now() + 250;
            }
        }
            // super jump jump phase
        if ((!isKeyDown(KEY_SHIFT) || actor.currentSuperJumpMagnitude >= actor.maxSuperJumpMagnitude) && actor.superJumpCharged) {
            actor.vy = -actor.currentSuperJumpMagnitude / 2.75;
            actor.superJumpCharged = false;
            actor.superJumped = true;
            actor.hasSuperJumpContrail = true;
            actor.currentSuperJumpMagnitude = 0;
            actor.superJumpKeyReleased = false;
        }
        if (!isKeyDown(KEY_SHIFT) && actor.superJumped) actor.superJumpKeyReleased = true;
            // super jump contrail
        if (actor.hasSuperJumpContrail) {
            if (actor.vy > 0) actor.hasSuperJumpContrail = false;   //WRONG: this isn't really a good condition by which to judge that your super jump is over.
            var contrailScale = -actor.vy / 10,
                contrailFPS = 200 / -actor.vy;
            if (actor.noSuperJumpContrailUntil <= now()) {
                addEffectJumpDust(actor.x, actor.y, contrailScale, contrailFPS, 0);
                actor.noSuperJumpContrailUntil = now() + (1500 / -actor.vy);
            }
        }
        var dx = 0;
        if (isKeyDown(KEY_LEFT)) dx--;
        if (isKeyDown(KEY_RIGHT)) dx++;
        if (actor.id === TagGame.taggedId) dx *= 1.2;
        if (actor.slipping) actor.vx += 0.1 * dx;
        else if (actor.isCrouching) actor.vx += dx / 2;
        else if (actor.grounded) actor.vx += dx;
        else actor.vx += dx / 1.5;
        actor.jumpKeyReleased = !isKeyDown(KEY_UP);
        if (!isKeyDown(KEY_SHIFT) && !actor.superJumped) actor.superJumpKeyReleased = true;
    }

    if (isPlayerCompelledByOctopusTouch(actor) && actor.grounded) {
        actor.vy -= 14;
    }



    // If the character is crouching, they are drawn smaller and have a shorter hitbox.
    if (actor.isCrouching ) {
        actor.scale = actor.scale / 2; // This affects visual representation only.
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
        actor.walkFrame = Math.floor(now() / (actor.slipping ? actor.msBetweenWalkFramesWhileSlipping : actor.msBetweenWalkFrames)) % actor.walkAnimation.frames.length;
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
        actor.idleFrame =  Math.floor(now() / (actor.slipping ? actor.msBetweenIdleFramesWhileSlipping : actor.msBetweenIdleFrames)) % actor.animation.frames.length;
        actor.currentFrame = actor.idleFrame;
    }

    // Rather than have the player get imperceptibly slower and slower, we just bring
    // them to a full stop once their speed is less than .5.
    if (!actor.slipping && Math.abs(actor.vx) < 0.5) actor.vx = 0;
    // gravity
    actor.vy++;

    if (!actor.attacking) {
        if (actor.vx) {
            actor.animation = actor.walkAnimation;
            actor.currentFrame = actor.walkFrame;
        }
    } else if (actor.vy < actor.uncontrolledFallVyThreshold) {  //can't attack during an uncontrolled fall
        actor.animation = actor.attackAnimation;
        actor.currentFrame = actor.attackFrame;
    }
    if (actor.x !== targetPosition[0]) {
        actor.xScale = (actor.x > targetPosition[0]) ? -1 : 1;
    }
    //jumping
    if (!actor.grounded && actor.vy < actor.uncontrolledFallVyThreshold) {
        actor.animation = actor.jumpAnimation;
        actor.jumpFrame =  Math.floor(now() / (actor.slipping ? 100 : 200)) % actor.animation.frames.length;
        actor.currentFrame = actor.jumpFrame;
    }
    // uncontrolled fall animation
    if (actor.vy >= actor.uncontrolledFallVyThreshold) {
        actor.animation = actor.uncontrolledFallAnimation;
        actor.uncontrolledFallFrame =  Math.floor(now() / (actor.slipping ? 100 : 200)) % actor.animation.frames.length;
        actor.currentFrame = actor.uncontrolledFallFrame;
    }
    // movement start animation. Originally used to make alien character spawn a teleportation effect after idling as sparkles for awhile.
    // The animation played here should be genericized.
    if (actor.vx || actor.vy !== 1) {
        actor.wasMoving = true;
    }
    if (!actor.vx && actor.vy === 1 && actor.wasMoving) {
        actor.hasIdledSince = now();
        actor.wasIdling = true;
        actor.wasMoving = false;
        // character "winks out" when they start idling
        //the animation played here should be genericized, but it's the alien's winkout effect for now.
        if (actor.type === CHARACTER_ALIEN) {
            if (actor.hasMovementStopAnimation) addEffectWinkOut(actor.x, actor.y);
        }
    }
    if (!actor.vx && actor.vy === 1 && actor.hasIdledSince < now() - 750) actor.hasIdledAwhile = true;
    if (actor.hasMovementStartAnimation && (actor.vx || actor.vy !== 1)) {
        // winking in when start moving/come out of idle
        if (actor.type === CHARACTER_ALIEN) {
            if (actor.wasIdling) addEffectWinkOut(actor.x, actor.y);
            // bigger teleport in on coming out of idle if have been idling for awhile.
            if (actor.hasIdledAwhile) addEffectTeleportation(actor.x, actor.y);
        }
        actor.hasIdledAwhile = false;
        actor.wasIdling = false;
    }
    // dies falling off of map
    if (actor.y - actor.hitBox.height > currentMap.tileSize * currentMap.height) {
        actor.health = 0;
    }
    // death
    if (actor === mainCharacter && actor.health <= 0 && !actor.deathTime) {
        actor.deathTime = now();
    }
    if (actor === mainCharacter && !actor.deathComplete && actor.deathTime && actor.deathTime < now() - 1000) {
        actor.deathComplete = true;
        if (actor.onDeathComplete) actor.onDeathComplete();
    }
    //prevents serial teleportation
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
    var hitBox = sprite.getHitBox ? sprite.getHitBox() : sprite.hitBox;
    if (!hitBox) {
        var frame = sprite.animation.frames[sprite.currentFrame];
        hitBox = frame.hitBox || frame.moveTo(0, 0);
    }
    return hitBox;
}

var getGlobalSpriteHitBox = (sprite) => getLocalSpriteHitBox(sprite).translate(sprite.x, sprite.y);

var canCharacterAirDash = (character) => character.currentActivatablePowerup === POWERUP_TYPE_AIRDASH && !character.airDashed;

var canCharacterSuperJump = (character) => character.currentActivatablePowerup === POWERUP_TYPE_SUPERJUMP && !character.superJumped && character.superJumpKeyReleased;



function isPlayerTouchingTeleporter(actor) {
    var globalHitBox = getGlobalSpriteHitBox(actor);
    // localSprites.filter(...) returns all the elements of localSprites that the function returns true for.
    var allTeleporters = localSprites.filter(sprite => sprite instanceof TeleporterTrigger);
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
    for (var column = leftColumn; column <= rightColumn; column++) {
        if (isTileX(topRow, column, TILE_SOLID * TILE_UP)) return true;
    }
    return false;
}

function moveSpriteInDirection(sprite, amount, direction) {
    var splits = Math.max(1, Math.ceil(2 * Math.abs(amount) / currentMap.tileSize));
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
                    if (sprite.vy > 0) sprite.vy *= 0.5;
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
    sprite.blinkUntil = sprite.invulnerableUntil = now() + 1000;
}

//this function should be a super-simple arrow function using .filter or indexOf or something
function doesArrayContainSuperJumpChargeWind(array) {
    for (var i = 0; i < array.length; i++) {
        if (array[i].type === EFFECT_JUMP_WIND) return true;
    }
    return false;
}

function changeCharacterToAlien(actor) {
    actor.walkAnimation = characterAlienWalkAnimation;
    actor.attackAnimation = characterAlienAttackAnimation;
    actor.hasMovementStartAnimation = true;
    actor.hasMovementStopAnimation = false;
    actor.idleAnimation = characterAlienIdleAnimation;
    actor.idleAnimationIntermittent = {};
    actor.idleAnimationLong = {};
    actor.jumpAnimation = characterAlienJumpAnimation;
    actor.uncontrolledFallAnimation = characterAlienUncontrolledFallAnimation;
    actor.uncontrolledLandingAnimation = {};
    actor.msBetweenWalkFrames = 200;
    actor.msBetweenWalkFramesWhileSlipping = actor.msBetweenWalkFrames / 2;
    actor.msBetweenIdleFrames = 200;
    actor.msBetweenIdleFramesWhileSlipping = actor.msBetweenIdleFrames;
    actor.scale = 1.75;
    actor.type = CHARACTER_ALIEN;
}

function changeCharacterToVictoria(actor) {
    actor.walkAnimation = characterVictoriaWalkAnimation;
    actor.attackAnimation = characterMysteryAttackAnimation;
    actor.hasMovementStartAnimation = false;
    actor.hasMovementStopAnimation = false;
    actor.idleAnimation = characterVictoriaIdleAnimation;
    actor.idleAnimationIntermittent = {};
    actor.idleAnimationLong = {};
    actor.jumpAnimation = characterVictoriaJumpAnimation;
    actor.uncontrolledFallAnimation = characterMysteryUncontrolledFallAnimation;
    actor.uncontrolledLandingAnimation = {};
    actor.msBetweenWalkFrames = 125;
    actor.msBetweenWalkFramesWhileSlipping = actor.msBetweenWalkFrames / 2;
    actor.msBetweenIdleFrames = 200;
    actor.msBetweenIdleFramesWhileSlipping = actor.msBetweenIdleFrames;
    actor.scale = 1.75;
    actor.type = CHARACTER_VICTORIA;
}

function changeCharacterToMystery(actor) {
    actor.walkAnimation = characterMysteryWalkAnimation;
    actor.attackAnimation = characterMysteryAttackAnimation;
    actor.hasMovementStartAnimation = false;
    actor.hasMovementStopAnimation = false;
    actor.idleAnimation = characterVictoriaIdleAnimation;
    actor.idleAnimationIntermittent = {};
    actor.idleAnimationLong = {};
    actor.jumpAnimation = characterVictoriaJumpAnimation;
    actor.uncontrolledFallAnimation = characterMysteryUncontrolledFallAnimation;
    actor.uncontrolledLandingAnimation = {};
    actor.msBetweenWalkFrames = 200;
    actor.msBetweenWalkFramesWhileSlipping = actor.msBetweenWalkFrames / 2;
    actor.msBetweenIdleFrames = 200;
    actor.msBetweenIdleFramesWhileSlipping = actor.msBetweenIdleFrames;
    actor.scale = 2;
    actor.type = CHARACTER_MYSTERY;
}

function changeCharacterToCowbot(actor) {
    actor.walkAnimation = characterCowbotWalkAnimation;
    actor.attackAnimation = characterCowbotAttackAnimation;
    actor.hasMovementStartAnimation = false;
    actor.hasMovementStopAnimation = false;
    actor.idleAnimation = characterCowbotIdleAnimation;
    actor.idleAnimationIntermittent = {};
    actor.idleAnimationLong = {};
    actor.jumpAnimation = characterCowbotJumpAnimation;
    actor.uncontrolledFallAnimation = characterCowbotUncontrolledFallAnimation;
    actor.uncontrolledLandingAnimation = {};
    actor.msBetweenWalkFrames = 150;
    actor.msBetweenWalkFramesWhileSlipping = actor.msBetweenWalkFrames / 2;
    actor.msBetweenIdleFrames = 150;
    actor.msBetweenIdleFramesWhileSlipping = actor.msBetweenIdleFrames;
    actor.scale = 1.5;
    actor.msBetweenSteamPlumesBase = 2000;   // modified by vx in udpates for Cowbot steam plume
    //actor.noSteamPlumeUntil = now();  //can't do this because changeCharacterTo... is getting called every frame, for now.
    actor.type = CHARACTER_COWBOT;
}
