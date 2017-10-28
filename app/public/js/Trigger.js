var TRIGGER_TYPE_FORCE = 'forceTrigger';
var TRIGGER_TYPE_SPAWN = 'spawnTrigger';
var TRIGGER_TYPE_TELEPORTER = 'teleporter'

var FORCE_AMP = 'playerVelocityMultiplied';
var FORCE_FIXED = 'fixedForceAddedToPlayer';

class Trigger {

    constructor(type, hitBox, cooldownInSeconds) {
        this.type = type;
        this.hitBox = hitBox;
        this.cooldownInSeconds = cooldownInSeconds;
        this.color = 'white';
        this.isTrigger = true;
    }

    isHittingMainCharacter() {
        return this.hitBox.overlapsRectangle(getGlobalSpriteHitBox(mainCharacter));
    }

    isOnCooldown() {
        return now() < this.onCooldownUntil;
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
        if (this.cooldownInSeconds) {
            this.onCooldownUntil = now() + this.cooldownInSeconds * 1000;
        }
        this.trigger();
    }

    trigger() {
        // This should be overriden by the specific trigger subclasses.
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
            mainContext.save();
            mainContext.globalAlpha = 1;
            mainContext.strokeStyle = 'white';
            mainContext.beginPath();
            draw.rectangle(mainContext, this.hitBox);
            mainContext.stroke();
            mainContext.restore();
        }
    }

    renderHUD(target) {
        draw.fillRectangle(mainContext, target, this.color);
    }
}

class ForceTrigger extends Trigger {
    constructor(hitBox, cooldownInSeconds, forceType, xForce, yForce) {
        super(TRIGGER_TYPE_FORCE, hitBox, cooldownInSeconds);
        this.forceType = forceType;
        this.xForce = xForce;
        this.yForce = yForce;
        this.color = 'purple';
    }

    clone() {
        return new ForceTrigger($.extend({}, this.hitBox),
            this.cooldownInSeconds, this.forceType, this.xForce, this.yForce
        );
    }

    trigger() {
        if (this.forceType === FORCE_AMP) {
            if (mainCharacter.vx) mainCharacter.vx *= this.xForce;
            if (mainCharacter.vy < 0) mainCharacter.vy *= this.yForce;    //doesn't speed falling
        } else if (this.forceType === FORCE_FIXED) {
            if (mainCharacter.vx) mainCharacter.vx += this.xForce;
            if (mainCharacter.vy) mainCharacter.vy += this.yForce;
        }
    }

    // Methods used by editor:
}

class SpawnTrigger extends Trigger {

    constructor(hitBox, cooldownInSeconds, spawnedObjectType, spawnX, spawnY) {
        super(TRIGGER_TYPE_SPAWN, hitBox, cooldownInSeconds);
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
        super(TRIGGER_TYPE_TELEPORTER, hitBox, cooldownInSeconds);
        this.destinationX = destinationX;
        this.destinationY = destinationY;
        this.color = 'blue';
    }

    clone() {
        return new TeleporterTrigger($.extend({}, this.hitBox),
            this.cooldownInSeconds, this.destinationX, this.destinationY
        );
    }

    trigger() {
        if (mainCharacter.canTeleport) {
            addTeleportationSprite(mainCharacter.x, mainCharacter.y);  // WRONG: this really isn't the right animation for this.
            mainCharacter.x = this.destinationX;
            mainCharacter.y = this.destinationY;
            mainCharacter.canTeleport = false;
            addTeleportationSprite(mainCharacter.x, mainCharacter.y);  // WRONG: this really isn't the right animation for this.
        }
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
            var frame = getAnimationFrame(fireballAnimation.frames, 5);
            // Draw a fireball clip where the fireball will spawn.
            draw.image(mainContext, frame.image, frame,
                Rectangle.defineByCenter(this.destinationX, this.destinationY, frame.width, frame.height)
            );
        }
    }

    renderHUD(target) {
        // We should update this to draw the spawned object eventually.
        var frame = getAnimationFrame(fireballAnimation.frames, 5);
        draw.image(mainContext, frame.image, frame, target);
    }
    /* Chris gave me this code to use as a reference for starting to srot out the teleporter's UI representation in the editor:
        renderHUD(target) {
       super.renderHUD(target);
       // We should update this to draw the spawned object eventually.
       var frame = getAnimationFrame(fireballAnimation.frames, 5);
       draw.image(mainContext, frame.image, frame, target);
   }*/    
}
