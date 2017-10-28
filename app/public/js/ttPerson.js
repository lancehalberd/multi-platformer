var ttPersonFrames = 5;
var ttPersonRows = 3;
var ttMonsterPersonRows = 3;
var ttHairRows = 6;
var clothes = [1, 3];
var equipmentSlots = ['weapon', 'body', 'feet', 'head', 'offhand', 'arms', 'legs', 'back', 'ring'];
var hair = [clothes[1] + 1, clothes[1] + 4];
var arm = {slot: 'arms', column: 1},
    hand = {slot: 'ring', column: 1},
    body = {slot: 'body', column: 0},
    head = {slot: 'head', column: 0},
    feet = {slot: 'feet', column: 2},
    legs = {slot: 'legs', column: 2};
// equipmentSource function must be declared before the contents of: armor.js, weapons.js, accessories.js
var equipmentSource = (type, row) => ({slot: type.slot, xOffset: type.column * 32, yOffset: row * 64});
var hideHair = (source) => {source.hideHair = true; return source;}
var equipmentSources = {
    // Pirate <3
    'strawHat': equipmentSource(head, 2),
    'vest': equipmentSource(body, 3),
    'shorts': equipmentSource(legs, 2),
    'sandals': equipmentSource(feet, 3),
    // Knight
    'heavyHelmet': hideHair(equipmentSource(head, 1)),
    'heavyShirt': equipmentSource(body, 0),
    'heavySleeves': equipmentSource(arm, 0),
    'heavyPants': equipmentSource(legs, 0),
    'heavyBoots': equipmentSource(feet, 1),
    // Wizard
    'wizardHat': equipmentSource(head, 9),
    'wizardRobe': equipmentSource(body, 10),
    'wizardSleeves': equipmentSource(arm, 10),
    'wizardPants': equipmentSource(legs, 9),
    'wizardSandals': equipmentSource(feet, 10),
    // Peter Pan
    'featherCap': equipmentSource(head, 12),
    'leatherVest': equipmentSource(body, 13),
    'leatherLongGloves': equipmentSource(arm, 12),
    'leatherPants': equipmentSource(legs, 12),
    'leatherBoots': equipmentSource(feet, 13),
    // Chainmail
    'chainmailHelm': equipmentSource(head, 17),
    'chainmailShirt': equipmentSource(body, 18),
    'chainmailSleeves': equipmentSource(arm, 18),
    'chainmailSkirt': equipmentSource(legs, 17),
    'chainmailGloves': equipmentSource(hand, 17),
    // Robes
    'blueRobe': equipmentSource(body, 6),
    'purpleRobe': equipmentSource(body, 7),
    // Other Hats
    'devilHelmet': equipmentSource(head, 4),
    'oversizedHelmet': equipmentSource(head, 5),
    'hood': equipmentSource(head, 14),
    // Other Shoes
    'redShoes': equipmentSource(feet, 5),
    // Other Gloves
    'leatherGloves': equipmentSource(hand, 6),
    // Accesories
    'bracelet': equipmentSource(hand, 1),
    'ring': equipmentSource(hand, 11),
};
var weaponSource = row => ({slot: 'weapon', yOffset: row * 64});
var weaponSources = {
    // Weapons
    //'wand': weaponSource(0),
    //'bow': weaponSource(1),
    'sword': weaponSource(2),
    'greatSword': weaponSource(3),
    'dagger': weaponSource(4),
    //'ball': weaponSource(5),
    'rock': weaponSource(6),
    'staff': weaponSource(7),
    'axe': weaponSource(8),
    'bigAxe': weaponSource(9),
};

var hairImageSource = requireImage('/gfx/person/hair.png'),
    equipmentImageSource = requireImage('/gfx/person/equipment.png'),
    weaponsImageSource = requireImage('/gfx/person/weapons.png');

