var HTTPS = require("https");
require("dotenv").load();
var request=require("request");


var secret= process.env.secret,
    refreshToken=process.env.REFRESH_TOKEN,
    bot_id=process.env.bot_id,
    spotify_user=process.env.spotify_user,
    playlist=process.env.playlist,
    accessToken, parsedURI, parsedSong, parsedArtist, successMessage;


    function respond() {
      var request = JSON.parse(this.req.chunks[0]),
          // command would be /add:song/artist
          botRegexT_A = /^\/add:.+\/.+$/,
          //command would be /add:song
          botRegexT = /^\/add:.+[^\/]$/;
      //cut up the request to get the query
      var reqString = request.toString();
      var trackQuery = reqString.slice(reqString.indexOf(":") + 1, reqString.lastIndexOf("/"));
      var artistQuery = reqString.slice(reqString.lastIndexOf("/") + 1, reqString.length);

      if (request.text && botRegexT_A.test(request.text)) {
          this.res.writeHead(200);
          //search spotify for URI based on track and artist
          searchTrack_Artist(trackQuery, artistQuery);
          this.res.end();
      } else if (request.text && botRegexT.test(request.text)) {
          this.res.writehead(200);
          //search spotify for URI based on track
          searchTrackOnly(trackQuery);
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
            authorization: 'Basic' + secret
        },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        }
    };

    request(options, function(error, response, body) {
        if (error) throw new Error(error);
        var parsedBody = JSON.parse(body);
        accessToken = parsedBody.access_token;
        console.log("recieved accessToken: " + accessToken);
        appendTrack(queryURI, accessToken);
    });
}

//search track
function searchTrackOnly(trackQuery) {
    var options = {
        method: 'GET',
        url: 'https://api.spotify.com/v1/search',
        qs: {
            q: trackQuery,
            type: 'track',
            offset: '0',
            limit: '1'
        },
        headers: {
            'postman-token': 'a9bc10bb-a9bc-d7bd-17a0-912db9f8483a',
            'cache-control': 'no-cache'
        }
    };

    request(options, function(error, response, body) {
        if (error) throw new Error(error);

        var parsedBody = JSON.parse(body);
        searchParse(parsedBody);
    });
}

function searchTrack_Artist(artistQuery, trackQuery) {
    var options = {
        method: 'GET',
        url: 'https://api.spotify.com/v1/search',
        qs: {
            q: 'artist:' + artistQuery + "track:" + trackQuery,
            type: 'track',
            offset: '0',
            limit: '1'
        },
        headers: {
            'postman-token': '9cf85f4d-cae9-e96d-f79d-d23992122836',
            'cache-control': 'no-cache'
        }
    };

    request(options, function(error, response, body) {
        if (error) throw new Error(error);
        var parsedBody = JSON.parse(body);
        searchParse(parsedBody);
    });
}


//parse out the response
function searchParse (parsedBody){
  parsedURI=parsedBody.tracks.items.uri;
  parsedArtist = parsedBody.tracks.items.artists.name;
  parsedSong = parsedBody.tracks.items.name;
  successMessage= "Added " + parsedSong + " by " + parsedArtist + ".";
  auth();
}

//addy it to the playlist.

function appendTrack(queryURI, accessToken){
var options = {
  method: 'POST',
  url: 'https://api.spotify.com/v1/users/' + spotify_user +'/playlists/'+playlist+'/tracks/',
  headers:
   { 'postman-token': '6a207873-0f36-ca7d-9a11-c277979720e1',
     'cache-control': 'no-cache',
     authorization: 'Bearer ' + accessToken,
     'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' },
  formData: { uris: parsedUri } };

request(options, function (error, response, body) {
  if (error) throw new Error(error);

  console.log(body);

  postMessage(successMessage);

});
}

function postMessage() {
  var botResponse, options, body, botReq;

  botResponse = successMessage;

  options = {
    hostname: 'api.groupme.com',
    path: '/v3/bots/post',
    method: 'POST'
  };

  body = {
    "bot_id" : bot_ID,
    "text" : botResponse
  };

  console.log('sending ' + botResponse + ' to ' + botID);

  botReq = HTTPS.request(options, function(res) {
      if(res.statusCode == 202) {
        //neat
      } else {
        console.log('rejecting bad status code ' + res.statusCode);
      }
  });

  botReq.on('error', function(err) {
    console.log('error posting message '  + JSON.stringify(err));
  });
  botReq.on('timeout', function(err) {
    console.log('timeout posting message '  + JSON.stringify(err));
  });
  botReq.end(JSON.stringify(body));
}
exports.respond = respond;
