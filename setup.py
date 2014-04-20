#!/usr/bin/env python

# to distribute:
# python setup.py register sdist upload

from setuptools import setup
from pip.req import parse_requirements

import os
import webmux

reqs = []

try:
    install_reqs = parse_requirements(os.path.join(os.path.dirname(__file__), 'requirements.txt'))

    reqs = [str(ir.req) for ir in install_reqs]

except:
    pass

setup(
    name='webmux',
    version=webmux.__version__,
    description='An open-source web based SSH terminal multiplexer',
    long_description='An open-source web based SSH terminal multiplexer',
    author='Ron Reiter (@ronreiter)',
    author_email='ron.reiter@gmail.com',
    url='http://github.com/ronreiter/webmux',
    packages=['webmux'],
    scripts=['webmuxd'],
    license='MIT',

    # TODO: how do you use requirements.txt without moving it into the package?
    install_requires=[
        'Twisted==13.2.0',
        'cffi==0.8.1',
        'cryptography==0.2.1',
        'futures==2.1.6',
        'parse==1.4.1',
        'pyOpenSSL==0.14',
        'pyasn1==0.1.7',
        'pycparser==2.10',
        'pycrypto==2.6.1',
        'six==1.5.2',
        'stuf==0.9.4',
        'txsockjs==1.2.1',
        'wsgiref==0.1.2',
        'zope.interface==4.1.0',
        'SQLObject==1.5.1',
        'Jinja2==2.7.2',
    ]
)
