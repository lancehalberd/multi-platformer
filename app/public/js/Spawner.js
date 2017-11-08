
class PointSpawner extends Entity {

    constructor(spawnSource, cooldownInSeconds) {
        super();
        this.spawnSource = spawnSource;
        this.cooldownInSeconds = cooldownInSeconds;
        // This could be set to allow more than one creature spawned at once.
        this.limit = 1;
        this.children = [];
        // This is just used for drawing the preview while editing.
        this.hitBox = new Rectangle(0, 0, 32, 32);
    }

    getEditingHitBox() {
        return this.hitBox;
    }

    isOnCooldown() {
        return now() < this.onCooldownUntil;
    }

    update() {
        // Filter out children that have been removed.
        this.children = this.children.filter(child => !child.shouldBeRemoved);
        // spawner is inactive when it has reached the max number of simultaneous spawns.
        if (this.children.length < this.limit) {
            if (this.isOnCooldown()) {
                return;
            }
            var spawn = cloneEntity(this.spawnSource);
            spawn.spawner = this;
            spawn.x = this.x;
            spawn.y = this.y;
            localSprites.push(spawn);
            this.children.push(spawn);
        }
        if (this.cooldownInSeconds) {
            this.onCooldownUntil = now() + this.cooldownInSeconds * 1000;
        }
    }

    render() {
        // Spawners don't render anything to the screen by default.
        // While editing, draw the spawner to the screen using the
        // same method we draw the brush preview.
        if (isEditing) {
            this.hitBox = this.hitBox.moveCenterTo(this.x, this.y);
            this.renderPreview(this.x, this.y);
            if (selectedTrigger === this) this.renderSelectedBox();
        }
    }

    // Methods used by editor:
    setTarget(x, y) {
        // Don't update if the coords are the same as the last update.
        if (this.x === x && this.y === y) return;
        this.x = x;
        this.y = y;
        this.dirty = true;
        this.hitBox = this.hitBox.moveCenterTo(this.x, this.y);
    }

    renderPreview(x, y) {
        this.renderHUD(this.hitBox.moveCenterTo(x, y));
    }

    renderHUD(target) {
        if (this.spawnSource.renderHUD) this.spawnSource.renderHUD(target);
    }
}
PointSpawner.localFields = ['children', 'hitBox', 'onCooldownUntil']
