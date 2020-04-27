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

var previousMove = "up";
const moves = ["up", "down", "left", "right"]

function moveToCoord(move, currentCoord){
    var newCoord = {...currentCoord};
    switch (move) {
      case 'up':
        newCoord.y++;
        break;
      case 'down':
        newCoord.y--;
        break;
      case 'left':
        newCoord.x--;
        break;
      case 'right':
        newCoord.x++;
        break;
      default:
        return null;
    }
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
    if(coord.x < 0 || coord.y < 0 || coord.x > board.width || coord.y > board.height){
        return false;
    }
    numSnakes = board.snakes.length;
    for (let i=0; i < numSnakes; i++){
        currentSnake = board.snakes[i];
        console.log("CHECK SNAKE: " + currentSnake);
        let snakeSize = currentSnake.body.length;
        for(let j = 0; j < snakeSize; j++){
            if(currentSnake.body[j].x == coord.x && currentSnake.body[j].y == coord.y){
                return false;
            }
        }
    }
    return true;
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
  var validMoves = [...moves];
  let index = moves.indexOf(reverseMove(previousMove));
  validMoves.splice(index,1);
  
  var currentCoord = data.you.body[0];
  for(;;){
      let i = Math.floor(Math.random() * 3);
      if(isSafeCoord(moveToCoord(validMoves[i], currentCoord),data.board)){
          var currentMove = validMoves[i];
          break;
      }
  }
  
  console.log("MOVE: " + currentMove );
  console.log("CURRENT HEAD: (" + data.you.body[0].x +","+data.you.body[0].y+")");
  console.log("CURRENT TAIL: (" + data.board.snakes[0].body[-1].x +","+data.board.snakes[0].body[-1].y+")");
  previousMove = currentMove;
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
