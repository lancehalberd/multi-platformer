class ZonePalette {
    constructor($container, isMainPalette = true) {
        this.$container = $container;
        this.$tileBrushes = this.$container.find('.js-tileBrushes');
        this.$specialBrushes = this.$container.find('.js-specialBrushes');
    }

    // This will return true if the palette changes as the result of setting the zoneId.
    setZoneId(zoneId) {
        if (this.zoneId === zoneId) return false;
        this.zoneId = zoneId;
        return this.updateBrushes(true);
    }

    // By default we show all brushes, but the foreign tile palette won't show brushes
    // already present in the main tile palette.
    showBrush(brush) {
        return true;
    }

    checkToUpdateBrushes(zoneId) {
        if (this.zoneId !== zoneId) {
            return this.setZoneId(zoneId);
        }
        return this.updateBrushes(false);
    }

    updateBrushes(fromScratch = false) {
        if (fromScratch) {
            this.$tileBrushes.empty();
            this.$specialBrushes.empty();
        }
        if (!this.zoneId) return true;
        var zone = loadedZonesById[this.zoneId];
        if (!zone) {
            requestZoneData(this.zoneId);
            return false;
        }
        var didUpdate = false;
        for (var n = this.$tileBrushes.children().length; n < zone.uniqueTiles.length; n++) {
            var brush = new TileBrush(n, zone);
            if (!this.showBrush(brush)) continue;
            this.$tileBrushes.append(createBrushPreviewElement(brush));
            didUpdate = true;
        }
        for (var n = this.$specialBrushes.children().length; n < (zone.brushes || []).length; n++) {
            var brushData = zone.brushes[n];
            var brushClass = classes[brushData.brushClass];
            try {
                if (!brushClass) throw new Error(`Missing brush class: '${brushData.brushClass}'`);
                if (!brushClass.loadBrush) throw new Error(`Brush '${brushData.brushClass}' is missing loadBrush method`);
                var brush = brushClass.loadBrush(zone, brushData);
                brush.brushIndex = n;
                if (!this.showBrush(brush)) continue;
                this.$specialBrushes.append(createBrushPreviewElement(brush));
                didUpdate = true;
            } catch (error) {
                console.log (error);
            }
        }
        return didUpdate;
    }

}

class MainZonePalette extends ZonePalette {
    constructor($container) {
        super($container);
        this.$newTileButton = this.$container.find('.js-newTile');
        this.$saveTileButton = this.$container.find('.js-saveTile');
        this.$cancelButton = this.$container.find('.js-cancelTile');
        this.$deleteButton = this.$container.find('.js-deleteTile');
        this.$saveBrushButton = this.$container.find('.js-saveBrush');
        this.$deleteBrushButton = this.$container.find('.js-deleteBrush');

        this.$cancelButton.on('click', () => this.cancelCreatingNewTile());

        this.$deleteButton.on('click', () => {
            if (!this.canDeleteCurrentBrush()) return;
            var uniqueTileIndex = currentMap.hash[hashObject(currentBrush.getTile())];
            if (confirm('Are you sure you want to delete this tile from this zone? Existing instances will be replaced with blank tiles.')) {
                sendData({action: 'deleteTileFromPalette', uniqueTileIndex});
            }
        });

        this.$newTileButton.on('click', () => {
            var currentTile = currentBrush.getTile ? currentBrush.getTile() : null;
            if (currentTile) {
                this.newTile = Object.assign({}, currentTile);
            } else {
                this.newTile = {image: getSelectedTileSource(), x:0, y:0, size:16, properties: 0};
            }
            previousBrush = currentBrush;
            selectBrush(new TileBrush(this.newTile));
            selectingTileGraphic = true;
            this.$newTileButton.hide();
            this.$deleteButton.hide();
            this.$saveTileButton.show();
            this.$cancelButton.show();
        });
        this.$saveTileButton.on('click', () => {
            var newKey = hashObject(this.newTile);
            // If the tile they attempt to save already exists, just cancel creation
            // and set the brush to match the existing tile.
            if (currentMap.hash[newKey]) {
                this.cancelCreatingNewTile(false);
                selectBrush(new TileBrush(currentMap.hash[newKey]));
                return;
            }
            sendData({action: 'addTileToPalette', newTile: this.newTile});
        });
        this.$saveBrushButton.on('click', () => {
            if (currentBrush.saveBrush) currentBrush.saveBrush();
        });
        this.$deleteBrushButton.on('click', () => {
            if (currentBrush.brushIndex >= 0 && currentBrush.mapSource === currentMap) {
                sendData({action: 'removeBrushFromPalette', brushIndex: currentBrush.brushIndex});
            }
        });

        this.newTile = null;
    }

    cancelCreatingNewTile(revertBrush = false) {
        this.newTile = null;
        selectingTileGraphic = false;
        if (revertBrush && previousBrush) {
            selectBrush(previousBrush);
        }
        this.$saveTileButton.hide();
        this.$cancelButton.hide();
        this.$newTileButton.show();
        this.$deleteButton.toggle(this.canDeleteCurrentBrush());
    }

    canDeleteCurrentBrush() {
        // Can't delete a brush while defining a new brush (use discard action instead).
        if (this.newTile) return false;
        // Cannot currently delete brushes with no getTile method.
        if (!currentBrush.getTile) return false;
        var tile = currentBrush.getTile();
        if (!tile) return false;
        var uniqueTileIndex = currentMap.hash[hashObject(tile)];
        if (!uniqueTileIndex) return false;
        return true;
    }

    onChangeBrush() {
        this.$deleteButton.toggle(this.canDeleteCurrentBrush());
        // Show the save brush button if this brush has a saveBrush method.
        this.$saveBrushButton.toggle(!!currentBrush.saveBrush);
        this.$deleteBrushButton.toggle(currentBrush.brushIndex >= 0 && currentBrush.mapSource === currentMap)
    }
}

class ForeignZonePalette extends ZonePalette {

    constructor($container) {
        super($container);
        this.$zoneSelect = $('.js-zoneSelect');
        this.$zoneSelect.on('change', () => {
            this.setZoneId(this.$zoneSelect.val());
        });
    }

    showBrush(brush) {
        if (brush instanceof TileBrush) {
            // Don't display tile brushes in the secondary palette that
            // are already in the primary palette.
            var tile = brush.getTile();
            return tile && !currentMap.hash[hashObject(tile)];
        }
        if (brush instanceof CloneBrush) {
            // TODO: return false if this CloneBrush matches a CloneBrush
            // from the primary palette.
            return true;
        }
        // Handle other special brushes here as we add the ability to save them to.
        return true;
    }
}


if (typeof(module) !== 'undefined') {
    module.exports = {
        ZonePalette,
    };
}
