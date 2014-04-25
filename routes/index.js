
module.exports = function(app) {
  console.log('trying to load chat');
  app.get('/chat', function(req, res, next) {
    res.render('chat');
  });
}
