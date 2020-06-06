FROM node:14-alpine

COPY app /app
COPY idle.sh /idle.sh

RUN apk update
RUN apk add --no-cache iptables ipset

WORKDIR /app
RUN npm install --no-cache

ENTRYPOINT ["/bin/sh", "/start.sh"]

