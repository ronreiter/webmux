define(["backbone"], function(Backbone) {
    return Backbone.Collection.extend({
        initialize: function(models, options) {
            var namespace = this.url.replace("/", "");
            options.socket.syncedCollections[namespace] = this;
        }
    });
});