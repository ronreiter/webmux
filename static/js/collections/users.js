define(["underscore", "backbone", "collections/synced", "models/user"], function(_, Backbone, SyncedCollection, User) {
    return SyncedCollection.extend({
        model : User,
        url: "/users"
    });
});