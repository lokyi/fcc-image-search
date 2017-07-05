// server.js

// init project
var express = require('express');
var needle = require('needle');
var moment = require('moment');
var MongoClient = require('mongodb').MongoClient;
var app = express();

app.use(express.static('public'));

var mongoUrl = `mongodb://${process.env.DBUSER}:${process.env.DBPASSWORD}@ds147872.mlab.com:47872/personal-project`;

app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

app.get("/latest-search", function (req, res) {
  MongoClient.connect(mongoUrl, function(err, db) {
    console.log("Connected successfully to server");
    var myCursor = db.collection("search-log").find().toArray(function(err, docs) {
      if (err) res.send(err.message || 'DB Error');

      res.json(docs.map(doc => ({ts: doc.ts, search: doc.search})));
      db.close();
    });
  });
});

app.get('/image-search/:searchTerm', function (req, res) {
  var offset = isNaN(Number(req.query.offset)) ? 0 : Number(req.query.offset);

  var url = 'https://www.googleapis.com/customsearch/v1';
  url += '?q=' + req.params.searchTerm;
  url += '&cx=' + process.env.CX;
  url += '&searchType=image';
  url += '&start=' + (offset + 1);
  url += '&key=' + process.env.KEY;

  needle.get(url, function(err, resp) {
    if (err) return res.json(err);
    if (!resp.body.items) return res.json([]);
    res.json(resp.body.items.map(item => ({
      imageURL: item.link,
      altText: item.title,
      pageUrl: item.image.contextLink
    })));
  });
  var ts = moment.utc().format();
  MongoClient.connect(mongoUrl, function(err, db) {
    console.log("Connected successfully to server");
    db.collection("search-log").insert({ts: ts, search: req.params.searchTerm, offset: offset}, {w: 1}, err => {
      console.log('insert err: ', err);
      db.close();
    });
  });
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Timestamp microservice is listening on port ' + listener.address().port);
});
