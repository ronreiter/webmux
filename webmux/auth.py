from twisted.conch.ssh import keys, userauth
from twisted.internet import defer


class AuthClient(userauth.SSHUserAuthClient):
    def __init__(self, options, *args):
        userauth.SSHUserAuthClient.__init__(self, str(options["user"]), *args)
        self.options = options

    def serviceStarted(self):
        userauth.SSHUserAuthClient.serviceStarted(self)

    def serviceStopped(self):
        pass

    def getPassword(self, prompt = None):
        return defer.succeed(str(self.options["password"]))

    def getPublicKey(self):
        return defer.succeed(keys.Key.fromString(self.options["privkey"]))

    def signData(self, publicKey, signData):
        return userauth.SSHUserAuthClient.signData(self, publicKey, signData)

    def getPrivateKey(self):
        return defer.succeed(keys.Key.fromString(self.options["privkey"]))
