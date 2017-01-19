var https = require("https");
var request = require("request");


var client_secret = process.env.client_secret,
    refreshToken = process.env.REFRESH_TOKEN,
    bot_ID = process.env.bot_id,
    spotify_user = process.env.spotify_user,
    playlist = process.env.playlist,
    lastFMAPI = process.env.lastFMAPIKey,
    andrew = process.env.andrew,
    accessToken, body, parsedURI, parsedSong, parsedArtist, parsedAlbum,
    successMessage, authBody, payload, albumLink, snapshot_id, lastTrack;


function respond() {
    var artist, track, reqString;

    var request = JSON.parse(this.req.chunks[0]),
        // command would be /add:song/artist
        botRegexT_A = /^\/add:.+\/.+$/,
        //command would be /add:song
        botRegexT = /^\/add:.+[^\/]$/,
        botRegexClear = /^\/clear$/;

    if (request.text && botRegexT_A.test(request.text)) {
        this.res.writeHead(200);
        //cut up the request to get the query
        reqString = JSON.stringify(request.text);
        var trackTemp = reqString.slice(reqString.indexOf(":") + 1, reqString.lastIndexOf("/"));
        track = trackTemp.replace(/ /g, '+');
        var artistTemp = reqString.slice(reqString.lastIndexOf("/") + 1, reqString.lastIndexOf("\""));
        artist = artistTemp.replace(/ /g, '+');

        console.log("searching for: " + track + " by " + artist);

        //search spotify for URI based on track and artist
        searchTrack_Artist(artist, track);
        this.res.end();
    } else if (request.text && botRegexT.test(request.text)) {
        this.res.writeHead(200);
        //cut up the request to get the query
        reqString = JSON.stringify(request.text);
        var anotherTrackTemp = reqString.slice(reqString.indexOf(":") + 1, reqString.length);
        track = anotherTrackTemp.replace(/ /g, '+');

        console.log("searching spotify for: " + track);

        //search spotify for URI based on track
        searchTrackOnly(track);
        this.res.end();
    } else if (botRegexClear.test(request.text) && request.name == andrew) {
        this.res.writeHead(200);
        console.log("starting process to delete last track");
        //start clearing the last track.
        auth4Clear();
        this.res.end();
    } else {
        console.log("That's not music.");
        this.res.writeHead(200);
        this.res.end();
    }
}


//get authorized for Spotify
//authorization field below is basic + base64 encoded client id and client secret
function auth() {
    var options = {
        method: 'POST',
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'postman-token': '76504f58-bc64-b4fd-0bf0-1f81a055cb18',
            'cache-control': 'no-cache',
            'content-type': 'application/x-www-form-urlencoded',
            authorization: 'Basic ' + client_secret
        },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        }
    };

    request(options, function(error, response, body) {
        if (error) throw new Error(error);
        console.log(JSON.parse(body));
        body = JSON.parse(body);
        authParse(body);

    });
}

function authParse(body) {
    accessToken = body.access_token;
    console.log(body.access_token);
    appendTrack(parsedURI, accessToken);
}

//search track
function searchTrackOnly(track) {
    var options = {
        method: 'GET',
        url: 'https://api.spotify.com/v1/search',
        qs: {
            q: track,
            type: 'track',
            offset: '0',
            limit: '1'
        }
    };

    request(options, function(error, response, body) {
        if (error) throw new Error(error);
        body = JSON.parse(body);
        console.log("parsing time!");
        parseItParseItRealGood(body);
    });
}

function searchTrack_Artist(artist, track) {
    var options = {
        method: 'GET',
        url: 'https://api.spotify.com/v1/search?query=artist%3A' + artist + '&track%3A' + track + '&type=track&offset=0&limit=1'
    };

    request(options, function(error, response, body) {
        if (error) {
          console.log (error);
        } else if (JSON.parse(body.tracks.total===0)){
          message="No results found, try searching with only a track name";
          postAlbum(message);
        }
        body = JSON.parse(body);
        console.log(body);
        console.log("parsing time! Heyooo");
        parseItParseItRealGood(body);
    });
}

function parseItParseItRealGood(body) {
    parsedURI = body.tracks.items[0].uri;
    parsedArtist = body.tracks.items[0].artists[0].name;
    parsedSong = body.tracks.items[0].name;
    parsedAlbum = body.tracks.items[0].album.name;
    successMessage = "Added " + parsedSong + " by " + parsedArtist + ".";
    console.log("all parsed up -- I speak parse...l tongue. GET IT?");
    //configure the payload
    auth();
}

//addy it to the playlist.

function appendTrack(parsedURI, accessToken) {
    var options = {
        method: 'POST',
        url: 'https://api.spotify.com/v1/users/' + spotify_user + '/playlists/' + playlist + '/tracks?uris=' + parsedURI,
        headers: {
            authorization: 'Bearer ' + accessToken,
        }
    };

    request(options, function(error, response, body) {
        if (error) throw new Error(error);
        console.log("popped it in the playlist for ya.");
        console.log(body);
        postMessage(successMessage);
    });
}

