# Imported from: https://github.com/oclif/docker/blob/master/Dockerfile
FROM node:alpine

LABEL Jahia Dev Team

# Add bash
RUN apk add --no-cache bash

WORKDIR /usr/share/jcustomer-custom-event-checker/

RUN npm install -g @jahia/jcustomer-custom-event-checker@latest

CMD ["/bin/bash"]
