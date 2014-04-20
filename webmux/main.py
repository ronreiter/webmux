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

import webmux
import os

class StaticResource(resource.Resource):
    isLeaf = False


def init():
    for term in Terminal.select():
        term.connect()

def main(args):
    WEBMUX_STATIC_PATH = os.path.join(webmux.__path__[0], "static")
    root = Home()

    static_path = resource.Resource()

    static_path.putChild("css", static.File(WEBMUX_STATIC_PATH + "/css"))
    static_path.putChild("js", static.File(WEBMUX_STATIC_PATH + "/js"))
    static_path.putChild("img", static.File(WEBMUX_STATIC_PATH + "/img"))

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

