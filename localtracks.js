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
        for (const playlist of userPlaylists) {
            await queue.add(() => spotifyProcessNext(spotify.getPlaylistTracks(playlist.id), (res) => {
                res.items.forEach((trackItem, position) => {
                    if (trackItem.is_local) {
                        var uri = trackItem.track.uri;

                        localTrackList[uri] = Object.assign({}, localTrackList[uri], {
                            title: trackItem.track.name,
                            artist: trackItem.track.artists[0].name,
                            album: trackItem.track.album.name,
                            duration: trackItem.track.duration_ms
                        });

                        var playlistOccourence = {
                            id: playlist.id,
                            position: res.offset+position,
                            name: playlist.name
                        };
                        if ('playlists' in localTrackList[uri]) {
                            localTrackList[uri].playlists.push(playlistOccourence);
                        } else {
                            localTrackList[uri].playlists = [playlistOccourence];
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
        for (const uri of Object.keys(localTrackList)) {
            if (typeof localTrackList[uri]['matches'] === 'undefined') {
                localTrackList[uri]['matches'] = [];
            }

            await queue.add(() => spotifyProcessNext(
                spotify.searchTracks(localTrackList[uri].title+' artist:'+localTrackList[uri].artist+' album:'+localTrackList[uri].album, {limit: 5}), (res) => {
                    localTrackList[uri]['matches'] = localTrackList[uri]['matches'].concat(res.tracks.items);

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
        }
        await queue.onEmpty();
        $('#step4').removeClass('working');
        $('#step4').addClass('list-group-item-success');

        // Remove local tracks that don't have matches
        localTrackList = Object.filter(localTrackList, track => track.matches.length != 0);

        // Render Table
        var template = $('#tableTemplate').html();
        var rendered = Mustache.render(template, {playlists: Object.entries(localTrackList).map(([uri, track]) => {
            track.localUri = uri;

            track.matches.forEach(match => {
                match.duration_diff = match.duration_ms - track.duration;
            });

            return track;
        })});
        $('#tableContainer').append(rendered);

        // Enable Step 5 & 6
        $('#step5 button').prop('disabled', false);
        $('#step6 button').prop('disabled', false);
    }
});

// Step 5
$('#step5 button').click(async function() {
    $('#step5 button').prop('disabled', true);

    Object.entries(localTrackList).map(([uri, track]) => {
        for (var match of track.matches) {
            if (Math.abs(match.duration_ms - track.duration) < 3000) {
                match.chosenOne = true;

                $('#tableContainer div.row[data-localUri="'+uri+'"] div.list-group-item[data-uri="'+match.uri+'"]').addClass('active');

                break;
            }
        }
    });

    $('#step5').addClass('list-group-item-success');
});

// Step 6
$('#step6 button').click(async function() {
    $('#step5 button').prop('disabled', true);
    $('#step6 button').prop('disabled', true);
    $('#step6').addClass('working');

    for (const uri of Object.keys(localTrackList)) {
        localTrackList[uri].matches = localTrackList[uri].matches.filter(match => match.chosenOne);
        if (localTrackList[uri].matches.length != 1) continue;

        for (var playlist of localTrackList[uri].playlists) {
            await queue.add(() => spotifyReplaceLocalTrack(playlist.id, playlist.position, localTrackList[uri].matches[0].uri));
        }
    }

    await queue.onEmpty();
    $('#step6').removeClass('working');
    $('#step6').addClass('list-group-item-success');
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

async function spotifyReplaceLocalTrack(playlistId, trackPosition, replacementUri) {
    // Get Snapshot ID for playlist
    var ownPlaylists = [];
    await spotifyProcessNext(spotify.getUserPlaylists({limit:50}), (res) => {
        ownPlaylists = ownPlaylists.concat(res.items);
    });
    var snapshotId = ownPlaylists.filter(playlist => playlist.id == playlistId)[0].snapshot_id;

    // Remove Track
    await spotify.removeTracksFromPlaylistInPositions(playlistId, [trackPosition], snapshotId);

    // Add Replacement
    await spotify.addTracksToPlaylistAtPosition(playlistId, [replacementUri], trackPosition);
}


Object.filter = (obj, predicate) => Object.keys(obj)
                                          .filter( key => predicate(obj[key]) )
                                          .reduce( (res, key) => (res[key] = obj[key], res), {} );
