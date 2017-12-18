class DeleteColumnBrush {

    constructor() {
        this.released = true;
    }

    update() {
        if (!isMouseOver($(mainCanvas))) return;
        var column = getMouseCoords()[0];
        if (column < 0 || column >= currentMap.width) return;
        if (this.released && mouseDown) {
            sendData({action: 'deleteColumn', column});
        }
        this.released = !mouseDown;
    }

    renderPreview(target) {
        if (!isMouseOver($(mainCanvas))) return;
        var column = getMouseCoords()[0];
        if (column < 0 || column > currentMap.width) return;
        var context = mainContext;
        context.save();
        context.globalAlpha = .5;
        draw.fillRectangle(context,  new Rectangle(column * currentMap.tileSize, cameraY, currentMap.tileSize, mainCanvas.height), 'red');
        context.restore();
    }

    renderHUD(context, target) {
        draw.fillRectangle(context, target.stretchFromCenter(1 / 3, 1), 'red');
    }
}
