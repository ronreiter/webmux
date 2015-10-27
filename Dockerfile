FROM python:2.7-onbuild
RUN pip install -e .

EXPOSE 8080

CMD ./webmuxd
