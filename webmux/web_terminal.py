__author__ = 'Ron'

from webmux.terminal import Terminal

# TODO: merge SocketIO / StandardIO objects with Terminal objects
class SocketIO(object):
    def __init__(self, client):
        self.client = client

    def write(self, data):
        terminal_id = self.client.session.conn.terminal._id
        self.parent.write_to_terminal(terminal_id, data)

    def close(self, channel):
        terminal_id = self.client.session.conn.terminal._id
        self.parent.close_connection(terminal_id)

    def loseConnection(self):
        print "lose connection"

    def loseWriteConnection(self):
        print "lose write connection"


class WebTerminal(Terminal):
    def __init__(self, parent, id, cols, rows):
        self.parent = parent
        self._cols = cols
        self._rows = rows
        self._id = id
        self.active_session = None
        self.resize_callback = None

        self.io = SocketIO
        # TODO: fixme - merge SocketIO interface with Terminal interface
        self.io.parent = parent

    def get_window_size(self):
        return self._rows, self._cols, self._cols * 5, self._rows * 13

    def get_name(self):
        return "xterm-256color"

    def resize(self, cols, rows):
        self._cols = cols
        self._rows = rows
        self.resize_callback(rows, cols, cols * 5, rows * 13)

    def register_resize_callback(self, resize_callback):
        self.resize_callback = resize_callback

    def set_active_session(self, session):
        self.active_session = session

