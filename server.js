var express = require("express");
var exphbs = require("express-handlebars");
var mongojs = require("mongojs");
var axios = require("axios");
var cheerio = require("cheerio");
var logger = require("morgan");
var mongoose = require("mongoose");

var app = express();

var PORT = process.env.PORT || 3000;

var db = require("./models");
app.use(logger("dev"));
app.use(express.urlencoded({ extended: true}));
app.use(express.json());

app.use(express.static("public"));

var uristring =
    process.env.MONGODB_URI ||
    process.env.MONGOLAB_OLIVE_URI ||
    'mongodb://localhost/scraper';

mongoose.connect(uristring, function (err, res) {
    if (err) {
    console.log ('ERROR connecting to: ' + uristring + '. ' + err);
    } else {
    console.log ('Succeeded connected to: ' + uristring);
    }
});


// Handlebars initialization

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");



//  Routes   ========================================


app.get("/", function(req, res) {
    
      
      res.render("index");
    
});


//   Scraping route for ESPN.com   ====================


app.get("/scrape", function(req, res) {

    db.Article.remove( {}, function(err) {

        if(err) {
            throw error;
        } else {
            res.send("Deleted previous scrape collection.");
        }

    });
    
   
    axios.get("http://www.espn.com/espn/latestnews").then(function(response) {

        var $ = cheerio.load(response.data);

        $("li").each( function(i, element) {
        
            var result = {};

            result.title = $(this).children("a").attr("title");
            result.link = $(this).children("a").attr("href");
            result.summary = $(this).text();
            
            db.Article.create(result)
                .then(function(dbArticle){
                    console.log(dbArticle);
                })
                .catch(function(err){
                    console.log(err);
                });

        });

    res.send("Scrape Complete");

    });
});


app.get("/all", function(req, res) {

    db.Article.find({})
        .then(function(dbArticle) {
            res.json(dbArticle);
        })
        .catch(function(err) {
            res.json(err);
        });
});


app.get("/all/:id", function(req, res) {

    db.Article.findOne({ _id: req.params.id })
        .populate("note")
        .then(function(dbArticle) {
            res.json(dbArticle);
        })
        .catch(function(err) {
            res.json(err);
        });
});

app.post("/all/:id", function(req, res) {

    db.Note.create(req.body)
        .then(function(dbNote) {
            return db.Article.findOneAndUpdate( { _id: req.params.id }, { note: dbNote._id }, { new: true });
        })
        .then(function(dbArticle) {
            res.json(dbArticle);
        })
        .catch(function(err) {
            res.json(err);
        });
});




app.listen(PORT, function() {
    console.log("App running on port " + PORT);
});