class InsertColumnBrush {

    constructor() {
        this.released = true;
        this.insertColumn = this.sourceColumn = null;
    }

    update() {
        this.insertColumn = null;
        if (!isMouseOver($(mainCanvas))) return;
        this.sourceColumn = getMouseCoords()[0];
        if (this.sourceColumn < 0 || this.sourceColumn >= currentMap.width) return;
        var subX = getPixelMouseCoords()[0] % currentMap.tileSize;
        if (subX < currentMap.tileSize / 2) this.insertColumn = this.sourceColumn;
        else this.insertColumn = this.sourceColumn + 1;
        if (this.released && mouseDown) {
            sendData({action: 'insertColumn', insertColumn: this.insertColumn, sourceColumn: this.sourceColumn});
        }
        this.released = !mouseDown;
    }

    renderPreview(target) {
        if (this.insertColumn === null) return;
        var context = mainContext;
        context.save();
        context.globalAlpha = .9;
        var width = mainCanvas.width - (this.sourceColumn * currentMap.tileSize - cameraX);
        draw.image(context, mainCanvas,
            new Rectangle(this.sourceColumn * currentMap.tileSize - cameraX, 0, width, mainCanvas.height),
            new Rectangle((this.sourceColumn + 1) * currentMap.tileSize, cameraY, width, mainCanvas.height),
        );
        context.globalAlpha = .5;
        draw.fillRectangle(context,
            new Rectangle(this.insertColumn * currentMap.tileSize, cameraY, currentMap.tileSize, mainCanvas.height), 'green'
        );
        context.restore();
    }

    renderHUD(context, target) {
        draw.fillRectangle(context, target.stretchFromCenter(1 / 3, 1), 'green');
    }
}
