FROM nginx:alpine

# install python and pip
RUN apk update && apk add python py-pip && rm -rf /var/cache/apk/*

# install python dependencies
RUN pip install pyyaml requests

# copy the files 
COPY . /usr/share/nginx/html

# update the cache on boot
RUN mkdir -p /usr/share/nginx/html/cache && cp -f /usr/share/nginx/html/docker/* /docker-entrypoint.d/
