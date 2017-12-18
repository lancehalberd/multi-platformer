class InsertRowBrush {
    constructor() {
        this.released = true;
        this.insertRow = this.sourceRow = null;
    }

    update() {
        this.insertRow = null;
        if (!isMouseOver($(mainCanvas))) return;
        this.sourceRow = getMouseCoords()[1];
        if (this.sourceRow < 0 || this.sourceRow >= currentMap.height) return;
        var subY = getPixelMouseCoords()[1] % currentMap.tileSize;
        if (subY < currentMap.tileSize / 2) this.insertRow = this.sourceRow;
        else this.insertRow = this.sourceRow + 1;
        if (this.released && mouseDown) {
            sendData({action: 'insertRow', insertRow: this.insertRow, sourceRow: this.sourceRow});
        }
        this.released = !mouseDown;
    }

    renderPreview(target) {
        var context = mainContext;
        if (this.insertRow === null) return;
        context.save();
        context.globalAlpha = .9;
        var height = mainCanvas.height - (this.sourceRow * currentMap.tileSize - cameraY);
        draw.image(context, mainCanvas,
            new Rectangle(0, this.sourceRow * currentMap.tileSize - cameraY, mainCanvas.width, height),
            new Rectangle(cameraX, (this.sourceRow + 1) * currentMap.tileSize, mainCanvas.width, height),
        );
        context.globalAlpha = .5;
        draw.fillRectangle(context,
            new Rectangle(cameraX, this.insertRow * currentMap.tileSize, mainCanvas.width, currentMap.tileSize), 'green'
        );
        context.restore();
    }

    renderHUD(context, target) {
        draw.fillRectangle(context, target.stretchFromCenter(1, 1 / 3), 'green');
    }
}
