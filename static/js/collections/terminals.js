define(["underscore", "backbone", "collections/synced", "models/terminal"], function(_, Backbone, SyncedCollection, Terminal) {
    return SyncedCollection.extend({
        model : Terminal,
        url: "/terminals"
    });
});