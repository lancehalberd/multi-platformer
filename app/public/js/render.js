
var mainCanvas = $('.js-mainCanvas')[0];
var mainContext = mainCanvas.getContext('2d');
mainContext.imageSmoothingEnabled = false;
var bufferCanvas = createCanvas(mainCanvas.width, mainCanvas.height);
var bufferContext = bufferCanvas.getContext('2d');

/////////////////
// lighting

var pointLights = [];

var lightingPixelsPerRow = 100,
    lightingPixelsPerColumn = Math.round(
        mainCanvas.height / mainCanvas.width * lightingPixelsPerRow
    ), // WRONG shouldn't stretch things because we get a half-cell
    lightingPixelsPerGrid = lightingPixelsPerRow * lightingPixelsPerColumn,
    lightingScaledPixelSize = mainCanvas.width / lightingPixelsPerRow, // WRONG not quite right if we're stretching cells vertically to avoid half-cells
    lightingCanvas = $(`<canvas width="${lightingPixelsPerRow}" height="${lightingPixelsPerColumn}" />`)[0],
    lightingContext = lightingCanvas.getContext('2d'),
    lightingData = lightingContext.createImageData(lightingPixelsPerRow, lightingPixelsPerColumn),
    lightingPixelArray = lightingData.data,
    lightingCanvas = document.createElement('canvas'),
    lightingContext = lightingCanvas.getContext('2d'),
    pointLights = [];

lightingCanvas.width = lightingPixelsPerRow;
lightingCanvas.height = lightingPixelsPerColumn;

// Lighting distance table. Usage:
// const dx = Math.round(Math.abs(x1 - x2) / lightingDistanceFactor);
// const dy = Math.round(Math.abs(y1 - y2) / lightingDistanceFactor);
// const distance = lightingDistance[dy][dx];
var lightingDistance = [];
var lightingDistanceFactor = 2;

// Fill in the lighting distance table.
function initializeLighting() {
    const ldf2 = lightingDistanceFactor ** 2;
    for (var i = 0; i < mainCanvas.height / lightingDistanceFactor; i++) {
        lightingDistance[i] = [];
        for (var j = 0; j < mainCanvas.width / lightingDistanceFactor; j++) {
            lightingDistance[i][j] = Math.sqrt(ldf2 * i * i + ldf2 * j * j);
        }
    }
}

initializeLighting();
function removeFinishedPointLights() {
    // This just gets rid of all the point lights that have shouldBeRemoved set to true on them.
    // For now, this will work with point lights that are localSprites.
    pointLights = pointLights.filter(pointLight => !pointLight.shouldBeRemoved);
}

