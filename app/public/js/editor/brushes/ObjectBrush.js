class ObjectBrush {

    constructor(mapObject) {
        this.mapObject = mapObject;
    }

    update() {
        if (mouseDown) {
            if (!objectStartCoords) objectStartCoords = getMouseCoords();
            objectLastCoords = getMouseCoords();
        } else {
            if (objectStartCoords) {
                var drawnRectangle = getDrawnRectangle(objectStartCoords, objectLastCoords, this.mapObject);
                sendMapObject(this.mapObject, drawnRectangle);
                objectStartCoords = null;
            }
        }
    }

    renderPreview(target) {
        if (objectStartCoords) {
            var drawnRectangle = getDrawnRectangle(objectStartCoords, objectLastCoords, this.mapObject);
            draw.fillRectangle(mainContext, drawnRectangle.scale(currentMap.tileSize), 'red');
        } else {
            draw.fillRectangle(mainContext, target, 'red');
        }
    }

    renderHUD(context, target) {
        var width = (this.mapObject.maxWidth || 3);
        var height = (this.mapObject.maxHeight || 3);
        context.scale(
            (this.mapObject.xScale || 1) * width / 3,
            (this.mapObject.yScale || 1) * height / 3
        );
        draw.image(context, requireImage(this.mapObject.image),
            new Rectangle(this.mapObject.x, this.mapObject.y, width, height).scale(this.mapObject.size),
            target
        );
    }
}