// Create an actor sprite given the specified base image, row(usually skin tone), hair type and equipment set.
function createEquippedActorSource(baseImage, row, hairIndex, equipmentSourcesArray) {
    // Conver the sources array into a single object. This will overwrite any sources that use the same slot.
    var equipmentSources = {};
    for (equipmentSource of equipmentSourcesArray) {
        equipmentSources[equipmentSource.slot] = equipmentSource;
    }
    var actorCanvas = createCanvas(ttPersonFrames * 96, 64);
    var actorContext = actorCanvas.getContext('2d');
    actorContext.imageSmoothingEnabled = false;
    for (var frame = 0; frame < ttPersonFrames; frame++) {
        var targetRectangle = new Rectangle(frame * 96 + 32, 0, 32, 64);
        // Draw the person legs then body then hair then under garment then leg gear then body gear.
        draw.image(actorContext, baseImage, new Rectangle(frame * 96 + 64, row * 64 , 32, 64), targetRectangle); //legs
        draw.image(actorContext, baseImage, new Rectangle(frame * 96, row * 64 , 32, 64), targetRectangle); //body
        if (!equipmentSources.head || !equipmentSources.head.hideHair) {
            draw.image(actorContext, hairImageSource, new Rectangle(frame * 96, hairIndex * 64, 32, 64), targetRectangle); // hair
        }
        // draw feet then legs (offset 64) then body then head gear (offset 0).
        for (var subX of [64, 0]) {
            for (var equipmentSlot of equipmentSlots) {
                var source = equipmentSources[equipmentSlot];
                if (!source || source.xOffset !== subX) continue;
                draw.image(actorContext, equipmentImageSource, new Rectangle(frame * 96 + source.xOffset, source.yOffset, 32, 64), targetRectangle);
            }
        }
        // Draw the weapon under the arm.
        if (equipmentSources.weapon) {
            var source = equipmentSources.weapon;
            draw.image(actorContext, weaponsImageSource, new Rectangle(frame * 96, source.yOffset, 96, 64), new Rectangle(frame * 96, 0, 96, 64));
        }
        // Draw the person arm then arm gear.
        draw.image(actorContext, baseImage, new Rectangle(frame * 96 + 32, row * 64 , 32, 64), targetRectangle); // arm
        // draw arm+hands gear (offset 32).
        for (var equipmentSlot of equipmentSlots) {
            var source = equipmentSources[equipmentSlot];
            if (!source || source.xOffset !== 32) continue; // don't draw this if it isn't arm/hands gear
            draw.image(actorContext, equipmentImageSource, new Rectangle(frame * 96 + source.xOffset, source.yOffset, 32, 64), targetRectangle);
        }
    }
    return actorCanvas;
}

