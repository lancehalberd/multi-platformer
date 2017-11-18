var POWERUP_TYPE_AIRDASH = 'airDashPowerup';
var POWERUP_TYPE_HEART = 'heartPowerup';
var POWERUP_TYPE_SUPERJUMP = 'superJumpPowerup';
var POWERUP_TYPE_COIN = 'coinPowerup';

//should be moved to Beacon.js:
var BEACON_TYPE_SCORE_EXCITER = 'scoreExciterBeacon';
var BEACON_TYPE_SCORE_DEPRESSOR = 'scoreDepressorBeacon';


var BEACON_FALLOFF_CURVE_LINEAR = 'linearFalloffCurve'; // i.e. 1-to-1 relationship between distance and score boost
var BEACON_FALLOFF_CURVE_HARD = 'hardFalloffCurve'; // i.e. not much score at the edge, a lot more toward the center
var BEACON_FALLOFF_CURVE_SOFT = 'softFalloffCurve'; // i.e. lots of score at the edge, not much more as you get closer
//end hshould be moved to Beacon.js

var powerupHeartImage = requireImage('/gfx/powerups/powerupHeart.png'),
    powerupAirDashImage = requireImage('/gfx/powerups/powerupAirDash.png'),
    powerupSuperJumpImage = requireImage('/gfx/powerups/powerupSuperJump.png'),
    powerupCoinImage = requireImage('/gfx/powerups/powerupCoin.png'),
    scoreBeaconImage = requireImage('/gfx/powerups/beacon.png');

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

    renderHUD(context, target) {
        var frame = getAnimationFrame(this.constructor.animation.frames, 5);
        draw.image(context, frame.image, frame, target);
    }
}
// Static fields need to be added to the class manually and can be read from this.constructor.staticProperty
Powerup.bobs = true;
Powerup.pulses = true;

class LifePowerup extends Powerup {
    //this.type = POWERUP_TYPE_HEART; //where could this go?
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
    constructor(hitBox, cooldownInSeconds) {
        super(hitBox, cooldownInSeconds);
        this.type = POWERUP_TYPE_AIRDASH;
    }

    trigger() {
        mainCharacter.currentActivatableMobilityPowerup = POWERUP_TYPE_AIRDASH;
        return true;
    }
}
AirDashPowerup.animation = {frames: rectangleToFrames(new Rectangle(0, 0, 32, 32), powerupAirDashImage, 1)};

class CoinPowerup extends Powerup {
    constructor(hitBox, cooldownInSeconds) {
        super(hitBox, cooldownInSeconds);
        this.type = POWERUP_TYPE_COIN;
    }

    trigger() {
        // The tagged player may not collect coins.
        if (mainCharacter.id === TagGame.taggedId) return false;
        mainCharacter.coins = (mainCharacter.coins || 0) + 1;
        return true;
    }
}
CoinPowerup.animation = {frames: rectangleToFrames(new Rectangle(0, 0, 32, 32), powerupCoinImage, 14)};

class SuperJumpPowerup extends Powerup {
    constructor(hitBox, cooldownInSeconds) {
        super(hitBox, cooldownInSeconds);
        this.type = POWERUP_TYPE_SUPERJUMP;
    }

    trigger() {
        mainCharacter.currentActivatableMobilityPowerup = POWERUP_TYPE_SUPERJUMP;
        return true;
    }
}
SuperJumpPowerup.animation = {frames: rectangleToFrames(new Rectangle(0, 0, 32, 32), powerupSuperJumpImage, 1)};

//should be moved to Beacon.js:
class ScoreBeacon extends Powerup {
    constructor(hitBox, radius, maxScoreRate, falloff) {
        super(hitBox);
        this.radius = radius;
        this.maxScoreRate = 5;  // WRONG: making this 'maxScoreRate' seemed to be giving it the value of 'undefined,' even though 'this.radius = radius' seems to be working fine.
        this.falloff = falloff;
        this.bobs = false; //beacons shouldn't bob, just pulse.
        this.currentScoreRate = 0;
        if (this.maxScoreRate >= 0) this.type = BEACON_TYPE_SCORE_EXCITER;
        else this.type = BEACON_TYPE_SCORE_DEPRESSOR;
    }
    update() {
        var falloffFactor;
        if (this.falloff === BEACON_FALLOFF_CURVE_LINEAR) falloffFactor = 1;
        if (this.falloff === BEACON_FALLOFF_CURVE_HARD) falloffFactor = 2;
        if (this.falloff === BEACON_FALLOFF_CURVE_SOFT) falloffFactor = 0.5;
        var xDistanceToMainCharacter = mainCharacter.x - (this.hitBox.left + (this.hitBox.width / 2)),
            yDistanceToMainCharacter = mainCharacter.y - (this.hitBox.top + (this.hitBox.height / 2)),
            distanceToMainCharacter = Math.sqrt(xDistanceToMainCharacter * xDistanceToMainCharacter + yDistanceToMainCharacter * yDistanceToMainCharacter);
        if (distanceToMainCharacter < this.radius) {
            this.currentScoreRate = Math.round(Math.min(this.radius / (distanceToMainCharacter * falloffFactor), this.maxScoreRate));
        } else this.currentScoreRate = 0;
    }
}
ScoreBeacon.animation = {frames: rectangleToFrames(new Rectangle(0, 0, 32, 32), scoreBeaconImage, 1)};


// only used for checking if a beacon is already in the player's .beaconsInfluencing array. Probably a much simpler way to do this, like a .filter arrow function.
function isObjectInArray(array, object) {
    if (array.length === 0) return false;
    for (var i = 0; i < array.length; i++) {
        if (array[i] === object) return true;
    }
    return false;
}

function beaconsToMainCharacterArray() {
    for (var i = 0; i < localSprites.length; i++) {
        if ((localSprites[i].type === BEACON_TYPE_SCORE_EXCITER || localSprites[i].type === BEACON_TYPE_SCORE_DEPRESSOR) && !isObjectInArray(mainCharacter.beaconsInfluencing, localSprites[i])) {
            mainCharacter.beaconsInfluencing.push(localSprites[i]);
        }
    }
}
