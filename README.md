# generals.io Node.js Bot Example

This is an example of a basic Javascript implementation of a bot for [generals.io](https://generals.io). Read the tutorial associated with this bot at [dev.generals.io/api#tutorial](https://dev.generals.io/api#tutorial).

## Usage

```
$ git clone git@github.com:zztczcx/generals.io-bot.git
$ cd generals.io-bot
$ npm install
$ node main.js
```

## Local Development

```
$ python3 -m http.server 8000

chrome: open localhost:8000
```

This will open a local map with two pre-defined bots, which will show you how the army moves.

## Bot interface

```
  move = bot.doStep(runnerMap, playerIndex)     

  move : [source, destination, false] ('false' means not using 50% of army)
```

```
  The whole map is an one-dimensional array.
  the top-left corner is index 0.


  runnerMap = {
    width: width,
    height: height,
    size: size,
    strengths: armies,
    owners: owners,
    terrain: terrain,
    rows: rows,
    step: step
  }

  owners: [-1, 0, 1, 2, 3, .....size]
                     -1 : not occupied or no owner,
           0, 1, 2, ....: playerIndex


  terrain: [-1, 0, 1, 2]
          -1: mountain or obstables;
           0: empty
           1: city
           2: general

  strenths: [0,0,11,55,1,2, .....size]
          how many army on each tile
```