class TTCharacter {
    constructor(actorCanvas, skin, hair, weapon) {
        this.canvas = actorCanvas;
        this.x = 200;
        this.y = 800;
        this.currentFrame = 0;
        this.scale = 1.5; //this is defined in the input area of updateActor.js, regarding crouching and standing. It might be good to separate xScale and yScale.
        this.speed = 0; //this is defined in the input area of updateActor.js, regarding crouching and standing.
        this.vx = this.vy = 0;
        this.grounded = false;
        this.hitBox = new Rectangle(-18, -63, 36, 63);
        //this.walkAnimation = characterMysteryWalkAnimation();
        this.walkAnimation = characterAlienWalkAnimation();
        this.hasMovementStartAnimation = true;
        //this.movementStartAnimation = addEffectTeleportation();   //BROKEN. placeholder that doesn't do anything. Right now any character with "hasMovementStartAnimation" spawns a teleporter effect (see updateActor.js) if they move after idling for 750ms or more.
        //this.attackAnimation = characterMysteryAttackAnimation();
        //this.idleAnimation = characterMysteryIdleAnimation();
        this.idleAnimation = characterAlienIdleAnimation();
        this.idleAnimationIntermittent = {};    //to be filled in with an occasional action during idling. At random, longish intervals.
        this.idleAnimationLong = {}; //to be filled in with what the character does when they've been idling for a long time
        this.jumpAnimation = characterAlienJumpAnimation();
        //this.jumpAnimation = characterMysteryJumpAnimation();
//        this.uncontrolledFallAnimation = characterAlienUncontrolledFallAnimation();
        this.uncontrolledFallAnimation = characterMysteryUncontrolledFallAnimation(); //fireball animation is fun, like you're a meteor. Something like that might actually work. Or might turn face-down with flailing limbs, setting up for a face plant.
        this.uncontrolledLandingAnimation = {}; //i.e. faceplant, followed by standing-up frames wherein the player can't move. Maybe takes damage.
        this.animation = this.walkAnimation;
        this.skin = skin;
        this.hair = hair;
        this.currentJumpDuration = 0; //to track how long the jump button has been held down, and so how high to jump
        this.maxJumpDuration = 8; //how long holding the jump button down will keep providing "upward thrust" during a jump. In frames.
        this.jumpMagnitude = -9; //how much upward thrust, per frame, the jump button produces.
        this.currentNumberOfJumps = 0; //to count jumps to make double-jumping work
        this.maxJumps = 2; //i.e. single-jump capable = 1, double-jump capable = 2 etc.
        this.jumpScaling = [1, 0.7]; //jumps after the first have jumpMagnitude * jumpScaling
        this.jumpKeyReleased = false;  //so you have to release the jump key before a double-jump can be triggered.
        this.airDashed = false; //if player has airDashed, they won't be able to airDash again until after they've grounded.
        this.isCrouching = false; //is crouched or not
        this.weapon = weapon;
        this.color = 'white';
    }

    jump() {
        if (this.currentNumberOfJumps < this.maxJumps) {
            this.currentNumberOfJumps++;
            this.currentJumpDuration = 0;
            // jumping resets vertical velocity.
            this.vy = 0;
            this.applyJumpVelocity();
        }
    }


    // Apply the jump velocity to the actor for a single frame.
    applyJumpVelocity() {
        // The jumpScaling value gets smaller for jumps in the air.
        var scalingIndex = Math.min(Math.max(0, this.currentNumberOfJumps - 1), this.jumpScaling.length - 1);
        // We use the Math.min here because holding/pressing jump should never slow your ascent. For example,
        // if you are bouncing very quickly up, holding up should not slow you down.
        this.vy = Math.min(this.vy, this.jumpMagnitude * this.jumpScaling[scalingIndex]);
    }

    update() {
        updateActor(this);
    }

    render() {
        mainContext.save();
        if (this.deathTime) {
            // The player fades to invisible before respawning when they die.
            mainContext.globalAlpha = Math.max(0, 1 - (now() - this.deathTime) / 1000);
        } else if (this.invulnerableUntil > now() || this.untaggableUntil > now()) {
            // The character flashes transparent when they are invulnerable.
            mainContext.globalAlpha = Math.cos((this.invulnerableUntil - now()) / 10) / 8 + 0.6;
        }
        drawSprite(mainContext, this);
        mainContext.restore();
    }

    renderFrame(context, frame, target) {
        if (taggedId === this.id) {
            var frame = getAnimationFrame(fireballAnimation.frames, 5);
        }
        draw.solidTintedImage(context, frame.image, this.color, frame, target);
        draw.image(context, frame.image, frame.translate(0, frame.height), target);
    }
}



var humanImage = requireImage('/gfx/person/personSprite.png'),
    characterMysteryImage = requireImage('/gfx/person/characterMystery.png'),
    characterAlienImage = requireImage('/gfx/person/characterAlien.png');

var mainCharacter;
var otherCharacters = {};
function walkAnimation(actorCanvas) {
    var hitBox = new Rectangle(36, 18, 24, 42);
    var neutralFrame = $.extend(new Rectangle(0, 0, 96, 64), {image: actorCanvas, hitBox});
    var stepRight = $.extend(new Rectangle(96, 0, 96, 64), {image: actorCanvas, hitBox});
    var stepLeft = $.extend(new Rectangle(192, 0, 96, 64), {image: actorCanvas, hitBox});
    return {frames: [neutralFrame, stepRight, neutralFrame, stepLeft]};
}

