const express = require('express')
const bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var randomstring = require("randomstring");
const app = express();
var mongoose = require('mongoose');
var ObjectID = require('mongodb').ObjectID;
app.use(bodyParser.json());
const url = "mongodb://localhost:27017/chitchat";


var userSchema = userSchema = mongoose.Schema({
    username: String,
    password: String,
    token: String,
    email: String,
    contacts: [],
    conversations: []
});

var userModel = mongoose.model('User', userSchema);


app.post('/createschemas', function (req, res) {
    mongoose.connect(url);
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        console.log("schema created!");
        res.send("schema created!");
    });
})

app.post('/login', function (req, res) {
    if (req.body) {
        mongoose.connect(url);
        var db = mongoose.connection;
        db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', function () {
            const query = userModel.findOne();
            query.collection(userModel.collection);
            query.where('email')
                .eq(req.body.email)
                .and({'password': req.body.password})
                .exec()
                .then(user => {
                    const contactQuery = userModel.find();
                    contactQuery.collection(userModel.collection);
                    contactQuery.where('_id')
                        .in(user.contacts)
                        .select('username')
                        .exec()
                        .then(contactList => {
                            user.contacts = contactList;
                            res.send(user);
                        })
                })
        });
    }
})

app.post('/signup', function (req, res) {
    mongoose.connect(url);
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        var newUser = new userModel({
            username: req.body.username,
            password: req.body.password,
            email: req.body.email,
            token: randomstring.generate(7),
            contacts: [],
            conversations: []
        });
        newUser.save();
        res.send(newUser);
    });
})


app.post('/add-contact', function (req, res) {
    if (req.body.contact_id && req.body.sender_token) {
        mongoose.connect(url);
        var db = mongoose.connection;
        db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', function () {
            const query = userModel.findOne();
            query.collection(userModel.collection);
            query.where('token').eq(req.body.sender_token).exec().then(user => {
                user.contacts.push(req.body.contact_id);
                user.save();
                res.send(user);
            })
        });
    } else {
        res.send("param contact_id or sender_id is empty");
    }
})

app.get('/contact-list/:token', function (req, res) {
    if (req.params.token) {
        mongoose.connect(url);
        var db = mongoose.connection;
        db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', function () {
            const query = userModel.findOne();
            query.collection(userModel.collection);
            query.where('token').eq(req.params.token).exec().then(user => {
                const contactQuery = userModel.find();
                contactQuery.collection(userModel.collection);
                contactQuery.where('_id').in(user.contacts)
                    .select('username')
                    .exec()
                    .then(contactList => {
                        console.log("contact list: ", contactList);
                        res.send(contactList);
                    })
            })
        });
    }
})


app.get('/find/:username', function (req, res) {
    if (req.params.username) {
        MongoClient.connect(url, function (err, db) {
            if (err) res.send(err);
            else {
                var dbo = db.db("chitchat");
                dbo.collection("users").findOne(req.params, function (err, result) {
                    console.log("found object ", result);
                    res.send(result);
                })
            }
        })
    } else res.send("parameter username is empty");
})

//
// app.get('/conversation/:id', function (req, res) {
//
// })

app.post('/sendMessage', function (req, res) {
    if (req.body) {
        findOne("conversations", {"_id": req.body.conversationID}).then(conversation => {

        }, reason => {
            insertOne("conversations", {})
        });
    }
})

app.listen(3000, function () {
    console.log('ChitChat server listening on port 3000!')
})


// async function findOne(objectName, value, opts = {}) {
//     if (value && objectName) {
//         MongoClient.connect(url, function (err, db) {
//             if (err) return false;
//             else {
//                 var dbo = db.db("chitchat");
//                 dbo.collection(objectName).findOne(value ? value : {}, opts, function (err, result) {
//                     console.log("found object ", result);
//                     return result;
//                 })
//             }
//         })
//     }
// }

// async function insertOne(objectName, value) {
//     if (value && objectName) {
//         MongoClient.connect(url, function (err, db) {
//             if (err) return false;
//             else {
//                 var dbo = db.db("chitchat");
//                 dbo.collection(objectName).insertOne(value, function (err, result) {
//                     console.log("object inserted: ", result);
//                     return result;
//                 })
//             }
//         })
//     }
// }