function renderLighting() {
    removeFinishedPointLights();
    //lightingContext.clearRect(0, 0, lightingCanvas.width, lightingCanvas.height); // Is this necessary? If we used a fadeout/decay effect and '+=' at the end (when the actual pixel values are affected) instead of '=' like I do in my "pure sim," we might get more interesting effects, like afterimages and flickering.
    for (var r = 0; r < lightingPixelsPerColumn; r++) {
        const y = (r + .5) * lightingScaledPixelSize;
        for (var c = 0; c < lightingPixelsPerRow; c++) {
            const x = (c + .5) * lightingScaledPixelSize;
            const i = r * lightingPixelsPerRow + c;
            // brightness decay
            // WRONG: eventually this will need to decay toward the precalculated lightmap values, instead of toward 0
            for (var pc = 0; pc < 4; pc++) { // 'pc' means 'pixel channel'
                lightingPixelArray[i * 4 + pc] *= 0.88;
            }
            var red = 0,
                green = 0,
                blue = 0,
                alpha = 0;
            // pointLights
            /*if (pointLights.length > 0) { // if there are point lights active
                    for (var j = 0; j < pointLights.length; j++) { // for each point light
                        var lightX = pointLights[j].x,
                            lightY = pointLights[j].y;
                        // rounding light coordinates, which is necessary for using the distance lookup tables
                        // avoiding Math.round() function calls:
                        // maybe there's a more elegant way to do this.
                        if (lightX % 1 >= 0.5) lightX += 1 - lightX % 1;
                        if (lightX % 1 < 0.5 && lightX % 1 > -0.5) lightX -= lightX % 1;
                        if (lightX % 1 <= -0.5) lightX -= 1 + lightX % 1;
                        if (lightY % 1 >= 0.5) lightY += 1 - lightY % 1;
                        if (lightY % 1 < 0.5 && lightY % 1 > -0.5) lightY -= lightY % 1;
                        if (lightY % 1 <= -0.5) lightY -= 1 + lightY % 1;
                        if (frameCounter % 15 === 0 && j === 0 && i === 0) {
                            console.log(

                            );
                        }
                        r = 0;
                        g = 0;
                        b = 0;
                        a = 0;
                        // WRONG: Should express these values as proportions of the first so that all this calculation doesn't have to happen repeatedly.
                        //      The speed gain might not be worth it, but it's really important that the lighting be efficient, so maybe it really is worth it.
                        // WRONG: eventually I'll transplant my neighborsOfIndexInRadius[][] array in from my pixel project and we can set
                        //      a limited radius to which cells a point light affects.
                        r += 768 / lightingDistanceFromIndexToIndex[i][lightingIndexOfCoordinates[lightX][lightY]];
                        g += 384 / lightingDistanceFromIndexToIndex[i][lightingIndexOfCoordinates[lightX][lightY]];
                        b += 64;//384 / lightingDistanceFromIndexToIndex[i][lightingIndexOfCoordinates[light.x][light.y]];
                        a += 128 / lightingDistanceFromIndexToIndex[i][lightingIndexOfCoordinates[lightX][lightY]];
                    }
                }*/
            // sun point light
            var sun = {x: mainCharacter.x - cameraX, y: mainCharacter.y - cameraY - 80};
            // `(A + .5) << 1 >> 1;` Does the same thing as `Math.round(A)`, but is a little bit faster because
            // it doesn't have to invoke a function.
            var dx = ((sun.x - x) / lightingDistanceFactor + .5) << 1 >> 1;
            var dy = ((sun.y - y) / lightingDistanceFactor + .5) << 1 >> 1;
            if (dx < 0) dx = -dx;
            if (dy < 0) dy = -dy;
            // These lines should do the same as the above 4, using functions.
            // var dx = Math.abs(Math.round((sun.x - x) / lightingDistanceFactor));
            // var dy = Math.abs(Math.round((sun.x - y) / lightingDistanceFactor));
            // I added a factor of 8 here because without it the sun looked too small in this version.
            const distance = lightingDistance[dy][dx];
            red += 768 / distance;
            green += 384 / distance;
            blue += 64;//384 / distance;
            alpha += 128 / distance;


            // haze
            var maxHaze = mainCanvas.height - y;
            if (maxHaze > 80) maxHaze = 80;
            if (maxHaze < 10) maxHaze = 10;
            red += 128 / maxHaze;
            green += 128 / maxHaze;
            blue += 64 / maxHaze;
            alpha += 128 / maxHaze;

            if (distance > 100) {
                red = 0;
                green = 0;
                blue = 0;
                alpha = 255 * (distance - 100) / 1000;
            }

            // logging
            if (frameCounter % 15 === 0 && i === 0) {
                console.log(

                );
            }

            // for each pixel, add the sum of all dynamic lighting this frame
            lightingPixelArray[i * 4 + 0] += red;
            lightingPixelArray[i * 4 + 1] += green;
            lightingPixelArray[i * 4 + 2] += blue;
            lightingPixelArray[i * 4 + 3] += alpha;
        }
    }
    // draw pixelArray
    lightingContext.putImageData(lightingData, 0, 0);
    // turn on antialiasing just for the lighting grid
    mainContext.imageSmoothingEnabled = true;
    // scale pixelArray up to canvas size
    mainContext.drawImage(lightingCanvas, 0, 0, lightingCanvas.width, lightingCanvas.height, 0, 0, mainCanvas.width, mainCanvas.height);
    // turning off antialiasing for everything else
    mainContext.imageSmoothingEnabled = false;
}
// end lighting
///////////////////

