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
var currentMoves = {};
const moves = ["up", "right", "down", "left"]
const offsets = {
    
    getOffsets : function(move, n){
        var view = [];
        n = Math.abs(n);
        var bound = Math.floor(n/2);
        switch (move) {
          case 'up':
            for(let i = -bound; i <= bound; i++){
                for(let j = -1; j >= -n; j--){
                    view.push([i,j]);
                }
            }
            break;
            
          case 'left':
            for(let i = -1; i >= -n; i--){
                for(let j = -bound; j <= bound; j++){
                    view.push([i,j]);
                }
            }
            break;
            
          case 'down':
            for(let i = -bound; i <= bound; i++){
                for(let j = 1; j <= n; j++){
                    view.push([i,j]);
                }
            }
            break;
            
          case 'right':
            for(let i = 1; i <= n; i++){
                for(let j = -bound; j <= bound; j++){
                    view.push([i,j]);
                }
            }
            break;
            
          default:
            console.log("Bad move given to getViewOffsets");
            return null;
        }
        return view;
    },
    up : getOffsets("up",7),
    right : getOffsets("right",7),
    down : getOffsets("down",7),
    left : getOffsets("left",7)
}

function moveToCoord(move, currentCoord){
    var newCoord = {...currentCoord};
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
        console.log("Bad move given to moveToCoord");
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
        console.log("Bad move given to reverseMove");
        return null;
    }
}

function clockwiseMove(move){
    switch (move) {
      case 'up':
        return 'right';
      case 'right':
        return 'down';
      case 'down':
        return 'left';
      case 'left':
        return 'up';
      default:
        console.log("Bad move given to clockwiseMove");
        return null;
    }
}

function counterclockwiseMove(move){
    switch (move) {
      case 'up':
        return 'left';
      case 'left':
        return 'down';
      case 'down':
        return 'right';
      case 'right':
        return 'up';
      default:
        console.log("Bad move given to counterclockwiseMove");
        return null;
    }
}


function inBounds(coord, board){
    if(coord.x < 0 || coord.y < 0 || coord.x >= board.width || coord.y >= board.height){
        return false;
    }
    return true;
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
        console.log("Bad move given to allBut");
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

function boardToGrid(board){
    let grid = {};
    //SNAKES
    for (let i=0; i < board.snakes.length; i++){
        let currentSnake = board.snakes[i];
        for(let j = 0; j < currentSnake.body.length - 1; j++){
            let coord = currentSnake.body[j];
            if(!(coord.x in grid)){
                grid[coord.x]={};
            }
            grid[coord.x][coord.y] = -1*((currentSnake.body.length - j)/currentSnake.body.length);
        }
        let tail = currentSnake.body[currentSnake.body.length - 1];
        if(!(tail.x in grid)){
            grid[tail.x]={};
        }
        grid[tail.x][tail.y] = 0.001/(currentSnake.body.length);//take a chance going towards tail
    }
    //FOOD
    for (let i = 0; i < board.food.length; i++){
        let coord = board.food[i];
        if(!(coord.x in grid)){
            grid[coord.x]={};
        }
        grid[coord.x][coord.y] = 5;
    }
    console.log(JSON.stringify(grid));
    return grid;
}

//Input:
//startCoord - where to move from
//move - a move to check
//board - the current game board
//grid - the current game grid
//Output:
//pathScore - an integer representing this path's score (higher is better)
function pathScore(startCoord, move, board, grid){
    let score = 0;
    let offsetArray = offsets[move];
    
    for(offset in offsetArray){
        let coord = {x:startCoord.x + offset[0], y: startCoord.y + offset[1]};
        
        if(!(inBounds(coord,board))){
            score += -1/n;
            continue;
        }
        if(coord.x in grid){
            if(coord.y in grid[coord.x]){
                let gridVal = grid[coord.x][coord.y];
                score += gridVal;
            }else{
                score += 1;
            }
        }else{
            score += 1;
        }
    }
    
    return score;
}

function bestPath(startCoord, forwardMove, board){
    let choice;
    let maxScore = Number.NEGATIVE_INFINITY;
    let grid = boardToGrid(board);
    let possibleMoves = [forwardMove, counterclockwiseMove(forwardMove), clockwiseMove(forwardMove)];
    let coords = possibleMoves.map(function(x){return moveToCoord(x, startCoord);});
    
    for(let i = 0; i < coords.length; i++){
        if(inBounds(coords[i],board) && 
        !(coords[i].x in grid && coords[i].y in grid[coords[i].x] && grid[coords[i].x][coords[i].y] < 0)){
            console.log("Path: " + potentialMoves[i]);
            let pScore = pathScore(startCoord, potentialMoves[i], board, grid);
            console.log(pScore);
            if(pScore > maxScore){
                maxScore = pScore;
                choice = potentialMoves[i];
            }
        }
    }
    if(!choice){
        choice = "up"; //no choices
    }
    return choice;
}

//  This function is called everytime your snake is entered into a game.
//  cherrypy.request.json contains information about the game that's about to be played.
// TODO: Use this function to decide how your snake is going to look on the board.
app.post('/start', (request, response) => {
  console.log("START");
  let j = Math.floor(Math.random()*4);
  currentMoves[request.body.you.id] = moves[j];
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
  let data = request.body;
  
  //let potentialMoves = allBut(reverseMove(currentMoves[data.you.id]));
  let currentCoord = data.you.body[0];
  
  console.log("TURN: "+data.turn);
  currentMoves[data.you.id] = bestPath(currentCoord, currentMoves[data.you.id], data.board);
  
  console.log(data.you.id + " HEAD: (" + data.you.body[0].x +","+data.you.body[0].y+")");
  console.log(data.you.id + " TAIL: (" + data.you.body[data.you.body.length - 1].x +","+data.you.body[data.you.body.length - 1].y+")");
  console.log(data.you.id +" MOVE: " + currentMoves[data.you.id] );
  return response.json({ move: currentMoves[data.you.id] })
})

// This function is called when a game your snake was in ends.
// It's purely for informational purposes, you don't have to make any decisions here.
app.post('/end', (request, response) => {
  console.log("END");
  delete currentMoves[request.body.you.id];
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
