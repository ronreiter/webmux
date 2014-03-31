define(["views/term"], function(TerminalView) {

    var Tab = TerminalView.extend({
        events: {
            "click .tab": "clickTab",
            "keydown": "keyDown",
            "keypress": "keyPress",
            "click": "focus",
            "copy": "onCopy",
            "paste": "onPaste"
        },

        clickTab: function (ev) {
            if (ev.ctrlKey || ev.altKey || ev.metaKey || ev.shiftKey) {
                this.destroy();
            } else {
                this.focus();
            }
            return cancel(ev);
        },

        initialize : function(options) {
            this.window = options.window;

            // TODO: this is not the backbone way
            options.rows = this.window.model.get("rows");
            options.cols = this.window.model.get("cols");

            this.model.on("data", _.bind(this.write, this));
            this.model.on("destroy", this.remove, this);

            // TODO: remove
            this.window.on("resize", this.resize, this);

            this.window.model.on("change:rows", this.updateWindowSize, this);
            this.window.model.on("change:cols", this.updateWindowSize, this);

            TerminalView.prototype.initialize.apply(this, [options]);
        },

        updateWindowSize : function() {
            this.resize(this.window.model.get("cols"), this.window.model.get("rows"));
        },

        render : function() {
            // TODO: move this button outside of the view
            var button = document.createElement("div");
            button.className = "tab glyphicon glyphicon-record";

            // TODO: implement tabs properly
            // this.window.bar.appendChild(button);

            this.socket = app.socket;
            this.button = button;
            this.process = "";
            this.open();
            this.hookKeys();

            this.el.offsetLeft = this.window.model.get("x");
            this.el.offsetTop = this.window.model.get("y");

            // this.button.title = app.connections.get(this.model.get("connection_id")).get("host");

            // this.trigger("open");

            if (this.model.get("history")) {
                this.write(this.model.get("history"));
            }

            return this.el;
        },

        // We could just hook in `tab.on("data", ...)`
        // in the constructor, but this is faster.
        handler : function (data) {
            this.socket.trigger("data", this.model.id, data);
        },

        _write : TerminalView.prototype.write,

        write : function (data) {
            if (this.window.focused !== this) this.button.style.color = "red";
            return this._write(data);
        },

        _focus : TerminalView.prototype.focus,

        focus : function () {
            this.el.focus();
            // TODO: simplify focus
            //this.window.focused = this;
            //return;

            if (TerminalView.prototype.focusedTerminal === this) return;

            var win = this.window;

            // maybe move to Tab.prototype.switch
            if (win.focused !== this) {
                if (win.focused) {
                    if (win.focused.el.parentNode) {
                        win.focused.el.parentNode.removeChild(win.focused.el);
                    }
                    win.focused.button.style.fontWeight = "";
                }

                win.el.appendChild(this.el);
                win.focused = this;

                var connection = app.connections.get(this.model.get("connection_id"));

                var windowTitle = connection.get("name") + " (" + connection.get("user") + "@" + connection.get("host") + ")";

                // TODO: move this to the window, child should not change the property of the parent (emit an event)
                win.title.textContent = windowTitle;
                win.iconText.textContent = windowTitle;

                document.title = connection.get("name") + " - webmux";
                this.button.style.fontWeight = "bold";
                this.button.style.color = "";
            }

            this._focus();

            win.focus();

            this.trigger("focus");
        },

        __destroy : TerminalView.prototype.destroy,

        destroy : function () {
            splice(this.window.tabViews, this);

            if (this.window.focused === this) {
                this.window.previousTab();
            }

            this.__destroy();
        },

        hookKeys : function () {
            var self = this;

            this.on("request paste", function (key) {
                this.socket.trigger("request paste", function (err, text) {
                    if (err) return;
                    self.send(text);
                });
            });

            this.on("request create", function () {
                console.log("request create");
                // this.tty.createNewConnection(this.window);
            });

            this.on("request term", function (key) {
                if (this.window.tabViews[key]) {
                    this.window.tabViews[key].focus();
                }
            });

            this.on("request term next", function (key) {
                this.window.nextTab();
            });

            this.on("request term previous", function (key) {
                this.window.previousTab();
            });
        }
//
//        _ignoreNext : function () {
//            // Don"t send the next key.
//            var handler = this.handler;
//            this.handler = function () {
//                this.handler = handler;
//            };
//            var showCursor = this.showCursor;
//            this.showCursor = function () {
//                this.showCursor = showCursor;
//            };
//        },
//
//        scrollable : {
//            irssi: true,
//            man: true,
//            less: true,
//            htop: true,
//            top: true,
//            w3m: true,
//            lynx: true,
//            mocp: true
//        },
//
//        _bindMouse : TerminalView.prototype.bindMouse,
//
//        bindMouse : function () {
//            if (!TerminalView.programFeatures) return this._bindMouse();
//
//            // TODO: remove self
//            var self = this;
//
//            var wheelEvent = "onmousewheel" in window
//                ? "mousewheel"
//                : "DOMMouseScroll";
//
//            on(self.element, wheelEvent, function (ev) {
//                if (self.mouseEvents) return;
//                if (!Tab.scrollable[self.process]) return;
//
//                if ((ev.type === "mousewheel" && ev.wheelDeltaY > 0)
//                    || (ev.type === "DOMMouseScroll" && ev.detail < 0)) {
//                    // page up
//                    self.keyDown({keyCode: 33});
//                } else {
//                    // page down
//                    self.keyDown({keyCode: 34});
//                }
//
//                return cancel(ev);
//            });
//
//            return this._bindMouse();
//        }


    });


    return Tab;
});
