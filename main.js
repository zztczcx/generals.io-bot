var io = require('socket.io-client');
var socket = io('https://bot.generals.io');

var custom_game_id = 'certsy_dev_fun';
var user_id = 'generals_id_20230315';
var username = '[Bot]_id_20230315';


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

  // need to wait a moment to force_start, no event to regester.
  setTimeout(function(){
    socket.emit('set_force_start', custom_game_id, true);
  },500)
  console.log('Joined custom game at https://bot.generals.io/games/' + encodeURIComponent(custom_game_id));
}

// Terrain Constants.
// Any tile with a nonnegative value is owned by the player corresponding to its value.
// For example, a tile with value 1 is owned by the player with playerIndex = 1.
var TILE_EMPTY = -1;
var TILE_MOUNTAIN = -2;
var TILE_FOG = -3;
var TILE_FOG_OBSTACLE = -4; // Cities and Mountains show up as Obstacles in the fog of war.

// Game data.
var playerIndex;
var generals; // The indicies of generals we have vision of.
var cities = []; // The indicies of cities we have vision of.
var map = [];

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
	playerIndex = data.playerIndex;
	var replay_url = 'https://bot.generals.io/replays/' + encodeURIComponent(data.replay_id);
	console.log('Game starting! The replay will be available after the game at ' + replay_url);
});

socket.on('game_update', function(data) {
	// Patch the city and map diffs into our local variables.
	cities = patch(cities, data.cities_diff);
	map = patch(map, data.map_diff);
	generals = data.generals;

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

	// Make a random move.
	while (true) {
		// Pick a random tile.
		var index = Math.floor(Math.random() * size);

		// If we own this tile, make a random move starting from it.
		if (terrain[index] === playerIndex) {
			var row = Math.floor(index / width);
			var col = index % width;
			var endIndex = index;

			var rand = Math.random();
			if (rand < 0.25 && col > 0) { // left
				endIndex--;
			} else if (rand < 0.5 && col < width - 1) { // right
				endIndex++;
			} else if (rand < 0.75 && row < height - 1) { // down
				endIndex += width;
			} else if (row > 0) { //up
				endIndex -= width;
			} else {
				continue;
			}

			// Would we be attacking a city? Don't attack cities.
			if (cities.indexOf(endIndex) >= 0) {
				continue;
			}

			socket.emit('attack', index, endIndex);
			break;
		}
	}
});

function leaveGame(data) {
  console.log('Defeated by ' + data.killer);
  socket.emit('leave_game');
  console.log('leave game')
}

socket.on('game_lost', leaveGame);

socket.on('game_won', leaveGame);
