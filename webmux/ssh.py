from twisted.conch.client import direct
from twisted.internet import defer, reactor, endpoints
from twisted.conch.ssh.transport import SSHClientTransport, SSHCiphers

from webmux.connection import SSHConnection
from webmux.auth import AuthClient
from twisted.python import log


class SSH(object):
    def __init__(self, user, password, host, port, privkey):

        self.options = {
            "user": user,
            "password": password,
            "host": host,
            "port": port,
            "privkey": privkey,
            "identity": None,
            "ciphers": SSHCiphers.cipherMap.keys(),
            "macs": SSHCiphers.macMap.keys(),
            "host-key-algorithms": SSHClientTransport.supportedPublicKeys,
            "known-hosts": None,
            "user-authentication": ["publickey", "password", "keyboard-interactive"],
            "logfile": None,
            "option": None,
            "compress": None,
            "version": None,
            "log": None,
            "nox11": None,
            "agent": None,
            "noagent": None,
            "reconnect": None,
        }

    @defer.inlineCallbacks
    def connect(self, terminal=None, on_error=None):
        connection_string = "tcp:host={host}:port={port}".format(
            host=self.options["host"],
            port=self.options["port"]
        )

        log.msg("Connecting with connection string %s" % connection_string)

        # TODO: add port forwarding here
        ssh_connection = SSHConnection(self, terminal)

        # TODO: verify host keys
        vhk = lambda *a: defer.succeed(1)

        # Build a basic auth client. There's a Twisted implementation
        # for this, but we need something simpler that does not access
        # keys that are stored on the disk
        uao = AuthClient(self.options, ssh_connection)

        d = defer.Deferred()
        factory = direct.SSHClientFactory(d, self.options, vhk, uao)
        if on_error:
            d.addErrback(on_error)

        endpoint = endpoints.clientFromString(reactor, connection_string)

        wp = None

        try:
            wp = yield endpoint.connect(factory)
        except Exception:
            terminal.leave()

        defer.returnValue(wp)

    def connectionMade(self, conn):
        pass

    def connectionLost(self, conn):
        conn.terminal.leave()


