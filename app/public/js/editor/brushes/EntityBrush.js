class EntityBrush {
    constructor(sourceEntity) {
        this.sourceEntity = sourceEntity;
        this.wasMouseDown = false;
    }

    createEntity() {
        var entity = cloneEntity(this.sourceEntity);
        // We store the brushClass so we know what brush to use when we select this entity.
        // Maybe we can put this as a static field on the entity class.
        entity.brushClass = this.constructor.name;
        return entity
    }

    update() {
        var mouseCoords = getMouseCoords();
        var pixelMouseCoords = getPixelMouseCoords();
        if (selectedEntity && isKeyDown(KEY_BACK_SPACE)) {
            sendDeleteEntity(selectedEntity.id);
            selectedEntity = null;
        }
        if (!this.wasMouseDown && mouseDown) {
            var lastSelected = selectedEntity, newSelectedEntity;
            localSprites.filter(sprite => (sprite instanceof Entity)).forEach(sprite => {
                if (sprite.getEditingHitBox().containsPoint(pixelMouseCoords[0], pixelMouseCoords[1])) {
                    newSelectedEntity = sprite;
                    return false;
                }
            });
            // Setting this prevents creating a new entity as a result of this mouse click
            // if they started clicking an existing entity.
            draggingEntity = newSelectedEntity;
            if (lastSelected === newSelectedEntity) {
                selectedEntity = null;
                currentBrush.wasMouseDown = true;
                return;
            } else if (newSelectedEntity) {
                selectEntity(newSelectedEntity);
                currentBrush.wasMouseDown = true;
                return;
            }
        }
        if (mouseDown) {
            if (!objectStartCoords && !draggingEntity) objectStartCoords = mouseCoords;
            objectLastCoords = mouseCoords;
        } else {
            draggingEntity = null;
            if (objectStartCoords) {
                var drawnRectangle = getDrawnRectangle(objectStartCoords, objectLastCoords, this.mapObject);
                // Don't do anything if the rectangle the selected is off screen
                if (drawnRectangle.overlapsRectangle(new Rectangle(0, 0, currentMap.width, currentMap.height), false)) {
                    this.onSelectRectangle(drawnRectangle);
                }
                objectStartCoords = null;
            }
        }
        if (rightMouseDown && pointIsInLevel(pixelMouseCoords[0], pixelMouseCoords[1])) {
            this.onSetTarget(pixelMouseCoords[0], pixelMouseCoords[1]);
        }
        this.wasMouseDown = mouseDown;
    }

    onSetTarget(pixelMouseCoords) {
        // No default behavior for setting target.
    }
    onSelectRectangle(drawnRectangle) {
        // No default behavior for selecting a rectangle.
    }
}
