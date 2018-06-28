const express = require('express')
const bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
const app = express();
app.use(bodyParser.json());
var url = "mongodb://localhost:27017/chitchat";


// app.post('/createdb', function (req, res) {
//     MongoClient.connect(url, function (err, db) {
//         if (err) res.send('error :/!');
//         else {
//             var dbo = db.db("chitchat");
//             dbo.createCollection("users", function (err) {
//                 if (err) res.send("error while creating users table!");
//                 // res.send("Collection created!");
//             });
//             dbo.createCollection("conversations", function (err) {
//                 if (err) res.send("error while creating conversations table!");
//                 // res.send("Collection created!");
//             });
//             dbo.createCollection("messages", function (err) {
//                 if (err) res.send("error while creating conversations table!");
//                 // res.send("Collection created!");
//             });
//         }
//     });
// })


app.post('/login', function (req, res) {
    if (req.body) {
        MongoClient.connect(url, function (err, db) {
            if (err) res.send("error!" + err);
            else {
                var dbo = db.db("chitchat");
                dbo.collection("users").findOne({email: req.body.email}, {}, function (err, result) {
                    console.log("found object ", result);
                    res.send(result);
                })
            }
        })
    }
})

app.post('/signup', function (req, res) {
    MongoClient.connect(url, function (err, db) {
        if (err) res.send("error!");
        else {
            var dbo = db.db("chitchat");
            console.log("request body: ", req.body);
            dbo.collection("users").insertOne(req.body, function (err) {
                if (err) res.send("error while inserting user!" + err);
                else res.send("user " + req.body.username + " has been created!");
                db.close();
            });
        }
    });
})


app.post('/add-contact', function (req, res) {
    if (req.body.contact_id && req.body.sender_id) {
        MongoClient.connect(url, function (err, db) {
            if (err) res.send(err);
            else {
                var dbo = db.db("chitchat");
                dbo.collection("users").updateOne({"_id": req.body.sender_id}, {$push: {"contacts": req.body.contact_id}}, function (err, result) {
                    console.log("found object ", result);
                    res.send(result);
                })
            }
        })
    } else {
        res.send("param contact_id or sender_id is empty");
    }
})

app.get('/contact-list', function (req, res) {

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


app.get('/conversation/:id', function (req, res) {

})

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


async function findOne(objectName, value, opts = {}) {
    if (value && objectName) {
        MongoClient.connect(url, function (err, db) {
            if (err) return false;
            else {
                var dbo = db.db("chitchat");
                dbo.collection(objectName).findOne(value ? value : {}, opts, function (err, result) {
                    console.log("found object ", result);
                    return result;
                })
            }
        })
    }
}

async function insertOne(objectName, value) {
    if (value && objectName) {
        MongoClient.connect(url, function (err, db) {
            if (err) return false;
            else {
                var dbo = db.db("chitchat");
                dbo.collection(objectName).insertOne(value, function (err, result) {
                    console.log("object inserted: ", result);
                    return result;
                })
            }
        })
    }
}
