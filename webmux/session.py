from twisted.conch.ssh import session, channel
from twisted.python import log
from twisted.conch.ssh import connection
from twisted.internet import reactor


import time

class SSHSession(channel.SSHChannel):
    name = 'session'
    def __init__(self, ssh, conn, io_handler):
        channel.SSHChannel.__init__(self)
        self.ssh = ssh
        self.conn = conn
        self.stdio = None
        self.io_handler = io_handler
        self.window_size = None
        self.last_update = None
        self.queue_call = False

    def allocatePty(self):
        term = self.conn.terminal.get_name()
        log.msg('terminal name:', term)

        self.window_size = self.conn.terminal.get_window_size()
        log.msg('terminal window size:', self.window_size)

        ptyReqData = session.packRequest_pty_req(term, self.window_size, '')
        self.last_update = time.time()
        self.conn.sendRequest(self, 'pty-req', ptyReqData)

        self.conn.terminal.register_resize_callback(self._windowResized)

    def channelOpen(self, foo):
        log.msg('session %s open' % self.id)
        self.conn.terminal.enter()

        c = session.SSHSessionClient()

        # TODO: figure out if this is right
        c.dataReceived = self.write

        c.connectionLost = self.sendEOF
        c.session = self

        self.conn.terminal.set_active_session(c)

        self.stdio = self.io_handler(c)

        self.allocatePty()
        self.conn.sendRequest(self, 'shell', '')

    def dataReceived(self, data):
        self.stdio.write(data)

    def extReceived(self, t, data):
        if t==connection.EXTENDED_DATA_STDERR:
            log.msg('got %s stderr data' % len(data))
            self.stdio.write(data)

    def eofReceived(self):
        log.msg('got eof')
        self.stdio.loseWriteConnection()

    def closeReceived(self):
        log.msg('remote side closed %s' % self)
        self.stdio.close(self)
        self.conn.sendClose(self)

    def closed(self):
        log.msg('closed %s' % self)
        self.stdio.close(self)
        log.msg(repr(self.conn.channels))

    def sendEOF(self, *args):
        log.msg('sendEOF')
        self.conn.sendEOF(self)

    def stopWriting(self):
        self.stdio.pauseProducing()

    def startWriting(self):
        self.stdio.resumeProducing()

    def _windowResized(self, *args):
        self.window_size = self.conn.terminal.get_window_size()
        self.updateWindowSize()

    def updateWindowSize(self):
        time_diff = float(time.time() - self.last_update)
        if time_diff < 1 and not self.queue_call:
            reactor.callLater(time_diff, self.updateWindowSize)
            self.queue_call = True
            return

        self.queue_call = False
        self.last_update = time.time()
        self.conn.sendRequest(self, 'window-change', session.packRequest_window_change(self.window_size))

