from webmux.pubsub import SockJSPubSubProtocol, SockJSPubSubFactory
from webmux.models import Window, Terminal, Connection, User
from webmux import models

from twisted.python import log

SYNC_TABLES = {
    "connections": Connection,
    "windows": Window,
    "terminals": Terminal,
    "users": User,
}


class TerminalProtocol(SockJSPubSubProtocol):
    @staticmethod
    def data(terminal_id, data_to_write):
        Terminal.terminals[terminal_id].active_session.dataReceived(data_to_write.encode('utf8'))

    @staticmethod
    def write_to_terminal(terminal_id, data):
        Terminal.write_to_terminal(terminal_id, data)

    # def close_connection(self, terminal_id):
    #     self.sync("terminals", "delete", {"id": terminal_id})
    #     self.parent.delete_model(terminal_id, None)
    #     TerminalFactory.trigger_all("sync", "terminals", "delete", {"id": terminal_id})

    def sync(self, namespace, method, data):
        if method != "read" and not data:
            print "No data for sync: %s %s" % (namespace, method)
            return
        table = SYNC_TABLES[namespace]

        if method == "create":
            if "id" in data:
                raise Exception("Can't use self assigned ID!")

            data = table.create_model(data, self)

        elif method == "read":
            data = table.read_collection(self)

            log.msg("sync: %s %s %s" % (namespace, method, data))
            return data

        elif method == "update":
            if "id" not in data:
                raise Exception("No ID received, can't update model.")

            data = table.update_model(data, self)

        elif method == "delete":
            table.delete_model(data["id"], self)

        self.trigger_all("sync", namespace, method, data)

        log.msg("sync: %s %s %s" % (namespace, method, data))
        return data

TerminalFactory = SockJSPubSubFactory.forProtocol(TerminalProtocol)

# initialize the model with the list of connections so it would be able
# to send out events
models.factory = TerminalFactory

