function updateActor(actor) {
    // Monsters target the player.
    var targetPosition = [mainCharacter.x, mainCharacter.y];
    if (actor.grounded) {
        actor.vx *= 0.8;
    } else { //prevents player from speeding up in the air
        actor.vx *= 0.9;
    }
    // The player targets the mouse.
    if (actor === mainCharacter){
        // This is the position of the mouse relative to the canvas.
        targetPosition = relativeMousePosition(mainCanvas);
        targetPosition[0] += cameraX;
        targetPosition[1] += cameraY;

        // Attack if the mouse is down.
        if (mouseDown && !actor.attacking) {
            actor.attacking = true;
            actor.attackTime = now();
        }
        // Main character's movement is controlled with the keyboard.
        if (actor.grounded) {
            if (!keysDown[KEY_UP]) {
                actor.numberOfJumps = 0;   //resetting jump on grounding if jump button has been released since last jump
                actor.jumpKeyReleased = false;
            }
            var dx = 0;
            if (keysDown[KEY_LEFT]) dx--;
            if (keysDown[KEY_RIGHT]) dx++;
            if (keysDown[KEY_DOWN]) {   //if the player is crouched
                //CROUCH IS MESSED UP: You can stand up even if a ceiling should prevent you from doing so
                actor.crouched = true;
                actor.scale = 0.75;
                actor.hitBox = rectangle(-18, -31, 36, 31);
                actor.speed = 2.5;
            } else {    //if the player is standing
                actor.crouched = false;
                actor.scale = 1.5;
                actor.hitBox = rectangle(-18, -63, 36, 63);
                actor.speed = 20; //speed doesn't seem to scale how I'd expect it to. "8" wasn't really very slow, and "20" doesn't feel anywhere near 2.5 times that.
                if (keysDown[KEY_UP] && actor.numberOfJumps === 0) actor.jump();
            }
            actor.vx += dx * 2; //tweak grounded acceleration with multiplier
        } else {    //double jump and limited air control
            dxair = 0;
            if (actor.numberOfJumps === 1 && (!keysDown[KEY_UP])) actor.jumpKeyReleased = true;
            if (keysDown[KEY_LEFT]) dxair--;
            if (keysDown[KEY_RIGHT]) dxair++;
            if (keysDown[KEY_UP] && actor.numberOfJumps <= 1 && actor.jumpKeyReleased) actor.jump(); //double-jump
            actor.speed = 20    //max speed in air
            actor.vx += dxair / 1.5; //i.e. dx / 2 grants 1/2 of normal movement response in air control, 1.5 grants 2/3 of normal movement response in air control
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
    if (actor.attacking) maxSpeed /= 2;
    //if (actor.vx * actor.xScale < 0) maxSpeed /= 2; //commented out to let the player move at full speed backwards (i.e. not have basic movement be mouse-dependent)
    actor.vx = Math.min(Math.max(actor.vx, -maxSpeed), maxSpeed);
    if (Math.abs(actor.vx) < .5) actor.vx = 0;

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
        if (actor.grounded && actor.x !== targetPosition[0]) {
            actor.xScale = (actor.x > targetPosition[0]) ? -1 : 1;
        }
    } else {
        actor.animation = actor.attackAnimation;
        actor.currentFrame = actor.attackFrame;
    }
}


function isTileSolid(row, column) {
    return _.get(currentMap.composite, [row, column, 'properties']) & TILE_SOLID;
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
            if (isTileSolid(row, targetColumn)) {
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
            if (isTileSolid(row, targetColumn)) {
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
            if (isTileSolid(targetRow, column)) {
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
            if (isTileSolid(targetRow, column)) {
                sprite.vy = 0;
                sprite.y = targetRow * currentMap.tileSize;
                sprite.grounded = true;
                return false;
            }
        }
    }
    return true;
}
