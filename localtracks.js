const spotify = new SpotifyWebApi();
const queue = new PQueue({concurrency: 1});

var spotifyToken;
var spotifyUserId;

var userPlaylists = {};

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
    $('#step2 button').click(async function() {
        spotify.setAccessToken(spotifyToken['access_token']);

        $('#step2 button').prop('disabled', true);
        
        var profile = await spotify.getMe();
        var spotifyUserId = profile.id;
        console.log(spotifyUserId);

        try {
            await spotifyProcessNext(spotify.getUserPlaylists({limit:50}), (res) => {
                res.items.forEach(playlist => {
                    if (playlist.owner.id == spotifyUserId || playlist.collaborative) {
                        userPlaylists[playlist.id] = playlist;
                        userPlaylists[playlist.id]['localtracks'] = {};
                        userPlaylists[playlist.id]['localtrackMatches'] = {};
                    }
                });
            });

            $('#step2').addClass('list-group-item-success');
        } catch {
            $('#step2').addClass('list-group-item-danger');
            return;
        }
        
        // Step 3
        Object.keys(userPlaylists).forEach(playlistId => {
            queue.add(() => spotifyProcessNext(spotify.getPlaylistTracks(playlistId), (res) => {
                res.items.forEach((trackItem, position) => {
                    userPlaylists[playlistId]['tracks'][res.offset+position] = trackItem;

                    if (trackItem.is_local) {
                        userPlaylists[playlistId]['localtracks'][res.offset+position] = trackItem;
                    }
                });
            }).catch(() => {
                $('#step3').addClass('list-group-item-danger');
                queue.pause();
            }));
        });

        await queue.onEmpty();
        $('#step3').addClass('list-group-item-success');

        // Step 4
        Object.keys(userPlaylists).forEach(playlistId => {
            var playlist = userPlaylists[playlistId];
            Object.keys(playlist.localtracks).forEach(trackPosition => {
                var localtrack = playlist.localtracks[trackPosition];

                //console.log(localtrack.track.name+' artist:'+localtrack.track.artists[0].name);

                queue.add(() => spotifyProcessNext(
                    spotify.search(
                        localtrack.track.name+' artist:'+localtrack.track.artists[0].name,
                        ['track'],
                        {
                            limit: 5
                        }
                    ),
                    (res) => {
                        playlist.localtrackMatches[trackPosition] = res.tracks.items;
                    }
                ).catch(() => {
                    $('#step4').addClass('list-group-item-danger');
                    queue.pause();
                }));
            });
        });
        await queue.onEmpty();
        $('#step4').addClass('list-group-item-success');
    });
});

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