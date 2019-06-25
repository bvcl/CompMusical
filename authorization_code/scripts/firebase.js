var firebase = require('firebase-admin')
var serviceAccount = require('../config/serviceAccountKey.json')

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://comp-musical.firebaseio.com",
})

var db = firebase.database()
var ref = db.ref('/')

function createUser(user) {
    var usersRef = ref.child('users')
    x = ref.push(user)
}

function saveRate(userID, musicID, rate) {
    var userRef = ref.child('users').child(userID)

    userRef.set({
        rate: rate,
    })
    
}

module.exports = {
    mockData: () => {
        var mockData = ref.child('mock')
        mockData.set({
            mockSucessful: "YES"
        })

        var user = new Object
        user.name = "João Vasconcelos"
        user.age = 25
        createUser(user)

    },

    saveRate: saveRate,
}