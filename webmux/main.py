import sys

from twisted.internet import reactor
from twisted.python import log
from twisted.web import resource, server, static
from txsockjs.factory import SockJSResource

log.startLogging(sys.stdout)

from webmux.handlers import Signup, Login, Logout, Home
from webmux.protocols import TerminalFactory
from webmux.user import LongSession
from webmux.models import Terminal

class StaticResource(resource.Resource):
    isLeaf = False


def init():
    for term in Terminal.select():
        term.connect()

def main(args):
    root = Home()

    static_path = resource.Resource()

    static_path.putChild("css", static.File("./static/css"))
    static_path.putChild("js", static.File("./static/js"))
    static_path.putChild("img", static.File("./static/img"))

    root.putChild("terminal", SockJSResource(TerminalFactory))
    root.putChild("signup", Signup())
    root.putChild("login", Login())
    root.putChild("logout", Logout())
    root.putChild("static", static_path)
    site = server.Site(root)
    site.sessionFactory = LongSession
    reactor.listenTCP(8080, site)

    reactor.callLater(0, init)

    reactor.run()

