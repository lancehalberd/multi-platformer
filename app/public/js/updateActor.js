function updateActor(actor) {
    // Friction. Air Friction is much lower than on the ground.
    if (actor.grounded) actor.vx *= 0.8;
    else actor.vx *= 0.9;
    if (!keysDown[KEY_UP]) {
        actor.currentJumpDuration = 0;
        actor.jumping = false;
    }
    // Main character's movement is controlled with the keyboard.
    if (actor === mainCharacter && !actor.deathTime){
        // Attack if the space key is down.
        if (isKeyDown(KEY_SPACE) && !actor.attacking) {
            actor.attacking = true;
            actor.attackTime = now();
            sendPlayerAttacked();
        }
        var dx = 0;
        if (actor.grounded) {   //player is on the ground
            if (!keysDown[KEY_UP]) {
                // Resetting jump on grounding if jump button has been released since last jump.
                actor.currentNumberOfJumps = 0;
                actor.jumpKeyReleased = false;
            }
            if (keysDown[KEY_LEFT]) dx--;
            if (keysDown[KEY_RIGHT]) dx++;
            if (keysDown[KEY_DOWN]) {
                // Crouched movement.
                // CROUCH IS MESSED UP: You can stand up even if a ceiling should prevent you from doing so.
                actor.crouched = true;
                actor.scale = 0.75;
                actor.hitBox = rectangle(-18, -31, 36, 31);
                actor.speed = 2;
            } else {
                // Standing up movement.
                actor.crouched = false;
                actor.scale = 1.5;
                actor.hitBox = rectangle(-18, -63, 36, 63);
                actor.speed = 7.5; //speed doesn't seem to scale how I'd expect it to. "8" wasn't really very slow, and "20" doesn't feel anywhere near 2.5 times that.
                if (keysDown[KEY_UP]) actor.jump(); //jump from grounded
            }
            actor.vx += dx * 1;
        } else {    //player is in the air/not grounded
            //double jump and limited air control
            if (actor.currentNumberOfJumps < actor.maxJumps && (!keysDown[KEY_UP])) {
                actor.jumpKeyReleased = true;
            }
            if (keysDown[KEY_LEFT]) dx--;
            if (keysDown[KEY_RIGHT]) dx++;
            if (keysDown[KEY_UP] && actor.jumpKeyReleased) actor.jump(); //double-jump/air jump
            actor.speed = 7.5;    //max speed in air
            actor.vx += dx / 1.5; //i.e. dx / 2 grants 1/2 of normal movement response in air control, 1.5 grants 2/3 of normal movement response in air control
        }
        if (actor.jumping === true && actor.currentJumpDuration <= actor.maxJumpDuration && (keysDown[KEY_UP])) {
            if (actor.currentNumberOfJumps <= 1) { //1st jump's magnitude isn't scaled down
                actor.vy = actor.jumpMagnitude;
            } else {
                actor.vy = actor.jumpMagnitude * actor.jumpScaling; //this implementation could be changed to trigger different jump magnitudes from grounded or air rather than from 1st and > 1st.
            }
            actor.currentJumpDuration++;
        }
    } else {
        // This player is handled remotely now.
        /*var dx = 0;
        if (targetPosition[0] + mainCharacter.hitBox.width < actor.x) dx--;
        else if (actor.x + actor.hitBox.width < targetPosition[0]) dx++;
        else if (!actor.attacking) {
            actor.attacking = true;
            actor.attackTime = now();
        }
        if (actor.y > targetPosition[1]) actor.jump();
        actor.vx += dx;*/
    }
    var maxSpeed = actor.speed;
    actor.vx = Math.min(Math.max(actor.vx, -maxSpeed), maxSpeed);
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
        moveDown(actor, actor.vy);
    }

    actor.vy++;
    if (!actor.grounded) {
        actor.jumpTime = now();
    }
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
                if (sprite.vy < 8) sprite.vy = 0;
                else sprite.vy = Math.min(-13, -1 * sprite.vy);
                sprite.y = targetRow * currentMap.tileSize;
                sprite.numberOfJumps = 0;
                return false;
            } else if (isTileX(targetRow, column, TILE_SOLID_DOWN)) {
                sprite.vy = 0;
                sprite.y = targetRow * currentMap.tileSize;
                sprite.grounded = true;
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
