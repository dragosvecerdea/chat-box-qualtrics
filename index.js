const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const bodyParser = require("body-parser");
const webSocket = require("ws");
const PORT = process.env.PORT || 8080;
const Pool = require("pg").Pool;

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

const pool = new Pool({
  connectionString: process.env.HEROKU_POSTGRESQL_CYAN_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

let server = http.createServer(app);

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "/client/build", "index.html"));
});

const participantsToChats = {};

let reidToNickname = new Object();
let reidToSex = new Object();

const wss = new webSocket.Server({ server });

const getChatForParticipant = () => {};

const chatHistory = [];

const chatHistories = {
  chat1: chatHistory,
};

const activeChats = {};

let chatCount = 0;

app.post("/api/register/:reid", (req, res) => {
  // req.query
  const reid = req.params.reid;
  const nickname = req.query.nickname;
  const sex = req.query.sex.toLowerCase();
  pool.query(
    "INSERT INTO participant (reid, nickname, sex, timestamp) VALUES ($1, $2, $3, now()) RETURNING *",
    [reid, nickname, sex],
    (error, results) => {
      if (error) {
        console.log(error);
        res.sendStatus(400);
        return;
      }
      pool.query(
        "SELECT chatid,COUNT(*) FROM chats GROUP BY chatid HAVING COUNT(*) <= 2",
        (err, response) => {
          if (err) {
            res.sendStatus(400);
            return;
          }
          let newChat = "";
          if (response.rowCount == 0) {
            newChat =
              `${(chatCount % 2) + 1}-` +
              (Math.random() + 1).toString(10).substring(7);
            chatCount += 1;
          } else {
            newChat = response.rows[0].chatid;
          }
          pool.query(
            "INSERT INTO chats (chatid, reid) VALUES ($1, $2)",
            [newChat, reid],
            (err, response) => {
              if (err) {
                res.sendStatus(400);
                return;
              }
              res.sendStatus(200);
            }
          );
        }
      );
    }
  );
});

app.get("/api/role/:reid", (req, res) => {
  pool.query(
    "SELECT chatid, reid FROM chats WHERE reid = $1",
    [req.params.reid],
    (err, response1) => {
      const control = response1.rows[0].chatid.substring(0, 1) == "1";
      pool.query(
        "SELECT chatid, reid FROM chats WHERE chatid = $1 ORDER BY timestamp",
        [response1.rows[0].chatid],
        (err, response2) => {
          console.log(err);
          res.send({
            control,
            role:
              response2.rows.findIndex((r) => r.reid == req.params.reid) + 1,
          });
        }
      );
    }
  );
});

app.post("/api/nickname/:reid", (req, res) => {
  reidToNickname[req.params.reid] = req.body.nickname;
});

app.get("/api/group/:reid", (req, res) => {
  pool.query(
    "SELECT chatid FROM chats WHERE reid = $1",
    [req.params.reid],
    (err, response1) => {
      pool.query(
        "SELECT p.nickname AS nickname FROM participant AS p JOIN chats AS c ON p.reid = c.reid WHERE c.chatid = $1 AND c.reid != $2",
        [response1.rows[0].chatid, req.params.reid],
        (err, response2) => {
          console.log(err);
          res.send({
            partners: response2.rows.map((r) => r.nickname),
          });
        }
      );
    }
  );
});

app.get("/api/nickname/:reid", (req, res) => {
  res.send(reidToNickname[req.params.reid]);
});

app.get("/api/chat/:reid", (req, res) => {
  pool.query(
    "SELECT m.message as message, p.nickname as nickname, m.reid as reid, p.sex as sex FROM chats AS c JOIN messages AS m ON m.chatid = c.chatid JOIN participant AS p ON m.reid = p.reid WHERE c.reid=$1",
    [req.params.reid],
    (err, response) => {
      if (err) {
        console.log(err);
        res.sendStatus(400);
        return;
      }
      res.send(
        response.rows.map((r) => {
          return {
            message: r.message,
            sender: r.nickname,
            senderSex: r.sex,
            senderReid: r.reid,
          };
        })
      );
    }
  );
});

app.post("/api/chat/:reid", (req, res) => {
  pool.query(
    "SELECT c.chatid as chatid, p.nickname as nickname, p.sex as sex FROM chats AS c JOIN participant AS p ON c.reid = p.reid WHERE p.reid = $1",
    [req.params.reid],
    (err, response1) => {
      if (err) {
        res.sendStatus(400);
        return;
      }
      wss.clients.forEach((client) => {
        if (client.reid != req.params.reid) {
          client.send(
            JSON.stringify({
              message: req.body.message,
              sender: response1.rows[0].nickname,
              senderReid: req.params.reid,
              senderSex: response1.rows[0].sex,
            })
          );
        }
      });
      pool.query(
        "INSERT INTO messages (reid, chatid, message, timestamp) VALUES($1, $2, $3, now())",
        [req.params.reid, response1.rows[0].chatid, req.body.message],
        (err, response2) => {
          if (!err) {
            res.sendStatus(200);
          } else {
            res.sendStatus(400);
          }
        }
      );
    }
  );
  // te iubesc pup pwp
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
