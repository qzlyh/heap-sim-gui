FROM ubuntu:16.04

RUN apt-get update
RUN apt-get install -y python2.7
RUN apt-get install -y binutils
RUN apt-get install -y gcc
RUN mkdir /root/heap-sim-gui

WORKDIR /root/heap-sim-gui

COPY ./docker/ez_setup.py /root/heap-sim-gui/ez_setup.py
COPY ./docker/get-pip.py /root/heap-sim-gui/get-pip.py
RUN python2.7 ez_setup.py
RUN python2.7 get-pip.py install

RUN pip install flask
RUN pip install six

COPY heapinspect /root/heap-sim-gui/heapinspect
COPY libs /root/heap-sim-gui/libs
COPY simulate /root/heap-sim-gui/simulate
COPY static /root/heap-sim-gui/static
COPY app.py /root/heap-sim-gui/app.py

EXPOSE 5000

CMD ["python2.7", "app.py"]