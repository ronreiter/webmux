from twisted.internet import reactor, task, defer
from twisted.conch.error import ConchError
from twisted.conch.ssh import forwarding
from twisted.conch.ssh import connection
from twisted.python import log

from webmux.session import SSHSession

conn = None

class SSHListenClientForwardingChannel(forwarding.SSHListenClientForwardingChannel):
    pass

class SSHConnectForwardingChannel(forwarding.SSHConnectForwardingChannel):
    pass

class KeepAlive(object):
    def __init__(self, conn):
        self.conn = conn
        self.globalTimeout = None
        self.lc = task.LoopingCall(self.sendGlobal)
        self.lc.start(300)

    def sendGlobal(self):
        d = self.conn.sendGlobalRequest("conch-keep-alive@twistedmatrix.com", "", wantReply = 1)
        d.addBoth(self._cbGlobal)
        self.globalTimeout = reactor.callLater(30, self._ebGlobal)

    def _cbGlobal(self, res):
        if self.globalTimeout:
            self.globalTimeout.cancel()
            self.globalTimeout = None

    def _ebGlobal(self):
        if self.globalTimeout:
            self.globalTimeout = None
            self.conn.transport.loseConnection()


class SSHConnection(connection.SSHConnection):
    def __init__(self, ssh, terminal, local_forward=None, remote_forward=None):
        self.ssh = ssh
        self.local_forward = local_forward
        self.remote_forward = remote_forward

        self.terminal = terminal
        connection.SSHConnection.__init__(self)

    def _beforeShutdown(self):
        for remotePort, hostport in self.remote_forward:
            log.msg("cancelling %s:%s" % (remotePort, hostport))
            self.cancelRemoteForwarding(remotePort)

    def _reConnect(self):
        self._beforeShutdown()
        self.transport.transport.loseConnection()

    def _do_localForwards(self):
        for localPort, hostport in self.local_forward:
            s = reactor.listenTCP(
                localPort,
                forwarding.SSHListenForwardingFactory(
                    conn,
                    hostport,
                    SSHListenClientForwardingChannel
                )
            )

            self.localForwards.append(s)

    def _do_remoteForwards(self):
        for remotePort, hostport in self.remote_forward:
            log.msg("asking for remote forwarding for %s:%s" %
                    (remotePort, hostport))
            self.requestRemoteForwarding(remotePort, hostport)
        reactor.addSystemEventTrigger("before", "shutdown", self._beforeShutdown)

    def processBacklog(self):
        if hasattr(self.transport, "sendIgnore"):
            KeepAlive(self)

        if self.local_forward:
            self._do_localForwards()

        if self.remote_forward:
            self._do_remoteForwards()

        self.openChannel(SSHSession(self.ssh, self, self.terminal.io))

    def serviceStarted(self):
        self.localForwards = []
        self.remoteForwards = {}
        if not isinstance(self, connection.SSHConnection):
            # make these fall through
            del self.__class__.requestRemoteForwarding
            del self.__class__.cancelRemoteForwarding

        self.processBacklog()

        self.ssh.connectionMade(self)

    def serviceStopped(self):
        lf = self.localForwards
        self.localForwards = []
        for s in lf:
            s.loseConnection()

        self.ssh.connectionLost(self)

    def requestRemoteForwarding(self, remotePort, hostport):
        data = forwarding.packGlobal_tcpip_forward(("0.0.0.0", remotePort))
        log.msg("requesting remote forwarding %s:%s" %(remotePort, hostport))
        try:
            yield self.sendGlobalRequest("tcpip-forward", data, wantReply=1)
        except:
            log.msg("remote forwarding %s:%s failed"%(remotePort, hostport))
            raise

        log.msg("accepted remote forwarding %s:%s" % (remotePort, hostport))
        self.remoteForwards[remotePort] = hostport
        log.msg(repr(self.remoteForwards))

    def cancelRemoteForwarding(self, remotePort):
        data = forwarding.packGlobal_tcpip_forward(("0.0.0.0", remotePort))
        self.sendGlobalRequest("cancel-tcpip-forward", data)
        log.msg("cancelling remote forwarding %s" % remotePort)
        try:
            del self.remoteForwards[remotePort]
        except:
            pass
        log.msg(repr(self.remoteForwards))

    def channel_forwarded_tcpip(self, windowSize, maxPacket, data):
        log.msg("%s %s" % ("FTCP", repr(data)))
        remoteHP, origHP = forwarding.unpackOpen_forwarded_tcpip(data)
        log.msg(self.remoteForwards)
        log.msg(remoteHP)
        if self.remoteForwards.has_key(remoteHP[1]):
            connectHP = self.remoteForwards[remoteHP[1]]
            log.msg("connect forwarding %s" % (connectHP,))
            return SSHConnectForwardingChannel(connectHP,
                                            remoteWindow = windowSize,
                                            remoteMaxPacket = maxPacket,
                                            conn = self)
        else:
            raise ConchError(connection.OPEN_CONNECT_FAILED, "don't know about that port")

    # def channelClosed(self, channel):
    #     self.terminal.close(channel)
