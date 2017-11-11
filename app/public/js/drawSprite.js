function drawSprite(context, sprite) {
    // This code just draw the hitbox rectangle to the canvas
    // and may be good to uncomment to check that the graphic
    // is being displayed correctly relative to the hitbox.
    // This will need to be updated for sprites that do not
    // have hitBox set on them directly as a property.
    if (isKeyDown('Y'.charCodeAt(0))) {
        draw.fillRectangle(mainContext, getGlobalSpriteHitBox(sprite), 'red');
    }
    var scale = ifdefor(sprite.scale, 1);
    drawFrameTo(context,
        sprite.animation.frames[sprite.currentFrame],
        sprite.x, sprite.y,
        ifdefor(sprite.xScale, 1) * scale, ifdefor(sprite.yScale, 1) * scale,
        ifdefor(sprite.rotation, 0),
        null,
        sprite
    );
}
function drawFrameTo(context, frame, x, y, xScale, yScale, rotation, tint, source) {
    context.save();
    // Convert image source to the actual image if it is currently a string (for instance, because it was serialized).
    if (typeof frame.image === 'string') {
        frame.image = requireImage(frame.image);
    }
    // If the frame does not have an explicit hitbox, just assume the hitbox
    // is the size of the box with origin at (0, 0).
    var hitBox = frame.hitBox || frame.moveTo(0, 0);
    context.translate(x, y - hitBox.height * yScale / 2);
    if (rotation) context.rotate(rotation * Math.PI/180);
    if (xScale !== 1 || yScale !== 1) context.scale(xScale, yScale);

    var hitBoxCenter = hitBox.getCenter();
    var target = frame.moveTo(-hitBoxCenter[0], -hitBoxCenter[1]);
    if (source.renderFrame) {
        source.renderFrame(context, frame, target);
    } else if (tint) draw.tintedImage(context, frame.image, tint, 0.5, frame, target);
    else draw.image(context, frame.image, frame, target);
    context.restore();

    /*if (tints.length) {
        prepareTintedImage();
        var tint = tints.pop();
        var tintedImage = getTintedImage(actor.image, tint[0], tint[1], frameSource);
        var tintSource = {'left': 0, 'top': 0, 'width': frameSource.width, 'height': frameSource.height};
        for (var tint of tints) {
            tintedImage = getTintedImage(tintedImage, tint[0], tint[1], tintSource);
        }
        drawImage(context, tintedImage, tintSource, target);
    } else {
        drawImage(context, actor.image, frameSource, target);
    }*/
}

function drawSpriteToRectangle(context, sprite, target) {
    var frame = sprite.animation.frames[sprite.currentFrame];
    // Convert image source to the actual image if it is currently a string (for instance, because it was serialized).
    if (typeof frame.image === 'string') {
        frame.image = requireImage(frame.image);
    }
    draw.image(context, frame.image, frame, target);
}

// Get array of tint effects to apply when drawing the given actor.
function getActorTints(actor) {
    var tints = [];
    if (actor.base.tint) {
        tints.push(actor.base.tint);
    }
    if (ifdefor(actor.tint)) {
        var min = ifdefor(actor.tintMinAlpha, 0.5);
        var max = ifdefor(actor.tintMaxAlpha, 0.5);
        var center = (min + max) / 2;
        var radius = (max - min) / 2;
        tints.push([actor.tint, center + Math.cos(actor.time * 5) * radius]);
    }
    if (actor.slow > 0) tints.push(['#fff', Math.min(1, actor.slow)]);
    return tints;
}

function setFontSize(context, size) {
    context.font = size +"px 'Cormorant SC', Georgia, serif";
}
