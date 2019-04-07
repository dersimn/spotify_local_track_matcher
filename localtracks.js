var spotify = new SpotifyWebApi();
var spotifyToken;
var spotifyUserId;

var userPlaylists = {};

function spotifyProcessNext(initialPromise, processFunction) {
    return new Promise((resolve, reject) => {
        function _internalRecursive(promise, processFunction, resolve, reject) {
            promise.then(response => {
                processFunction(response);

                if (response.next) {
                    _internalRecursive(
                        spotify.getGeneric(response.next), 
                        processFunction, 
                        resolve, 
                        reject
                    );
                } else {
                    resolve();
                }
            }).catch(err => {
                reject(err);
            });
        }
        _internalRecursive(initialPromise, processFunction, resolve, reject);
    }); 
}

$(function() {
    spotifyToken = $.deparam(window.location.hash.replace(/^#/, ''));

    // Step 1: enable/disable based on token in url's #
    if (!('access_token' in spotifyToken)) {
        console.log('no token provided');
        $('#step1 button').click(function() {
            window.location = 'https://accounts.spotify.com/authorize?'+$.param({
                client_id: '74af9cd024304ad28d4e4ea53b0fd5da',
                response_type: 'token',
                redirect_uri: window.location.origin + window.location.pathname,
                scope: 'playlist-read-private playlist-modify-public playlist-modify-private playlist-read-collaborative'
            });
        });
    } else {
        $('#step1').addClass('list-group-item-success');
        $('#step1 button').prop('disabled', true);

        $('#step2 button').prop('disabled', false);

        spotify.setAccessToken(spotifyToken['access_token']);
    }
    
    // Step 2
    $('#step2 button').click(function() {
        spotify.setAccessToken(spotifyToken['access_token']);

        $('#step2 button').prop('disabled', true);
        
        spotify.getMe()
            .then(profile => {spotifyUserId = profile.id})
            .then(() => {
                return spotifyProcessNext(spotify.getUserPlaylists({limit:50}), (response) => {
                    response.items.forEach(playlist => {
                        if (playlist.owner.id == spotifyUserId || playlist.collaborative) {
                            userPlaylists[playlist.id] = playlist;
                            userPlaylists[playlist.id]['localtracks'] = [];
                        }
                    });
                });
            })
            .then(() => {
                console.log(userPlaylists);
            })
            .catch(err => {
                console.error(err);
            })
    });
    

    // if ('access_token' in spotifyToken) {
    //     spotifyApi.setAccessToken(spotifyToken['access_token']);

    //     spotifyApi.getMe().then(profile => {
    //         spotifyUserId = profile.id;

    //         function itterativeGetResponse(currentRes, callback) {
    //             if (currentRes.next == null) return;

    //             spotifyApi.getGeneric(currentRes.next).then(nextRes => {
    //                 callback(nextRes);
    //                 itterativeGetResponse(nextRes, callback);
    //             });
    //         }

    //         spotifyApi.getUserPlaylists({
    //             limit: 50
    //         }).then(firstResponse => {
    //             function processResponse(response) {
    //                 response.items.forEach(playlist => {
    //                     if (playlist.owner.id == spotifyUserId || playlist.collaborative) {
    //                         userPlaylists[playlist.id] = playlist;
    //                         userPlaylists[playlist.id]['localtracks'] = [];

    //                         spotifyApi.getPlaylistTracks(playlist.id).then(firstResponse => {
    //                             function getLocalTracks(res) {
    //                                 var playlistId = res.href.match(/playlists\/([A-Za-z0-9]+)\//)[1];
                                    
    //                                 res.items.forEach(item => {
    //                                     if (/^spotify:local/.test(item.track.uri)) {
    //                                         userPlaylists[playlistId]['localtracks'].push(item.track);
    //                                     }
    //                                 });
    //                             }
    //                             getLocalTracks(firstResponse);
    //                             itterativeGetResponse(firstResponse, getLocalTracks);
    //                         });
    //                     }
    //                 });
    //             }

    //             processResponse(firstResponse);
    //             itterativeGetResponse(firstResponse, processResponse);
    //         });
    //     });
    // }
});
