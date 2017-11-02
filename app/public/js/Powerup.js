var powerupHeartImage = requireImage('/gfx/powerups/powerupHeart.png'),
    powerupAirDashImage = requireImage('/gfx/powerups/powerupAirDash.png');

class Powerup extends Trigger {

    render() {
        mainContext.save();
        // Draw the powerup transparent if it is currently on cooldown.
        if (this.isOnCooldown()) {
            mainContext.globalAlpha = .1;
        }
        var frame = getAnimationFrame(this.constructor.animation.frames, 5);
        draw.image(mainContext, frame.image, frame, this.getHitBox());
        mainContext.restore();
    }

    // The hitBox for powerups changes over time, this function gives the current
    // position of the hitbox.
    getHitBox() {
        var target = this.hitBox;
        // The powerup bobs up and down if the bobs flag is true.
        if (this.constructor.bobs) target = target.translate(0, 12 * Math.sin(now() / 300));
        // The powerup scales up and down if the pulses flag is true.
        if (this.constructor.pulses) target = target.scaleFromCenter(1 + 0.125 * Math.sin(now() / 200));
        return target;
    }

    renderPreview(target, startCoords, lastCoords) {
        var frame = getAnimationFrame(this.constructor.animation.frames, 5);
        draw.image(mainContext, frame.image, frame, target);
        if (selectedTrigger === this) {
            this.renderSelectedBox();
        }
    }

    renderHUD(target) {
        var frame = getAnimationFrame(this.constructor.animation.frames, 5);
        draw.image(mainContext, frame.image, frame, target);
    }
}
// Static fields need to be added to the class manually and can be read from this.constructor.staticProperty
Powerup.bobs = true;
Powerup.pulses = true;

class LifePowerup extends Powerup {
    trigger() {
        // The player can only collect a life powerup if they are missing health.
        if (mainCharacter.health >= mainCharacter.maxHealth) return false;
        mainCharacter.health++;
        // Returning true indicates that the powerup was consumed.
        return true;
    }
}
LifePowerup.animation = {frames: rectangleToFrames(new Rectangle(0, 0, 32, 32), powerupHeartImage, 1)};

class AirDashPowerup extends Powerup {
    constructor(hitBox, cooldownInSeconds, durationInSeconds) {
        super(hitBox, cooldownInSeconds);
        this.durationInSeconds = durationInSeconds;
    }

    trigger() {
        mainCharacter.canAirDashUntil = now() + this.durationInSeconds * 1000;
        return true;
    }
}
AirDashPowerup.animation = {frames: rectangleToFrames(new Rectangle(0, 0, 32, 32), powerupAirDashImage, 1)};

