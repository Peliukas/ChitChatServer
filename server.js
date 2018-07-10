const express = require('express');
const bodyParser = require('body-parser');
var randomstring = require("randomstring");
const app = express();
var mongoose = require('mongoose');
app.use(bodyParser.json());
const url = "mongodb://localhost:27017/chitchat";
var http = require('http').Server(app);
var io = require('socket.io')(http);
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

var connectedClients = [];

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
                            res.send(user);
                        })
                }, reason => {
                    res.send("Failed to login: ");
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
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        const query = userModel.find({"username": {"$regex": req.params.username.toLowerCase()}}, {"username": 1});
        query.collection(userModel.collection).exec().then(userList => {
            res.send(userList);
        })
    });
})

app.post('/add-contact', function (req, res) {
    if (req.body) {
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
                    members: [req.body.contact_id, user._id.toString()],
                    messages: []
                });
                newConversation.save();
                const query = userModel.find();
                query.collection(userModel.collection);
                query.where('_id').in(user.contacts)
                    .select('username')
                    .exec().then(userContacts => {
                    res.send(userContacts);
                });
            })
        });
    } else {
        res.send("contact id not set!")
    }
})

app.post('/remove-contacts', function (req, res) {
    mongoose.connect(url);
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        const query = userModel.findOne();
        query.collection(userModel.collection);
        query.where('token').eq(req.body.sender_token).exec().then(user => {
            user.contacts = [];
            user.save();
            console.log("user contacts: ", user.contacts);
            res.send(user.contacts);
        })
    });
})

//clean conversation messages by conversation ID
app.delete('/messages', function(req, res){
    mongoose.connect(url);
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        const query = conversationModel.findOne();
        query.collection(conversationModel.collection);
        query.where('_id').eq(req.body.conversation_id).exec().then(conversation => {
            conversation.messages = [];
            conversation.save();
            res.send("conversation messages were deleted!");
        })
    });
})

//delete conversation by conversation ID
app.delete('/conversations', function (req, res) {
    mongoose.connect(url);
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        const query = conversationModel.findOne();
        query.collection(conversationModel.collection);
        query.remove({}).exec().then(() => {
            res.send("conversations were purged!");
        })
    });
})

app.get('/contact-list', function (req, res) {
    if (req.header('Authorization')) {
        var userToken = req.header('Authorization');
        mongoose.connect(url);
        var db = mongoose.connection;
        db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', function () {
            //find logged in user
            const query = userModel.findOne();
            query.collection(userModel.collection);
            query.where('token').eq(userToken).exec().then(user => {
                //get logged in user contacts
                const contactQuery = userModel.find();
                contactQuery.collection(userModel.collection);
                contactQuery.where('_id').in(user.contacts)
                    .select('username')
                    .exec()
                    .then(contactList => {
                        res.send(contactList);
                    })
            })
        });
    }
})

app.post('/sendMessage', function (req, res) {
    if (req.body.conversation_id && req.body.message_body) {
        mongoose.connect(url);
        var db = mongoose.connection;
        db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', function () {
            const query = userModel.findOne();
            query.collection(userModel.collection);
            query.where('token').eq(req.body.sender_token).exec().then( user => {
                const query = conversationModel.findOne();
                query.collection(conversationModel.collection);
                query.where('_id').eq(req.body.conversation_id).exec().then(conversation => {
                    conversation.messages.push({
                        author_id: user._id,
                        body: req.body.message_body,
                        timestamp: new Date()
                    });
                    conversation.save();
                    for(var member of conversation.members){
                        if(connectedClients[member._id]){
                            connectedClients[member._id].emit('notification',"message arrived");
                        }
                    }
                    res.send(conversation);
                })
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


app.get('/conversation/:contact_id', function (req, res) {
    mongoose.connect(url);
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        const query = userModel.findOne();
        query.collection(userModel.collection);
        query.where('token').eq(req.header("Authorization")).exec().then(user => {
            const query = conversationModel.findOne();
            query.collection(conversationModel.collection);
            query.where('members').in([req.params.contact_id, user._id]).exec().then(conversation => {
                res.send(conversation);
            })
        })
    });
})

app.get('/conversation/:conversation_id', function (req, res) {
    mongoose.connect(url);
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        const query = conversationModel.findOne();
        query.collection(conversationModel.collection);
        query.where('_id').eq(req.params.conversation_id).exec().then(conversation => {
            res.send(conversation);
        })
    });
})

http.listen(3000, function () {
    console.log('ChitChat server listening on port 3000!')
})


io.on('connection', function(socket){
    socket.on('register-client', userId => {
        connectedClients[userId] = socket;
    });

    socket.on('hello', function(msg){
      socket.emit('notification', "hi to u too");
    });
  });