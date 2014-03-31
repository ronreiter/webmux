define(["underscore", "backbone", "views/conndialog"], function(_, Backbone, ConnectionDialog) {

    var ManageConnectionsDialog = ConnectionDialog.extend({
        className: "manage-connections-dialog",
        events: {
            "click .modal" : "remove",
            "click .close" : "remove",
            "click .close-button" : "remove",
            "click .reset" : "reset",
            "click .delete" : "deleteConnection",
            "click .btn-primary" : "save",
            "submit form" : "save",
            "click .connections option" : "chooseConnection",
            "change input" : "disableSelection",
            "change textarea" : "disableSelection"
        },
        initialize : function() {

        },

        render : function() {
            // template rendering
            var t = document.querySelector('#manage-connections-dialog-template');
            t.content.querySelector('.modal').style.background = 'rgba(0,0,0,0.5)';

            var clone = document.importNode(t.content, true);

            this.el.appendChild(clone);
            document.body.appendChild(this.el);

            this.connectionNameInput = this.el.querySelector("input[name=connection-name]");
            this.hostInput = this.el.querySelector("input[name=host]");
            this.portInput = this.el.querySelector("input[name=port]");
            this.userInput = this.el.querySelector("input[name=username]");
            this.passwordInput = this.el.querySelector("input[name=password]");
            this.privkeyInput = this.el.querySelector("textarea[name=privkey]");

            this.connectionList = this.el.querySelector(".connections");

            app.connections.on("destroy", this.onDestroy, this);

            if (app.connections.length == 0) {
                this.remove();
                return;
            }

            app.connections.each(_.bind(function(connection) {
                var connectionItem = document.createElement("option");
                connectionItem.textContent = connection.get("name");
                connectionItem.value = connection.id;
                this.connectionList.appendChild(connectionItem);
            }, this));


            this.connectionList.selectedIndex = 0;
            this.selectedConnectionId = this.connectionList.value;
            this.reset();

            this.error = this.el.querySelector(".error");
            this.error.style.display = "none";

        },

        disableSelection : function() {
            this.connectionList.disabled = true;
        },

        chooseConnection : function(e) {
            this.selectedConnectionId = e.target.value;
            this.reset();
        },

        reset : function() {
            var connection = app.connections.get(this.selectedConnectionId);

            this.connectionNameInput.value = connection.get("name");
            this.hostInput.value = connection.get("host");
            this.portInput.value = connection.get("port");
            this.userInput.value = connection.get("user");
            this.passwordInput.value = connection.get("password");
            this.privkeyInput.value = connection.get("privkey");

            this.connectionList.disabled = false;
        },

        save : function() {
            if (!this.validate()) {
                return false;
            }

            app.connections.get(this.selectedConnectionId).save({
                name : this.connectionNameInput.value,
                host : this.hostInput.value,
                user : this.userInput.value,
                password : this.passwordInput.value,
                port: this.portInput.value,
                privkey: this.privkeyInput.value
            }, {
                wait : true,
                success : _.bind(function() {
                    this.connectionList.disabled = false;
                }, this),
                error : _.bind(function() {
                    this.error.style.display = "block";
                    this.error.textContent = "There was an error updating the connection.";
                }, this)
            });

            return false;
        },

        deleteConnection : function() {
            app.connections.get(this.selectedConnectionId).destroy({wait: true});
        },

        onDestroy : function(model) {
            for (var i = 0; i < this.connectionList.length; i++) {
                if (this.connectionList[i].value == model.id) {
                    this.connectionList.remove(i);
                }
            }

            this.connectionList.remove(this.connectionList.selectedIndex);

            if (this.connectionList.length == 0) {
                this.remove();
            } else {
                this.connectionList.selectedIndex = 0;
                this.selectedConnectionId = this.connectionList.value;
                this.reset();
            }
        }

    });

    return ManageConnectionsDialog;
});
