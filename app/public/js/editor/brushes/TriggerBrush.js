class TriggerBrush extends EntityBrush {

    onSelectRectangle(drawnRectangle) {
        if (!selectedEntity) {
            selectedEntity = this.createEntity();
            var pixelMouseCoords = getPixelMouseCoords();
            selectedEntity.setTarget(pixelMouseCoords[0], pixelMouseCoords[1]);
            selectedEntity.hitBox = drawnRectangle.scale(currentMap.tileSize);
            sendCreateEntity(selectedEntity);
        } else {
            selectedEntity.hitBox = drawnRectangle.scale(currentMap.tileSize);
            sendUpdateEntity(selectedEntity);
        }
    }

    onSetTarget(x, y) {
        if (!selectedEntity) return;
        selectedEntity.setTarget(x, y);
        sendUpdateEntity(selectedEntity);
    }

    renderPreview(target) {
        if (selectedEntity) selectedEntity.renderPreview(target, objectStartCoords, objectLastCoords);
        else this.sourceEntity.renderPreview(target, objectStartCoords, objectLastCoords);
    }

    renderHUD(context, target) {
        this.sourceEntity.renderHUD(context, target);
    }
}
