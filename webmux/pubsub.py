from twisted.internet.protocol import Protocol, Factory
from twisted.python import log

import json


class SockJSPubSubProtocol(Protocol):
    def connectionMade(self):
        self.factory.transports.add(self.transport)

    def connectionLost(self, reason):
        self.factory.transports.remove(self.transport)

    def dataReceived(self, data):
        json_data = json.loads(data)

        retval = {}
        ex = None

        try:
            func_retval = getattr(self, json_data["type"])(*json_data["args"])
        except Exception, e:
            log.err()
            ex = e.message
            func_retval = None

        if "callback" in json_data:
            retval["callback"] = json_data["callback"]
            retval["args"] = (ex, func_retval)
            self.transport.write(json.dumps(retval))

    def trigger(self, type, *args):
        raw_data = json.dumps({
            "type": type,
            "args": list(args),
        })
        print raw_data
        self.transport.write(raw_data)

    def trigger_all(self, type, *args):
        raw_data = json.dumps({
            "type": type,
            "args": list(args),
        })
        for transport in self.factory.transports:
            #if transport != self.transport:
            transport.write(raw_data)


class SockJSPubSubFactory(Factory):
    protocol = SockJSPubSubProtocol
    transports = set()

    def trigger_all(self, type, *args):
        raw_data = json.dumps({
            "type": type,
            "args": list(args),
        })

        for transport in self.transports:
            transport.write(raw_data)


