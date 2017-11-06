var classes = {
    Object, Rectangle, Entity, Trigger, TeleporterTrigger, ForceTrigger, SpawnTrigger, LifePowerup, AirDashPowerup, CoinPowerup,
    SuperJumpPowerup, ScoreBeacon, PointSpawner, SimpleSprite,
};

var cloneEntity = (entity) => {
    var clone = new classes[entity.constructor.name]();
    return Object.assign(clone, entity);
};

// Serialize an object so that it
var serializeEntity = (entity) => {
    // Return scalars as they are.
    if (entity === null || typeof entity !== 'object') {
        return entity;
    }
    // Serialize each entry of an array.
    if (entity instanceof Array) {
        return entity.map(serializeEntity);
    }
    // Images should be serialized as the original source used to load them.
    if (entity.constructor.name === 'HTMLImageElement') {
        if (!entity.originalSource) {
            throw new Error('Cannot serialize an image without an originalSource set.');
        }
        return entity.originalSource;
    }
    // Serialize each field on an object and assign the special __class__ field.
    var object = {};
    object.__class__ = entity.constructor.name;
    var entityClass = classes[object.__class__];
    if (!entityClass) {
        throw new Error(`Attempting to serialize instance of unspported class ${object.__class__}`);
    }
    if (entityClass.localFields) {
        entity = _.omit(entity, entityClass.localFields);
    }
    for (var i in entity) {
        object[i] = serializeEntity(entity[i]);
    }
    return object;
};

var unserializeEntity = (object) => {
    if (object === null || typeof object !== 'object') {
        return object;
    }
    // Serialize each entry of an array.
    if (object instanceof Array) {
        return object.map(unserializeEntity);
    }
    // Unserialize each field on the object.
    for (var i in object) {
        object[i] = unserializeEntity(object[i]);
    }
    if (!object.__class__) throw new Error("Missing __class__ on serialized entity.");
    // Instantiate the empty class.
    var entity = new classes[object.__class__]();
    delete object.__class__;
    // Fill it with th evalues from the serialized object.
    return Object.assign(entity, object);
};