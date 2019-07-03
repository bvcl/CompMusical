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
  clientId: '2b748ffd807843cbbed3d02542d86909',
  clientSecret: '80ad7a7f9221429ea671fbb74d92eba4',
  redirectUri: 'http://localhost:8888/callback'
});
var client_id = '2b748ffd807843cbbed3d02542d86909'; // Your client id
var client_secret = '80ad7a7f9221429ea671fbb74d92eba4'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; 
var globalToken="";
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
  var scope = 'user-top-read playlist-modify-public playlist-modify-private user-read-private user-read-email user-read-recently-played playlist-read-private playlist-read-collaborative';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state,
      show_dialog:true
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
        globalToken = access_token;
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

app.get('/get_token',function(req,res){
  res.send({
    token:globalToken
  })
})

app.get('/user_playlist', function(req, res) {
  spotifyApi.getMe()
  .then(function(data) {
    userInfo=data.body;
    spotifyApi.getUserPlaylists(data.body.id)
      .then(function(data) {
        //console.log('Retrieved playlists', data.body);
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

app.get('/post_rank', function(req, res) {
  var trackId = req.query.trackId;
  var playlistId = req.query.playlistId;
  var userId = req.query.userId;
  var rank = req.query.rank;

  var music_user = new Object
  music_user.musicID = trackId
  music_user.UserID = userId
  music_user.rate = rank
  
  database.pushRank(playlistId,music_user).then(resp=>{
    //console.log(resp);
  });
  
  res.end('post done');
});

app.get('/post_join_playlist', function(req, res) {
  var tracksId = req.query.tracksId;
  var playlistId = req.query.playlistId;
  var userId = req.query.userId;
  
  database.pushJoinPlaylist(playlistId,tracksId,userId).then(resp=>{
    //console.log(resp);
  });
  
  res.end('joined');
});

app.get('/get_track_rate', function(req, res) {
  var trackId = req.query.trackId;
  var playlistId = req.query.playlistId;
  var userId = req.query.userId;
  var rank = -1;

  var music_user = new Object
  music_user.musicID = trackId
  music_user.UserID = userId
  music_user.rate = rank
  
  database.getTrackRate(playlistId,music_user).then(resp=>{
    //console.log(resp);
    res.send({
      'rate': resp
    });
  });
});

app.get('/get_recently_played', function(req, res) {
  spotifyApi.getMyRecentlyPlayedTracks({ limit: 2})
  .then(function(data){
      res.send({
        'recentlyPlayed': data.body
      });  
    },function(err) {
      console.log('Something went wrong!', err);
      res.send("error1");
    }
  )
});

app.get('/get_audioFeatures_tracks', function(req, res) {
  var tracks_ids = req.query.tracks_id;
  spotifyApi.getAudioFeaturesForTracks(tracks_ids)
  .then(function(data){
      res.send({
        'audioFeatures': data.body
      });  
    },function(err) {
      console.log('Something went wrong!', err);
      res.send("error1");
    }
  )

});

app.get('/post_tracks_playlist', function(req, res) {
  var playlistId = req.query.playlistId;
  var tracksURIs = req.query.tracksURIs;

  spotifyApi.addTracksToPlaylist(playlistId,tracksURIs)
  .then(function(data){
      res.send({
        'message': "tracks added"
      });  
    },function(err) {
      console.log('Something went wrong!', err);
      res.send("error1");
    }
  )
});

app.get('/get_tracks_db', function(req, res) {
  var playlistId = req.query.playlistId;
  database.getTracksOnDB(playlistId).then(resp=>{
    res.send({
      tracks:resp
    })
  })
});

app.get('/get_tracks_by_id', function(req, res) {
  var tracksId = req.query.tracksId;
  console.log("TRACKSID");
  
  console.log(tracksId);
  
  if(tracksId){
    spotifyApi.getTracks(tracksId)
    .then(function(data){
        res.send({
          'tracks': data.body
        });  
      },function(err) {
        console.log('Something went wrong!', err);
        res.send("error1");
      }
    )
  }
  else{
    res.end("nothing to update");
  }
});

function makeMatrix(tracksJson){
  var objValues = Object.values(tracksJson);
  var musicIds = [...new Set(objValues.map(o=>o.musicID))];
  var userIds = [...new Set(objValues.map(o=>o.UserID))];
  var matrix = [];
  for(i=0;i<userIds.length;i++)matrix.push([...new Array(musicIds.length)].map(x => 0));

  for(i=0;i<userIds.length;i++){
    for(j=0;j<musicIds.length;j++){
      var filtered = objValues.filter(o=>(o.musicID==musicIds[j] && o.UserID==userIds[i])); 
      if(filtered.length>0){
        matrix[i][j]=Number(filtered[0].rate)
      }
      else{
        matrix[i][j]=-2;
      } 
    }
  }
  return {matrix:matrix,userIds:userIds,musicIds:musicIds};
}

app.get('/get_user_score_matrix', function(req, res) {
  var playlistId = req.query.playlistId;
  database.getTracksOnDB(playlistId).then(resp=>{
    //leastMisery(makeMatrix(resp),2);
    leastMisery({
      matrix:[[3,1,2,4,5],[4,2,4,2,3],[5,5,3,4,3],[2,3,4,1,5]],
      userIds:['U1','U2','U3','U4'],
      musicIds:['T1','T2','T3','T4','T5']
     },2);
    res.send({
      score_matrix:makeMatrix(resp)
    })
  })
});

function leastMisery(score_matrix,numberDesiredTracks){
  var values = score_matrix.matrix;
  var musicIds = score_matrix.musicIds;
  var finalScore = [];

  for(j=0;j<values[0].length;j++){
    var menorValor = 6;
    for(i=0;i<values.length;i++){
      if(values[i][j]<menorValor && values[i][j]>-1)menorValor=values[i][j];
    }
    if(menorValor==6)menorValor=-1;
    finalScore.push({leastMisery:menorValor,trackId:musicIds[j]});
  }
  finalScore.sort(function(a, b){
    return a.leastMisery < b.leastMisery;
  });
  console.log(finalScore);
  
  console.log(finalScore.slice(0,numberDesiredTracks));
  return  finalScore.slice(0,numberDesiredTracks)
}

function average(score_matrix,numberDesiredTracks){
  var values = score_matrix.matrix;
  var musicIds = score_matrix.musicIds;
  var finalScore = [];

  for(j=0;j<values[0].length;j++){
    var avg = 0;
    var countNulls=0;
    for(i=0;i<values.length;i++){
      if(values[i][j]==-1)countNulls++;
      else if(values[i][j]==-2){
        avg+=3;
        //tratar missing values
      }
      else avg+=values[i][j];
    }
    avg = (avg/(values.length-countNulls))
    finalScore.push({average:avg,trackId:musicIds[j]});
  }
  finalScore.sort(function(a, b){
    return a.average < b.average;
  });
  console.log(finalScore.slice(0,numberDesiredTracks));
  return  finalScore.slice(0,numberDesiredTracks)
}

function pluralityVoting(score_matrix,numberDesiredTracks){
  var values = score_matrix.matrix;
  var musicIds = score_matrix.musicIds;

  for(i=0;i<values.length;i++){
    for(j=0;j<values[0].length;j++){
      if(values[i][j]!=-2)values[i][j] = {'rate':values[i][j],'trackId':musicIds[j]}
      else values[i][j] = {'rate':3,'trackId':musicIds[j]}
    }
  }

  var orderByUser = []
  for(i=0;i<values.length;i++){
    orderByUser.push([]);
    orderByUser[i] = values[i].sort(function(a, b){
      return a.rate < b.rate;
    });
  }
  
  var finalResults = [];
  for(j=0;j<orderByUser[0].length;){
    var occurences = [...new Array(musicIds.length)].map(x => 0);
    for(i=0;i<orderByUser.length;i++){
      occurences[musicIds.indexOf(orderByUser[i][j].trackId)]++;
    }
    
    var highestOccurenceIndex = 0;
    for(k=0;k<occurences.length;k++){
      if(occurences[k] > occurences[highestOccurenceIndex])highestOccurenceIndex = k;
    }
    
    for(p=0;p<orderByUser.length;p++)orderByUser[p] = orderByUser[p].filter(o=>o.trackId!=musicIds[highestOccurenceIndex])
    
    finalResults.push(musicIds[highestOccurenceIndex]);
  }
  return finalResults;
}


//https://developer.spotify.com/console/get-current-user-top-artists-and-tracks/?type=artists&time_range=medium_term&limit=10&offset=5


console.log('Listening on 8888');
app.listen(8888);
