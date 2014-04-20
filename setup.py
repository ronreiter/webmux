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
    install_requires=reqs
)
