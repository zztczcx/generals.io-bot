var io = require('socket.io-client');
var socket = io('https://bot.generals.io');

var Bot = require("./bots/MyBot v1/bot.js")
var Helper = require("./helper.js");

// You can use any name as custom_game_id, user_id and username, as long as it is uniq
// except username needs to start with [Bot]
// when you develop, it's better to use a private game.
var custom_game_id = 'certsy_dev_fun';

/* Don't lose this user_id or let other people see it!
* Anyone with your user_id can play on your bot's account and pretend to be your bot.
* If you plan on open sourcing your bot's code (which we strongly support), we recommend
* replacing this line with something that instead supplies the user_id via an environment variable, e.g.
* var user_id = process.env.BOT_USER_ID;
*/
var user_id = 'generals_id_20230324';
var username = '[Bot]_id_20230324';
var bot = new Bot();

var usernames;
var playerIndex;

console.clear()

socket.on('disconnect', function() {
  console.error('Disconnected from server.');
  process.exit(1);
});

socket.on('connect', function() {
  console.log('Connected to server.');

  // Set the username for the bot.
  // This should only ever be done once. See the API reference for more details.
  socket.emit('set_username', user_id, username);
});

socket.on('error_set_username', function(info){
  console.log(info)
  if(info.indexOf('taken') > 0 || info.length == 0) {
    Helper.join_and_start_game(socket, custom_game_id, user_id);
  }
})


socket.on('game_start', function(data) {
  // Get ready to start playing the game.
  usernames = data.usernames
  playerIndex = data.playerIndex;

  //TODO
  //playerCount: usernames.length,
  //activePlayerCount: usernames.length,
  console.log('playerIndex:', playerIndex);
  console.log('usernames:', usernames);

  replay_url = 'https://bot.generals.io/replays/' + encodeURIComponent(data.replay_id);
  console.log('Game starting! The replay will be available after the game at ' + replay_url);

});

const process = require('process')
const rdl = require("readline")

socket.on('game_update', function(data) {
  rdl.cursorTo(process.stdout, 0, 6)

  console.log('scores:', data.scores)
  runnerMap = Helper.generate_runner_map(data, playerIndex, usernames)
  move = bot.doStep(runnerMap, playerIndex)     

  if(move!=undefined){
    socket.emit('attack', move[0], move[1]);
  }
});

socket.on('game_lost', ()=>{
  console.log('game lost');
  socket.emit('leave_game');
});

socket.on('game_won', ()=>{
  console.log('game won');
  socket.emit('leave_game');
});
