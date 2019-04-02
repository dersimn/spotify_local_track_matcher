var spotifyApi = new SpotifyWebApi();
var spotifyToken;
var spotifyUserId;

$(function() {
    $('#auth').attr('href', 'https://accounts.spotify.com/authorize?'+$.param({
        client_id: '74af9cd024304ad28d4e4ea53b0fd5da',
        response_type: 'token',
        redirect_uri: 'http://localhost/auth.htm',
        scope: 'playlist-read-private playlist-modify-public playlist-modify-private playlist-read-collaborative'
    }));

    spotifyToken = $.deparam(window.location.hash.replace(/^#/, ''));
    console.log(spotifyToken);

    if ('access_token' in spotifyToken) {
        spotifyApi.setAccessToken(spotifyToken['access_token']);

        spotifyApi.getMe().then(profile => {
            spotifyUserId = profile.id;

            function itterativeGetResponse(currentRes, callback) {
                if (currentRes.next == null) return;

                spotifyApi.getGeneric(currentRes.next).then(nextRes => {
                    callback(nextRes);
                    itterativeGetResponse(nextRes, callback);
                });
            }

            spotifyApi.getUserPlaylists({
                limit: 10
            }).then(firstResponse => {
                function processResponse(response) {
                    response.items.forEach(playlist => {
                        if (playlist.owner.id == spotifyUserId || playlist.collaborative) {
                            $('#playlists > tbody').append(
                                $('<tr>').attr('id', 'playlist-'+playlist.id).append(
                                    $('<th scope="row">').text(playlist.name),
                                    $('<td>').text(playlist.owner.display_name || playlist.owner.id),
                                    $('<td>').text(playlist.tracks.total),
                                    $('<td class="local">')
                                )
                            );

                            spotifyApi.getPlaylistTracks(playlist.id).then(firstResponse => {
                                function getLocalTracks(res) {
                                    var playlistId = res.href.match(/playlists\/([A-Za-z0-9]+)\//)[1];
                                    
                                    res.items.forEach(item => {
                                        if (/^spotify:local/.test(item.track.uri)) {
                                            var element = $('tr[id="playlist-'+playlistId+'"] > td.local');
                                            var currentText = $(element).text();

                                            if (currentText) {
                                                $(element).text(Number(currentText) + 1);
                                            } else {
                                                $(element).text('1');
                                            }
                                        }
                                    });
                                }
                                getLocalTracks(firstResponse);
                                itterativeGetResponse(firstResponse, getLocalTracks);
                            });
                        }
                    });
                }

                processResponse(firstResponse);
                itterativeGetResponse(firstResponse, processResponse);
            });
        });
    }
});
