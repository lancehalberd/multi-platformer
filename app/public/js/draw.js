
var globalTintCanvas = createCanvas(400, 300);
var globalTintContext = globalTintCanvas.getContext('2d');
var globalCompositeCanvas = createCanvas(150, 150);
var globalCompositeContext = globalCompositeCanvas.getContext('2d');
globalTintContext.imageSmoothingEnabled = false;

var draw = {
    image(context, image, source, target) {
        context.save();
        context.translate(target.left + target.width / 2, target.top + target.height / 2);
        if (target.xScale || target.yScale) {
            context.scale(ifdefor(target.xScale, 1), ifdefor(target.yScale, 1));
        }
        context.drawImage(image, source.left, source.top, source.width, source.height, -target.width / 2, -target.height / 2, target.width, target.height);
        context.restore();
    },
    clearRectangle(context, target) {
        context.clearRect(target.left, target.top, target.width, target.height);
    },
    solidTintedImage(context, image, tint, source, target) {
        // First make a solid color in the shape of the image to tint.
        globalTintContext.save();
        var tintRectangle = source.moveTo(0, 0);
        draw.clearRectangle(globalTintContext, tintRectangle)
        draw.image(globalTintContext, image, source, tintRectangle)
        globalTintContext.globalCompositeOperation = "source-in";
        draw.fillRectangle(globalTintContext, tintRectangle, tint);
        draw.image(context, globalTintCanvas, tintRectangle, target);
        globalTintContext.restore();
    },
    makeTintedImage(image, tint) {
        var tintCanvas = createCanvas(image.width, image.height);
        var tintContext = tintCanvas.getContext('2d');
        tintContext.clearRect(0, 0, image.width, image.height);
        tintContext.fillStyle = tint;
        tintContext.fillRect(0,0, image.width, image.height);
        tintContext.globalCompositeOperation = "destination-atop";
        tintContext.drawImage(image, 0, 0, image.width, image.height, 0, 0, image.width, image.height);
        var resultCanvas = createCanvas(image.width, image.height);
        var resultContext = resultCanvas.getContext('2d');
        resultContext.drawImage(image, 0, 0, image.width, image.height, 0, 0, image.width, image.height);
        resultContext.globalAlpha = 0.3;
        resultContext.drawImage(tintCanvas, 0, 0, image.width, image.height, 0, 0, image.width, image.height);
        resultContext.globalAlpha = 1;
        return resultCanvas;
    },
    tintedImage(context, image, tint, amount, source, target) {
        context.save();
        // First make a solid color in the shape of the image to tint.
        globalTintContext.save();
        var tintRectangle = source.moveTo(0, 0);
        draw.clearRectangle(globalTintContext, tintRectangle)
        globalTintContext.drawImage(image, source.left, source.top, source.width, source.height, 0, 0, source.width, source.height);
        globalTintContext.globalCompositeOperation = "source-in";
        draw.fillRectangle(globalTintContext, tintRectangle, tint);
        globalTintContext.restore();
        // Next draw the untinted image to the target.
        context.drawImage(image, source.left, source.top, source.width, source.height, target.left, target.top, target.width, target.height);
        // Finally draw the tint color on top of the target with the desired opacity.
        context.globalAlpha *= amount; // This needs to be multiplicative since we might be drawing a partially transparent image already.
        context.drawImage(globalTintCanvas, 0, 0, source.width, source.height, target.left, target.top, target.width, target.height);
        context.restore();
    },
    prepareTintedImage() {
        globalCompositeContext.clearRect(0, 0, globalCompositeCanvas.width, globalCompositeCanvas.height);
    },
    getTintedImage(image, tint, amount, sourceRectangle) {
        draw.tintedImage(globalCompositeContext, image, tint, amount, sourceRectangle, {'left': 0, 'top': 0, 'width': sourceRectangle.width, 'height': sourceRectangle.height});
        return globalCompositeCanvas;
    },
    sourceWithOutline(context, source, color, thickness, target) {
        if (source.drawWithOutline) {
            source.drawWithOutline(context, color, thickness, target);
            return;
        }
        context.save();
        var smallTarget = $.extend({}, target);
        for (var dy = -1; dy < 2; dy++) {
            for (var dx = -1; dx < 2; dx++) {
                if (dy == 0 && dx == 0) continue;
                smallTarget.left = target.left + dx * thickness;
                smallTarget.top = target.top + dy * thickness;
                draw.sourceAsSolidTint(context, source, color, smallTarget);
            }
        }
        source.draw(context, target);
    },
    sourceAsSolidTint(context, source, tint, target) {
        // First make a solid color in the shape of the image to tint.
        globalTintContext.save();
        globalTintContext.fillStyle = tint;
        globalTintContext.clearRect(0, 0, source.width, source.height);
        var tintRectangle = {'left': 0, 'top': 0, 'width': source.width, 'height': source.height};
        source.draw(globalTintContext, tintRectangle);
        globalTintContext.globalCompositeOperation = "source-in";
        globalTintContext.fillRect(0, 0, source.width, source.height);
        draw.image(context, globalTintCanvas, tintRectangle, target);
        globalTintContext.restore();
    },
    outlinedImage(context, image, color, thickness, source, target) {
        context.save();
        var smallTarget = $.extend({}, target);
        for (var dy = -1; dy < 2; dy++) {
            for (var dx = -1; dx < 2; dx++) {
                if (dy == 0 && dx == 0) continue;
                smallTarget.left = target.left + dx * thickness;
                smallTarget.top = target.top + dy * thickness;
                draw.solidTintedImage(context, image, color, source, smallTarget);
            }
        }
        draw.image(context, image, source, target);
    },
    logPixel(context, x, y) {
        var imgd = context.getImageData(x, y, 1, 1);
        console.log(imgd.data)
    },
    setupSource(source) {
        source.width = ifdefor(source.width, 48);
        source.height = ifdefor(source.height, 64);
        source.actualHeight = ifdefor(source.actualHeight, source.height);
        source.actualWidth = ifdefor(source.actualWidth, source.width);
        source.xOffset = ifdefor(source.xOffset, 0);
        source.yOffset = ifdefor(source.yOffset, 0);
        source.xCenter = ifdefor(source.xCenter, source.actualWidth / 2 + source.xOffset);
        source.yCenter = ifdefor(source.yCenter, source.actualHeight / 2 + source.yOffset);
        return source;
    },

    bar(context, x, y, width, height, background, color, percent) {
        percent = Math.max(0, Math.min(1, percent));
        if (background) {
            context.fillStyle = background;
            context.fillRect(x, y, width, height);
        }
        context.fillStyle = color;
        context.fillRect(x + 1, y + 1, Math.floor((width - 2) * percent), height - 2);
    },

    rectangleBackground(context, rectangle) {
        context.save();
        context.beginPath();
        context.globalAlpha = .9;
        context.fillStyle = 'black';
        draw.fillRectangle(context, rectangle);
        context.globalAlpha = 1;
        context.fillStyle = 'white';
        context.beginPath();
        draw.rectangle(context, rectangle);
        draw.rectangle(context, rectangle.pad(-1));
        context.fill('evenodd');
        context.restore();
    },

    titleRectangle(context, rectangle) {
        context.save();
        context.beginPath();
        context.globalAlpha = .5;
        context.fillStyle = '#999';
        draw.fillRectangle(context, rectangle);
        context.globalAlpha = 1;
        context.beginPath();
        draw.rectangle(context, rectangle);
        draw.rectangle(context, rectangle.pad(-2));
        context.fill('evenodd');
        context.restore();
    },
    fillRectangle(context, rectangle, fillStyle) {
        if (fillStyle) {
            context.save();
            context.fillStyle = fillStyle;
            context.beginPath();
            draw.rectangle(context, rectangle);
            context.fill();
            context.restore();
        } else {
            context.beginPath();
            draw.rectangle(context, rectangle);
            context.fill();
        }
    },
    strokeRectangle(context, rectangle, strokeStyle) {
        if (strokeStyle) {
            context.save();
            context.strokeStyle = strokeStyle;
            context.beginPath();
            draw.rectangle(context, rectangle);
            context.stroke();
            context.restore();
        } else {
            context.beginPath();
            draw.rectangle(context, rectangle);
            context.stroke();
        }
    },
    rectangle(context, rectangle) {
        context.rect(rectangle.left, rectangle.top, rectangle.width, rectangle.height);
    },
};