class DoorTriggerBrush extends TriggerBrush {

    createEntity() {
        var entity = super.createEntity();
        // Use the currently selected zone Id when creating a new door.
        entity.setZoneId(getSelectedCheckPointId());
        var checkPointId = getSelectedCheckPointId();
        if (checkPointId === 'custom') entity.setCheckPointId(null);
        else entity.setCheckPointId(checkPointId);
        // Set targetX/targetY either way. If for some reason the check point is deleted
        // we can fall back to these.
        entity.setTarget(
            Number($('.js-locationSelectField .js-x').val()),
            Number($('.js-locationSelectField .js-y').val())
        );
        return entity
    }

    onSelectLocation(checkPointId, targetX, targetY) {
        if (!selectedEntity) return;
        if (checkPointId === 'custom') selectedEntity.setCheckPointId(null);
        else selectedEntity.setCheckPointId(checkPointId);
        // Set targetX/targetY either way. If for some reason the check point is deleted
        // we can fall back to these.
        selectedEntity.setTarget(targetX, targetY);
        checkToUpdateEntity(selectedEntity);
    }

    onSelectZone(zoneId) {
        if (!selectedEntity) return;
        selectedEntity.setZoneId(zoneId);
        selectedEntity.setCheckPointId(null);
        selectedEntity.setTarget(64, 64);
        checkToUpdateEntity(selectedEntity);
    }

    onSetTarget(x, y) {
        // Door target cannot be set on the current map, you have to use the
        // zone+checkPoint dropdowns on the right panel to set its target.
    }
}
