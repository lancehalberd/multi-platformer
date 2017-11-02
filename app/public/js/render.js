
var mainCanvas = $('.js-mainCanvas')[0];
var mainContext = mainCanvas.getContext('2d');
mainContext.imageSmoothingEnabled = false;
var bufferCanvas = createCanvas(mainCanvas.width, mainCanvas.height);
var bufferContext = bufferCanvas.getContext('2d');

var render = () => {
    try {
    if (!gameHasBeenInitialized || !currentMap) {
        window.requestAnimationFrame(render);
        return;
    }

    var xPercent = cameraX / (areaRectangle.width - mainCanvas.width);
    var yPercent = cameraY / (areaRectangle.height - mainCanvas.height);
    var bgSourceRectangle = new Rectangle(0, 0, 1920, 1080);
    var target = bgSourceRectangle.scale(0.6);
    target = target.moveTo(- xPercent * (target.width - mainCanvas.width), - yPercent * (target.height - mainCanvas.height));

    draw.image(mainContext, requireImage('/gfx/backgrounds/yellowMountains.png'), bgSourceRectangle, target);

    mainContext.save();
    mainContext.translate(Math.round(-cameraX), Math.round(-cameraY));
    drawMap();
    // Update all the sprites that the game keeps track of
    for (var sprite of
        [
            // All the characters from other clients.
            ...Object.values(otherCharacters),
            // The main character for the client is drawn after the other characters
            // so that it will always appear in front of them.
            mainCharacter,
            // Other sprite objects like fireballs, particles, explosions and triggers.
            ...localSprites,
        ]
    ) {
        sprite.render(sprite);
    }
    mainContext.restore();

    // Draw HUD elements here like the life display for the main character.
    mainContext.save();
    mainContext.translate(10, 10);
    var heartImage = requireImage('/gfx/heart.png');
    var heartRectangle = new Rectangle(0, 0, 50, 50);
    for (var i = 0; i < mainCharacter.maxHealth; i++) {
        if (i < mainCharacter.health) draw.image(mainContext, heartImage, heartRectangle, heartRectangle);
        else draw.solidTintedImage(mainContext, heartImage, '#444', heartRectangle, heartRectangle);
        mainContext.translate(60, 0);
    }
    mainContext.restore();

    renderEditor();

    TagGame.render();

    // Considering calculating hit box from the animation. But do I want to worry about rotation with this?
    /*var frame = mainCharacter.walkAnimation.frames[0];
    var hitBox = frame.hitBox;
    hitBox = rectangle(mainCharacter.x - frame.width / 2 + hitBox.left)*/

    // Draw a rectangle where we expect the sprite to be displayed for the main character.
    // draw.fillRectangle(mainContext, rectangle(mainCharacter.x - 2, mainCharacter.y - 2, 4, 4), 'white');



    window.requestAnimationFrame(render);
    } catch (e) {
        console.log(e);
        debugger;
    }
};
var drawMap = () => {
    var topRow = Math.floor(cameraY / currentMap.tileSize);
    var bottomRow = Math.ceil((cameraY + mainCanvas.height) / currentMap.tileSize);
    var leftColumn = Math.floor(cameraX / currentMap.tileSize);
    var rightColumn = Math.ceil((cameraX + mainCanvas.width) / currentMap.tileSize);
    mainContext.save();
    mainContext.translate(0, currentMap.tileSize * topRow + currentMap.tileSize / 2);
    for (var row = topRow; row < bottomRow; row++) {
        if (!currentMap.composite[row]) {
            mainContext.translate(0, currentMap.tileSize);
            continue;
        }
        mainContext.save();
        mainContext.translate(currentMap.tileSize * leftColumn + currentMap.tileSize / 2, 0);
        for (var col = leftColumn; col < rightColumn; col++) {
            var tile = currentMap.composite[row][col];
            if (tile) {
                var image = requireImage(tile.image);
                mainContext.save();
                mainContext.scale(tile.xScale, tile.yScale);
                draw.image(mainContext, image,
                    new Rectangle(tile.x, tile.y, 1, 1).scale(tile.size),
                    new Rectangle(-1 / 2, -1 / 2, 1, 1).scale(currentMap.tileSize)
                );
                mainContext.restore();
            }
            mainContext.translate(currentMap.tileSize, 0);
        }
        mainContext.restore();
        mainContext.translate(0, currentMap.tileSize);
    }
    mainContext.restore();
}
render();
