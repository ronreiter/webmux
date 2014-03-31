define(["underscore", "backbone", "collections/synced", "models/connection"], function(_, Backbone, SyncedCollection, Connection) {
    return SyncedCollection.extend({
        model : Connection,
        url: "/connections"
    });
});