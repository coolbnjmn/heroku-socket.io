var passport = require('passport');


var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
           res.render('index', { title: 'GymBudUcla' });
           });


router.get('/chat', isLoggedIn, function(req, res, next) {
        res.render('chat', {user: req.user});
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
