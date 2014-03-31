from sqlobject import *
from sqlobject.inheritance import InheritableSQLObject

from webmux.ssh import SSH
from webmux.web_terminal import WebTerminal

from twisted.python import log

import hashlib


sqlhub.processConnection = connectionForURI('sqlite:webmux.db')
factory = None

MAX_TERM_HISTORY = 10000


class User(SQLObject):
    email = StringCol()
    password = StringCol()
    is_admin = BoolCol()
    #desktops = RelatedJoin('Desktop', joinColumn='user', otherColumn='desktop', intermediateTable='desktop_users')

    @classmethod
    def login(cls, email, password):
        users = User.selectBy(email=email, password=hashlib.md5(password).hexdigest())
        if users.count():
            return users[0]

    @classmethod
    def signup(cls, email, password):
        num_users = User.select().count()

        users = cls.selectBy(email=email)

        if users.count():
            raise Exception("Can't sign up, user already exists")

        is_admin = True if num_users == 0 else False
        new_user = User(
            email=email,
            password=hashlib.md5(password).hexdigest(),
            is_admin=is_admin
        )

        return new_user

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "password": self.password,
            "is_admin": self.is_admin,
        }

    @classmethod
    def read_collection(cls, protocol):
        # TODO: check if we are an admin

        return [x.serialize() for x in cls.select()]

    @classmethod
    def create_model(cls, data, protocol):
        # TODO: check if we are an admin

        user = User(
            email=data["email"],
            password=data["password"],
            is_admin=data["is_admin"]
        )

        return user.serialize()

    @classmethod
    def update_model(cls, data, protocol):
        # TODO: check if we are an admin

        model = cls.get(data["id"])
        model.email = data["email"]
        model.password = data["password"]
        model.is_admin = data["is_admin"]

        return model.serialize()

    @classmethod
    def delete_model(cls, user_id, protocol):
        # TODO: check if we are an admin

        User.delete(user_id)
        return True

class Connection(SQLObject):
    name = StringCol()
    user = StringCol()
    password = StringCol()
    host = StringCol()
    port = IntCol()
    privkey = StringCol()

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "user": self.user,
            "password": self.password,
            "host": self.host,
            "port": self.port,
            "privkey": self.privkey,
        }

    @classmethod
    def read_collection(cls, protocol):
        return [x.serialize() for x in cls.select()]

    @classmethod
    def create_model(cls, data, protocol):
        if not data["user"]:
            raise Exception("No user provided!")

        if not data["privkey"] and not data["password"]:
            raise Exception("No authentication method!")

        model = Connection(
            name=data["name"],
            user=data["user"],
            password=data["password"],
            host=data["host"],
            port=int(data["port"]),
            privkey=data["privkey"],
        )
        return model.serialize()

    @classmethod
    def update_model(cls, data, protocol):
        model = cls.get(data["id"])
        model.name = data["name"]
        model.user = data["user"]
        model.password = data["password"]
        model.host = data["host"]
        model.port = data["port"]
        model.privkey = data["privkey"]

    @classmethod
    def delete_model(cls, connection_id, protocol):
        if Terminal.select(connection=connection_id).count():
            raise Exception("can't remove a connection if it is open")

        Connection.delete(connection_id)
        return True

