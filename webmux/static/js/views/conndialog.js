define(["underscore", "backbone"], function(_, Backbone) {

    var ConnectionDialog = Backbone.View.extend({

        dragOver : function(e) {
            e.stopPropagation();
            e.preventDefault();
            $(e.target).addClass("hover");
        },

        dragLeave : function(e) {
            e.stopPropagation();
            e.preventDefault();
            $(e.target).removeClass("hover");
        },

        drop : function(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }

            this.getKeyFromFile(e.originalEvent.dataTransfer.files);
            $(e.target).removeClass("hover");
            return false;
        },

        uploadKey : function() {
            var privkeyUpload = this.el.querySelector("[name=privkey-upload]").files;
            this.getKeyFromFile(privkeyUpload);

        },

        getKeyFromFile : function(filesObject) {
            var privkey = this.el.querySelector("[name=privkey]");
            if (filesObject.length == 0) {
                return;
            }

            var reader = new FileReader();
            reader.onloadend = _.bind(function(evt) {
                if (evt.target.readyState == FileReader.DONE) {
                    privkey.value = evt.target.result;
                }
            }, this);

            reader.readAsText(filesObject[0]);
        },

        validate : function() {
            if (!this.passwordInput.value && !this.privkeyInput.value) {
                this.error.style.display = "block";
                this.error.textContent = "Please use either a password or a private key.";
                return false;
            }

            return true;
        }

    });

    return ConnectionDialog;
});