## Run with Docker

Install dependencies with `npm install` or

    docker run --rm -v $(pwd):/app -w /app node npm install

Run nginx

    docker run -d --rm -p 80:80 -v $(pwd):/usr/share/nginx/html:ro nginx
