Visit <https://dersimn.github.io/spotify_local_track_matcher> to use a productive copy of this script.

> **WARNING**: Be aware, that this script is still in Development! You could mess up your Spotify Playlists by using this.

## Run with Docker

    npm install
    grunt

Run nginx

    docker run -d --rm -p 80:80 -v $(pwd):/usr/share/nginx/html:ro nginx

## Publish via GitHub Pages

    git branch -D gh-pages
    git branch gh-pages
    git checkout gh-pages
    git add bundle.*
    git commit -m "Publish for GitHub Pages"
    git push -f origin gh-pages