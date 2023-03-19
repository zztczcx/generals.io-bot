var io = require('socket.io-client');
var socket = io('https://bot.generals.io');

// You can use any name as custom_game_id, user_id and username, as long as it is uniq
// except username needs to start with [Bot]
// when you develop, it's better to use a private game.
var custom_game_id = 'certsy_dev_fun';
var user_id = 'generals_id_20230315';
var username = '[Bot]_id_20230315';

var Bot = require("./bots/MyBot v1/bot.js")

socket.on('disconnect', function() {
	console.error('Disconnected from server.');
	process.exit(1);
});

socket.on('connect', function() {
	console.log('Connected to server.');

	/* Don't lose this user_id or let other people see it!
	 * Anyone with your user_id can play on your bot's account and pretend to be your bot.
	 * If you plan on open sourcing your bot's code (which we strongly support), we recommend
	 * replacing this line with something that instead supplies the user_id via an environment variable, e.g.
	 * var user_id = process.env.BOT_USER_ID;
	 */

	// Set the username for the bot.
	// This should only ever be done once. See the API reference for more details.
	socket.emit('set_username', user_id, username);
});

socket.on('error_set_username', function(info){
  console.log(info)
  if(info.indexOf('taken') > 0 || info.length == 0) {
    join_and_start_game(socket);
  }
})

function join_and_start_game(socket){
  // Join a custom game and force start immediately.
  // Custom games are a great way to test your bot while you develop it because you can play against your bot!
  socket.emit('join_private', custom_game_id, user_id);

  // need to wait a moment to force_start, no event to hook.
  setTimeout(function(){
    socket.emit('set_force_start', custom_game_id, true);
  },500)
  console.log('Joined custom game at https://bot.generals.io/games/' + encodeURIComponent(custom_game_id));
}

// Terrain Constants.
// Any tile with a nonnegative value is owned by the player corresponding to its value.
// For example, a tile with value 1 is owned by the player with playerIndex = 1.
var TILE_EMPTY = -1;
var TILE_CITY = 1;
var TILE_MOUNTAIN = -2;
var TILE_FOG = -3;
var TILE_FOG_OBSTACLE = -4; // Cities and Mountains show up as Obstacles in the fog of war.

// Game data.
var playerIndex;
var generals; // The indicies of generals we have vision of.
var cities = []; // The indicies of cities we have vision of.
var map = [];
var usernames;
var bot;

/* Returns a new array created by patching the diff into the old array.
 * The diff formatted with alternating matching and mismatching segments:
 * <Number of matching elements>
 * <Number of mismatching elements>
 * <The mismatching elements>
 * ... repeated until the end of diff.
 * Example 1: patching a diff of [1, 1, 3] onto [0, 0] yields [0, 3].
 * Example 2: patching a diff of [0, 1, 2, 1] onto [0, 0] yields [2, 0].
 */
function patch(old, diff) {
	var out = [];
	var i = 0;
	while (i < diff.length) {
		if (diff[i]) {  // matching
			Array.prototype.push.apply(out, old.slice(out.length, out.length + diff[i]));
		}
		i++;
		if (i < diff.length && diff[i]) {  // mismatching
			Array.prototype.push.apply(out, diff.slice(i + 1, i + 1 + diff[i]));
			i += diff[i];
		}
		i++;
	}
	return out;
}

socket.on('game_start', function(data) {
	// Get ready to start playing the game.

        usernames = data.usernames
        bot = new Bot()
  	playerIndex = data.playerIndex;
	replay_url = 'http://bot.generals.io/replays/' + encodeURIComponent(data.replay_id);
	console.log('Game starting! The replay will be available after the game at ' + replay_url);

});

socket.on('game_update', function(data) {
    // Patch the city and map diffs into our local variables.
    cities = patch(cities, data.cities_diff);
    map = patch(map, data.map_diff);
    generals = data.generals;
    var step = data.turn
    
    // TODO: print some useful data during game
    console.log(step)

    // The first two terms in |map| are the dimensions.
    var width = map[0];
    var height = map[1];
    var size = width * height;

    // The next |size| terms are army values.
    // armies[0] is the top-left corner of the map.
    var armies = map.slice(2, size + 2);

    // The last |size| terms are terrain values.
    // terrain[0] is the top-left corner of the map.
    var terrain = map.slice(size + 2, size + 2 + size);
    var owners = Array(size)

    for(var i = 0; i < terrain.length; i++){
        var t = terrain[i]
        if(t == TILE_EMPTY){
            terrain[i] = 0
            owners[i] = -1
        }else if(t == TILE_MOUNTAIN){
            terrain[i] = -1
            owners[i] = -1
        }else if(t == TILE_FOG){
            terrain[i] = 0
            owners[i] = -1
        }else if(t == TILE_FOG_OBSTACLE){
            terrain[i] = -1
            owners[i] = -1
        }else{
            terrain[i] = 0
            owners[i] = t
        }
    }
    
    for(var i = 0; i < cities.length; i++){
        terrain[cities[i]] = 1
    }
    
    for(var i = 0; i < generals.length; i++){
        if(generals[i] < 0){ continue; }
        terrain[generals[i]] = 2
    }
    
    var rows = Array(height)
    // Precomputed Rows
    for(var y = 0; y < height; y++){
        rows[y] = Array(width)
        for(var x = 0; x < width; x++){
            rows[y][x] = y * width + x
        }
    }
    
    // Convert to our own map style
    
    var runnerMap = {
            playerCount: usernames.length,
            activePlayerCount: usernames.length,
            width: width,
            height: height,
            size: size,
            strengths: armies,
            owners: owners,
            terrain: terrain,
            rows: rows,
            step: data.step
        }
    
    
    // Call bot
    move = bot.doStep(runnerMap, playerIndex)

    print_game_map(runnerMap, terrain, armies, owners);

    // console.log(move)
    if(move!=undefined){
        socket.emit('attack', move[0], move[1]);
    }
});

function print_game_map(runnerMap, terrain, armies, owners){
  delete runnerMap['rows']
  delete runnerMap['strengths']
  delete runnerMap['owners']
  delete runnerMap['terrain']
  console.log("map: ", runnerMap, playerIndex)

  console.log('terrain:')
  terrain.each_slice(runnerMap['width'], function(slice){
    console.log(slice.map(x => x.toString().padStart(3)).join(','))
  });

  console.log('Armies:')
  armies.each_slice(runnerMap['width'], function(slice){
    console.log(slice.map(x => x.toString().padStart(3)).join(','))
  });

  console.log('Lands owners:')
  owners.each_slice(runnerMap['width'], function(slice){
    console.log(slice.map(x => x.toString().padStart(3)).join(','))
  });

}

function leaveGame() {
  socket.emit('leave_game');
  console.log('leave game');
}

socket.on('game_lost', leaveGame);

socket.on('game_won', leaveGame);



Array.prototype.each_slice = function (size, callback){
  for (var i = 0, l = this.length; i < l; i += size){
    callback.call(this, this.slice(i, i + size));
  }
};
