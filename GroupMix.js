var https = require("https");
var request=require("request");


var client_secret= process.env.client_secret,
    refreshToken=process.env.REFRESH_TOKEN,
    bot_id=process.env.bot_id,
    spotify_user=process.env.spotify_user,
    playlist=process.env.playlist,
    accessToken, parsedBody, parsedURI, parsedSong, parsedArtist, successMessage;


    function respond() {
      var request = JSON.parse(this.req.chunks[0]),
          // command would be /add:song/artist
          botRegexT_A = /^\/add:.+\/.+$/,
          //command would be /add:song
          botRegexT = /^\/add:.+[^\/]$/;
      //cut up the request to get the query
      var reqString = JSON.stringify(request.text);
      var trackTemp = reqString.slice(reqString.indexOf(":") + 1, reqString.lastIndexOf("/"));
      var track= trackTemp.replace(/ /g, '+');
      var artistTemp = reqString.slice(reqString.lastIndexOf("/") + 1, reqString.lastIndexOf("\""));
      var artist= artistTemp.replace(/ /g, '+');


      console.log(artist, track);

      if (request.text && botRegexT_A.test(request.text)) {
          this.res.writeHead(200);
          console.log("message parsed: track and artist query");
          //search spotify for URI based on track and artist
          searchTrack_Artist(artist, track);
          this.res.end();
      } else if (request.text && botRegexT.test(request.text)) {
          this.res.writeHead(200);
          console.log("searching for track only!");
          //search spotify for URI based on track
          searchTrackOnly(track);
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
            authorization: 'Basic' + client_secret
        },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        }
    };

    request(options, function(error, response, body) {
        if (error) throw new Error(error);
        var parsedAuthBody = JSON.parse(body);
        accessToken = parsedAuthBody.access_token;
        console.log("recieved accessToken: " + accessToken);
        appendTrack(queryURI, accessToken);
    });
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
        },
        headers: {
            'postman-token': 'a9bc10bb-a9bc-d7bd-17a0-912db9f8483a',
            'cache-control': 'no-cache'
        }
    };

    request(options, function(error, response, body) {
        if (error) throw new Error(error);
        console.log("searched for track and found some result");
        parsedBody = JSON.parse(body);
        console.log(parsedBody);
        searchParse(parsedBody);
    });
}

function searchTrack_Artist(artist, track) {
    var options = {
        method: 'GET',
        url: 'https://api.spotify.com/v1/search?query=artist%3A' + artist + '&track%3A'+ track + '&type=track&offset=0&limit=1'
      };

    request(options, function(error, response, body) {
        if (error) throw new Error(error);

        console.log(body);
      /*    parsedURI=JSON.stringify(body.tracks.items.uri);
          parsedArtist = JSON.stringify(body.tracks.items.artists.name);
          parsedSong = JSON.stringify(body.tracks.items.name);
          successMessage= "Added " + parsedSong + " by " + parsedArtist + ".";
          console.log(parsedURI, parsedArtist, parsedSong);
        auth();*/
    });
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

  botReq = https.request(options, function(res) {
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
