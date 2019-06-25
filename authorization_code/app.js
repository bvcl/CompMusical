/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */
var database = require('./scripts/firebase')
database.mockData()

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var SpotifyWebApi = require('spotify-web-api-node');
var userInfo;
// credentials are optional
var spotifyApi = new SpotifyWebApi({
  clientId: 'd0a977ff7e984164aba6e8f5c6523deb',
  clientSecret: 'ff354fab75cf4131bdee3ff67220173a',
  redirectUri: 'http://localhost:8888/callback'
});
var client_id = 'd0a977ff7e984164aba6e8f5c6523deb'; // Your client id
var client_secret = 'ff354fab75cf4131bdee3ff67220173a'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-read-recently-played playlist-read-private playlist-read-collaborative';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        spotifyApi.setAccessToken(access_token);
        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

app.get('/get_me',function(req,res){
  res.send({
    user:userInfo
  })
})

app.get('/user_playlist', function(req, res) {
  spotifyApi.getMe()
  .then(function(data) {
    userInfo=data.body;
    spotifyApi.getUserPlaylists(data.body.id)
      .then(function(data) {
        console.log('Retrieved playlists', data.body);
         res.send({
          'items': data.body
        }); 
      },function(err) {
        console.log('Something went wrong!', err);
        res.send("error1");
      });
  }, function(err) {
    console.log('Something went wrong!', err);
    res.send("error2");
  });
});

app.get('/playlist_tracks', function(req, res) {
  console.log('oi');
  console.log(req.query);
  
  var playlist_id = req.query.playlist_id;
  console.log(playlist_id);
  spotifyApi.getPlaylistTracks(playlist_id)
  .then(function(data){
    console.log(data);
      res.send({
        'tracks': data.body
      });  
    },function(err) {
      console.log('Something went wrong!', err);
      res.send("error1");
    }
  )
});

app.get('/get_user', function(req, res) {
  var user_id = req.query.user_id;
  spotifyApi.getUser(user_id)
  .then(function(data){
      res.send({
        'user': data.body
      });  
    },function(err) {
      console.log('Something went wrong!', err);
      res.send("error1");
    }
  )
});


//https://developer.spotify.com/console/get-current-user-top-artists-and-tracks/?type=artists&time_range=medium_term&limit=10&offset=5


console.log('Listening on 8888');
app.listen(8888);
