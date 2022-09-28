const express = require('express')
const cors = require('cors')
const path = require('path')
const http = require('http')
const bodyParser = require('body-parser')
const webSocket = require('ws')
const { Console } = require('console')
const PORT = process.env.PORT || 8080


const app = express()
.use(express.static(path.join(__dirname, '/client/build')))
.use(cors())
.use( bodyParser.json() )
.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

let server = http.createServer(app)

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/client/build', 'index.html'));
});

const participantsToChats = {
  'a': 'chat1',
  'b': 'chat1',
}

const reidToNickname = {
  'a': 'Ioana',
  'b': 'Dragos'
}

const wss = new webSocket.Server({ server });


const getChatForParticipant = () => {

}

const chatHistory = [
  {
    message: "Hello 1",
    sender: "Ioana",
    senderReid: "a",
  },
  {
    message: "Hello 2",
    sender: "Dragos",
    senderReid: "b",
  },
  {
    message: "Hello 1",
    sender: "Ioana",
    senderReid: "a",
  }
]

const chatHistories = {
  'chat1': chatHistory,
}


app.post('/api/nickname/:reid', (req, res) => {
  reidToNickname[req.params.reid] = req.body.nickaname
})

app.get('/api/nickname/:reid', (req, res) => {
  res.send(reidToNickname[req.params.reid])
})
app.get('/api/chat/:reid', (req, res) => {
  res.send(chatHistories[participantsToChats[req.params.reid]])
})

app.post('/api/chat/:reid', (req, res) => {
  chatHistories[participantsToChats[req.params.reid]].push({
    message: req.body.message,
    sender: reidToNickname[req.params.reid],
    senderReid: req.params.reid
  })
  wss.clients
  .forEach(client => {
      if (client.reid != req.params.reid) {
          client.send(JSON.stringify({
            message: req.body.message,
            sender: reidToNickname[req.params.reid],
            senderReid: req.params.reid
          }));
      }    
  });
  res.sendStatus(200)
})


wss.on('connection', (ws) => {

    //connection is up, let's add a simple simple event
    ws.on('message', (reid) => {

        ws.reid = reid
        //log the received message and send it back to the client
        console.log('reid has connected: ', reid);
    });
});


setInterval(() => chatHistory.splice(0, chatHistory.length) , 120000)

server.listen(PORT, () => console.log(`Listening on ${ PORT }`))
