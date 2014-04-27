var passport = require('passport');
var mongoose = require('mongoose');
var express = require('express');
var router = express.Router();

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
           res.render('index', { title: 'GymBudUcla' });
           });


router.get('/chat', isLoggedIn, function(req, res, next) {
      User.find({}, function(e, docs) {
        res.render('chat', {user: req.user, userlist: docs});
        });
});

router.get('/chat/:username', function(req, res) {
	var username = req.params.email;
      User.find({}, function(e, docs) {
        res.render('chat', {user: req.user, to:username, userlist: docs});
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
                                             successRedirect : '/',
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