function characterMysteryWalkAnimation() {
    frames = rectangleToFrames(new Rectangle(0, 0, 32, 32), characterMysteryImage, 4);
    return {frames};
}

function characterMysteryUncontrolledFallAnimation() {
    var xSize = 32,
    ySize = 32,
    hitBox = new Rectangle(0, -64, 64, 64),
    frames = [
        $.extend(new Rectangle(0 * xSize, 0 * ySize, xSize, ySize), {image: fireballBImage, hitBox}),
        $.extend(new Rectangle(1 * xSize, 0 * ySize, xSize, ySize), {image: fireballBImage, hitBox}),
        $.extend(new Rectangle(2 * xSize, 0 * ySize, xSize, ySize), {image: fireballBImage, hitBox}),
        $.extend(new Rectangle(3 * xSize, 0 * ySize, xSize, ySize), {image: fireballBImage, hitBox}),
        $.extend(new Rectangle(4 * xSize, 0 * ySize, xSize, ySize), {image: fireballBImage, hitBox})
    ];
    return {frames};
}

function characterMysteryJumpAnimation() {
    var xSize = 32,
    ySize = 32,
    hitBox = new Rectangle(-4, -32, 40, 64),
    frames = [
        $.extend(new Rectangle(0 * xSize, 0 * ySize, xSize, ySize), {image: characterMysteryImage, hitBox}),
    ];
    return {frames};
}

function characterMysteryIdleAnimation() {
    frames = rectangleToFrames(new Rectangle(0, 0, 32, 32), characterMysteryImage, 8).slice(4, 8);
    return {frames};
}

function characterAlienWalkAnimation() {
    var xSize = 32,
    ySize = 36,
    hitBox = new Rectangle(-4, -24, 40, 60),
    frames = [
        $.extend(new Rectangle(0 * xSize, 0 * ySize, xSize, ySize), {image: characterAlienImage, hitBox}),
        $.extend(new Rectangle(1 * xSize, 0 * ySize, xSize, ySize), {image: characterAlienImage, hitBox}),
        $.extend(new Rectangle(2 * xSize, 0 * ySize, xSize, ySize), {image: characterAlienImage, hitBox}),
        $.extend(new Rectangle(4 * xSize, 0 * ySize, xSize, ySize), {image: characterAlienImage, hitBox}),
        $.extend(new Rectangle(5 * xSize, 0 * ySize, xSize, ySize), {image: characterAlienImage, hitBox}),
        $.extend(new Rectangle(6 * xSize, 0 * ySize, xSize, ySize), {image: characterAlienImage, hitBox}),
        $.extend(new Rectangle(7 * xSize, 0 * ySize, xSize, ySize), {image: characterAlienImage, hitBox}),
        $.extend(new Rectangle(8 * xSize, 0 * ySize, xSize, ySize), {image: characterAlienImage, hitBox})
    ];
    return {frames};
}

function characterAlienIdleAnimation() {
    var sourceRectangle = new Rectangle(0, 0, 32, 32);
    var frames = rectangleToFrames(sourceRectangle, teleporterAImage, 24).slice(9, 23);
    var target = sourceRectangle.scale(3);
    return {frames};
}

function characterAlienJumpAnimation() {
    var xSize = 32,
    ySize = 36,
    hitBox = new Rectangle(-4, -24, 40, 60),
    frames = [
        $.extend(new Rectangle(1 * xSize, 0 * ySize, xSize, ySize), {image: characterAlienImage, hitBox}),
    ];
    return {frames};
}

