function drawSprite(context, sprite) {
    var scale = ifdefor(sprite.scale, 1);
    drawFrameTo(context,
        sprite.animation.frames[sprite.currentFrame],
        sprite.x, sprite.y,
        ifdefor(sprite.xScale, 1) * scale, ifdefor(sprite.yScale, 1) * scale,
        ifdefor(sprite.rotation, 0)
    );
}
function drawFrameTo(context, frame, x, y, xScale, yScale, rotation) {
    context.save();
    var hitBox = frame.hitBox || frame;
    context.translate(x, y - hitBox.height * yScale / 2);
    if (rotation) context.rotate(rotation * Math.PI/180);
    if (xScale !== 1 || yScale !== 1) context.scale(xScale, yScale);

    var target = {
        'left': -(hitBox.left + hitBox.width / 2),
        'top': -(hitBox.top + hitBox.height / 2),
        'width': frame.width,
        'height': frame.height,
    };
    draw.image(context, frame.image, frame, target)
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
// Get array of tint effects to apply when drawing the given actor.
function getActorTints(actor) {
    var tints = [];
    if (actor.base.tint) {
        tints.push(actor.base.tint);
    }
    if (ifdefor(actor.tint)) {
        var min = ifdefor(actor.tintMinAlpha, .5);
        var max = ifdefor(actor.tintMaxAlpha, .5);
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
