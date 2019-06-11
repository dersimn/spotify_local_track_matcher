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
                return spotifyProcessNext(spotify.getUserPlaylists({limit:50}), (res) => {
                    res.items.forEach(playlist => {
                        if (playlist.owner.id == spotifyUserId || playlist.collaborative) {
                            userPlaylists[playlist.id] = playlist;
                            userPlaylists[playlist.id]['localtracks'] = {};
                            userPlaylists[playlist.id]['localtrackMatches'] = {};
                        }
                    });
                });
            })
            .then(() => {
                $('#step2').addClass('list-group-item-success');
            }, (err) => {
                $('#step2').addClass('list-group-item-danger');
            })
            // Step 3
            .then(() => {
                var track_promises = [];
                Object.keys(userPlaylists).forEach(playlistId => {
                    track_promises.push(spotifyProcessNext(spotify.getPlaylistTracks(playlistId), (res) => {
                        res.items.forEach((trackItem, position) => {
                            userPlaylists[playlistId]['tracks'][res.offset+position] = trackItem;

                            if (trackItem.is_local) {
                                userPlaylists[playlistId]['localtracks'][res.offset+position] = trackItem;
                            }
                        });
                    }));
                });
                return Promise.all(track_promises);
            })
            .then(() => {
                $('#step3').addClass('list-group-item-success');
            }, (err) => {
                $('#step3').addClass('list-group-item-danger');
            })
            // Step 4
            .then(() => {
                var search_promises = [];
                Object.keys(userPlaylists).forEach(playlistId => {
                    var playlist = userPlaylists[playlistId];
                    Object.keys(playlist.localtracks).forEach(trackPosition => {
                        var localtrack = playlist.localtracks[trackPosition];

                        //console.log(localtrack.track.name+' artist:'+localtrack.track.artists[0].name);

                        search_promises.push(spotifyProcessNext(
                            spotify.search(localtrack.track.name+' artist:'+localtrack.track.artists[0].name, ['track']),
                            (res) => {
                                playlist.localtrackMatches[trackPosition] = res.tracks.items;
                            }
                        ));
                    });
                });
                return Promise.all(search_promises);
            })
            .then(() => {
                $('#step4').addClass('list-group-item-success');
            }, (err) => {
                $('#step4').addClass('list-group-item-danger');
            })
            .catch(err => {
                console.error(err);
            })
    });
});
