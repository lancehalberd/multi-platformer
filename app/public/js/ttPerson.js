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
    'wand': weaponSource(0),
    'bow': weaponSource(1),
    'sword': weaponSource(2),
    'greatSword': weaponSource(3),
    'dagger': weaponSource(4),
    'ball': weaponSource(5),
    'rock': weaponSource(6),
    'staff': weaponSource(7),
    'axe': weaponSource(8),
    'bigAxe': weaponSource(9),
};

var hairImageSource = requireImage('gfx/person/hair.png'),
    equipmentImageSource = requireImage('gfx/person/equipment.png'),
    weaponsImageSource = requireImage('gfx/person/weapons.png');

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
        var targetRectangle = rectangle(frame * 96 + 32, 0, 32, 64);
        // Draw the person legs then body then hair then under garment then leg gear then body gear.
        draw.image(actorContext, baseImage, rectangle(frame * 96 + 64, row * 64 , 32, 64), targetRectangle); //legs
        draw.image(actorContext, baseImage, rectangle(frame * 96, row * 64 , 32, 64), targetRectangle); //body
        if (!equipmentSources.head || !equipmentSources.head.hideHair) {
            draw.image(actorContext, hairImageSource, rectangle(frame * 96, hairIndex * 64, 32, 64), targetRectangle); // hair
        }
        // draw feet then legs (offset 64) then body then head gear (offset 0).
        for (var subX of [64, 0]) {
            for (var equipmentSlot of equipmentSlots) {
                var source = equipmentSources[equipmentSlot];
                if (!source || source.xOffset !== subX) continue;
                draw.image(actorContext, equipmentImageSource, rectangle(frame * 96 + source.xOffset, source.yOffset, 32, 64), targetRectangle);
            }
        }
        // Draw the weapon under the arm.
        if (equipmentSources.weapon) {
            var source = equipmentSources.weapon;
            draw.image(actorContext, weaponsImageSource, rectangle(frame * 96, source.yOffset, 96, 64), rectangle(frame * 96, 0, 96, 64));
        }
        // Draw the person arm then arm gear.
        draw.image(actorContext, baseImage, rectangle(frame * 96 + 32, row * 64 , 32, 64), targetRectangle); // arm
        // draw arm+hands gear (offset 32).
        for (var equipmentSlot of equipmentSlots) {
            var source = equipmentSources[equipmentSlot];
            if (!source || source.xOffset !== 32) continue; // don't draw this if it isn't arm/hands gear
            draw.image(actorContext, equipmentImageSource, rectangle(frame * 96 + source.xOffset, source.yOffset, 32, 64), targetRectangle);
        }
    }
    return actorCanvas;
}

class TTCharacter {
    constructor(actorCanvas) {
        this.canvas = actorCanvas;
        this.x = 200;
        this.y = 800;
        this.currentFrame = 0;
        this.scale = 2;
        this.speed = 5;
        this.vx = this.vy = 0;
        this.grounded = false;
        this.hitBox = rectangle(-24, -84, 48, 84);
        this.walkAnimation = walkAnimation(actorCanvas);
        this.attackAnimation = attackAnimation(actorCanvas);
        this.animation = this.walkAnimation;
    }

    jump() {
        if (this.grounded && (this.jumpTime || 0) < now()) {
            this.vy = -15;
        }
    }
}

var mainCharacter;
var otherCharacters = [];
function walkAnimation(actorCanvas) {
    var hitBox = rectangle(36, 18, 24, 42);
    var neutralFrame = $.extend(rectangle(0, 0, 96, 64), {image: actorCanvas, hitBox});
    var stepRight = $.extend(rectangle(96, 0, 96, 64), {image: actorCanvas, hitBox});
    var stepLeft = $.extend(rectangle(192, 0, 96, 64), {image: actorCanvas, hitBox});
    return {frames: [neutralFrame, stepRight, neutralFrame, stepLeft]};
}
function attackAnimation(actorCanvas) {
    var hitBox = rectangle(36, 18, 24, 42);
    var neutralFrame = $.extend(rectangle(0, 0, 96, 64), {image: actorCanvas, hitBox});
    var prepareFrame = $.extend(rectangle(96 * 3, 0, 96, 64), {image: actorCanvas, hitBox});
    var attackFrame = $.extend(rectangle(96 * 4, 0, 96, 64), {image: actorCanvas, hitBox});
    return {frames: [prepareFrame, attackFrame, prepareFrame, neutralFrame]};
}
function initializePersonGraphics() {
    var baseImage = requireImage('gfx/person/personSprite.png');
    var skinToneIndex = Random.range(0, ttPersonRows - 1);
    var hairIndex = Random.range(0, ttHairRows - 1);
    var actorCanvas = createEquippedActorSource(baseImage, skinToneIndex, hairIndex,
        [equipmentSources.leatherVest, equipmentSources.leatherPants, equipmentSources.leatherBoots, weaponSources.sword]
    );
    mainCharacter = new TTCharacter(actorCanvas);
    while (otherCharacters.length < 1) {
        baseImage = requireImage('gfx/person/monsterPeople.png');
        skinToneIndex = Random.range(0, ttMonsterPersonRows - 1);
        hairIndex = Random.range(0, ttHairRows); // no -1 so they can be bald.
        actorCanvas = createEquippedActorSource(baseImage, skinToneIndex, hairIndex,
            [equipmentSources.leatherVest, equipmentSources.leatherPants, equipmentSources.leatherBoots, weaponSources.sword]
        );
        otherCharacters.push(new TTCharacter(actorCanvas));
    }
}