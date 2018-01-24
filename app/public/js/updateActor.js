var CHARACTER_VICTORIA = 'victoriaCharacter';
var CHARACTER_COWBOT = 'cowbotCharacter';
var CHARACTER_MYSTERY = 'mysteryCharacter';
var CHARACTER_ALIEN = 'alienCharacter';



function updateActor(actor) {
    beaconsToMainCharacterArray();  // running this every loop isn't necessary right now, but if 'beacons' come to include things that can spawn and die (which they may well), then this is a good place for this function call.
    if (actor.stuckUntil > now() || actor.changingZones) {
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
    actor.hitBox = actor.walkingHitBox;//Would be nice to slip into 2-tile-wide openings while falling pretty easily.
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
        changeCharacterToVictoria(actor);
        //changeCharacterToCowbot(actor);
        actor.jumpScaling = [1, 0.7];
    }
    // disabled behavior
    // checks to see if character is disabled and updates consequences of the disabling effect, including animations
    // WRONG: eventually will have to find a way to prioritize one disabliing effect over any other, though if they all make you invulnerable,
    //      and all places that can subject you to a disabling effect require that you be vulnerable, then maybe prioritizing them will never come up.
    if (isCharacterSubjectToDisablingEffect(actor)) actor.disabled = true;
    else actor.disabled = false;
    if (actor.disabled) {
        // uncontrolled fall behavior
        //      NOTE: good to put this before knocked down behavior in the disabled behavior section so that
        //          all the actor update behavior doesn't happen between the uncontrolled fall landing and the knock down.
        if (actor.fallingUncontrolled) {
            actor.invulnerable = true;
            if (actor.vy !== 1) actor.uncontrolledFallVyBeforeLanding = actor.vy; // the if (actor.vy !== 1) thing is kludgy, but I think it works fine.
        }
        // falling damage
        if (actor.fallingUncontrolled && actor.grounded) {
                damageSprite(actor, 1);
                actor.fallingUncontrolled = false;
                //actor.invulnerable = false; // this would be worth leaving if there wasn't an immediate knock down
                knockDown(actor, actor.uncontrolledFallVyBeforeLanding / 20);
                // WRONG need to add a knockdown effect on landing from an uncontrolled fall, including an animation speed decrease on the downed state and the standing up
                //      animation based on the player's speed at impact.
        }
        // end uncontrolled fall behavior

        // knock down behavior
        if (actor.knockedDown) {
            actor.invulnerable = true;
            if (!actor.grounded) {
               actor.animation = actor.knockDownAirborneAnimation;
                actor.knockDownAirborneFrame =  Math.floor(now() / 200) % actor.animation.frames.length;
                actor.currentFrame = actor.knockDownAirborneFrame;
                //actor.hitBox = actor.knockDownAnimationHitBox;
                actor.wasAirborne = true;
            }
            if (actor.grounded) {
                if (actor.wasAirborne || actor.wasJustKnockedDown) {
                    actor.vx *= 1.2; // makes player slide/skid after landing from a knockDown
                    actor.notReadyToStandUpUntil = now() + actor.msOnGroundAfterKnockDownBase * actor.timeOnGroundAfterKnockDownScale;
                    actor.wasAirborne = false;
                    actor.wasJustKnockedDown = false;
                    actor.justStartedStandingUp = true;
                    actor.animation = actor.knockDownGroundedAnimation;
                    actor.knockDownGroundedFrame =  Math.floor(now() / 200) % actor.animation.frames.length;
                    actor.currentFrame = actor.knockDownGroundedFrame;
                }
                if (actor.notReadyToStandUpUntil <= now() && actor.justStartedStandingUp) {
                    actor.justStartedStandingUp = false;
                    actor.justStoodUp = true;
                    actor.standingUpUntil = now() + 375 * actor.timeOnGroundAfterKnockDownScale;
                    actor.animation = actor.standingUpAnimation;
                    // WRONG animation timing will probably have to change once these animations have mulitiple frames.
                    actor.standingUpFrame =  Math.floor(now() / (200)) % actor.animation.frames.length;
                    actor.currentFrame = actor.standingUpFrame;
                    // WRONG: if you're not invulerable for a while *after* you regain control, you could get knocked down again immeeidately if a dog is hovering right on top of you, either because they're homing or just accidentally.
                    // I'll probably make it so that creatures that can disable you move away from you if you're disabled, but maybe I shouldn't rely on that exclusively?
                }
                if (actor.standingUpUntil <= now() && actor.justStoodUp) {
                    actor.justStoodUp = false;
                    actor.invulnerable = false;
                    actor.knockedDown = false;
                    actor.timeOnGroundAfterKnockDownScale = 1;
                }
            }
        }
        // end knock down behavior
    }
    // end disabled behavior

    if (actor === mainCharacter && !actor.deathTime && !isEditing && !actor.disabled) {
        // attacking behavior part 1. Attack if the space key is down.
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
            // air dash resets on grounding
            if (actor.airDashed) {
                actor.cannotAirDashUntil = now() + actor.airDashCooldownDuration;
                actor.airDashed = false;
            }
            // after grounding and cooldown, air dash key must be released before character can air dash again
            if (isKeyDown(KEY_SHIFT)) actor.currentAirDashDuration = actor.maxAirDashDuration + 1;
            else if (!isKeyDown(KEY_SHIFT) && actor.cannotAirDashUntil <= now()) actor.currentAirDashDuration = 0;
            // super jump resets on grounding
            actor.superJumped = false;
            // The player can crouch by pressing down while standing on solid ground.
            if (isKeyDown(KEY_DOWN)) {
                if (actor.jumpKeyReleased && isKeyDown(KEY_UP) && isPlayerOnOneWayGround(actor)) {
                    // The player will attempt to jump down through a one way tile.
                    if (actor.jumpDown()) {
                        // No animations during jumpDown action currently.
                    }
                } else {
                    actor.isCrouching = true;
                }
            } else if (actor.jumpKeyReleased && isKeyDown(KEY_UP)) {
                // The player will attempt to jump if they press the
                // jump key while on the ground and not crouching.
                if (actor.jump()) {
                    // Spawns a dust plume on jumping from a grounded state.
                    addEffectJumpDust(actor.x, actor.y, 2.5, 10, 0); // full-sized plume for ground jump
                    if (actor.type === CHARACTER_COWBOT) addEffectSteamPlume(actor.x, actor.y - 66, 0, -10, 3, 7); // WRONG the '66' should be actor.hitBox.height, which I don't know how to call right now
                }
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
                    // smaller, shorter-lived plume effect for air jump
                    if (actor.jump()) {
                        addEffectJumpDust(actor.x, actor.y, 1.5, 15, 0);
                        if (actor.type === CHARACTER_COWBOT) addEffectSteamPlume(actor.x, actor.y - 66, 0, -10, 1.5, 11); // WRONG the '66' should be actor.hitBox.height, which I don't know how to call right now
                    }
                }
            } else if (isKeyDown(KEY_UP) && actor.currentJumpDuration < actor.maxJumpDuration) {
                // If the actor has not released the jump key since they started jumping,
                // the jump velocity will continue to be applied as long as they hold the jump key
                // until they hit the maxJumpDuration.
                actor.applyJumpVelocity();
                actor.currentJumpDuration++;
            }
            // air dash
            if (isKeyDown(KEY_SHIFT) && canCharacterAirDash(actor)) {
                if (isKeyDown(KEY_LEFT) || isKeyDown(KEY_RIGHT)) {
                    // WRONG: this isn't quite going to handle all situations correctly when you start an air dash and then press the other direction while dashing
                    //      with regard to resetting the air dash on key release and cooling down and grounding
                    if (isKeyDown(KEY_LEFT)) {
                        actor.vx -= actor.airDashMagnitude;
                        actor.airDashDirectionKey = KEY_LEFT;
                    }
                    if (isKeyDown(KEY_RIGHT)) {
                        actor.vx += actor.airDashMagnitude;
                        actor.airDashDirectionKey = KEY_RIGHT;
                    }
                    actor.vy = 0;
                    actor.currentAirDashDuration++;
                    actor.airDashed = true;
                    // if an air dash interrupts a jump, the jump won't continue after the air dash stops
                    actor.currentJumpDuration = actor.maxJumpDuration;
                    //addEffectJumpDust(actor.x - (actor.hitBox.width / 2), actor.x + (actor.hitBox.height / 2), 1.75, 15, 90); // BROKEN: trying to add horizontal dust plume to air dash, but neither the positioning nor rotation are working, and it's not too important, so I'm not worrying about it right now.
                }
            }
            // if the actor ended an air dash while still in the air by releasing one of the air dash keys or by maxing out their air dash duration,
            if (actor.airDashed && (!isKeyDown(KEY_SHIFT) || !isKeyDown(actor.airDashDirectionKey) || actor.currentAirDashDuration > actor.maxAirDashDuration)) {
                // then the air dash cooldown starts
                // if neither the key is release nor the duration is maxed out while in the air, these things are reset on grounding.
                actor.cannotAirDashUntil = now() + actor.airDashCooldownDuration;
                actor.airDashed = false;
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
        actor.hitBox = actor.crouchingAnimationHitBox;
    }
    var targetPosition = [actor.x + 100 * actor.vx, actor.y];
    // attacking behavior
    if (actor.attacking) {
        actor.attackFrame = Math.floor((now() - actor.attackTime) / actor.attackAnimationMsPerFrame);
        // Autojump when the mouse is higher than the character.
        // if (actor.attackFrame === 1 && targetPosition[1] < groundY - 100) actor.jump();
        if (actor.attackFrame >= actor.attackAnimation.frames.length) {
            actor.attacking = false;
            actor.cannotAttackUntil = now() + actor.attackCooldownInMs;
        }
    }
    actor.stuck = false;
    if (actor.vx) {
        actor.walkFrame = Math.floor(now() / (actor.slipping ? actor.msBetweenWalkFramesWhileSlipping : actor.msBetweenWalkFrames)) % actor.walkingAnimation.frames.length;
    } else {
        actor.walkFrame = 0;
    }
    actor.slipping = false;
    actor.grounded = actor.grounded && (actor.vy === 0);

    moveSprite(actor, actor.vx, actor.vy);

    if (actor.grounded && !actor.vx && !actor.attacking && !actor.disabled) {
        actor.animation = actor.idlingAnimation;
        actor.idleFrame =  Math.floor(now() / (actor.slipping ? actor.msBetweenIdleFramesWhileSlipping : actor.msBetweenIdleFrames)) % actor.animation.frames.length;
        actor.currentFrame = actor.idleFrame;
    }

    // Rather than have the player get imperceptibly slower and slower, we just bring
    // them to a full stop once their speed is less than .5.
    if (!actor.slipping && Math.abs(actor.vx) < 0.5) actor.vx = 0;
    // gravity
    actor.vy++;

    if (actor.x !== targetPosition[0]) {
        actor.xScale = (actor.x > targetPosition[0]) ? -1 : 1;
    }
    // jumping behavior
    if (!actor.grounded && !actor.disabled && !actor.attacking) {
        actor.animation = actor.jumpingAnimation;
        actor.jumpFrame =  Math.floor(now() / (actor.slipping ? 100 : 200)) % actor.animation.frames.length;
        actor.currentFrame = actor.jumpFrame;
    }
    if (!actor.attacking) {
        if (actor.vx && !actor.disabled && actor.grounded) {
            actor.animation = actor.walkingAnimation;
            actor.currentFrame = actor.walkFrame;
        }
    // attacking animation and attacking behavior part 2
    } else if (!actor.disabled && actor.cannotAttackUntil <= now()) {
        actor.animation = actor.attackAnimation;
        actor.currentFrame = actor.attackFrame;
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
    var tile = currentMap.uniqueTiles[_.get(currentMap.composite, [row, column])];
    return tile && (tile.properties & property);
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

var canCharacterAirDash = (character) => character.currentActivatableMobilityPowerup === POWERUP_TYPE_AIR_DASH && character.cannotAirDashUntil <= now() && character.currentAirDashDuration <= character.maxAirDashDuration;

var canCharacterSuperJump = (character) => character.currentActivatableMobilityPowerup === POWERUP_TYPE_SUPERJUMP && !character.superJumped && character.superJumpKeyReleased;


// Check if a player is touching a trigger that telports it (Door or Teleporter).
// This is used to prevent a player from teleporting onto another teleporter.
function isPlayerTouchingTeleporter(actor) {
    var globalHitBox = getGlobalSpriteHitBox(actor);
    // localSprites.filter(...) returns all the elements of localSprites that the function returns true for.
    var allTeleporters = localSprites.filter(sprite => sprite instanceof TeleporterTrigger || sprite instanceof DoorTrigger);
    // allTeleporters.some(...) returns true if any of the elements return true for the given function.
    return allTeleporters.some(teleporter => teleporter.hitBox.overlapsRectangle(globalHitBox));
}

function isPlayerCompelledByOctopusTouch(character) {
    return character.compelledByOctopusTouch > now();
}

function isCharacterSubjectToDisablingEffect(character) {
    if (character.knockedDown) return true;
    if (character.stunnedUntil > now()) return true;
    if (character.grabbed) return true;
    if (character.launched) return true;
    if (character.bounced) return true;
    if (character.fallingUncontrolled) return true;
    return false;
}

function isPlayerUnderCeiling(player) {
    var hitBox = getGlobalSpriteHitBox(player),
        topRow = Math.floor(hitBox.top / currentMap.tileSize),
        leftColumn = Math.floor(hitBox.left / currentMap.tileSize),
        rightColumn = Math.floor((hitBox.right - 0.1) / currentMap.tileSize);
    for (var column = leftColumn; column <= rightColumn; column++) {
        if (isTileX(topRow, column, TILE_SOLID * TILE_UP)) return true;
    }
    return false;
}

function isPlayerOnOneWayGround(player) {
    var hitBox = getGlobalSpriteHitBox(player),
        bottomwRow = Math.floor((hitBox.bottom + 0.1) / currentMap.tileSize),
        leftColumn = Math.floor(hitBox.left / currentMap.tileSize),
        rightColumn = Math.floor((hitBox.right - 0.1) / currentMap.tileSize);
    for (var column = leftColumn; column <= rightColumn; column++) {
        // The player can jump down through ground as long as it is only
        // solid in one vertical direction.
        if (
            isTileX(bottomwRow, column, TILE_SOLID * TILE_DOWN) &&
            isTileX(bottomwRow, column, TILE_SOLID * TILE_UP)
        ) {
            return false;
        }
    }
    return true;

}

function moveSprite(sprite, dx, dy) {
    var splits = Math.max(1, Math.ceil(4 * Math.max(Math.abs(dy), Math.abs(dx)) / currentMap.tileSize));
    for (var i = 0; i < splits; i++) {
        var moved = false;
        if (dx) moved = moveSpriteInDirection(sprite, dx / splits, (dx < 0) ? TILE_LEFT : TILE_RIGHT) || moved;
        if (dy) moved = moveSpriteInDirection(sprite, dy / splits, (dy < 0) ? TILE_UP : TILE_DOWN) || moved;
        if (!moved) return false;
    }
    return true;
}
function moveSpriteInDirection(sprite, amount, direction) {
    var splits = Math.max(1, Math.ceil(2 * Math.abs(amount) / currentMap.tileSize));
    var amount = amount / splits;
    for (var i = 0; i < splits; i++) {
        sprite[directionToCoordinate[direction]] += amount;
        var hitBox = getGlobalSpriteHitBox(sprite);
        var leftColumn = Math.floor(hitBox.left / currentMap.tileSize);
        var rightColumn = Math.floor((hitBox.right - .1) / currentMap.tileSize);
        var topRow = Math.floor(hitBox.top / currentMap.tileSize);
        var bottomRow = Math.floor((hitBox.bottom - .1) / currentMap.tileSize);
        // Currently we only do collision checks against the edges of tiles, so skip checks if the character
        // is only moving through the middle of a tile.
        // The +/-1 is added because without it the player could slide through the wall when moving fractional
        // pixel amounts while sliding on ice. It is possible we could fix this by requiring only whole pixel
        // movement, but this solution seems to work for now.
        if (direction === TILE_UP && (hitBox.top % currentMap.tileSize) < currentMap.tileSize + amount - 1) {
            continue;
        }
        if (direction === TILE_DOWN && (hitBox.bottom % currentMap.tileSize) > amount + 1) {
            continue;
        }
        if (direction === TILE_LEFT && (hitBox.left % currentMap.tileSize) < currentMap.tileSize + amount - 1) {
            continue;
        }
        if (direction === TILE_RIGHT && (hitBox.right % currentMap.tileSize) > amount + 1) {
            continue;
        }
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
                    sprite.y = (topRow + 1) * currentMap.tileSize - getLocalSpriteHitBox(sprite).top;
                    break;
                case TILE_DOWN:
                    if (stop) {
                        sprite.vy = 0;
                        sprite.grounded = true;
                        sprite.currentNumberOfJumps = 0;
                    }
                    sprite.y = bottomRow * currentMap.tileSize - hitBox.height - getLocalSpriteHitBox(sprite).top;
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
    if ((sprite.invulnerableUntil && now() < sprite.invulnerableUntil) || (sprite.invulnerable && sprite.invulnerable === false)) return;
    sprite.health -= amount;
    sprite.blinkUntil = sprite.invulnerableUntil = now() + (sprite.invulnerableOnDamageDurationInMs || 1000);
}

function getDamageHitBox(sprite) {
    var currentFrame = sprite.getCurrentFrame();
    if (!currentFrame.damageHitBox) return null;
    var damageHitBox = currentFrame.damageHitBox;
    if ((sprite.scale || 1) !== 1 || (sprite.xScale || 1) !== 1 || (sprite.yScale || 1) !== 1) {
        damageHitBox = damageHitBox.stretch(
            (sprite.scale || 1) * (sprite.xScale || 1),
            (sprite.scale || 1) * (sprite.yScale || 1)
        ).snap();
    }
    return damageHitBox.translate(sprite.x, sprite.y);
}

//this function should be a super-simple arrow function using .filter or indexOf or something
function doesArrayContainSuperJumpChargeWind(array) {
    for (var i = 0; i < array.length; i++) {
        if (array[i].type === EFFECT_JUMP_WIND) return true;
    }
    return false;
}

function changeCharacterToAlien(actor) {
    actor.walkingAnimation = characterAlienWalkingAnimation;
    actor.attackAnimation = characterAlienAttackAnimation;
    actor.hasMovementStartAnimation = true;
    actor.hasMovementStopAnimation = false;
    actor.idlingAnimation = characterAlienIdlingAnimation;
    actor.idlingAnimationIntermittent = {};
    actor.idlingAnimationLong = {};
    actor.jumpingAnimation = characterAlienJumpingAnimation;
    actor.uncontrolledFallAnimation = characterAlienUncontrolledFallAnimation;
    actor.uncontrolledLandingAnimation = {};
    actor.msBetweenWalkFrames = 200;
    actor.msBetweenWalkFramesWhileSlipping = actor.msBetweenWalkFrames / 2;
    actor.msBetweenIdleFrames = 200;
    actor.msBetweenIdleFramesWhileSlipping = actor.msBetweenIdleFrames;
    actor.scale = 1.75;
    actor.type = CHARACTER_ALIEN;
    actor.knockDownAnimationHitBox = new Rectangle(-24, -20, 48, 20);
    actor.walkingAnimationHitBox = new Rectangle(-20, -60, 40, 60);
    actor.crouchingAnimationHitBox = new Rectangle(-20, -32, 40, 32);
}

function changeCharacterToVictoria(actor) {
    actor.currentActivatableMobilityPowerup = POWERUP_TYPE_AIR_DASH;
    actor.walkingAnimation = characterVictoriaWalkingAnimation;
    actor.attackAnimation = characterVictoriaAttackAnimation;
    actor.hasMovementStartAnimation = false;
    actor.hasMovementStopAnimation = false;
    actor.idlingAnimation = characterVictoriaIdlingAnimation;
    actor.idlingAnimationIntermittent = {};
    actor.idlingAnimationLong = {};
    actor.jumpingAnimation = characterVictoriaJumpingAnimation;
    actor.uncontrolledFallAnimation = characterMysteryUncontrolledFallAnimation;
    actor.uncontrolledLandingAnimation = {};
    actor.standingUpAnimation = characterVictoriaStandingUpAnimation;
    actor.knockDownAirborneAnimation = characterVictoriaKnockDownAirborneAnimation;
    actor.knockDownAnimationHitBox = new Rectangle(-24, -20, 48, 20);
    actor.walkingAnimationHitBox = new Rectangle(-20, -60, 40, 60);
    actor.crouchingAnimationHitBox = new Rectangle(-20, -32, 40, 32);
    actor.hitBox = actor.walkingAnimationHitBox;
    actor.knockDownGroundedAnimation = characterVictoriaKnockDownGroundedAnimation;
    actor.msBetweenWalkFrames = 125;
    actor.msBetweenWalkFramesWhileSlipping = actor.msBetweenWalkFrames / 2;
    actor.msBetweenIdleFrames = 200;
    actor.msBetweenIdleFramesWhileSlipping = actor.msBetweenIdleFrames;
    actor.attackAnimationMsPerFrame = 280;
    actor.scale = 1.75;
    //actor.scale = 2.125; // maybe this scale is better with Lee's ghost town tiles?
    actor.type = CHARACTER_VICTORIA;
}

function changeCharacterToCowbot(actor) {
    actor.currentActivatableMobilityPowerup = POWERUP_TYPE_SUPERJUMP;
    actor.walkingAnimation = characterCowbotWalkingAnimation;
    actor.attackAnimation = characterCowbotAttackAnimation;
    actor.hasMovementStartAnimation = false;
    actor.hasMovementStopAnimation = false;
    actor.idlingAnimation = characterCowbotIdlingAnimation;
    actor.idlingAnimationIntermittent = {};
    actor.idlingAnimationLong = {};
    actor.jumpingAnimation = characterCowbotJumpingAnimation;
    actor.uncontrolledFallAnimation = characterCowbotUncontrolledFallAnimation;
    actor.uncontrolledLandingAnimation = {};
    actor.msBetweenWalkFrames = 150;
    actor.msBetweenWalkFramesWhileSlipping = actor.msBetweenWalkFrames / 2;
    actor.msBetweenIdleFrames = 150;
    actor.msBetweenIdleFramesWhileSlipping = actor.msBetweenIdleFrames;
    actor.scale = 1.5;
    actor.msBetweenSteamPlumesBase = 2000;   // modified by vx in udpates for Cowbot steam plume
    //actor.noSteamPlumeUntil = now();  //can't do this because changeCharacterTo... is getting called every frame, for now.
    actor.knockBackInertiaScale = 0.6; // cowbot is heavy and doesn't get knocked back as easily as other characters
    actor.type = CHARACTER_COWBOT;
}

function changeCharacterToMystery(actor) {
    actor.walkingAnimation = characterMysteryWalkingAnimation;
    actor.attackAnimation = characterMysteryAttackAnimation;
    actor.hasMovementStartAnimation = false;
    actor.hasMovementStopAnimation = false;
    actor.idlingAnimation = characterVictoriaIdlingAnimation;
    actor.idlingAnimationIntermittent = {};
    actor.idlingAnimationLong = {};
    actor.jumpingAnimation = characterVictoriaJumpingAnimation;
    actor.uncontrolledFallAnimation = characterMysteryUncontrolledFallAnimation;
    actor.uncontrolledLandingAnimation = {};
    actor.msBetweenWalkFrames = 200;
    actor.msBetweenWalkFramesWhileSlipping = actor.msBetweenWalkFrames / 2;
    actor.msBetweenIdleFrames = 200;
    actor.msBetweenIdleFramesWhileSlipping = actor.msBetweenIdleFrames;
    actor.scale = 2;
    actor.type = CHARACTER_MYSTERY;
}
