 (function($){
  
  // create global app parameters...
  var NICK_MAX_LENGTH = 30,
  ROOM_MAX_LENGTH = 10,
  lockShakeAnimation = false,
  socket = null,
  clientId = null,
  nickname = null,
  
  // holds the current room we are in
  currentRoom = null,
  
  // server information
 // serverAddress = 'http://www.gym-bud.co',
  serverAddress = 'http://localhost:5000',
  serverDisplayName = 'Server',
  serverDisplayColor = '#1c5380',
  
  // some templates we going to use in the chat,
  // like message row, client and room, this
  // templates will be rendered with jQuery.tmpl
  tmplt = {
  room: [
         '<li data-roomId="${room}">',
         '<span class="icon"></span> ${room}',
         '</li>'
         ].join(""),
  client: [
           '<li data-clientId="${clientId}" class="cf">',
           '<div class="fl clientName"><span class="icon"></span> ${nickname}</div>',
           '<div class="fr composing"></div>',
           '</li>'
           ].join(""),
  message: [
            '<li class="cf">',
            '<div class="fl sender">${sender}: </div><div class="fl text">${text}</div><div class="fr time">${time}</div>',
            '</li>'
			].join("")
  };
  
  // bind DOM elements like button clicks and keydown
  function bindDOMEvents(){
  
  $('.chat-input input').on('keydown', function(e){
                            var key = e.which || e.keyCode;
                            if(key == 13) { handleMessage(); }
                            });
  
  $('.chat-submit button').on('click', function(){
                              handleMessage();
                              });
  
  $('#nickname-popup .input input').on('keydown', function(e){
                                       var key = e.which || e.keyCode;
                                       if(key == 13) { handleNickname(); }
                                       });
  
  $('#nickname-popup .begin').on('click', function(){
                                 handleNickname();
                                 });
  
  handleNickname();
  
  $('#addroom-popup .input input').on('keydown', function(e){
                                      var key = e.which || e.keyCode;
                                      if(key == 13) { createRoom(); }
                                      });
  
  $('#addroom-popup .create').on('click', function(){
                                 console.log('calling create room');
                                 createRoom();
                                 });
  
  $('.big-button-green.start').on('click', function(){
                                  $('#nickname-popup .input input').val('');
                                  Avgrund.show('#nickname-popup');
                                  window.setTimeout(function(){
                                                    $('#nickname-popup .input input').focus();
                                                    },100);
                                  });
  
  $('.chat-rooms .title-button').on('click', function(){
                                    $('#addroom-popup .input input').val('');
                                    Avgrund.show('#addroom-popup');
                                    window.setTimeout(function(){
                                                      $('#addroom-popup .input input').focus();
                                                      },100);
                                    });
  
  $('#addprivateroom-popup .input input').on('keydown', function(e){
                                      var key = e.which || e.keyCode;
                                      if(key == 13) { createPrivateRoom(); }
                                      });
  
  $('#addprivateroom-popup .create').on('click', function(){
                                 console.log('calling create private room');
                                 createPrivateRoom();
                                 });
  $('.chat-clients .title-button').on('click', function(){
                                      $('#addprivateroom-popup .input input').val('');
                                      Avgrund.show('#addprivateroom-popup');
                                      window.setTimeout(function(){
                                                        $('#addroom-popup .input input').focus();
                                                        },100);
                                      });
  
  $('.chat-rooms ul').on('scroll', function(){
                         $('.chat-rooms ul li.selected').css('top', $(this).scrollTop());
                         });
  
  $('.chat-messages').on('scroll', function(){
                         var self = this;
                         window.setTimeout(function(){
                                           if($(self).scrollTop() + $(self).height() < $(self).find('ul').height()){
                                           $(self).addClass('scroll');
                                           } else {
                                           $(self).removeClass('scroll');
                                           }
                                           }, 50);
                         });
  
  $('.chat-rooms ul li').live('click', function(){
                              var room = $(this).attr('data-roomId');
                              if(room != currentRoom){
                              socket.emit('unsubscribe', { room: currentRoom });
                              socket.emit('subscribe', { room: room, isPrivate:false });
                              }
                              });
  $('.chat-clients ul li').live('click', function(){
                              var room = $(this).attr('data-roomId');
                              if(room != currentRoom){
                                console.log('room: ' + room);
                                console.log('currentRoom: ' + currentRoom);
                              socket.emit('unsubscribe', { room: currentRoom });
                              socket.emit('subscribe', { room: room, isPrivate:true, user:nickname });
                              }
                              });
  }
  
  // bind socket.io event handlers
  // this events fired in the server
  function bindSocketEvents(){
  
  // when the connection is made, the server emiting
  // the 'connect' event
  socket.on('connect', function(){
			// firing back the connect event to the server
			// and sending the nickname for the connected client
			socket.emit('connect', { nickname: nickname });
            });
  
  // after the server created a client for us, the ready event
  // is fired in the server with our clientId, now we can start
  socket.on('ready', function(data){
            console.log('ready');
			// hiding the 'connecting...' message
			$('.chat-shadow').animate({ 'opacity': 0 }, 200, function(){
                                      $(this).hide();
                                      $('.chat input').focus();
                                      });
            
			// saving the clientId localy
			clientId = data.clientId;
            });
  
  // after the initialize, the server sends a list of
  // all the active rooms
  socket.on('roomslist', function(data){
			for(var i = 0, len = data.rooms.length; i < len; i++){
            // in socket.io, their is always one default room
            // without a name (empty string), every socket is automaticaly
            // joined to this room, however, we don't want this room to be
            // displayed in the rooms list
            if(data.rooms[i] != ''){
            addRoom(data.rooms[i], false);
            }
			}
            for(var i = 0; i < data.privaterooms.length; i++) {
            console.log('printing private room');
            console.log(data.privaterooms[i]);
            addPrivateRoom(data.privaterooms[i], false);
            }
            });
  
  // when someone sends a message, the sever push it to
  // our client through this event with a relevant data
  socket.on('chatmessage', function(data){
			var nickname = data.client.nickname;
			var message = data.message;
            
			//display the message in the chat window
			insertMessage(nickname, message, null, false, true, false, false);
            });
  
  socket.on('pastmessages', function(data) {
            console.log('passtmessages here');
            console.log(data.messages);
            for(var i = 0; i<data.messages.length; i++) {
            console.log('pastmessages' + i);
            console.log(data);
                insertMessage(data.messages[i].name, data.messages[i].message, data.messages[i].date, true, true, false, false)
            }
            });
  // when we subscribes to a room, the server sends a list
  // with the clients in this room
  socket.on('roomclients', function(data){
            
            if(data.isPrivate) {
            console.log('printing data in roomclients');
            console.log(data);
            addPrivateRoom(data.room, false);
            } else {
            console.log('printing data in roomclients not private');
            console.log(data);
			// add the room name to the rooms list
			addRoom(data.room, false);
            }
			// set the current room
            console.log('calling setcurrentroom, data is: ' + data.isPrivate);
			setCurrentRoom(data.room, data.isPrivate);
            
			// announce a welcome message
			insertMessage(serverDisplayName, 'Welcome to the room: `' + data.room + '`... enjoy!', null, false, true, false, true);
			//$('.chat-clients ul').empty();
            
			// add the clients to the clients list
			//addClient({ nickname: nickname, clientId: clientId }, false, true);
			for(var i = 0, len = data.clients.length; i < len; i++){
            if(data.clients[i]){
            addClient(data.clients[i], false);
            }
			}
            
			// hide connecting to room message message
			$('.chat-shadow').animate({ 'opacity': 0 }, 200, function(){
                                      $(this).hide();
                                      $('.chat input').focus();
                                      });
            });
  
  // if someone creates a room the server updates us
  // about it
  socket.on('addroom', function(data){
			addRoom(data.room, true);
            });
  
  // if one of the room is empty from clients, the server,
  // destroys it and updates us
  socket.on('removeroom', function(data){
			removeRoom(data.room, true);
            });
  
  socket.on('addprivateroom', function(data) {
            console.log('addprivateroom');
            })
  
  // with this event the server tells us when a client
  // is connected or disconnected to the current room
  socket.on('presence', function(data){
			if(data.state == 'online'){
            addClient(data.client, true);
			} else if(data.state == 'offline'){
            removeClient(data.client, true);
			}
            });
  }
  
  function addPrivateRoom(name, announce){
  // clear the trailing '/'
//  name = name.replace('/','');
  console.log('adding private room');
  console.log(name);
  // check if the room is not already in the list
  if($('.chat-clients ul li[data-roomId="' + name + '"]').length == 0){
  $.tmpl(tmplt.room, { room: name }).appendTo('.chat-clients ul');
  // if announce is true, show a message about this room
  if(announce){
  console.log('announce was true');
  insertMessage(serverDisplayName, 'The room `' + name + '` created...', null, false, true, false, true);
  } else {
  console.log('announce was false');
  }
  }
  }
  // add a room to the rooms list, socket.io may add
  // a trailing '/' to the name so we are clearing it
  function addRoom(name, announce){
  // clear the trailing '/'
  name = name.replace('/','');
  console.log('adding room');
  console.log(name);
  // check if the room is not already in the list
  if($('.chat-rooms ul li[data-roomId="' + name + '"]').length == 0){
  $.tmpl(tmplt.room, { room: name }).appendTo('.chat-rooms ul');
  // if announce is true, show a message about this room
  if(announce){
  console.log('announce was true');
  insertMessage(serverDisplayName, 'The room `' + name + '` created...', null, false, true, false, true);
  } else {
  console.log('announce was false');
  }
  }
  }
  
  // remove a room from the rooms list
  function removeRoom(name, announce){
  $('.chat-rooms ul li[data-roomId="' + name + '"]').remove();
  // if announce is true, show a message about this room
  if(announce){
  insertMessage(serverDisplayName, 'The room `' + name + '` destroyed...',null, false,  true, false, true);
  }
  }
  
  /*
  // add a client to the clients list
  function addClient(client, announce, isMe){
  var $html = $.tmpl(tmplt.client, client);
  
  // if this is our client, mark him with color
  if(isMe){
  $html.addClass('me');
  }
  
  // if announce is true, show a message about this client
  if(announce){
  insertMessage(serverDisplayName, client.nickname + ' has joined the room...', null, false, true, false, true);
  }
  $html.appendTo('.chat-clients ul')
  }
  
  // remove a client from the clients list
  function removeClient(client, announce){
  $('.chat-clients ul li[data-clientId="' + client.clientId + '"]').remove();
  
  // if announce is true, show a message about this room
  if(announce){
  insertMessage(serverDisplayName, client.nickname + ' has left the room...', null, false, true, false, true);
  }
  }
  */
  // every client can create a new room, when creating one, the client
  // is unsubscribed from the current room and then subscribed to the
  // room he just created, if he trying to create a room with the same
  // name like another room, then the server will subscribe the user
  // to the existing room
  
  function createPrivateRoom() {
  console.log('time to add a private chat room');
  var room = $('#addprivateroom-popup .input input').val().trim();
  if(room != currentRoom){
  console.log('in create private room');
  console.log(room);
  // show room creating message
  $('.chat-shadow').show().find('.content').html('Creating room: ' + room + '...');
  $('.chat-shadow').animate({ 'opacity': 1 }, 200);
  
  // unsubscribe from the current room
  socket.emit('unsubscribe', { room: currentRoom });
  
  // create and subscribe to the new room
  socket.emit('subscribe', { room: room, isPrivate:true, user:nickname});
  Avgrund.hide();
  } else {
  shake('#addprivateroom-popup', '#addprivateroom-popup .input input', 'tada', 'yellow');
  $('#addprivateroom-popup .input input').val('');
  }
  }
  
  function createRoom(){
  var room = $('#addroom-popup .input input').val().trim();
  if(room && room.length <= ROOM_MAX_LENGTH && room != currentRoom){
  console.log('in create room');
  console.log(room);
  // show room creating message
  $('.chat-shadow').show().find('.content').html('Creating room: ' + room + '...');
  $('.chat-shadow').animate({ 'opacity': 1 }, 200);
  
  // unsubscribe from the current room
  socket.emit('unsubscribe', { room: currentRoom });
  
  // create and subscribe to the new room
  socket.emit('subscribe', { room: room, isPrivate:false });
  Avgrund.hide();
  } else {
  shake('#addroom-popup', '#addroom-popup .input input', 'tada', 'yellow');
  $('#addroom-popup .input input').val('');
  }
  }
  
  // sets the current room when the client
  // makes a subscription
  function setCurrentRoom(room, isPrivate){
  console.log('setCurrentRoom');
  if(!isPrivate) {
    currentRoom = room;
    $('.chat-rooms ul li.selected').removeClass('selected');
  $('.chat-clients ul li.selected').removeClass('selected');
    $('.chat-rooms ul li[data-roomId="' + room + '"]').addClass('selected');
  } else {
  currentRoom = room;
  $('.chat-rooms ul li.selected').removeClass('selected');
  $('.chat-clients ul li.selected').removeClass('selected');
  $('.chat-clients ul li[data-roomId="' + room + '"]').addClass('selected');
  }
  }
  
  // save the client nickname and start the chat by
  // calling the 'connect()' function
  function handleNickname(){
  var nick = $('#nickname-popup .input input').val().trim();
  console.log(nick);
  if(nick && nick.length <= NICK_MAX_LENGTH){
  nickname = nick;
  connect();
  } else {
  shake('#nickname-popup', '#nickname-popup .input input', 'tada', 'yellow');
  $('#nickname-popup .input input').val('');
  }
  }
  
  // handle the client messages
  function handleMessage(){
  var message = $('.chat-input input').val().trim();
  if(message){
  console.log(socket);
  // send the message to the server with the room name
  socket.emit('chatmessage', { message: message, room: currentRoom });
  
  // display the message in the chat window
  insertMessage(nickname, message, null, false, true, true);
  $('.chat-input input').val('');
  } else {
  shake('.chat', '.chat input', 'wobble', 'yellow');
  }
  }
  
  // insert a message to the chat window, this function can be
  // called with some flags
  function insertMessage(sender, message, time, hasTime, showTime, isMe, isServer){
  if(hasTime) {
  console.log(time);
    var $html = $.tmpl(tmplt.message, {
                     sender: sender,
                     text: message,
                     time: showTime ? time : ''
                     });
  } else {
    var $html = $.tmpl(tmplt.message, {
                     sender: sender,
                     text: message,
                     time: showTime ? getTime() : ''
                     });
  }

  
  // if isMe is true, mark this message so we can
  // know that this is our message in the chat window
  if(isMe){
  $html.addClass('marker');
  }
  
  // if isServer is true, mark this message as a server
  // message
  if(isServer){
  $html.find('.sender').css('color', serverDisplayColor);
  }
  $html.appendTo('.chat-messages ul');
  $('.chat-messages').animate({ scrollTop: $('.chat-messages ul').height() }, 100);
  }
  
  // return a short time format for the messages
  function getTime(){
  var date = new Date();
  return (date.getHours() < 10 ? '0' + date.getHours().toString() : date.getHours()) + ':' +
  (date.getMinutes() < 10 ? '0' + date.getMinutes().toString() : date.getMinutes());
  }

  
  // just for animation
  function shake(container, input, effect, bgColor){
  if(!lockShakeAnimation){
  lockShakeAnimation = true;
  $(container).addClass(effect);
  $(input).addClass(bgColor);
  window.setTimeout(function(){
                    $(container).removeClass(effect);
                    $(input).removeClass(bgColor);
                    $(input).focus();
                    lockShakeAnimation = false;
                    }, 1500);
  }
  }
  
  // after selecting a nickname we call this function
  // in order to init the connection with the server
  function connect(){
  // show connecting message
  console.log('connecting');
  $('.chat-shadow .content').html('Connecting...');
  
  // creating the connection and saving the socket
  socket = io.connect(serverAddress);
  
  // now that we have the socket we can bind events to it
  bindSocketEvents();
  }
  
  // on document ready, bind the DOM elements to events
  $(function(){
    bindDOMEvents();
	});
  
  })(jQuery);