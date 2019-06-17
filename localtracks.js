const spotify = new SpotifyWebApi();
const queue = new PQueue({concurrency: 1});

var urlHash = $.deparam(window.location.hash.replace(/^#/, ''));
var spotifyUserId;

var userPlaylists = [];
var localTrackList = {};

$(async function() {
    // Step 1: enable/disable based on token in url's #
    if (!('access_token' in urlHash)) {
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
    
        // Step 2
        spotify.setAccessToken(urlHash['access_token']);

        $('#step2').addClass('working');
        try {
            var profile = await spotify.getMe();
            var spotifyUserId = profile.id;

            await spotifyProcessNext(spotify.getUserPlaylists({limit:50}), (res) => {
                var ownPlaylists = res.items.filter(playlist => (playlist.owner.id == spotifyUserId || playlist.collaborative));

                // Development
                ownPlaylists = ownPlaylists.filter(playlist => playlist.name == 'test');

                userPlaylists = userPlaylists.concat(ownPlaylists);
                $('#step2 small').text('found '+userPlaylists.length+' playlists');
            });

            $('#step2').removeClass('working');
            $('#step2').addClass('list-group-item-success');
        } catch {
            $('#step2').removeClass('working');
            $('#step2').addClass('list-group-item-danger');
            return;
        }
        
        // Step 3
        $('#step3').addClass('working');
        var localtrackCount = 0;
        for (var playlist of userPlaylists) {
            await queue.add(() => spotifyProcessNext(spotify.getPlaylistTracks(playlist.id), (res) => {
                res.items.forEach((trackItem, position) => {
                    if (trackItem.is_local) {
                        var trackUri = trackItem.track.uri;

                        localTrackList[trackUri] = Object.assign({}, localTrackList[trackUri], {
                            title: trackItem.track.name,
                            artist: trackItem.track.artists[0].name,
                            album: trackItem.track.album.name
                        });

                        var playlistOccourence = {
                            id: playlist.id,
                            position: res.offset+position,
                            name: playlist.name
                        };
                        if ('playlists' in localTrackList[trackUri]) {
                            localTrackList[trackUri].playlists.push(playlistOccourence);
                        } else {
                            localTrackList[trackUri].playlists = [playlistOccourence];
                        }

                        localtrackCount++;
                        $('#step3 small').text('found '+localtrackCount+' local tracks');
                    }
                });
            }).catch(() => {
                $('#step3').removeClass('working');
                $('#step3').addClass('list-group-item-danger');
                queue.pause();
            }));
        }

        await queue.onEmpty();
        $('#step3').removeClass('working');
        $('#step3').addClass('list-group-item-success');

        // Step 4
        $('#step4').addClass('working');
        var matchCount = 0;
        userPlaylists.forEach(playlist => {
            playlist.localtracks.forEach(localtrack => {
                if (typeof localtrack['matches'] === 'undefined') {
                    localtrack['matches'] = [];
                }
                queue.add(() => spotifyProcessNext(
                    spotify.searchTracks(localtrack.track.name+' artist:'+localtrack.track.artists[0].name, {limit: 5}),
                    (res) => {
                        localtrack['matches'] = localtrack['matches'].concat(res.tracks.items);

                        if (res.tracks.items.length != 0) {
                            matchCount++;
                            $('#step4 small').text('found '+matchCount+' potential matches');
                        }
                    }
                ).catch(() => {
                    $('#step4').removeClass('working');
                    $('#step4').addClass('list-group-item-danger');
                    queue.pause();
                }));
            });
        });
        await queue.onEmpty();
        $('#step4').removeClass('working');
        $('#step4').addClass('list-group-item-success');

        userPlaylists.forEach(playlist => {
            // Remove local tracks that don't have matches
            playlist.localtracks = playlist.localtracks.filter(localtrack => localtrack.matches.length != 0);

            playlist.localtracks.forEach(localtrack => {
                localtrack.matches.forEach(match => {
                    match.chosenOne = false;
                    match.duration_difference = match.duration_ms - localtrack.track.duration_ms;
                });
            });
        });

        // Enable Step 5
        $('#step5 button').prop('disabled', false);
    }

    // Step 5
    $('#step5 button').click(async function() {
        userPlaylists.forEach(playlist => {
            playlist.localtracks.forEach(localtrack => {
                if (Math.abs(localtrack.matches[0].duration_difference) < 3000) {
                    localtrack.matches[0].chosenOne = true;
                }
            });
        });

        // Render Table
        var template = $('#tableTemplate').html();
        var rendered = Mustache.render(template, {playlists: userPlaylists});
        $('#tableContainer').append(rendered);
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
