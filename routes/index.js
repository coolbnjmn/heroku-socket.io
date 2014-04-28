var passport = require('passport');
var mongoose = require('mongoose');
var express = require('express');
var router = express.Router();

var im = require('imagemagick');
var btoa = require('btoa');
var fs = require('fs');

var userSchema = new mongoose.Schema({
  image: {
    data: Buffer,
    contentType: String
  },
  local: {
    email : String, 
    password: String,
    socket: Object
  }, 
  facebook : {
    id : String, 
    token : String, 
    name : String, 
    email : String
  }
});

var User = mongoose.model('User', userSchema);

router.get('/', function(req, res) {
           res.render('index', { title: 'Gym Bud' });
           });


router.get('/chat', isLoggedIn, function(req, res, next) {
      User.find({}, function(e, docs) {
        res.render('chat', {user: req.user, userlist: docs});
        });
});

router.get('/chat/:username', isLoggedIn, function(req, res) {
	var username = req.params.username;
	console.log(username);
      User.find({}, function(e, docs) {
        res.render('chat', {user: req.user, to:username, userlist: docs});
        });
});


router.post('/uploadImage', function(req, res) {
  console.log('uploading');
  var fstream;
  console.log(req.files); 
  User.findOne({ "local.email": req.user.local.email}, function(err, docs) {
    if(req.files.image.type.match('image.*')) {
      var imgData;
      im.convert([req.files.image.path, '-resize', '64x64', req.files.image.path], function(err) {
        if(err) throw err;

	docs.image.data = fs.readFileSync(req.files.image.path);
	docs.image.contentType = req.files.image.type;

	imgData = btoa(docs.image.data);
	docs.image.data = imgData;
	docs.save(function(err) {
	  if(err) throw err;
	});

        User.find({}, function(e, userlist) {
	  res.render('chat', {user: docs, userlist: userlist});
	});
      });
    } else {
         res.redirect('/chat');
    }
  });
});

router.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
        });

router.get('/login', function(req, res) {
           console.log('login page');
           res.render('login', {user: req.user, message: req.flash('loginMessage') });
           });

router.post('/login', passport.authenticate('local-login', {
                                             successRedirect : '/chat',
                                             failureRedirect : '/login',
                                             failureFlash: true
}));

router.get('/signup', function(req, res) {
           res.render('signup', {user : req.user, message: req.flash('signupMessage') });
           });

router.post('/signup', passport.authenticate('local-signup', {
                                             successRedirect : '/chat',
                                             failureRedirect : '/signup',
                                             failureFlash: true
                                             }));

function isLoggedIn(req, res, next) {
    if(req.isAuthenticated()) {
        console.log('isLoggedIn');
        return next();
    }
    res.redirect('/');
}

module.exports = router;
