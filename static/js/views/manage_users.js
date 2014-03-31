define(["underscore", "backbone"], function(_, Backbone) {
    var ManageUsersDialog = Backbone.View.extend({
        className: "manage-users-dialog",
        events: {
            "click .modal" : "remove",
            "click .close" : "remove",
            "click .close-button" : "remove",
            "click .reset" : "reset",
            "click .create" : "createUser",
            "click .delete" : "deleteUser",
            "click .btn-primary" : "save",
            "submit form" : "save",
            "change .users" : "chooseUser",
            "change input" : "editing",
            "change textarea" : "editing",
            "keypress input" : "editing",
            "focus input[name='user_password']" : "checkIfPasswordHashed"
        },

        checkIfPasswordHashed : function() {
            if (this.hashedPassword) {
                this.hashedPassword = false;
                this.passwordInput.value = "";
            }
        },

        initialize : function() {

        },

        render : function() {
            // template rendering
            var t = document.querySelector('#manage-users-dialog-template');
            t.content.querySelector('.modal').style.background = 'rgba(0,0,0,0.5)';

            var clone = document.importNode(t.content, true);

            this.el.appendChild(clone);
            document.body.appendChild(this.el);

            this.emailInput = this.el.querySelector("input[name=user_email]");
            this.passwordInput = this.el.querySelector("input[name=user_password]");
            this.isAdminInput = this.el.querySelector("input[name=is_admin]");

            this.userList = this.el.querySelector(".users");

            app.users.on("add", this.addUser, this);
            app.users.on("destroy", this.onDestroy, this);
            app.users.on("change", this.onChange, this);

            if (app.users.length == 0) {
                this.remove();
                return;
            }

            app.users.each(_.bind(this.addUser, this));

            this.userList.selectedIndex = 0;
            this.selectedUserId = this.userList.value;
            this.reset();

            this.error = this.el.querySelector(".error");
            this.error.style.display = "none";

        },

        onChange : function(user) {
            console.log(user.id);
            var userItem = this.el.querySelector(".users option[value='" + user.id + "']");
            if (userItem) {
                userItem.textContent = user.get("email");
            }
        },

        addUser : function(user) {
            var userItem = document.createElement("option");
            userItem.textContent = user.get("email") ? user.get("email") : "New User";
            userItem.value = user.id;
            this.userList.appendChild(userItem);
            this.userList.selectedIndex = this.userList.length - 1;
            this.selectedUserId = user.id;
            this.reset();

        },

        editing : function() {
            this.userList.disabled = true;
            this.el.querySelector(".btn-primary").disabled = false;
        },

        notEditing : function() {
            this.userList.disabled = false;
            this.el.querySelector(".btn-primary").disabled = true;
        },

        chooseUser : function(e) {
            this.selectedUserId = e.target.value;
            this.reset();
        },

        reset : function() {
            var user = app.users.get(this.selectedUserId);
            if (!user) return;

            this.emailInput.value = user.get("email");
            this.passwordInput.value = user.get("password");
            this.isAdminInput.checked = user.get("is_admin");

            if (user.get("logged_in_user")) {
                this.isAdminInput.disabled = true;
            }

            this.notEditing();
            this.hashedPassword = true;
        },

        validate : function() {
            if (!this.emailInput.validity.valid) {
                this.error.style.display = "block";
                this.error.textContent = this.emailInput.validationMessage;
                return false;
            }
            if (!this.passwordInput.value) {
                this.error.style.display = "block";
                this.error.textContent = "Password cannot be empty.";
                return false;
            }

            return true;
        },

        save : function() {
            if (!this.validate()) {
                return false;
            }

            if (!this.hashedPassword) {
                this.passwordInput.value = md5(this.passwordInput.value);
            }
            this.hashedPassword = true;

            app.users.get(this.selectedUserId).save({
                email : this.emailInput.value,
                password : this.passwordInput.value,
                is_admin : this.isAdminInput.checked
            }, {
                wait : true,
                success : _.bind(function() {
                    this.notEditing();
                    this.error.style.display = "none";
                }, this),
                error : _.bind(function() {
                    this.error.style.display = "block";
                    this.error.textContent = "There was an error updating the user.";
                }, this)
            });

            return false;
        },

        createUser : function() {
            app.users.create({
                "email": "",
                "password": "",
                "is_admin": false
            }, {
                wait: true
            });
        },

        deleteUser : function() {
            app.users.get(this.selectedUserId).destroy({wait: true});
        },

        onDestroy : function(model) {
            for (var i = 0; i < this.userList.length; i++) {
                if (this.userList[i].value == model.id) {
                    this.userList.remove(i);
                }
            }

            this.userList.remove(this.userList.selectedIndex);

            if (this.userList.length == 0) {
                this.remove();
            } else {
                this.userList.selectedIndex = 0;
                this.selectedUserId = this.userList.value;
                this.reset();
            }
        }

    });

    return ManageUsersDialog;
});
