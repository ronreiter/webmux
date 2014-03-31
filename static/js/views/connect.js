define(["underscore", "backbone", "views/conndialog"], function(_, Backbone, ConnectionDialog) {

    var ConnectDialog = ConnectionDialog.extend({
        className: "connect-dialog",
        events: {
            "click .modal" : "remove",
            "click .close" : "remove",
            "click .close-button" : "remove",
            "click .btn-primary" : "submit",
            "change input[name=privkey-upload]" : "uploadKey",
            "submit form" : "submit",
            "dragover textarea[name=privkey]" : "dragOver",
            "dragleave textarea[name=privkey]" : "dragLeave",
            "drop textarea[name=privkey]" : "drop"

        },
        render : function() {
            // template rendering
            var t = document.querySelector('#connect-dialog-template');
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

            this.error = this.el.querySelector(".error");
            this.error.style.display = "none";

        },

        submit : function() {
            if (!this.validate()) {
                return false;
            }

            this.createConnection({
                name : this.connectionNameInput.value,
                host : this.hostInput.value,
                user : this.userInput.value,
                password : this.passwordInput.value,
                port: this.portInput.value,
                privkey: this.privkeyInput.value
            });

            this.remove();
            return false;
        },

        createConnection : function(connectionDetails) {
            app.connections.create(connectionDetails, {
                wait: true,
                success: _.bind(function() {
                    this.remove();
                }, this),
                error: _.bind(function() {
                    this.error.style.display = "block";
                    this.error.textContent = "There was an error adding the new connection.";
                }, this)
            });
        }

    });

    return ConnectDialog;
});
