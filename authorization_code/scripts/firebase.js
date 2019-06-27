var firebase = require('firebase-admin')
var serviceAccount = require('../config/serviceAccountKey.json')

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://comp-musical.firebaseio.com",
})

var db = firebase.database()
var ref = db.ref('/')

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

function pushPlaylist(playlist) {
    var playlistsRef = ref.child('/playlists')

    return new Promise((resolve, reject) => {
        playlistRef = playlistsRef.push(playlist)
        resolve(playlistRef)
    })
}

function pushMusic(playlistID, music) {
    playlistRef = ref.child(`playlists/${playlistID}`)

    return new Promise((resolve, reject) => {
        musicRef = playlistRef.push(music)
        resolve(musicRef)
    })
}

function getPlaylist(playlistID) {
    var playlistRef = ref.child(`/playlists/${playlistID}`)

    playlistRef.once('value').then((playlistObject) => {
        resolve(playlistObject.val())
    }, (error) => {
        reject(error)
    })
}

function getAllPlaylists() {
    var playlistRef = ref.child('/playlists')

    return new Promise((resolve, reject) => {
        playlistRef.once((playlists) => {
            resolve(playlists.val())
        }, (error) => {
            reject(error)
        })
    })
}



module.exports = {
    mockData: () => {
        var playlist = new Object
        playlist.ID = "playlistSpotifyID - 1"

        pushPlaylist(playlist).then((playlistRef) => {
            console.log(playlistRef.key)
        })
    },

}