//hit lastFM to get album image
function getAlbumArt(parsedArtist, parsedAlbum) {
    var options = {
        method: "POST",
        url: "https://ws.audioscrobbler.com/2.0/?method=album.getinfo&api_key=" + lastFMAPI + "&artist=" + parsedArtist + "&album=" + parsedAlbum + "&format=json"
    };

    request(options, function(error, response, body) {
        if (error) {
            console.log(error);
            //skip the album artwork then.
            postMessage(successMessage);
        }
        body = JSON.parse(body);
        albumParse(body);
    });
}

function albumParse(body) {
    message = body.album.image[3]["#text"];
    console.log("got the art");
    postAlbum(message);
}

//-------module for clearing the last song from the list-----------

function auth4Clear() {
    var options = {
        method: 'POST',
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'postman-token': '76504f58-bc64-b4fd-0bf0-1f81a055cb18',
            'cache-control': 'no-cache',
            'content-type': 'application/x-www-form-urlencoded',
            authorization: 'Basic ' + client_secret
        },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        }
    };

    request(options, function(error, response, body) {
        if (error) throw new Error(error);
        console.log(JSON.parse(body));
        body = JSON.parse(body);
        auth4ClearParse(body);

    });
}

function auth4ClearParse(body) {
    accessToken = body.access_token;
    console.log(body.access_token);
    getPlaylist(spotify_user, playlist, accessToken);
}

function getPlaylist(spotify_user, playlist, accessToken) {
    var options = {
        method: "GET",
        url: "https://api.spotify.com/v1/users/" + spotify_user + "/playlists/" + playlist,
        headers: {
            authorization: 'Bearer ' + accessToken,
        }
    };

    request(options, function(error, response, body) {
        if (error) throw new Error(error);
        console.log("Got the snapshot ID.");
        body = JSON.parse(body);
        parseSnapshot(body);
    });
}

var lastTrack;
var lastTrackArr;
var lastURI;

function parseSnapshot(body) {
    snapshot_id = body.snapshot_id;
    lastTrack = body.tracks.total - 1;
    var lastTrackArr = [];
    lastTrackArr.push(body.tracks.total - 1);
    getURIForLastSong(lastTrack, accessToken);
}

function getURIForLastSong(lastTrack, accessToken) {
    var options = {
        method: "GET",
        url: "https://api.spotify.com/v1/users/" + spotify_user + "/playlists/" + playlist + "/tracks?limit=1&offset=" + lastTrack,
        headers: {
            authorization: 'Bearer ' + accessToken,
        }
    };
    request(options, function(error, response, body) {
        if (error) {
            console.log(error);
        }
        body = JSON.parse(body);
        console.log(body);
        parseURIForLastSong(body);
    });
}


var uriForLastSong;
function parseURIForLastSong(body){
  uriForLastSong = body.items[0].track.uri;
  clearTheLast(snapshot_id, lastTrackArr, accessToken, uriForLastSong);
}


function clearTheLast(snapshot_id, lastTrackArr, accessToken, uriForLastSong) {
    var options = {
        method: "DELETE",
        url: "https://api.spotify.com/v1/users/" + spotify_user + "/playlists/" + playlist + "/tracks",
        headers: {
            authorization: 'Bearer ' + accessToken,
        },
        body: JSON.stringify({
            "tracks": [{ "uri": uriForLastSong,
                "positions": lastTrackArr
            }],
            "snapshot_id": snapshot_id
        })
    };


    request(options, function(error, response, body) {
        if (error) {
            console.log(error);
        }
        console.log("deleted the lastone");
        console.log(body);
        message = "Deleted the last song for you.";
        postAlbum(message);
    });
}


//-------------------------------------

function postMessage(successMessage) {
    var botResponse, options, body, botReq;

    botResponse = successMessage;

    options = {
        hostname: 'api.groupme.com',
        path: '/v3/bots/post',
        method: 'POST'
    };

    body = {
        "bot_id": bot_ID,
        "text": botResponse
    };

    console.log('sending ' + botResponse + ' to ' + bot_ID);

    botReq = https.request(options, function(res) {
        if (res.statusCode == 202) {
            //neat
        } else {
            console.log('rejecting bad status code ' + res.statusCode);
        }
    });

    botReq.on('error', function(err) {
        console.log('error posting message ' + JSON.stringify(err));
    });
    botReq.on('timeout', function(err) {
        console.log('timeout posting message ' + JSON.stringify(err));
    });
    botReq.end(JSON.stringify(body), getAlbumArt(parsedArtist, parsedAlbum));
}


function postAlbum(message) {
    var botResponse, options, body, botReq;

    botResponse = message;

    options = {
        hostname: 'api.groupme.com',
        path: '/v3/bots/post',
        method: 'POST'
    };

    body = {
        "bot_id": bot_ID,
        "text": botResponse
    };

    console.log('sending ' + botResponse + ' to ' + bot_ID);

    botReq = https.request(options, function(res) {
        if (res.statusCode == 202) {
            //neat
        } else {
            console.log('rejecting bad status code ' + res.statusCode);
        }
    });

    botReq.on('error', function(err) {
        console.log('error posting message ' + JSON.stringify(err));
    });
    botReq.on('timeout', function(err) {
        console.log('timeout posting message ' + JSON.stringify(err));
    });
    botReq.end(JSON.stringify(body));
}

exports.respond = respond;
