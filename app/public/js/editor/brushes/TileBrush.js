class TileBrush {

    constructor(tileSource, mapSource) {
        this.tileSource = tileSource;
        this.mapSource = mapSource;
    }

    update() {
        if (mouseDown) {
            var coords = getMouseCoords();
            if (onMap(coords[1], coords[0])) {
                updateTileIfDifferent(coords, this.getTile());
            }
        }
    }

    getTile() {
        if (typeof this.tileSource === 'number') {
            // 0 is the only valid numeric tile without a source map, since the source map
            // contains the mapping of numbers to actual tiles.
            if (!this.mapSource) return 0;
            return this.mapSource.uniqueTiles[this.tileSource];
        }
        return this.tileSource;
    }

    renderPreview(target) {
        var tile = this.getTile();
        if (tile) {
            mainContext.translate(target.left + currentMap.tileSize / 2, target.top + currentMap.tileSize / 2);
            mainContext.scale(tile.xScale, tile.yScale);
            draw.image(mainContext, requireImage(tile.image),
                getTileSourceRectangle(tile),
                new Rectangle(-1 / 2, -1 / 2, 1, 1).scale(currentMap.tileSize)
            );
        } else {
            draw.fillRectangle(mainContext, target, 'white');
        }
    }

    renderHUD(context, target) {
        var tile = this.getTile();
        if (tile) {
            context.scale(tile.xScale || 1, tile.yScale || 1);
            draw.image(context, requireImage(tile.image), getTileSourceRectangle(tile), target);
        } else {
            draw.fillRectangle(context, target, 'white');
        }
    }
}
