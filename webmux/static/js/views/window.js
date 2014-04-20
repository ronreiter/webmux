define(["underscore", "backbone", "views/tab"], function(_, Backbone, TabView) {

    var WindowView = Backbone.View.extend({
        className: "window",

        events: {
            "click .new-tab" : "newTab",
            "mousedown .grip" : "startResize",
            "mousedown .bar" : "mouseDown",
            "mousedown .title" : "mouseDown",
            "mouseup .bar" : "focus",
            "mouseup .terminal" : "focus",
            "click .minimize-button" : "toggleHide",
            "click .maximize-button" : "maximize",
            "click .close-button" : "killTerminal"
        },

        initialize: function() {
            this.tabViews = [];

            this.model.on("change:hidden", this.updateHidden, this);
            this.model.on("change:top", this.updateWindowPosition, this);
            this.model.on("change:left", this.updateWindowPosition, this);
            this.model.on("change:z_index", this.updateWindowIndex, this);
            this.model.on("destroy", this.removeWindow, this);

            _.bindAll(this, "move", "up", "moveResize", "upResize");
        },

        updateWindowPosition: function() {
            this.el.style.top = this.model.get("top") + "px";
            this.el.style.left = this.model.get("left") + "px";
        },

        updateWindowIndex: function() {
            this.el.style.zIndex = this.model.get("z_index");
        },

        toggleHide : function() {
            this.model.save("hidden", !this.model.get("hidden"));
        },

        updateHidden: function() {
            if (this.model.get("hidden")) {
                this.iconElement.style.display = "inline-block";
                this.el.style.display = "none";
            } else {
                this.iconElement.style.display = "none";
                this.el.style.display = "block";
            }
        },

        tabRemoved: function(model) {
            // TODO: perhaps move this to the model
            var window_id = this.model.id;
            var windowTerminals = app.terminals.filter(function(terminal) { return terminal.get("window_id") == window_id && terminal != model});
            if (windowTerminals.length == 0) {
                this.model.destroy();
            }
        },


        newTab : function(ev) {
            if (ev.ctrlKey || ev.altKey || ev.metaKey || ev.shiftKey) {
                this.focused.model.destroy();
            } else {
                app.terminals.create({
                    connection_id : this.focused.model.get("connection_id"),
                    window_id : this.focused.model.get("window_id")
                });
            }
            return cancel(ev);
        },

        startResize : function(ev) {
            this.focus();
            this.resizing(ev);
            return cancel(ev);
        },

        mouseDown : function(ev) {
            this.focus();

            cancel(ev);

            if (new Date - this.last < 600) {
                return this.maximize();
            }
            this.last = new Date;

            this.drag(ev);

            return cancel(ev);
        },

        render : function () {
            var grip = document.createElement("div");
            grip.className = "grip";

            var bar = document.createElement("div");
            bar.className = "bar";

            // TODO: implement tabs proplery (use a separate bar, use full text, manage in window, listen on event
            // TODO: if content has changed from window)
            // var button = document.createElement("i");
            // button.className = "tab new-tab glyphicon glyphicon-plus-sign";
            // button.title = "New tab";

            // TODO: create a window template
            this.closeButton = document.createElement("i");
            this.minimizeButton = document.createElement("i");
            this.maximizeButton = document.createElement("i");

            this.closeButton.className = "tab close-button glyphicon glyphicon-remove-sign";
            this.minimizeButton.className = "tab minimize-button glyphicon glyphicon-minus-sign";
            this.maximizeButton.className = "tab maximize-button glyphicon glyphicon-plus-sign";

            var title = document.createElement("div");
            title.className = "title";
            title.innerHTML = "";

            this.grip = grip;
            this.bar = bar;
            // this.button = button;
            this.title = title;

            this.tabs = [];
            this.focused = null;

            this.iconImage = document.createElement("img");
            this.iconImage.src = "/static/img/logo.png";

            // TODO: bind text content to terminal
            this.iconText = document.createElement("div");
            this.iconText.textContent = "";

            this.iconElement = document.createElement("div");
            this.iconElement.className = "window-icon";
            this.iconElement.appendChild(this.iconImage);
            this.iconElement.appendChild(this.iconText);

            // TODO: move this view logic to the app
            app.windowIcons.appendChild(this.iconElement);
            this.iconElement.addEventListener("dblclick", _.bind(this.toggleHide, this));

            this.el.appendChild(grip);
            this.el.appendChild(bar);
            bar.appendChild(title);

            bar.appendChild(this.closeButton);
            bar.appendChild(this.minimizeButton);
            bar.appendChild(this.maximizeButton);

            // bar.appendChild(button);
            this.updateHidden();
            this.updateWindowPosition();

            return this.el;
        },

        focus : function () {
            var topmostWindow = this.model;

            app.windows.each(function(win) {
                if (win.get("z_index") > topmostWindow.get("z_index")) {
                    topmostWindow = win;
                }
            });

            if (topmostWindow != this.model) {
                this.model.save("z_index", topmostWindow.get("z_index") + 1);
            }

            // Focus Foreground Tab
            this.focused.focus();
        },

        destroy : function () {
            if (this.destroyed) return;
            this.destroyed = true;

            if (this.m) this.minimize();

            // delete this.tty.windows[this.id];

            this.el.parentNode.removeChild(this.el);

            this.each(function (term) {
                term.destroy();
            });
        },

        move : function(ev) {
            var el = this.el;
            var drag = this.currentDrag;

            var newX = (drag.left + ev.pageX - drag.pageX);
            var newY = (drag.top + ev.pageY - drag.pageY);

            if (newX < 0) newX = 0;
            if (newY < 50) newY = 50;

            el.style.left = newX + "px";
            el.style.top = newY + "px";
        },

        up : function() {

            this.el.style.opacity = "";
            this.el.style.cursor = "";
            this.title.style.cursor = "";
            this.bar.style.cursor = "";

            off(window, "mousemove", this.move);
            off(window, "mouseup", this.up);

            this.model.save({
                left: this.el.offsetLeft,
                top: this.el.offsetTop
            })
        },

        drag : function (ev) {

            this.currentDrag = {
                left: this.el.offsetLeft,
                top: this.el.offsetTop,
                pageX: ev.pageX,
                pageY: ev.pageY
            };

            if (this.m) return;

            this.el.style.opacity = "0.60";
            this.title.style.cursor = "move";
            this.bar.style.cursor = "move";
            //document.body.style.cursor = "move";

            // TODO: backbone-ify
            on(window, "mousemove", this.move);
            on(window, "mouseup", this.up);
        },

        resizing : function (ev) {
            if (this.m) delete this.m;

            this.resizeInitialSize = {
                w: this.el.clientWidth,
                h: this.el.clientHeight
            };

            // TODO: use class instead of styles
            this.el.style.overflow = "hidden";
            this.el.style.opacity = "0.70";

            document.body.style.cursor = "se-resize";

            on(document, "mousemove", this.moveResize);
            on(document, "mouseup", this.upResize);
        },

        moveResize : function(ev) {
            var x = ev.pageX - this.el.offsetLeft;
            var y = ev.pageY - this.el.offsetTop;
            this.el.style.width = x + "px";
            this.el.style.height = y + "px";
        },

        upResize : function(ev) {
            var x, y;

            x = this.el.clientWidth / this.resizeInitialSize.w;
            y = this.el.clientHeight / this.resizeInitialSize.h;
            x = (x * this.focused.cols) | 0;
            y = (y * this.focused.rows) | 0;

            this.resize(x, y);

            this.el.style.width = "";
            this.el.style.height = "";

            // TODO: use class instead of styles
            this.el.style.overflow = "";
            this.el.style.opacity = "";

            document.body.style.cursor = "";
            this.focused.el.style.height = "";

            off(document, "mousemove", this.moveResize);
            off(document, "mouseup", this.upResize);
        },

        maximize : function () {
            if (this.m) return this.minimize();

            this.m = {
                cols: this.focused.cols,
                rows: this.focused.rows,
                left: this.el.offsetLeft,
                top: this.el.offsetTop,
                root: document.body.className
            };

            window.scrollTo(0, 0);

            var root = document.body;

            var x = root.clientWidth / this.focused.el.offsetWidth;
            var y = (root.clientHeight - 50) / this.focused.el.offsetHeight;
            x = (x * this.focused.cols) | 0;
            y = (y * this.focused.rows) | 0;

            this.el.style.left = "0px";
            this.el.style.top = "50px";
            this.el.style.width = "100%";
            this.el.style.height = "100%";
            this.el.style.borderRadius = "0";
            this.focused.el.style.width = "100%";
            this.focused.el.style.height = "100%";
            this.el.style.boxSizing = "border-box";
            this.grip.style.display = "none";
            root.className = "maximized";

            this.resize(x, y);

            this.trigger("maximize");
        },

        minimize : function () {
            this.el.style.left = this.m.left + "px";
            this.el.style.top = this.m.top + "px";
            this.el.style.width = "";
            this.el.style.height = "";
            this.el.style.borderRadius = "5px";
            this.focused.el.style.width = "";
            this.focused.el.style.height = "";
            this.el.style.boxSizing = "";
            this.grip.style.display = "";
            document.body.className = this.m.root;

            this.resize(this.m.cols, this.m.rows);

            this.trigger("minimize");

            delete this.m;
        },

        resize : function (cols, rows) {
            this.model.save({
                cols: cols,
                rows: rows
            });

              this.trigger("resize", cols, rows);
        },

        killTerminal : function() {
            this.focused.model.destroy();
        },

        each : function (func) {
            var i = this.tabs.length;
            while (i--) {
                func(this.tabs[i], i);
            }
        },

        createTab : function (model) {
            var tabView = new TabView({
                model: model,
                window: this
            });

            tabView.render();
            model.on("destroy", this.tabRemoved, this);

            this.tabViews.push(tabView);

            this.focus();
        },

        focusTab : function (next) {
            var tabViews = this.tabViews
                , i = indexOf(tabViews, this.focused)
                , l = tabViews.length;

            if (!next) {
                if (tabViews[--i]) return tabViews[i].focus();
                if (tabViews[--l]) return tabViews[l].focus();
            } else {
                if (tabViews[++i]) return tabViews[i].focus();
                if (tabViews[0]) return tabViews[0].focus();
            }

            return this.focused && this.focused.focus();
        },

        nextTab : function () {
            return this.focusTab(true);
        },

        previousTab : function () {
            return this.focusTab(false);
        },

        removeWindow : function() {
            app.windowIcons.removeChild(this.iconElement);
            this.remove();
        }

    });

    return WindowView;
});