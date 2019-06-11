## Run with Docker

Install dependencies with `npm install` or

    docker run --rm -v $(pwd):/app -w /app node npm install

Run Browserify

    browserify browserify_p-queue.js -o p-queue.js

Run nginx

    docker run -d --rm -p 80:80 -v $(pwd):/usr/share/nginx/html:ro nginx
