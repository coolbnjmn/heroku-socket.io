// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var LocalStrategy = require('passport-local').Strategy;
var io = require('socket.io').listen(server);
var port = process.env.PORT || 8080;
var path = require('path');
var mongo = require('mongodb');

// Routing
app.use(express.static(__dirname + '/public'));


var uristring ="mongodb://heroku_app24509551:legvh3pgnof81ms8niu1hut2ej@ds037508.mongolab.com:37508/heroku_app24509551"; 
var mongoose = require('mongoose');
mongoose.connect(uristring);

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var flash = require('connect-flash');
var passport = require('passport');
var multipart = require('connect-multiparty');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser('secretString'));
app.use(session({cookie: { maxAge : 1000*60*60*24 }}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(multipart());

//server.listen(port, function () {
// console.log('Server listening at port %d', port);
//});
console.log("Listening on port" + port);
server.listen(port);

var bcrypt = require('bcrypt-nodejs');

var userSchema = new mongoose.Schema({
                                     image: {
                                     data: Buffer,
                                     contentType: String
                                     },
                                     local: {
                                     email : String,
                                     password: String,
                                     socket: Object,
				     goals: String,
      			             interest1: String,
   				 interest2: String,
   				 interest3: String,
   				 phonenum: String,
  				  background: String,
 				   orgs: String,
 				   trainer_filter: Boolean,
				   // email and comments in reviews
				   name: String
                                     },
                                     facebook : {
                                     id : String,
                                     token : String,
                                     name : String,
                                     email : String
                                     }
                                     });

userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

var User = mongoose.model('user', userSchema);

var reviewSchema = new mongoose.Schema({
	reviewer: String, 
	rating: Number, 
	comments: String,
	reviewee: String
});

var Review = mongoose.model('review', reviewSchema);
var chatSchema = new mongoose.Schema({
	from: String,
	to: String, 
	message: String
});

var Chat = mongoose.model('chat', chatSchema);

// usernames which are currently connected to the chat
var usernames = {};
var onlineUsers = {};
var numUsers = 0;

io.configure(function() {
  io.set('transports', ['xhr-polling']);
  io.set('polling duration', 10);
});
io.on('connection', function (socket) {
      var addedUser = false;
      
      // when the client emits 'new message', this listens and executes
      socket.on('new message', function (from, data) {
                // we tell the client to execute 'new message'
		var newMsg = new Chat({from: from, message: data});
		newMsg.save(function(err) {
                  socket.broadcast.emit('new message', {
                                      username: socket.username,
                                      message: data,
				      to: 'undefined'
                                      });
                  });
		});
      socket.on('pm', function(from, to, message) {
        var newMsg = new Chat({from: from, to: to, message: message});
	newMsg.save(function(err) {
	  console.log('new message saved in database');
    	  var id = onlineUsers[to];
	  io.sockets.socket(id).emit('new message', {
		username: socket.username,
		message: message,
		to: to
	  });
	});


       });
      // when the client emits 'add user', this listens and executes
      socket.on('add user', function (username) {
                // we store the username in the socket session for this client
                socket.username = username;
                // add the client's username to the global list
                usernames[username] = username;
                ++numUsers;
                addedUser = true;
		onlineUsers[username] = socket.id;

		Chat.find({$or :[{'to':username}, {'to' : 'undefined'}]}, function(err, docs) {
		  console.log(docs);
                  socket.emit('login', {
                            numUsers: numUsers,
			    previousChats : docs
                            });

		});
                // echo globally (all clients) that a person has connected
                socket.broadcast.emit('user joined', {
                                      username: socket.username,
                                      numUsers: numUsers
                                      });
                });
      
      // when the client emits 'typing', we broadcast it to others
      socket.on('typing', function () {
                socket.broadcast.emit('typing', {
                                      username: socket.username
                                      });
                });
      
      // when the client emits 'stop typing', we broadcast it to others
      socket.on('stop typing', function () {
                socket.broadcast.emit('stop typing', {
                                      username: socket.username
                                      });
                });
      
      // when the user disconnects.. perform this
      socket.on('disconnect', function () {
                // remove the username from global usernames list
                if (addedUser) {
                delete usernames[socket.username];
		delete onlineUsers[socket.username];
                --numUsers;
                
                // echo globally that this client has left
                socket.broadcast.emit('user left', {
                                      username: socket.username,
                                      numUsers: numUsers
                                      });
                }
                });
      });

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback (err, db) {
        User.findOne({'local.email' : "bhendricks@pacbell.net"}, function(err, user) {
                     console.log('made it here');
                });
                // yay!
        });

mongo.connect(uristring, function(err, db) {
              if(err) throw err;
              console.log('Connected to database');
              
              });

passport.use('local-signup', new LocalStrategy({
                                               usernameField : 'email',
                                               passwordField : 'password',
                                               passReqToCallback : true
                                               }, function(req, email, password, done) {
                                               process.nextTick(function() {
                                                                User.findOne({ 'local.email' : email }, function(err, user) {
                                                                             if(err) return done(err);
                                                                             if(user) {
                                                                             return done(null, false, req.flash('signupMessage', 'That email has already been taken.')); 
                                                                             } else {
									       // check that hte email is a .edu email
									       var eduPattern = new RegExp(/^([a-zA-Z0-9_][a-zA-Z0-9._]*)+@ucla+\.edu/);
									       var eduMatches = email.match(eduPattern);
									       console.log(eduMatches);
									       if(eduMatches) {
                                                                             var newUser = new User();
                                                                             newUser.local.email = email;
                                                                             newUser.local.password = newUser.generateHash(password);
                                                                             newUser.save(function(err) {
                                                                                          if(err) 
                                                                                          throw err;
                                                                                          return done(null, newUser);
                                                                                          });
											  } else {
											  return done(null, false, req.flash('signupMessage', 'Sorry, you must use a ucla.edu email address'));
											  }
                                                                             }
                                                                             });
                                                                });
                                               }));
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


// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
                   message: err.message,
                   error: {}
                   });
        });

app.use(function(req, res, next) {
        req.db = db;
        next();
        });
// will print stacktrace
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });

var routes = require('./routes/index');
app.use('/', routes);

module.exports = app;
