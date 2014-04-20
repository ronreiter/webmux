define([
    "jquery",
    "underscore",
    "backbone",
    "socket",
    "views/window",
    "views/connect",
    "views/manage_connections",
    "views/manage_users",
    "collections/connections",
    "collections/windows",
    "collections/terminals",
    "collections/users"

], function(
    $,
    _,
    Backbone,
    socket,
    WindowView,
    ConnectDialog,
    ManageConnectionsDialog,
    ManageUsersDialog,
    Connections,
    Windows,
    Terminals,
    Users) {

    var App = Backbone.View.extend({
        el: document.body,

        events : {
            "click #new-connection" : "newConnection",
            "click #manage-connections" : "manageConnections",
            "click #manage-users" : "manageUsers",
            "click .connection a" : "connect"
        },

        initialize : function() {
            _.bindAll(this, "addConnection", "addWindow", "addTerminal", "connect");
        },

        addConnection : function(connection) {

            var connectionListItem = document.createElement("li");
            connectionListItem.className = "connection";
            connectionListItem.dataset.id = connection.id;

            var connectionLink = document.createElement("a");
            connectionLink.textContent = connection.get("name");
            connectionLink.style.cursor = "pointer";

            connectionListItem.appendChild(connectionLink);
            this.connectionsList.appendChild(connectionListItem);

        },

        removeConnection : function(connection) {
            this.connectionsList.removeChild(this.el.querySelector("li[data-id='" + connection.id + "']"));
        },

        connect : function(e) {
            var connection_id = $(e.target).parents("li").data("id");

            // when adding a new window, create a new terminal with the selected connection ID
            this.windows.once("add", _.bind(function(window) {
                // create a new terminal with the selected connection details
                this.terminals.create({
                    connection_id : connection_id,
                    window_id : window.id
                }, { wait: true });
            }, this));

            // create a new window (will trigger the terminal creation when window is created
            this.windows.create({
                cols: 80,
                rows: 25,
                top: 50,
                left: 10,
                hidden: false
            }, { wait: true });

        },

        render : function () {
            this.windowViews = {};
            this.lastZIndex = 0;

            this.connectionsList = document.querySelector(".connections");
            this.windowIcons = document.querySelector(".window-icons");

            this.socket = socket.connect("/terminal", _.bind(this.onConnect, this));
        },

        onConnect : function() {
            this.socket.on("data", _.bind(this.dataReceived, this));
            this.socket.on("connection_closed", _.bind(this.connectionClosed, this));
            this.socket.on("kill", _.bind(this.killTerminal, this));

            this.connections = new Connections([], {socket: this.socket});
            this.connections.on("add", this.addConnection, this);
            this.connections.on("remove", this.removeConnection, this);

            this.windows = new Windows([], {socket: this.socket});
            this.windows.on("add", this.addWindow, this);

            this.terminals = new Terminals([], {socket: this.socket});
            this.terminals.on("add", this.addTerminal, this);

            this.users = new Users([], {socket: this.socket});
            this.users.fetch();

            // TODO: how do we chain the calls properly with 'this' being us?
            this.connections.fetch().then(_.bind(function() {
                this.windows.fetch().then(_.bind(function() {
                    this.terminals.fetch();
                }, this));
            }, this))

        },

        addWindow : function(model) {
            var windowView = new WindowView({
                parent: this,
                model: model
            });

            this.windowViews[model.id] = windowView;

            // find the topmost z-index
            if (model.get("z_index") > this.lastZIndex) {
                this.lastZIndex = model.get("z_index");
            }

            document.body.appendChild(windowView.render());
        },

        // TODO: move this function inside the window, and filter out only the relevant terminals
        addTerminal : function(model) {
            this.windowViews[model.get("window_id")].createTab(model);
        },

        dataReceived : function (id, data) {
            this.terminals.get(id).trigger("data", data);
        },

        connectionClosed : function (id) {
            this.terminals.get(id).destroy();
        },

        killTerminal : function (id) {
            this.terminals.remove(id);
        },

        newConnection : function() {
            this.connectDialog = new ConnectDialog();
            this.connectDialog.render();
        },

        manageConnections : function() {
            this.connectDialog = new ManageConnectionsDialog();
            this.connectDialog.render();
        },

        manageUsers : function() {
            this.userDialog = new ManageUsersDialog();
            this.userDialog.render();
        }

    });

    return App;

});