var render = () => {
    //countFps(5, 30, FPSRENDER); // just comment this in for an FPS display in the console.
    try {
    if (!gameHasBeenInitialized || !currentMap) {
        window.requestAnimationFrame(render);
        return;
    }

    //var bgSourceRectangle = new Rectangle(0, 0, 1920, 1080);
    var bgSourceRectangle = new Rectangle(0, 0, 800, 608);
    var target = bgSourceRectangle.scale(1.2); // used to be 0.6 when the background pic was yellowMountains.png
    var xPercent = (cameraX / (Math.max(areaRectangle.width, target.width) - mainCanvas.width)) || 0;
    if (areaRectangle.width < mainCanvas.width) xPercent = 0;
    var yPercent = (cameraY / (Math.max(areaRectangle.height, target.height) - mainCanvas.height)) || 0;
    if (areaRectangle.height < mainCanvas.height) yPercent = 0;
    target = target.moveTo(- xPercent * (target.width - mainCanvas.width), - yPercent * (target.height - mainCanvas.height));

    var taggedPlayer = TagGame.getTaggedPlayer();
    draw.fillRectangle(mainContext, new Rectangle(0, 0, mainCanvas.width, mainCanvas.height), 0);
    //if (taggedPlayer) {
    //    draw.tintedImage(mainContext, requireImage('/gfx/backgrounds/yellowMountains.png'), taggedPlayer.color, .5, bgSourceRectangle, target)
    //} else {
//    draw.image(mainContext, requireImage('/gfx/backgrounds/yellowMountains.png'), bgSourceRectangle, target);
    draw.image(mainContext, requireImage('/gfx/backgrounds/desertBackgroundA.png'), bgSourceRectangle, target);
    //}

    drawMap();
    mainContext.save();
    mainContext.translate(Math.round(-cameraX), Math.round(-cameraY));
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
    if (isEditing) {
        renderEditor();
        window.requestAnimationFrame(render);
        return;
    }

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

    if (mainCharacter.changingZones) {
        mainContext.save();
        mainContext.globalAlpha = (now() - mainCharacter.changingZones) / 500;
        draw.fillRectangle(mainContext, new Rectangle(0, 0, mainCanvas.width, mainCanvas.height), 0);
        mainContext.restore();
    }

    TagGame.render();

    // Considering calculating hit box from the animation. But do I want to worry about rotation with this?
    /*var frame = mainCharacter.walkingAnimation.frames[0];
    var hitBox = frame.hitBox;
    hitBox = rectangle(mainCharacter.x - frame.width / 2 + hitBox.left)*/

    // Draw a rectangle where we expect the sprite to be displayed for the main character.
    // draw.fillRectangle(mainContext, rectangle(mainCharacter.x - 2, mainCharacter.y - 2, 4, 4), 'white');



    window.requestAnimationFrame(render);
    } catch (e) {
        console.log(e);
        debugger;
    }
    renderLighting();
};
var drawMap = () => {
    var topRow = Math.floor((cameraY - mapTop) / currentMap.tileSize);
    var bottomRow = Math.ceil((cameraY - mapTop + mainCanvas.height) / currentMap.tileSize);
    var leftColumn = Math.floor((cameraX - mapLeft) / currentMap.tileSize);
    var rightColumn = Math.ceil((cameraX - mapLeft + mainCanvas.width) / currentMap.tileSize);
    mainContext.save();
    mainContext.translate(Math.round(-cameraX), Math.round(-cameraY));
    mainContext.translate(0, currentMap.tileSize * topRow + currentMap.tileSize / 2);
    for (var row = topRow; row < bottomRow; row++) {
        if (!currentMap.composite[row]) {
            mainContext.translate(0, currentMap.tileSize);
            continue;
        }
        mainContext.save();
        mainContext.translate(currentMap.tileSize * leftColumn + currentMap.tileSize / 2, 0);
        for (var col = leftColumn; col < rightColumn; col++) {
            var tile = currentMap.uniqueTiles[currentMap.composite[row][col]];
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
