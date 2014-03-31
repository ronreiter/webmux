from zope.interface import Interface, Attribute, implements
from twisted.python.components import registerAdapter
from twisted.web.server import Session


from models import User

class IUserSession(Interface):
    user_id = Attribute("A user identifier.")


class UserSession(object):
    implements(IUserSession)

    def __init__(self, session):
        self.user_id = 0

    def get_user(self):
        if self.user_id:
            return User.get(self.user_id)
        else:
            return None

    def set_user(self, user):
        self.user_id = user.id


class LongSession(Session):
    sessionTimeout = 31536000

registerAdapter(UserSession, LongSession, IUserSession)


