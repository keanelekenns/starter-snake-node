const bodyParser = require('body-parser')
const express = require('express')
const logger = require('morgan')
const app = express()
const {
  fallbackHandler,
  notFoundHandler,
  genericErrorHandler,
  poweredByHandler
} = require('./handlers.js')

// For deployment to Heroku, the port needs to be set using ENV, so
// we check for the port number in process.env
app.set('port', (process.env.PORT || 9001))

app.enable('verbose errors')

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(poweredByHandler)

// --- SNAKE LOGIC GOES BELOW THIS LINE ---
var currentMove;
var previousMove = "up";
const moves = ["up", "down", "left", "right"]

function moveToCoord(move, currentCoord){
    var newCoord = {...currentCoord};
    //console.log("OLD COORD: (" + newCoord.x +"," +newCoord.y+")");
    switch (move) {
      case 'up':
        newCoord.y--;
        break;
      case 'down':
        newCoord.y++;
        break;
      case 'left':
        newCoord.x--;
        break;
      case 'right':
        newCoord.x++;
        break;
      default:
        console.log("BAD COORD CONVERSION");
        return null;
    }
    //console.log("NEW COORD: (" + newCoord.x +"," +newCoord.y+")");
    return newCoord;
}

function reverseMove(move){
    switch (move) {
      case 'up':
        return 'down';
      case 'down':
        return 'up';
      case 'left':
        return 'right';
      case 'right':
        return 'left';
      default:
        return null;
    }
}

function isSafeCoord(coord, board){
    //check boundary
    if(coord.x < 0 || coord.y < 0 || coord.x >= board.width || coord.y >= board.height){
        return false;
    }
    //check snakes
    for (let i=0; i < board.snakes.length; i++){
        let currentSnake = board.snakes[i];
        for(let j = 0; j < currentSnake.body.length; j++){
            if(currentSnake.body[j].x == coord.x && currentSnake.body[j].y == coord.y){
                return false;
            }
        }
    }
    return true;
}
//Input:
//potentialMoves - a list of moves to check
//startCoord - where to move from
//board - the current game board
//Output:
//safeMoves - a subset of the moves list containing only safe moves
function safeMoves(potentialMoves, startCoord, board){
    let safeMoves = [];
    let coords = potentialMoves.map( function(x) { return moveToCoord(x, startCoord); });
    for(let i = 0; i < coords.length; i++){
        console.log("Potential Move : " + potentialMoves[i] + " (" + coords[i].x +"," + coords[i].y + ")");
        if(isSafeCoord(coords[i], board)){
            safeMoves.push(potentialMoves[i]);
        }
    }
    return safeMoves
}

//Input:
//move - the move to be removed
//Output:
//goodMoves - a list of all moves without move
function allBut(move){
    let goodMoves = [...moves];
    let badIndex = goodMoves.indexOf(move);
    if(badIndex >= 0){
        goodMoves.splice(badIndex,1);
    }else{
        console.log("BAD MOVE");
    }
    return goodMoves;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        let temp = array[i]
        array[i] = array[j]
        array[j] = temp
    }
}

//  This function is called everytime your snake is entered into a game.
//  cherrypy.request.json contains information about the game that's about to be played.
// TODO: Use this function to decide how your snake is going to look on the board.
app.post('/start', (request, response) => {
  console.log("START");

  // Response data
  const data = {
    color: '#4DC8FF',
    headType: "silly",
    tailType: "bolt"
  }

  return response.json(data)
})

// This function is called on every turn of a game. It's how your snake decides where to move.
// Valid moves are "up", "down", "left", or "right".
// TODO: Use the information in cherrypy.request.json to decide your next move.
app.post('/move', (request, response) => {
  var data = request.body;
  var validMoves = allBut(reverseMove(previousMove));
  
  var currentCoord = data.you.body[0];
  let safe = safeMoves(validMoves, currentCoord, data.board);
  shuffle(safe);
  var maxNumChoices = 0;
  console.log("TURN: " + data.turn);
  console.log("Safe Moves: " + safe.length);
  for(let i = 0; i < safe.length; i++){
      let possibleMove = safe[i];
      let secondaryMoves = allBut(reverseMove(possibleMove));
      let numChoices = safeMoves(secondaryMoves, moveToCoord(possibleMove, currentCoord), data.board).length;
      if (numChoices > maxNumChoices){
          currentMove = possibleMove;
          maxNumChoices = numChoices;
      }
      console.log(possibleMove + " numChoices after: " + numChoices);
  }
  
  previousMove = currentMove;
  console.log(data.you.id + " HEAD: (" + data.you.body[0].x +","+data.you.body[0].y+")");
  console.log(data.you.id + " TAIL: (" + data.you.body[data.you.body.length - 1].x +","+data.you.body[data.you.body.length - 1].y+")");
  console.log(data.you.id +" MOVE: " + currentMove );
  return response.json({ move: currentMove })
})

// This function is called when a game your snake was in ends.
// It's purely for informational purposes, you don't have to make any decisions here.
app.post('/end', (request, response) => {
  console.log("END");
  return response.json({ message: "ok" });
})

// The Battlesnake engine calls this function to make sure your snake is working.
app.post('/ping', (request, response) => {
  return response.json({ message: "pong" });
})

// --- SNAKE LOGIC GOES ABOVE THIS LINE ---

app.use('*', fallbackHandler)
app.use(notFoundHandler)
app.use(genericErrorHandler)

app.listen(app.get('port'), () => {
  console.log('Server listening on port %s', app.get('port'))
})
