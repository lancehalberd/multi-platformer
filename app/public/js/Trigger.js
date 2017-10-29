var FORCE_AMP = 'playerVelocityMultiplied';
var FORCE_FIXED = 'fixedForceAddedToPlayer';

class Trigger {

    constructor(hitBox, cooldownInSeconds) {
        this.hitBox = hitBox;
        this.cooldownInSeconds = cooldownInSeconds;
        this.color = 'white';
    }

    // This method can be defined on subclasses to give some dynamic behavior,
    // like bobbing and pulsing powerups.
    getHitBox() {
        return this.hitBox;
    }

    isHittingMainCharacter() {
        return this.getHitBox().overlapsRectangle(getGlobalSpriteHitBox(mainCharacter), false);
    }

    isOnCooldown() {
        return now() < this.onCooldownUntil;
    }

    putOnCooldown() {
        if (this.cooldownInSeconds) {
            this.onCooldownUntil = now() + this.cooldownInSeconds * 1000;
        }
    }

    update() {
        // Triggers currently do nothing while on cooldown.
        if (this.isOnCooldown()) {
            return;
        }
        // Trigger does nothing if the player for this client isn't overlapping it.
        if (!this.isHittingMainCharacter()) {
            return;
        }
        if (this.trigger() && this.cooldownInSeconds) {
            this.putOnCooldown();
            sendEntityOnCooldown(this.id);
        }
    }

    trigger() {
        // This should be overriden by the specific trigger subclasses.
        return false;
    }

    render() {
        mainContext.save();
        mainContext.globalAlpha = .4;
        draw.fillRectangle(mainContext, this.hitBox, this.color);
        mainContext.restore();
    }

    // Methods used by editor:
    setTarget(x, y) {
        // override this in sublcasses.
    }

    renderPreview(target, startCoords, lastCoords) {
        if (objectStartCoords) {
            var drawnRectangle = getDrawnRectangle(objectStartCoords, objectLastCoords, this.mapObject);
            draw.fillRectangle(mainContext, drawnRectangle.scale(currentMap.tileSize), this.color);
        } else {
            draw.fillRectangle(mainContext, target, this.color);
        }
        if (selectedTrigger === this) {
            this.renderSelectedBox();
        }
    }

    renderSelectedBox() {
        mainContext.save();
        mainContext.globalAlpha = 1;
        draw.strokeRectangle(mainContext, this.hitBox, 'white');
        mainContext.restore();
    }

    renderHUD(target) {
        draw.fillRectangle(mainContext, target, this.color);
    }
}

class ForceTrigger extends Trigger {
    constructor(hitBox, cooldownInSeconds, forceType, xForce, yForce) {
        super(hitBox, cooldownInSeconds);
        this.forceType = forceType;
        this.xForce = xForce;
        this.yForce = yForce;
        if (this.xForce < 1 && this.yForce < 1) this.color = 'green';
        else this.color = 'purple';
    }

    trigger() {
        if (this.forceType === FORCE_AMP) {
            if (mainCharacter.vx) mainCharacter.vx *= this.xForce;
            if (this.xForce < 1 && this.yForce < 1) mainCharacter.vy *= this.xForce; //if trigger is force dampening, falling is slowed
            else if (mainCharacter.vy < 0) mainCharacter.vy *= this.yForce;    // if trigger if force amp, it doesn't speed falling
        } else if (this.forceType === FORCE_FIXED) {
            if (mainCharacter.vx) mainCharacter.vx += this.xForce;
            if (mainCharacter.vy) mainCharacter.vy += this.yForce;
        }
        return true;
    }

    // Methods used by editor:
}

class SpawnTrigger extends Trigger {

    constructor(hitBox, cooldownInSeconds, spawnedObjectType, spawnX, spawnY) {
        super(hitBox, cooldownInSeconds);
        this.spawnedObjectType = spawnedObjectType;
        this.spawnX = spawnX;
        this.spawnY = spawnY;
        this.color = 'orange';
    }

    clone() {
        return new SpawnTrigger($.extend({}, this.hitBox),
            this.cooldownInSeconds, this.spawnedObjectType, this.spawnX, this.spawnY
        );
    }

    trigger() {
        if (this.spawnedObjectType === PROJECTILE_TYPE_HOMING_FIREBALL) {
            addHomingFireballSprite(this.spawnX, this.spawnY, mainCharacter);
        }
        return true;
    }

    // Methods used by editor:
    setTarget(x, y) {
        this.spawnX = x;
        this.spawnY = y;
    }

    renderPreview(target, startCoords, lastCoords) {
        super.renderPreview(target);
        if (selectedTrigger === this) {
            // We should update this to draw the spawned object eventually.
            var frame = getAnimationFrame(fireballAnimation.frames, 5);
            // Draw a fireball clip where the fireball will spawn.
            draw.image(mainContext, frame.image, frame,
                Rectangle.defineByCenter(this.spawnX, this.spawnY, frame.width, frame.height)
            );
        }
    }

    renderHUD(target) {
        // We should update this to draw the spawned object eventually.
        var frame = getAnimationFrame(fireballAnimation.frames, 5);
        draw.image(mainContext, frame.image, frame, target);
    }
}

class TeleporterTrigger extends Trigger {

    constructor(hitBox, cooldownInSeconds, destinationX, destinationY) {
        super(hitBox, cooldownInSeconds);
        this.destinationX = destinationX;
        this.destinationY = destinationY;
        this.color = 'blue';
    }

    trigger() {
        if (mainCharacter.canTeleport) {
            addEffectTeleportation(mainCharacter.x, mainCharacter.y);  // WRONG: this really isn't the right animation for this.
            mainCharacter.x = this.destinationX;
            mainCharacter.y = this.destinationY;
            mainCharacter.canTeleport = false;
            addEffectTeleportation(mainCharacter.x, mainCharacter.y);  // WRONG: this really isn't the right animation for this.
            mainCharacter.currentNumberOfJumps = 0;
            return true;
        }
        return false;
    }

    // Methods used by editor:
    setTarget(x, y) {
        this.destinationX = x;
        this.destinationY = y;
    }

    renderPreview(target, startCoords, lastCoords) {
        super.renderPreview(target);
        if (selectedTrigger === this) {
            // We should update this to draw the spawned object eventually.
            var frame = getAnimationFrame(portalAnimation.frames, 5);
            // Draw a fireball clip where the fireball will spawn.
            draw.image(mainContext, frame.image, frame,
                Rectangle.defineByCenter(this.destinationX, this.destinationY, frame.width * 2, frame.height * 2)
            );
        }
    }

    renderHUD(target) {
        // We should update this to draw the spawned object eventually.
        var frame = getAnimationFrame(portalAnimation.frames, 5);
        draw.image(mainContext, frame.image, frame, target);
    }
    /* Chris gave me this code to use as a reference for starting to sort out the teleporter's UI representation in the editor:
        renderHUD(target) {
       super.renderHUD(target);
       // We should update this to draw the spawned object eventually.
       var frame = getAnimationFrame(fireballAnimation.frames, 5);
       draw.image(mainContext, frame.image, frame, target);
   }*/
}
