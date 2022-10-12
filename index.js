const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const bodyParser = require("body-parser");
const webSocket = require("ws");
const PORT = process.env.PORT || 8080;

const app = express()
  .use(express.static(path.join(__dirname, "/client/build")))
  .use(cors())
  .use(bodyParser.json())
  .use(
    bodyParser.urlencoded({
      // to support URL-encoded bodies
      extended: true,
    })
  );

let server = http.createServer(app);

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "/client/build", "index.html"));
});

const participantsToChats = {};

let reidToNickname = new Object();

const wss = new webSocket.Server({ server });

const getChatForParticipant = () => {};

const chatHistory = [];

const chatHistories = {
  chat1: chatHistory,
};

const activeChats = {};

app.post("/api/register/:reid", (req, res) => {
  // req.query
  if (!reidToNickname[req.params.reid]) {
    const reid = req.params.reid;
    const nickname = req.query.nickname;
    const sex = req.query.sex;
    reidToNickname[req.params.reid] = nickname;
    const freeChat = Object.keys(activeChats).find(
      (chat) => activeChats[chat] <= 2
    );
    if (!freeChat) {
      let newChat =
        `${(Object.keys(activeChats).length % 2) + 1}-` +
        (Math.random() + 1).toString(10).substring(7);
      while (
        Object.keys(activeChats).findIndex((chat) => chat == newChat) != -1
      ) {
        newChat =
          `${(Object.keys(activeChats).length % 2) + 1}-` +
          (Math.random() + 1).toString(10).substring(7);
      }
      activeChats[newChat] = 1;
      chatHistories[newChat] = [];
      participantsToChats[reid] = newChat;
      console.log(`Participant ${reid} assigned to ${newChat} chat`);
    } else {
      activeChats[freeChat] += 1;
      participantsToChats[reid] = freeChat;
      console.log(`Participant ${reid} assigned to ${freeChat} chat`);
    }
  }
  res.sendStatus(200);
  console.log(reidToNickname);
});

app.get("/api/role/:reid", (req, res) => {
  const chat = participantsToChats[req.params.reid];

  res.send({
    control: chat.substring(0, 1) == "1",
    role:
      Object.entries(participantsToChats)
        .filter((p) => p[1] == chat)
        .sort((p1, p2) => p1[0] < p2[0])
        .findIndex((p) => p[0] == req.params.reid) + 1,
  });
});

app.post("/api/nickname/:reid", (req, res) => {
  reidToNickname[req.params.reid] = req.body.nickname;
});

app.get("/api/nickname/:reid", (req, res) => {
  res.send(reidToNickname[req.params.reid]);
});

app.get("/api/chat/:reid", (req, res) => {
  res.send(chatHistories[participantsToChats[req.params.reid]]);
});

app.post("/api/chat/:reid", (req, res) => {
  chatHistories[participantsToChats[req.params.reid]].push({
    message: req.body.message,
    sender: reidToNickname[req.params.reid],
    senderReid: req.params.reid,
  });
  wss.clients.forEach((client) => {
    if (client.reid != req.params.reid) {
      client.send(
        JSON.stringify({
          message: req.body.message,
          sender: reidToNickname[req.params.reid],
          senderReid: req.params.reid,
        })
      );
    }
  });
  res.sendStatus(200);
});

wss.on("connection", (ws) => {
  //connection is up, let's add a simple simple event
  ws.on("message", (reid) => {
    ws.reid = reid;
    //log the received message and send it back to the client
    console.log("reid has connected: ", reid);
  });
});

setInterval(() => chatHistory.splice(0, chatHistory.length), 120000);

server.listen(PORT, () => console.log(`Listening on ${PORT}`));
