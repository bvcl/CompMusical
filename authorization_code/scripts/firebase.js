var firebase = require('firebase-admin')
var serviceAccount = require('../config/serviceAccountKey.json')

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://comp-musical.firebaseio.com",
})

var db = firebase.database()
var root = db.ref('/')

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
        var ref = root.child("/mock")
        pushPlaylist(ref, playlist).then((playlistRef) => {
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
        })
    },

}