class Window(SQLObject):
    rows = IntCol()
    cols = IntCol()
    top = IntCol()
    left = IntCol()
    hidden = BoolCol()
    z_index = IntCol()
    #desktop = ForeignKey("Desktop")

    def serialize(self):
        return {
            "id": self.id,
            "rows": self.rows,
            "cols": self.cols,
            "top": self.top,
            "left": self.left,
            "hidden": self.hidden,
            "z_index": self.z_index,
        }

    @classmethod
    def read_collection(cls, protocol):
        return [x.serialize() for x in cls.select()]

    @classmethod
    def create_model(cls, data, protocol):
        log.msg("create window %s" % data)
        last_z_window = None
        for win in Window.select(orderBy=DESC(Window.q.z_index)):
            last_z_window = win
            break

        if not last_z_window:
            last_z_index = 1
        else:
            last_z_index = last_z_window.z_index + 1

        model = Window(
            rows=data.get("rows", 25),
            cols=data.get("cols", 80),
            top=data.get("top", 100),
            left=data.get("left", 20),
            hidden=data.get("hidden", False),
            z_index=data.get("z_index", last_z_index)
        )

        if not model.left:
            model.left = 20 * (cls.select().count() % 5 + 1)

        if not model.top:
            model.top = 50 * (cls.select().count() % 5 + 1)

        return model.serialize()

    @classmethod
    def update_model(cls, data, protocol):
        log.msg("update window %s" % data)

        model = cls.get(data["id"])
        has_changed = model.cols != data["cols"] or model.rows != data["rows"]

        model.cols = data["cols"]
        model.rows = data["rows"]
        model.left = data["left"]
        model.top = data["top"]
        model.hidden = data["hidden"]
        model.z_index = data["z_index"]

        if model.cols < 20:
            model.cols = 20
        if model.cols > 1000:
            model.cols = 1000
        if model.rows < 5:
            model.rows = 5
        if model.rows > 500:
            model.rows = 500
        if model.left < 0:
            model.left = 0
        if model.top < 50:
            model.top = 50
        if model.z_index < 0:
            model.z_index = 0

        if has_changed:
            for term in Terminal.selectBy(window=model):
                Terminal.terminals[term.id].resize(model.cols, model.rows)
                term.history = str()

        return model.serialize()

    @classmethod
    def delete_model(cls, model_id, protocol):
        model = Window.get(model_id)

        if not model:
            return

        log.msg("delete window %s" % model)

        for term in Terminal.selectBy(window=model):
            protocol.sync("terminals", "delete", {"id": term.id})

        Window.delete(model.id)
        return True


class Terminal(SQLObject):
    history = StringCol()
    window = ForeignKey("Window")
    conn = ForeignKey("Connection")
    terminals = {}
    factory = None

    def serialize(self):
        return {
            "id": self.id,
            "history": self.history,
            "window_id": self.window.id,
            "connection_id": self.conn.id,
        }

    @classmethod
    def read_collection(cls, protocol):
        return [x.serialize() for x in cls.select()]

    @classmethod
    def create_model(cls, data, protocol):
        conn = Connection.get(data["connection_id"])
        win = Window.get(data["window_id"])

        model = Terminal(
            history="",
            window=win,
            conn=conn,
        )

        model.connect()

        return model.serialize()

    def connect(self):
        log.msg("connecting to %s with user %s" % (self.conn.host, self.conn.user))
        self.history = str("Connecting to %s...\r\n" % self.conn.host)

        if not self.conn.user:
            raise Exception("No user given.")
        if not self.conn.password and not self.conn.privkey:
            raise Exception("No authentication details given.")

        web_term = WebTerminal(self, self.id, self.window.cols, self.window.rows)

        Terminal.terminals[self.id] = web_term

        ssh = SSH(
            user=self.conn.user,
            password=self.conn.password,
            host=self.conn.host,
            port=self.conn.port,
            privkey=self.conn.privkey,
        )

        def err(e):
            self.write_to_terminal(self.id, e.value[0])

        ssh.connect(web_term, on_error=err)


    @classmethod
    def update_model(cls, data, protocol):
        model = cls.get(data["id"])
        return model.serialize()

    @classmethod
    def delete_model(cls, terminal_id, protocol):
        log.msg("delete terminal %s" % terminal_id)

        model = Terminal.get(terminal_id)
        if not model:
            return False

        window_id = model.window.id

        Terminal.delete(terminal_id)

        kill_window = True
        for terminal in Terminal.select():
            if terminal.window.id == window_id:
                kill_window = False

        if kill_window:
            Window.delete(window_id)

        return True

    def write_to_terminal(self, terminal_id, data):
        #log.msg("write to terminal %s %s" % (terminal_id, data))
        model = Terminal.get(terminal_id)

        model.history += str(data)
        if len(model.history) > MAX_TERM_HISTORY:
            model.history = model.history[-MAX_TERM_HISTORY:]

        factory.trigger_all("data", terminal_id, str(data))

    # TODO: why is this not static?
    def close_connection(self, terminal_id):
        Terminal.delete(terminal_id)
        factory.trigger_all("sync", "terminals", "delete", {"id": terminal_id})

# class Desktop(SQLObject):
#     name = StringCol()
#     short_link = StringCol()
#     users = RelatedJoin('User', joinColumn='desktop', otherColumn='user', intermediateTable='desktop_users')


class Preference(SQLObject):
    key = StringCol(alternateID=True)
    value = StringCol()


User.createTable(ifNotExists=True)
Connection.createTable(ifNotExists=True)
#Desktop.createTable(ifNotExists=True)
Preference.createTable(ifNotExists=True)
Window.createTable(ifNotExists=True)
Terminal.createTable(ifNotExists=True)
