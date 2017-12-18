class CloneBrush {

    constructor(tileGrid, mapSource) {
        this.tileGrid = tileGrid;
        this.released = true;
        this.mapSource = mapSource;
    }

    forEachTile(coords, callback) {
        for (var row = 0; row < this.tileGrid.length; row++) {
            for (var column = 0; column < this.tileGrid[0].length; column++) {
                var tileIndex = this.tileGrid[row][column];
                callback(this.mapSource.uniqueTiles[tileIndex], coords[1] + row, coords[0] + column);
            }
        }
    }

    update() {
        // Send tile update only if the brush is different than what is
        // currently on the map.
        if (this.released && mouseDown) {
            this.forEachTile(getMouseCoords(), (tileSource, tileRow, tileColumn) => {
                if (onMap(tileRow, tileColumn)) {
                    updateTileIfDifferent([tileColumn, tileRow], tileSource);
                }
            });
        }
        this.released = !mouseDown;
    }

    renderPreview(target) {
        this.forEachTile(getMouseCoords(), (tileSource, tileRow, tileColumn) => {
            var target = new Rectangle(tileColumn, tileRow, 1, 1).scale(currentMap.tileSize);
            if (tileSource) {
                mainContext.save();
                mainContext.translate(target.left + currentMap.tileSize / 2, target.top + currentMap.tileSize / 2);
                mainContext.scale(tileSource.xScale, tileSource.yScale);
                draw.image(mainContext, requireImage(tileSource.image),
                    getTileSourceRectangle(tileSource),
                    new Rectangle(-1 / 2, -1 / 2, 1, 1).scale(currentMap.tileSize)
                );
                mainContext.restore();
            } else {
                draw.fillRectangle(mainContext, target, 'white');
            }
        });
    }

    renderHUD(context, target) {
        var scale = Math.min(2 / this.tileGrid.length, 2 / this.tileGrid[0].length);
        context.scale(scale, scale);
        this.forEachTile([0, 0], (tileSource, tileRow, tileColumn) => {
            var subTarget = new Rectangle(
                Math.round(target.left / scale + tileColumn * currentMap.tileSize),
                Math.round(target.top / scale + tileRow * currentMap.tileSize),
                currentMap.tileSize,
                currentMap.tileSize
            );
            if (tileSource) {
                context.save();
                context.translate(subTarget.left + currentMap.tileSize / 2, subTarget.top + currentMap.tileSize / 2);
                context.scale(tileSource.xScale || 1, tileSource.yScale || 1);
                draw.image(context, requireImage(tileSource.image), getTileSourceRectangle(tileSource),
                    new Rectangle(-1 / 2, -1 / 2, 1, 1).scale(currentMap.tileSize)
                );
                context.restore();
            }
        });
    }
}
