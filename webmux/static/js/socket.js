/*
    SockJS to SocketIO emulation interface

    Copyright 2014, Ron Reiter
 */
define(["underscore", "backbone", "sockjs"], function(_, Backbone, SockJS) {
    Backbone.socket = null;

    Backbone.sync = function (method, model, options) {
        var params = _.extend({}, options)

        if (params.url) {
            params.url = _.result(params, 'url');
        } else {
            params.url = _.result(model, 'url') || urlError();
        }

        var cmd = params.url.split('/')
            , namespace = (cmd[0] !== '') ? cmd[0] : cmd[1]; // if leading slash, ignore

        if ( !params.data && model ) {
            params.data = params.attrs || model.toJSON(options) || {};
        }

        if (params.patch === true && params.data.id == null && model) {
            params.data.id = model.id;
        }

        //since Backbone version 1.0.0 all events are raised in methods 'fetch', 'save', 'remove' etc

        var defer = $.Deferred();
        Backbone.socket.trigger("sync", namespace, method, params.data, function (err, data) {
            if (err) {
                if(options.error) options.error(err);
                defer.reject();
            } else {
                if(options.success) options.success(data);
                defer.resolve();
            }
        });

        var promise = defer.promise();
        model.trigger('request', model, promise, options);
        return promise;
    };

    var Socket = function (path, callback) {
        var sock = new SockJS(path);
        var callbacks = {};
        var retvalCallbacks = {};
        var counter = 1;
        var self = this;

        sock.onopen = function () {
            if (callback) callback();
        };

        sock.onmessage = function (e) {
            var message = JSON.parse(e.data);
            if (message.callback && retvalCallbacks[message.callback]) {
                retvalCallbacks[message.callback].apply(self, message.args);
                delete retvalCallbacks[message.callback];
            } else {
                callbacks[message.type].apply(self, message.args);
            }
        };

        sock.onclose = function () {
            console.log("disconnected");
        };

        this.on = function (type, callback) {
            callbacks[type] = callback;
        };

        this.trigger = function (type) {
            var args = [];
            for (var i = 1; i < arguments.length; i++) {
                if (typeof arguments[i] != "function") {
                    args.push(arguments[i]);
                } else {
                    retvalCallbacks[counter] = arguments[i];
                }
            }

            var sendData = {
                type: type,
                args: args
            };

            if (retvalCallbacks[counter]) {
                sendData.callback = counter;
            }

            sock.send(JSON.stringify(sendData));

            counter += 1;
        }
    };

    return {
        connect : function(path, callback) {
            Backbone.socket = new Socket(path, callback);
            Backbone.socket.on("sync", function(namespace, method, data) {
                console.log(namespace, method, data);
                if (!data) return;
                var collection = Backbone.socket.syncedCollections[namespace];
                var model = collection.get(data.id);
                switch(method) {
                    case "create":
                        // create only if model does not exist
                        if (!model) {
                            collection.create(data);
                        }
                        break;
                    case "update":
                        if (model) {
                            model.set(data);
                        }
                        break;
                    case "delete":
                        if (model) {
                            model.destroy();
                        }
                        break;
                }
            });
            Backbone.socket.syncedCollections = {};

            return Backbone.socket;
        }
    };
});
