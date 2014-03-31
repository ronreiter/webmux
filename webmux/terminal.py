__author__ = 'Ron'

class Terminal(object):
    def get_window_size(self):
        raise NotImplementedError()

    def get_name(self):
        raise NotImplementedError()

    def enter(self):
        pass

    def leave(self):
        pass



