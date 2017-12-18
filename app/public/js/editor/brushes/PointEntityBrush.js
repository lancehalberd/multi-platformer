class PointEntityBrush extends EntityBrush {

    onSetTarget(x, y) {
        if (!selectedEntity) {
            selectedEntity = this.createEntity();
            selectedEntity.setTarget(x, y);
            sendCreateEntity(selectedEntity);
        } else {
            selectedEntity.setTarget(x, y);
            checkToUpdateEntity(selectedEntity);
        }
    }

    renderPreview(target) {
        var pixelMouseCoords = getPixelMouseCoords();
        if (selectedEntity) selectedEntity.renderPreview(pixelMouseCoords[0], pixelMouseCoords[1]);
        else this.sourceEntity.renderPreview(pixelMouseCoords[0], pixelMouseCoords[1]);
    }

    renderHUD(context, target) {
        this.sourceEntity.renderHUD(context, target);
    }
}