function characterAlienUncontrolledFallAnimation() {
    var xSize = 32,
    ySize = 36,
    hitBox = new Rectangle(-4, -24, 40, 60),
    frames = [
        $.extend(new Rectangle(6 * xSize, 0 * ySize, xSize, ySize), {image: fireballBImage, hitBox}),
        $.extend(new Rectangle(1 * xSize, 0 * ySize, xSize, ySize), {image: characterAlienImage, hitBox}),
    ];
    return {frames};
}

function attackAnimation(actorCanvas) {
    var hitBox = new Rectangle(36, 18, 24, 42);
    var neutralFrame = $.extend(new Rectangle(0, 0, 96, 64), {image: actorCanvas, hitBox});
    var prepareFrame = $.extend(new Rectangle(96 * 3, 0, 96, 64), {image: actorCanvas, hitBox});
    var attackFrame = $.extend(new Rectangle(96 * 4, 0, 96, 64), {image: actorCanvas, hitBox});
    return {frames: [prepareFrame, attackFrame, prepareFrame, neutralFrame]};
}

function characterMysteryAttackAnimation() {
        var xSize = 32,
        ySize = 32,
        hitBox = new Rectangle(0, -32, 40, 64),
        frames = [
            $.extend(new Rectangle(0 * xSize, 0 * ySize, xSize, ySize), {image: fireballBImage, hitBox}),
            $.extend(new Rectangle(1 * xSize, 0 * ySize, xSize, ySize), {image: fireballBImage, hitBox}),
            $.extend(new Rectangle(2 * xSize, 0 * ySize, xSize, ySize), {image: fireballBImage, hitBox}),
            $.extend(new Rectangle(3 * xSize, 0 * ySize, xSize, ySize), {image: fireballBImage, hitBox}),
            $.extend(new Rectangle(4 * xSize, 0 * ySize, xSize, ySize), {image: fireballBImage, hitBox})
        ];
        return {frames};
}

function initializeTTCharacter(playerData) {
    var actorCanvas = createEquippedActorSource(humanImage, playerData.skin, playerData.hair,
        [equipmentSources.leatherVest, equipmentSources.leatherPants, equipmentSources.leatherBoots, weaponSources[playerData.weapon]]
    );
    var character = new TTCharacter(actorCanvas, playerData.skin, playerData.hair, playerData.weapon);
    for (var i in playerData) character[i] = playerData[i];
    return character;
}
function initializePersonGraphics() {
    var skin = Random.range(0, ttPersonRows - 1);
    var hair = Random.range(0, ttHairRows - 1);
    var weapon = Random.element(Object.keys(weaponSources));
    mainCharacter = initializeTTCharacter({skin, hair, weapon});
    mainCharacter.health = 5;
    mainCharacter.maxHealth = 5;
    mainCharacter.originalX = mainCharacter.x;
    mainCharacter.originalY = mainCharacter.y;
    mainCharacter.invulnerableUntil = now();
    mainCharacter.uncontrolledFallVyThreshold = 30;
    mainCharacter.canTeleport = true;
    mainCharacter.landingDustVyThreshold = 16; //vy at/over which the player will produce a landing dust plume on touchdown
    mainCharacter.runDustSpeed = 3; // vx over which player will spawn dust plumes behing them
    mainCharacter.msBetweenRunDustPlumes = 200;  // ms between spawned dust plumes when player is running.
    mainCharacter.noRunDustUntil = now();   // for knowing when to spawn a new run dust plume
    mainCharacter.onDeathComplete = function () {
        this.health = this.maxHealth;
        this.x = this.originalX;
        this.y = this.originalY;
        this.vx = this.vy = 0;
        this.deathComplete = false;
        this.invulnerableUntil = now() + 2000;
        delete this.deathTime;
        sendPlayerMoved();
        sendTaggedPlayer(publicId);
    };
    // zoneId is set globally on page load by the server based on the current route. For instance /zones/spikePit will set zoneId to 'spikePit'.
    mainCharacter.zoneId = zoneId;
    sendPlayerJoined();
}