var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

passport.use('local-login', new LocalStrategy({
                                              usernameField : 'email',
                                              passwordField : 'password',
                                              passReqToCallback : true
                                              }, function(req, email, password, done) {
                                              console.log('hello');
                                              
                                              User.findOne({'local.email' : email}, function(err, user) {
                                                           if(err)
                                                           return done(err);
                                                           
                                                           if(!user)
                                                           return done(null, false, req.flash('loginMessage', 'No user found.'));
                                                           if(!user.validPassword(password))
                                                           return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));
                                                           
                                                           return done(null, user);
                                                           });
                                              }));

passport.serializeUser(function(user, done) {
                       done(null, user.id);
                       });

passport.deserializeUser(function(id, done) {
                         User.findById(id, function(err, user) {
                                       done(err, user);
                                       });
                         });

var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
           res.render('index', { title: 'GymBudUcla' });
           });


router.get('/chat', function(req, res, next) {
        res.render('chat');
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
                                             successRedirect : '/',
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
