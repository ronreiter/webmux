define(["underscore", "backbone", "collections/synced", "models/window"], function(_, Backbone, SyncedCollection, Window) {
    return SyncedCollection.extend({
        model : Window,
        url: "/windows"
    });
});