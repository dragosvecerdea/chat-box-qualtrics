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

let chatCount = 0;

const _reidToChat = {};

function reidToChat(reid) {
  if (_reidToChat(reid)) return _reidToChat(reid);
  const res = await pool.query("SELECT chatid FROM chats WHERE reid = $1", [reid])
  _reidToChat[res.rows[0].chatid]
  return res.rows[0].chatid;
}

app.post("/api/register/:reid", (req, res) => {
  // req.query
  const reid = req.params.reid;
  const nickname = req.query.nickname;
  const sex = req.query.sex.toLowerCase();
  pool.query(
    "INSERT INTO participant (reid, nickname, sex, timestamp) VALUES ($1, $2, $3, now()) RETURNING *",
    [reid, nickname, sex],
    (error, _) => {
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
              _reidToChat[reid] = newChat;
              res.sendStatus(200);
            }
          );
        }
      );
    }
  );
});

app.get("/api/role/:reid", (req, res) => {
  const chatid = reidToChat(req.params.reid);
  const reid = req.params.reid;
  if (!chatid || !reid) {
    res.sendStatus(400);
    return;
  }
  const control = chatid.substring(0, 1) == "1";
  pool.query(
    "SELECT chatid, reid FROM chats WHERE chatid = $1 ORDER BY timestamp",
    [chatid],
    (err, results) => {
      console.log(`Eroare in /api/role/${reid} ${err}`);
      res.send({
        control,
        role: results.rows.findIndex((r) => r.reid == reid) + 1,
      });
    }
  );
});

app.post("/api/nickname/:reid", (req, res) => {
  reidToNickname[req.params.reid] = req.body.nickname;
});

app.get("/api/group/:reid", (req, res) => {
  const chatid = reidToChat(req.params.reid);
  const reid = req.params.reid;
  if (!chatid || !reid) {
    res.sendStatus(400);
    return;
  }
  pool.query(
    "SELECT p.nickname AS nickname FROM participant AS p JOIN chats AS c ON p.reid = c.reid WHERE c.chatid = $1 AND c.reid != $2",
    [chatid, reid],
    (err, results) => {
      console.log(`Eroare in /api/group/${reid} ${err}`);
      res.send({
        partners: results.rows.map((r) => r.nickname),
      });
    }
  );
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
        (err, _) => {
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

app.get("/api/response/:reid", (req, res) => {
  const reid = req.params.reid;
  pool.query(
    "UPDATE participant SET answers = $1 WHERE reid = $2",
    [req.query.answers, reid],
    (err, _) => {
      if (!err) {
        pool.query(
          "SELECT p.answers as answers FROM participant AS p JOIN chats AS c ON p.reid = c.reid WHERE c.chatid = $1",
          [reidToChat(reid)],
          (err, results) => {
            if (!err) {
              res.send(
                results.rows.every((r) => r.answers == results.rows[0].answers)
              );
            }
          }
        );
      }
    }
  );
});

wss.on("connection", (ws) => {
  //connection is up, let's add a simple simple event
  ws.on("message", (reid) => {
    ws.reid = reid;
    //log the received message and send it back to the client
    console.log("reid has connected: ", reid);
  });
});

server.listen(PORT, () => console.log(`Listening on ${PORT}`));
