var firebase = require('firebase-admin')
var serviceAccount = require('../config/serviceAccountKey.json')

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://comp-musical.firebaseio.com",
})

var db = firebase.database()
var root = db.ref('/')
var rootChild = "/mock";
var globalRef = root.child(rootChild);
/*
    Database View

    {
        playlistFirebaseID: {
            playlistID: spotifyPlaylistID,

            musicFirebaseID: {
                musicID: spotifyMusicID,
                userID: spotifyUserID,
                rate: int,
            },

        },

    },

*/

function pushPlaylist(ref, playlist) {
    var playlistsRef = ref.child('/playlists')

    return new Promise((resolve, reject) => {
        playlistRef = playlistsRef.push(playlist)
        resolve(playlistRef)
    })
}

function playlistExists(ref,playlistId){
    var playlistsRef = ref.child('/playlists')
    return new Promise((resolve, reject) => {
        playlistsRef.once("value", (playlists) => {
            Object.keys(playlists.val()).forEach(ele=>{
                if(playlists.val()[ele].playlistID==playlistId){
                    resolve(ele);
                    return;
                }
            })
            resolve(null);
        })
    })
}

function getRateOfTrack(ref,playlistID,userId,trackId){
    musicsRef = ref.child(`playlists/${playlistID}/musics`)
    return new Promise((resolve, reject) => {
        musicsRef.once("value", (musics) => {
            Object.keys(musics.val()).forEach(ele=>{
                if(musics.val()[ele].UserID==userId && musics.val()[ele].musicID==trackId){
                    resolve(musics.val()[ele].rate);
                    return;
                }
            })
            resolve(-1);
        })
    })
}

function pushMusic(ref, playlistID, music) {
    playlistRef = ref.child(`playlists/${playlistID}/musics`)

    return new Promise((resolve, reject) => {
        musicRef = playlistRef.push(music)
        resolve(musicRef)
    })
}

function getPlaylist(ref, playlistID) {
    var playlistRef = ref.child(`/playlists/${playlistID}`)

    return new Promise((resolve, reject) => {
        playlistRef.once('value').then((playlistObject) => {
            resolve(playlistObject.val())
        }, (error) => {
            reject(error)
        })
    })
}

function getAllPlaylists(ref) {
    var playlistRef = ref.child('/playlists')

    return new Promise((resolve, reject) => {
        playlistRef.once("value", (playlists) => {
            resolve(playlists.val())
        }, (error) => {
            reject(error)
        })
    })
}

function getMusic(ref, playlistID, musicID) {
    var musicRef = ref.child(`playlists/${playlistID}/musics/${musicID}`)

    return new Promise((resolve, reject) => {
        musicRef.once("value", (music) => {
            resolve(music.val())
        }, (error) => {
            reject(error)
        })
    })
}



module.exports = {
    mockData: () => {
        var playlist = new Object
        playlist.playlistID = "playlistSpotifyID - 1"
        /* pushPlaylist(ref, playlist).then((playlistRef) => {
            var playlistID = playlistRef.key
            var music1 = new Object

            music1.musicID = "spotifyMusicID - 1"
            music1.UserID = "spotifyUserID - 1"
            music1.rate = 3

            var music2 = new Object

            music2.musicID = "spotifyMusicID - 2"
            music2.UserID = "spotifyUserID - 2"
            music2.rate = 4

            pushMusic(ref, playlistID, music1)
            pushMusic(ref, playlistID, music2)

            // Get playlists
            getAllPlaylists(ref).then((playlists) => {
                console.log(Object.keys(playlists))
            })

            // Get one playlist
            getPlaylist(ref, playlistID).then((playlist) => {
                console.log(playlist.playlistID)
                console.log(Object.keys(playlist.musics))
                var firstMusicID = Object.keys(playlist.musics)[0]
                console.log(firstMusicID)
                getMusic(ref, playlistID, firstMusicID).then((music) => {
                    console.log(music.rate)
                })
            })
        }) */
    },
    pushRank: (playlistId,music_user) => {
        var playlist = new Object;
        playlist.playlistID = playlistId;
        var respReturn = "done";
        return new Promise((resolve, reject) => {
            playlistExists(globalRef,playlistId).then(resp=>{
                //playlist já existe
                if(resp!=null){
                    var playListRef = resp;
                    getRateOfTrack(globalRef,resp,music_user.UserID,music_user.musicID).then(resp=>{
                        //usuario ainda nao votou
                        if(resp==-1){
                            pushMusic(globalRef, playListRef, music_user)
                            resolve(respReturn);
                        }
                        //usuario ja votou
                        else{
                            respReturn = 'usuario ja votou'; 
                            console.log('usuario ja votou');
                            resolve(respReturn);
                        }
                    })
                }
                //playlist não existe
                else{
                    pushPlaylist(globalRef, playlist).then((playlistRef) => {
                        var playlistID = playlistRef.key
                        pushMusic(globalRef, playlistID, music_user)
                        resolve(respReturn);
                    })
                }
            })
        })
    },
    pushJoinPlaylist: (playlistId,tracksId,userId)=>{
        var playlist = new Object;
        playlist.playlistID = playlistId;
        var respReturn = "done";
        return new Promise((resolve, reject) => {
            playlistExists(globalRef,playlistId).then(resp=>{
                if(resp!=null){
                    tracksId.forEach(obj=>{
                        var music = new Object
                        music.musicID = obj;
                        music.UserID = userId;
                        music.rate = -1;
                        pushMusic(globalRef, resp, music)
                    })
                    resolve(respReturn);
                }
                else{
                    pushPlaylist(globalRef, playlist).then((playlistRef) => {
                        var playlistID = playlistRef.key
                        tracksId.forEach(obj=>{
                            var music = new Object
                            music.musicID = obj;
                            music.UserID = userId;
                            music.rate = -1;
                            pushMusic(globalRef, playlistID, music)
                        })
                        resolve(respReturn);
                    })
                }
            })
        })
    },
    getTrackRate: (playlistId,music_user) =>{
        var playlist = new Object;
        playlist.playlistID = playlistId;
        return new Promise((resolve, reject) => {
            playlistExists(globalRef,playlistId).then(resp=>{
                //playlist já existe
                if(resp!=null){
                    getRateOfTrack(globalRef,resp,music_user.UserID,music_user.musicID).then(resp=>{
                        resolve(resp);
                    })
                }
                //playlist não existe
                else{
                    resolve(-1)
                }
            })
        })
    },
    getTracksOnDB: (playlistId)=>{
        return new Promise((resolve, reject) => {
            playlistExists(globalRef,playlistId).then(resp=>{
                if(resp!=null){
                    getPlaylist(globalRef,resp).then(resp=>{
                        resolve(resp.musics);
                    })
                }
                else{
                    resolve(null)
                }
            })
        })
    }

}