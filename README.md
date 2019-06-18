## Run with Docker

    npm install
    grunt

Run nginx

    docker run -d --rm -p 80:80 -v $(pwd):/usr/share/nginx/html:ro nginx
