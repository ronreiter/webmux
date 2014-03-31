from sys import stdout

from twisted.python.log import startLogging, err

from twisted.internet import reactor
from twisted.internet.defer import Deferred

from twisted.conch.ssh.common import NS
from twisted.conch.scripts.cftp import ClientOptions
from twisted.conch.ssh.filetransfer import FileTransferClient, FXF_WRITE, FXF_CREAT, FXF_TRUNC
from twisted.conch.client.connect import connect
from twisted.conch.client.default import SSHUserAuthClient, verifyHostKey
from twisted.conch.ssh.connection import SSHConnection
from twisted.conch.ssh.channel import SSHChannel


class SFTPSession(SSHChannel):
    name = 'session'

    def channelOpen(self, whatever):
        d = self.conn.sendRequest(
            self, 'subsystem', NS('sftp'), wantReply=True)
        d.addCallbacks(self._cbSFTP)


    def _cbSFTP(self, result):
        client = FileTransferClient()
        client.makeConnection(self)
        self.dataReceived = client.dataReceived
        self.conn._sftp.callback(client)



class SFTPConnection(SSHConnection):
    def serviceStarted(self):
        self.openChannel(SFTPSession())


def sftp(user, host, port):
    options = ClientOptions()
    options['host'] = host
    options['port'] = port
    options.identitys = ['~/.ssh/amazon.pem']

    conn = SFTPConnection()
    conn._sftp = Deferred()
    auth = SSHUserAuthClient(user, options, conn)
    connect(host, port, options, verifyHostKey, auth)
    return conn._sftp


def transfer(client):
    d = client.openFile('/home/ec2-user/test.txt', FXF_WRITE | FXF_CREAT | FXF_TRUNC, {})
    def cbWrite(f):
        print 'File created'
        f.writeChunk(5, 'hello')

    d.addCallback(cbWrite)
    return d


def main():
    startLogging(stdout)

    user = 'ec2-user'
    host = 'crosswiselabs.com'
    port = 22
    d = sftp(user, host, port)
    d.addCallback(transfer)
    d.addErrback(err, "Problem with SFTP transfer")
    d.addCallback(lambda ignored: reactor.stop())
    reactor.run()


if __name__ == '__main__':
    main()