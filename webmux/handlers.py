from twisted.web.util import redirectTo
from webmux.user import IUserSession
from webmux.models import User
from twisted.web import resource

from jinja2 import Environment, PackageLoader
jinja = Environment(loader=PackageLoader('webmux', 'templates'))

from Crypto.Cipher import AES

secret = 'ca621b281350e4ebe6d92629b299fb84'
init_vector = 'IV'
COOKIE_NAME = 'session'

class SecureCookieResource(resource.Resource):
    def get_session(self, request):
        cookie_data = ""
        request.getCookie(COOKIE_NAME)
        request.addCookie(COOKIE_NAME, cookie_data, path='/', max_age=60*60*24*365)

        obj = AES.new(secret, AES.MODE_CBC, init_vector)
        message = "The answer is no"
        ciphertext = obj.encrypt(message)

        obj2 = AES.new(secret, AES.MODE_CBC, init_vector)
        obj2.decrypt(ciphertext)


class Home(SecureCookieResource):
    isLeaf = False

    def getChild(self, name, request):
        if name == "":
            return self
        return resource.Resource.getChild(self, name, request)

    def render_GET(self, request):
        user_session = IUserSession(request.getSession())

        user = user_session.get_user()
        if user:
            #user_session.email = "foo"
            return jinja.get_template("index.html").render(user=user).encode("utf8")
        else:
            num_users = User.select().count()
            if num_users == 0:
                return redirectTo("signup", request)
            else:
                return redirectTo("login", request)


class Signup(SecureCookieResource):
    isLeaf = True

    def render_GET(self, request):
        num_users = User.select().count()
        session = IUserSession(request.getSession())

        return jinja.get_template("signup.html").render(
            session=session,
            create_admin=num_users == 0
        ).encode("utf8")

    def render_POST(self, request):
        session = IUserSession(request.getSession())

        if request.args["password"][0] != request.args["confirm"][0]:
            return redirectTo("signup", request)

        user = User.signup(request.args["email"][0], request.args["password"][0])

        if user:
            session.set_user(user)
        else:
            return redirectTo("signup", request)

        return redirectTo("/", request)


class Login(SecureCookieResource):
    isLeaf = True

    def render_GET(self, request):
        session = IUserSession(request.getSession())

        return jinja.get_template("login.html").render(session=session).encode("utf8")

    def render_POST(self, request):
        session = IUserSession(request.getSession())

        user = User.login(request.args["email"][0], request.args["password"][0])
        if user:
            session.set_user(user)
        else:
            return redirectTo("login", request)

        return redirectTo("/", request)


class Logout(SecureCookieResource):
    isLeaf = True

    def render_GET(self, request):
        request.getSession().expire()

        return redirectTo("login", request)
