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
    name: String,
    password: String,
    socket: Object, 
    interest1: String,
    interest2: String,
    interest3: String,
    phonenum: String,
    background: String,
    orgs: String,
    goals: String,
    trainer_filter: Boolean,
    reviews: [{ reviewer: String, 
              rating: Number, 
	      comments: String}]
  }, 
  facebook : {
    id : String, 
    token : String, 
    name : String, 
    email : String
  }
});

var User = mongoose.model('User', userSchema);

var reviewSchema = new mongoose.Schema({
	reviewer: String, 
	rating: Number, 
	comments: String,
	reviewee: String
});

var Review = mongoose.model('Review', reviewSchema);

router.get('/', function(req, res) {
           res.render('index', { title: 'GymBud' });
           });

router.get('/about', function(req, res) {
           res.render('about', {user: req.user} );
});


router.get('/chat', isLoggedIn, function(req, res, next) {
      User.find({}, function(e, docs) {
        res.render('chat', {user: req.user, userlist: docs});
        });
});

router.get('/chat/:username', isLoggedIn, function(req, res) {
	var username = req.params.username;
      User.find({}, function(e, docs) {
        res.render('chat', {user: req.user, to:username, userlist: docs});
        });
});


router.post('/uploadImage', function(req, res) {
  var fstream;
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
                                             successRedirect : '/signup2',
                                             failureRedirect : '/signup',
                                             failureFlash: true
                                             }));

router.get('/signup2', isLoggedIn, function(req, res) {
           res.render('signup2', {user : req.user, message: req.flash('signupMessage') });
           });

router.post('/signup2', function(req, res) {
  User.findOne({"local.email": req.user.local.email}, function(err, docs) {
    docs.local.interest1 = req.body.interest1;
    docs.local.interest2 = req.body.interest2;
    docs.local.interest3 = req.body.interest3;
    if(req.body.phonenum) {
      docs.local.phonenum = req.body.phonenum
    }
    docs.local.background = req.body.background;
    docs.local.orgs = req.body.orgs;
    docs.local.trainer_filter = req.body.trainer_filter;
    docs.local.name = req.body.name;
    docs.local.goals = req.body.goals;

    docs.save(function(err) {
      if(err) throw err;
      res.redirect('/chat');
    });
  });
});

router.get('/contact', function(req, res) {
  res.render('contact', {user: req.user});
});

router.get('/userlist', isLoggedIn, function(req, res) {
  
      User.find({}, function(e, docs) {
         res.render('userlist', {user: req.user, userlist: docs});
        });
});

router.get('/profile/:email', isLoggedIn, function(req, res) {
    var email = req.params.email;

    User.findOne({'local.email': email}, function(err, docs) {
      Review.find({reviewee: req.params.email}, function(err, reviews) {
        var reviewSum = 0;
	var avgReview = 0;
	if(reviews) {
	  for(var i = 0; i < reviews.length; i++) {
	    reviewSum += reviews[i].rating; 
	  }
	  avgReview = reviewSum / reviews.length;
	}

        res.render('profile-public', {user : req.user, userProfile: docs, to: docs.local.email, reviews:reviews, avg: avgReview});
      });
    });
});

router.get('/edit-profile', isLoggedIn, function(req, res) {
   res.render('edit-profile', {user: req.user});
});

router.post('/edit-profile', isLoggedIn, function(req, res) {
  User.findOne({"local.email": req.user.local.email}, function(err, docs) {
    docs.local.interest1 = req.body.interest1;
    docs.local.interest2 = req.body.interest2;
    docs.local.interest3 = req.body.interest3;
    if(req.body.phonenum) {
      docs.local.phonenum = req.body.phonenum;
    } else {
      docs.local.phonenum = '';
    }
    docs.local.background = req.body.background;
    docs.local.orgs = req.body.orgs;
    docs.local.trainer_filter = req.body.trainer_filter;
    docs.local.name = req.body.name;
    docs.local.goals = req.body.goals;

    docs.save(function(err) {
      if(err) throw err;
      res.redirect('/chat');
    });
  });
});

router.get('/add-review/:email', isLoggedIn, function(req, res) {
   // first check if this user has already added a review
   res.render('add-review', {forUser: req.params.email, user: req.user});
});

router.post('/add-review/:email', isLoggedIn, function(req, res) {
    User.findOne({"local.email": req.params.email} , function(err, docs) {
       Review.create({reviewer: req.user.local.name, rating: req.body.rating, comments: req.body.comments, reviewee: req.params.email}, function(err, review) {
       console.log(req.user.local.name);
      console.log('HERE HERE HERE HERE HERE HERE');
        console.log(review);
         if(err) throw err;
         res.redirect('/profile/'+req.params.email);
       });

    });
});



function isLoggedIn(req, res, next) {
    if(req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

module.exports = router;
