
var mainCanvas = $('.js-mainCanvas')[0];
var mainContext = mainCanvas.getContext('2d');
mainContext.imageSmoothingEnabled = false;
var bufferCanvas = createCanvas(mainCanvas.width, mainCanvas.height);
var bufferContext = bufferCanvas.getContext('2d');

var render = () => {
    try {
    if (!gameHasBeenInitialized) {
        window.requestAnimationFrame(render);
        return;
    }

    var xPercent = cameraX / (areaRectangle.width - mainCanvas.width);
    var yPercent = cameraY / (areaRectangle.height - mainCanvas.height);
    var target = rectangle(0, 0, 1920 * .6, 1080 *.6);
    target.left = - xPercent * (target.width - mainCanvas.width);
    target.top = - yPercent * (target.height - mainCanvas.height);
    //console.log(target.x);
    draw.image(mainContext, requireImage('gfx/backgrounds/yellowMountains.png'), rectangle(0, 0, 1920, 1080), target);

    mainContext.save();
    mainContext.translate(Math.round(-cameraX), Math.round(-cameraY));
    /*draw.fillRectangle(mainContext, rectangle(cameraX, groundY, mainCanvas.width, areaRectangle.height - groundY), '#403020');
    draw.fillRectangle(mainContext, rectangle(500 * Math.floor(cameraX / 500), groundY, 200, areaRectangle.height - groundY), '#504030');
    draw.fillRectangle(mainContext, rectangle(500 * Math.ceil(cameraX / 500), groundY, 200, areaRectangle.height - groundY), '#504030');
    draw.fillRectangle(mainContext, rectangle(500 * Math.ceil(cameraX / 500 + 1), groundY, 200, areaRectangle.height - groundY), '#504030');*/
    drawMap();
    for (var actor of [...Object.values(otherCharacters), mainCharacter]) {
        /*draw.fillRectangle(mainContext, rectangle(
            actor.x + actor.hitBox.left,
            actor.y + actor.hitBox.top,
            actor.hitBox.width,
            actor.hitBox.height), 'red');*/
        if (actor.deathTime) {
            mainContext.globalAlpha = Math.max(0, 1 - (now() - actor.deathTime) / 1000);
        } else if (actor.invulnerableUntil && actor.invulnerableUntil > now()) {
            mainContext.globalAlpha = Math.cos((actor.invulnerableUntil - now()) / 10) / 8 + .6;
        } else {
            mainContext.globalAlpha = 1;
        }
        drawSprite(mainContext, actor);
    }
    mainContext.restore();

    // Draw HUD elements here like the life display for the main character.
    mainContext.save();
    mainContext.translate(10, 10);
    var heartImage = requireImage('gfx/heart.png');
    var heartRectangle = rectangle(0, 0, 50, 50);
    for (var i = 0; i < mainCharacter.maxHealth; i++) {
        if (i < mainCharacter.health) draw.image(mainContext, heartImage, heartRectangle, heartRectangle);
        else draw.solidTintedImage(mainContext, heartImage, '#444', heartRectangle, heartRectangle);
        mainContext.translate(60, 0);
    }
    mainContext.restore();

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
                mainContext.save();
                mainContext.scale(tile.xScale, tile.yScale);
                draw.image(mainContext, tile.image,
                    rectangle(tile.size * tile.x, tile.size * tile.y, tile.size, tile.size),
                    rectangle(-currentMap.tileSize / 2, -currentMap.tileSize / 2, currentMap.tileSize, currentMap.tileSize)
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
