var classes = {
    Object, Rectangle, Trigger, TeleporterTrigger, ForceTrigger, SpawnTrigger, LifePowerup, AirDashPowerup,
};

var cloneEntity = (entity) => {
    var clone = new classes[entity.constructor.name]();
    return Object.assign(clone, entity);
};

// Serialize an object so that it
var serializeEntity = (entity) => {
    // Return scalars as they are.
    if (typeof entity !== 'object') {
        return entity;
    }
    // Serialize each entry of an array.
    if (entity instanceof Array) {
        return entity.map(serializeEntity);
    }
    // Serialize each field on an object and assign the special __class__ field.
    var object = {};
    for (var i in entity) {
        object[i] = serializeEntity(entity[i]);
    }
    object.__class__ = entity.constructor.name;
    if (!classes[object.__class__]) {
        throw new Error(`Attempting to serialize instance of unspported class ${object.__class__}`);
    }
    return object;
};

var unserializeEntity = (object) => {
    if (typeof object !== 'object') {
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