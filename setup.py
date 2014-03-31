#!/usr/bin/env python

from distutils.core import setup
from webmux import __version__

setup(
    name='webmux',
    version=__version__,
    description='An open-source web based SSH terminal multiplexer',
    author='Ron Reiter (@ronreiter)',
    author_email='ron.reiter@gmail.com',
    url='http://github.com/ronreiter/webmux',
    packages=['webmux'],
    scripts=['webmuxd'],
)

