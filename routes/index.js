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
    isVerified: Boolean,
    verifyToken: String,
    socket: Object, 
    interest1: String,
    interest2: String,
    interest3: String,
    phonenum: String,
    background: String,
    achievements: String,
    goals: String,
    trainer_filter: Boolean,
    reviews: [{ reviewer: String, 
              rating: Number, 
	      comments: String}]
  }, 
  facebook: {
    accessToken: String
  },
  banking: {
             firstName: String,
	     lastName: String,
	     dob: String,
	     ssn: String,
	     streetAddress: String,
	     locality: String,
	     region: String,
	     postalCode: String, 
	     mobilePhone: String,
	     accountNumber: String,
	     routingNumber: String
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

var eventSchema = new mongoose.Schema({
	date: String,
	place: String, 
	person1: String,
	person2: String,
	description: String
});

var Event = mongoose.model('Event', eventSchema);
var chatSchema = new mongoose.Schema({
	from: String,
	to: String, 
	message: String
});

var Chat = mongoose.model('Chat', chatSchema);

var braintree = require('braintree');
var gateway = braintree.connect({ 
        environment:  braintree.Environment.Sandbox,
        merchantId:   '5y5262mc4z8c627q',
        publicKey:    'nmfn7877khr53tgg',
	privateKey:   '02250b63a3f4e5287be0c6dde217a78f'
});

var nodemailer = require('nodemailer');

var smtpTransport = nodemailer.createTransport("SMTP", {
  service: "Gmail", 
  auth:  {
     user: "gymbudbruins@gmail.com", 
     pass: "gymbud123"
  }
});

var schedule = require('node-schedule');

var rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [1,3,5]; 
rule.hour = 20;
rule.minute = 00;

/*
var emailblast = schedule.scheduleJob(rule, function() {

 User.find({}, function(err, userlist) {
  
  for(var i = 0; i < userlist.length; i++) {
   var mailOptions = {
	from: "GymBud <gymbuducla@gmail.com>",
//	to: "coolbnjmn@ucla.edu",
	to: userlist[i].local.email,
	subject: "Update from GymBud",
	html: "<style> body { background-color: #FFF3DA;} </style>" + "<body>" + "<h2> GymBud Update! </h2>" + "<p> Hey GymBud Users, </p><p> Just a quick update from the GymBud team to inform you of some new features and design changes to the website!</p><p> 1) It's now mobile friendly, so you can now access GymBud on the go! </p> <p> 2) A new review feature has been added, so you can get/receive feedback from past workout partners. </p> <p> 3) A new event feature has been added, so you can create a workout with another person and see it on your profile. </p> <p> 4) *** And most importantly, we have decided to change the primary function of the website from being a platform to pair new/experienced gym users to simply coordinate work-outs with any UCLA members. </p> <br> <p> Regardless of your skill level, utilize the GymBud status update room to coordinate workouts, strategize gym plans, discuss nutrition, or whatever you desire. </p> <br> <p> Welcome to the GymBud community! </p><p> Please visit us at www.gymbuducla.com </p><p> Or send us any feedback or comments to gymbuducla@gmail.com </p> </body>"
   };

    smtpTransport.sendMail(mailOptions, function(error, response) {
      if(error) {
        console.log('MAILING ERROR');
        console.log(error);
      } else {
        console.log('Message sent: ' + response.message);
      }
    });

  }
    });

});
*/


var job = schedule.scheduleJob(rule, function() {
  console.log('Job Now');
  User.findOne({"local.email" : "coolbnjmn@ucla.edu"}, function(err, docs) {
   Chat.find({ $or: [{"to": docs.local.email}, {"from":docs.local.email} ]},	function(error, chats) {
    Event.find({ $or: [{"person1": docs.local.email}, {"person2": docs.local.email}]}, function(e, events) {
     Review.find({ "reviewee" : docs.local.email}, function(errorr, reviews) {
    var htmlReview = "";
    for(var i = 0; i < reviews.length; i++) {
      htmlReview += "<h4> Review from: " + reviews[i].reviewer + "</h4><h5> Rating of: " + reviews[i].rating + "</h5><p>" + reviews[i].comments + "</p>";
    }

    var htmlChat = "";
    for(var i = 0; i < chats.length; i++) {
      var tmp = chats[i].to;
      if(tmp == "undefined") tmp = "everyone";
      htmlChat += "<h4> Message from: " + chats[i].from + "</h4><h5> Message to: " + tmp + "</h5><p>" + chats[i].message + "</p>";
    }

    var htmlEvent = "";
    for(var i = 0; i < events.length; i++) {
      htmlEvent += "<h4> Event with: " + events[i].person1 + " and " + events[i].person2 + "</h4><p>" + events[i].date + " " + events[i].place + "</p><p>" + events[i].description + "</p>";
    }
    var mailOptions = { 
      from: "GymBud <gymbudbruins@gmail.com>",
      to: docs.local.email,
      subject: "Status Update from GymBud!",
      html: "<style> body { background-color: #FFF3DA;} </style>" + "<body>" + "<h1> GymBud Status Update! From www.gymbudbruins.com </h1><h3>Hi there from GymBud. The following things have happened since the last time you were on GymBud.</h3>" + "<h3> Recent Chats </h3>" + htmlChat + "<h3> Recent Events </h3>" + htmlEvent + "<h3> Recent Reviews </h3>" + htmlReview + "<p>Login here: www.gymbudbruins.com/login </p><p> or please feel free to contact us with any questions or concerns at gymbudbruins@gmail.com </p>"+ "</body>" 
    };

    smtpTransport.sendMail(mailOptions, function(error, response) {
      if(error) {
        console.log('MAILING ERROR');
        console.log(error);
      } else {
        console.log('Message sent: ' + response.message);
      }
      });
      });
      });
   });
    });
});
/*
require('faceplate').middleware({
  app_id :"1413575708905968",
  secret: "cedb405616b258b3710dabd99024646d",
  scope: 'user_photos, email, user_friends'
});
*/

router.get('/', function(req, res) {
   /*
   Code to auto verify all users in the database. 
   User.find({}, function(err, docs) {
      for(var i = 0; i < docs.length; i++) {
         if(docs[i].local.isVerified === undefined)
	 {
	 	docs[i].local.isVerified = true;
		docs[i].local.verifyToken = makeid();
	        docs[i].save(function(error) {
	     		if(error) throw error;
		});
	 }
      }
   });
   */
  res.render('index', { user: req.user, title: 'GymBud' });
           });

// Redirect the user to Facebook for authentication.  When complete,
// Facebook will redirect the user back to the application at
//     /auth/facebook/callback
router.get('/auth/facebook', function(req, res, next) {
           passport.authenticate('facebook', {scope : 'email'})(req, res, next);
           return;
           });

// Facebook will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
router.get('/auth/facebook/callback', function(req, res, next) {
           passport.authenticate('facebook', { scope: 'emails',
                                 successRedirect: '/chat',
                                 failureRedirect: '/' })(req, res, next);
           });

var facebook = require('./facebook');
router.get('/friends', isLoggedIn, function(req, res) {
  facebook.get(req.user.facebook.accessToken, '/me/friends', function(data) {
    console.log(data);
  });

/*
  req.facebook.get('/me/friends', {limit: 100}, function(err, friends) {
    res.send('friends: '+require('util').inspect(friends));
  });
  */
});

router.get('/about', function(req, res) {
           res.render('about', {title: "GymBud", user: req.user} );
});

router.get('/team_page', function(req, res) {
           res.render('team_page', {title: "GymBud", user: req.user} );
});

router.get('/team', function(req, res) {
           res.render('team', {user: req.user} );
});


router.get('/chat', isLoggedIn, isVerified, function(req, res, next) {
      User.find({}, function(e, docs) {
       Event.find({ $or:[ {'person1':req.user.local.email}, {'person2':req.user.local.email}]}, function(err, events) {
        res.render('chat', {title: "GymBud", user: req.user, to:undefined, userlist: docs, events: events});
	});
        });
});

router.get('/chat/:username', isLoggedIn, isVerified, function(req, res) {
	var username = req.params.username;
      User.find({}, function(e, docs) {
       Event.find({ $or:[ {'person1':req.user.local.email}, {'person2':req.user.local.email}]}, function(err, events) {
        res.render('chat', {events: events, user: req.user, to:username, userlist: docs});
        });
	});
});


router.post('/uploadImage', function(req, res) {
  var fstream;
  User.findOne({ "local.email": req.user.local.email}, function(err, docs) {
    if(req.files.image.type.match('image.*')) {
      var imgData;
      im.convert([req.files.image.path, '-resize', '200x200', req.files.image.path], function(err) {
        if(err) throw err;

	docs.image.data = fs.readFileSync(req.files.image.path);
	docs.image.contentType = req.files.image.type;

	imgData = btoa(docs.image.data);
	docs.image.data = imgData;
	docs.save(function(err) {
	  if(err) throw err;
	});

        User.find({}, function(e, userlist) {
          Event.find({ $or:[ {'person1':req.user.local.email}, {'person2':req.user.local.email}]}, function(err, events) {
           res.render('chat', {title: "GymBud", user: docs, to:undefined, userlist: userlist, events: events});
	   });
	  //res.render('chat', {title: "GymBud", user: docs, to: undefined, userlist: userlist});
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
           res.render('login', {title: "GymBud", user: req.user, message: req.flash('loginMessage') });
           });

router.post('/login', passport.authenticate('local-login', {
                                             successRedirect : '/chat',
                                             failureRedirect : '/login',
                                             failureFlash: true
}));

router.get('/signup', function(req, res) {
           res.render('signup', {title: "GymBud", user : req.user, message: req.flash('signupMessage') });
           });

router.post('/signup', passport.authenticate('local-signup', {
                                             successRedirect : '/signup2',
                                             failureRedirect : '/signup',
                                             failureFlash: true
                                             }));

router.get('/signup3', isLoggedIn, function(req, res) {
  res.render('signup3', {title: 'GymBud', user: req.user});
});

router.get('/toc', isLoggedIn, function(req, res) {
	var pdfFile = "public/Terms And Conditions - Gym Bud.pdf";
	fs.readFile(pdfFile, function(err, data) {
	  res.contentType('application/pdf');
	  res.send(data);
	});
});

router.get('/signup2', isLoggedIn, function(req, res) {
           res.render('signup2', {title: "GymBud", user : req.user, message: req.flash('signupMessage') });
           });

router.post('/signup2', function(req, res) {
  if(!req.body.toc_agree) {
    req.flash('signupMessage', 'You must agree to the terms and conditions');
    res.render('signup2', {title: "GymBud", user: req.user, message: req.flash('signupMessage') });
    return;
  }
  User.findOne({"local.email": req.user.local.email}, function(err, docs) {
    docs.local.interest1 = req.body.interest1;
    docs.local.interest2 = req.body.interest2;
    docs.local.interest3 = req.body.interest3;
    if(req.body.phonenum) {
      docs.local.phonenum = req.body.phonenum
    }
    docs.local.background = req.body.background;
    docs.local.achievements = req.body.achievements;
    docs.local.trainer_filter = req.body.trainer_filter;
    docs.local.name = req.body.name;
    docs.local.goals = req.body.goals;

    docs.local.isVerified = false;
    docs.local.verifyToken = makeid();
    docs.save(function(err) {
      if(err) throw err;
      res.redirect('/chat');
    });

    var mailOptions = { 
      from: "GymBud <gymbudco@gmail.com>",
      to: docs.local.email,
      subject: "Please verify your new GymBud account!",
      text: "Verification is simple! Just follow this link, and you're good to go! You'll be redirected to our home page and you can simply log in.  http://www.gymbudbruins.com/confirm/"+docs.local.verifyToken
    };

    smtpTransport.sendMail(mailOptions, function(error, response) {
      if(error) {
        console.log('MAILING ERROR');
        console.log(error);
      } else {
        console.log('Message sent: ' + response.message);
      }
    });
  });
});

router.get('/confirm/:verifyToken', function(req, res) {
   var verifyToken = req.params.verifyToken;

   User.findOne({'local.verifyToken': verifyToken}, function(err, docs) {
     docs.local.isVerified = true;
     docs.save(function(err) {
      if(err) throw err;
      res.redirect('/');
     });
   });

});
router.get('/contact', function(req, res) {
  res.render('contact', {title: "GymBud", user: req.user});
});

router.get('/userlist', isLoggedIn, isVerified, function(req, res) {
  
      //User.find({}, function(e, docs) {
      User.find({}, null, {sort: {'local.name' : 'ascending'}}, function(err, docs) {
         res.render('userlist', {title: "GymBud", user: req.user, userlist: docs});
        });
});

router.get('/profile/:email', isLoggedIn, isVerified, function(req, res) {
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

        res.render('profile-public', {title: "GymBud", user : req.user, userProfile: docs, to: docs.local.email, reviews:reviews, avg: avgReview});
      });
    });
});

router.get('/edit-profile', isLoggedIn, isVerified, function(req, res) {
   res.render('edit-profile', {title: "GymBud", user: req.user});
});

router.post('/edit-profile', isLoggedIn, isVerified, function(req, res) {
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
    docs.local.achievements = req.body.achievements;
    docs.local.trainer_filter = req.body.trainer_filter;
    docs.local.name = req.body.name;
    docs.local.goals = req.body.goals;

    docs.save(function(err) {
      if(err) throw err;
      res.redirect('/chat');
    });
  });
});

router.get('/add-review/:email', isLoggedIn, isVerified, function(req, res) {
   // first check if this user has already added a review
   res.render('add-review', {title: "GymBud", forUser: req.params.email, user: req.user});
});

router.post('/add-review/:email', isLoggedIn, isVerified, function(req, res) {
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

router.post('/add-trainer', isLoggedIn, isVerified, function(req, res) {
  User.findOne({"local.email": req.user.local.email}, function(err, docs) {
       if(req.body.firstName) {
         docs.banking.firstName = req.body.firstName;
       } else {
         docs.banking.firstName = docs.local.name;
       }

       if(req.body.lastName) {
         docs.banking.lastName = req.body.lastName;
       } else {
         docs.banking.lastName = docs.local.name;
       }

       docs.banking.dob = req.body.dob;
       docs.banking.ssn = req.body.ssn;
       docs.banking.streetAddress = req.body.streetAddress;
       docs.banking.locality = req.body.locality;
       docs.banking.region = req.body.region;
       docs.banking.postalCode = req.body.postalCode;
       docs.banking.mobilePhone = req.body.mobilePhone;
       docs.banking.accountNumber = req.body.accountNumber;
       docs.banking.routingNumber = req.body.routingNumber;

       docs.save(function(err) {
          // success or failure?
       });

       var merchantAccountParams = {
         individual: {
	   firstName : docs.banking.firstName,
	   lastName: docs.banking.lastName,
	   email: docs.local.email, 
	   phone: docs.local.phonenum,
	   dateOfBirth : docs.banking.dob,
	   ssn: docs.banking.ssn,
	   address: {
	     streetAddress: docs.banking.streetAddress,
	     locality: docs.banking.locality, 
	     region: docs.banking.region,
	     postalCode: docs.banking.postalCode
	     }
	   }, 
	   funding: {
	     destination: "bank", 
	     email: docs.local.email,
	     mobilePhone: docs.banking.mobilePhone,
	     accountNumber: docs.banking.accountNumber,
	     routingNumber: docs.banking.routingNumber
	   },
	   tosAccepted: true,
	   masterMerchantAccountId: "ttvwp5d8nhm5wpcr",
	   id: docs.local.email
       };

       gateway.merchantAccount.create(merchantAccountParams, function(err, result) {
         if(result.success) {
	   console.log('successfully added banking information');
	 } else {
	   console.log('unsuccessfully added bank info');
	 }
       });
  });
});

router.get('/add-trainer', isLoggedIn, isVerified, function(req, res) {
  req.flash('addTrainerMessage', 'All Fields are Required');
  res.render('add-trainer', {user: req.user, message: req.flash('addTrainerMessage')});
});

router.get('/webhooks', function(req, res) { 
  res.send(gateway.webhookNotification.verify(req.query.bt_challenge));
});

router.post('/webhooks', function(req, res) {
  gateway.webhookNotifaction.parse(
    req.body.bt_signature, 
    req.body.bt_payload,
    function(err, webhookNotification) {
	if(webhookNotification.kind === WebhookNotification.Kind.SubMerchantAccountApproved) {
	  console.log('adding trainer was approved');
	} else {
	  console.log('adding trainer was not approved');
	}
    });
    console.log('webhook received');
});

router.post('/add-event', isLoggedIn, isVerified, function(req, res) {
	var newEvent = new Event({date: req.body.date, place: req.body.place, person1: req.user.local.email, person2: req.body.person, description: req.body.description});    
	newEvent.save(function(err) {
	   if(err) throw err;
	   // save succeeeded
	   res.redirect('/chat');
	});
});
router.get('/add-event', isLoggedIn, isVerified, function(req, res) {
      User.find({}, function(e, docs) {
         res.render('add-event', {title: 'GymBud', user: req.user, userlist: docs, message: req.flash('eventMessage')});
        });
});


router.get('/map', isLoggedIn, isVerified, function(req, res) {
      User.find({}, function(e, docs) {
         res.render('map', {title: 'GymBud', user: req.user, userlist: docs });
        });
  
});

router.get('/search_user', function(req, res) {
  console.log('get search');
  var regex = new RegExp(req.query["term"], 'i')
  var query = User.find({"local.name" : regex}, {"local.name": 1}).limit(50);
  query.exec(function(err, users) {
    if(!err) {
     var result = buildResultSet(users);
     res.send(result, {
      'Content-Type': 'application/json'
      }, 200);
    } else {
      res.send(JSON.stringify(err), {
        'Content-Type': 'application/json'
      }, 404);
    }
  });
});

router.post('/searchUser', isLoggedIn, isVerified, function(req, res) {
    console.log(req.body);
    User.findOne({"local.name" : req.body.search}, function(e, docs) {
	console.log(docs);
      Review.find({reviewee: docs.local.email}, function(err, reviews) {
        var reviewSum = 0;
	var avgReview = 0;
	if(reviews) {
	  for(var i = 0; i < reviews.length; i++) {
	    reviewSum += reviews[i].rating; 
	  }
	  avgReview = reviewSum / reviews.length;
	}

        res.render('profile-public', {title: "GymBud", user : req.user, userProfile: docs, to: docs.local.email, reviews:reviews, avg: avgReview});
      });
	});
});
function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < 20; i++ )
           text += possible.charAt(Math.floor(Math.random() * possible.length));

       return text;
}

function buildResultSet(users) {
  console.log(users);
  return users;
}
function isVerified(req, res, next) {
    if(req.user.local.isVerified) {
       return next();
    }
    res.redirect('/signup3');
}
function isLoggedIn(req, res, next) {
    if(req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

module.exports = router;
