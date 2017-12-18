class DeleteRowBrush {
    constructor() {
        this.released = true;
    }

    update() {
        if (!isMouseOver($(mainCanvas))) return;
        var row = getMouseCoords()[1];
        if (row < 0 || row > currentMap.height) return;
        if (this.released && mouseDown) {
            sendData({action: 'deleteRow', row});
        }
        this.released = !mouseDown;
    }

    renderPreview(target) {
        if (!isMouseOver($(mainCanvas))) return;
        var context = mainContext;
        var row = getMouseCoords()[1];
        if (row < 0 || row >= currentMap.height) return;
        context.save();
        context.globalAlpha = .5;
        draw.fillRectangle(context, new Rectangle(cameraX, row * currentMap.tileSize, mainCanvas.width, currentMap.tileSize), 'red');
        context.restore();
    }

    renderHUD(context, target) {
        draw.fillRectangle(context, target.stretchFromCenter(1, 1 / 3), 'red');
    }
}
