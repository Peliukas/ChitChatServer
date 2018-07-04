const express = require('express');
const bodyParser = require('body-parser');
var randomstring = require("randomstring");
const app = express();
var mongoose = require('mongoose');
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

var conversationSchema = mongoose.Schema({
    members: [],
    messages: []
});

var conversationModel = mongoose.model('Conversation', conversationSchema);


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
                            console.log("RETURNING: ", user);
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

app.get('/find/:username', function (req, res) {
    mongoose.connect(url);
    console.log("User name: ", req.params.username);
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        const query = userModel.find({"username": {"$regex": req.params.username}}, {"username": 1});
        query.collection(userModel.collection).exec().then(userList => {
            res.send(userList);
        })
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
                var newConversation = new conversationModel({
                    members: [req.body.contact_id, user._id],
                    messages: []
                });
                newConversation.save();
                res.send({user: user, converstion: newConversation});
            })
        });
    } else {
        res.send("param contact_id or sender_id is empty");
    }
})

app.get('/contact-list', function (req, res) {
    console.log("Auth head: ", req.header('Authorization'));
    if (req.header('Authorization')) {
        var userToken = req.header('Authorization');
        mongoose.connect(url);
        var db = mongoose.connection;
        db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', function () {
            const query = userModel.findOne();
            query.collection(userModel.collection);
            query.where('token').eq(userToken).exec().then(user => {
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


app.post('/sendMessage', function (req, res) {
    if (req.body.conversation_id) {
        mongoose.connect(url);
        var db = mongoose.connection;
        db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', function () {
            const query = conversationModel.findOne();
            query.collection(conversationModel.collection);
            query.where('_id').eq(req.body.conversation_id).exec().then(conversation => {
                conversation.messages.push({author_id: req.body.author_id, body: req.body.body, timestamp: new Date()});
                conversation.save();
                console.log("conversation: ", conversation);
                res.send(conversation);
            })
        });
    } else {
        res.send("fail");
    }
})


app.get('/conversations', function (req, res) {
    mongoose.connect(url);
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        const query = userModel.findOne();
        query.collection(userModel.collection);
        query.where('token')
            .eq(req.header('Authorization'))
            .exec()
            .then(loggedInUser => {
                if (loggedInUser._id) {
                    const query = conversationModel.find();
                    query.collection(conversationModel.collection)
                        .where('members')
                        .in(loggedInUser._id)
                        .exec()
                        .then(conversationList => {
                            console.log("conversationList: ", conversationList);
                            const query = userModel.find();
                            var newConversations = [];
                            conversationList.forEach(conversation => {
                                query.collection(userModel.collection)
                                    .where('_id').in(conversation.members)
                                    .exec()
                                    .then(conversationMembers => {
                                        console.log('conversation members: ', conversationMembers);
                                        conversation.members = conversationMembers;
                                        newConversations.push(conversation);
                                    });
                            }).then(() => {
                                res.send(newConversations);
                            });
                        })
                } else {
                    res.error(500);
                }
            })
    });
})


app.get('/conversation/:id', function (req, res) {
    mongoose.connect(url);
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        const query = conversationModel.findOne();
        query.collection(conversationModel.collection);
        query.where('_id').eq(req.body.conversation_id).exec().then(conversation => {
            res.send(conversation);
        })
    });
})

app.listen(3000, function () {
    console.log('ChitChat server listening on port 3000!')
})
