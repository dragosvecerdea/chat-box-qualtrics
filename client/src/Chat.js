import styles from "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import {
  Avatar,
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  ConversationHeader,
} from "@chatscope/chat-ui-kit-react";
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Chat({ reid, nickname, sex = "male" }) {
  const [conversations, setConversations] = useState([]);
  const [_reid, setReid] = useState(reid);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    if (reid && !ws) {
      setReid(reid);
      axios
        .get(`${process.env.REACT_APP_SERVER || ""}/api/chat/${reid}`)
        .then((res) => setConversations(res.data));
      let _ws = new WebSocket(
        `${process.env.REACT_APP_WS_SERVER ||
          "wss://chat-box-qualtrics.herokuapp.com"}`
      );
      _ws.onopen = (event) => {
        _ws.send(reid);
        axios.get(`${process.env.REACT_APP_SERVER || ""}/api/chat/${_reid}`);
      };

      _ws.onmessage = function({ data }) {
        axios
          .get(`${process.env.REACT_APP_SERVER || ""}/api/chat/${_reid}`)
          .then((res) => setConversations(res.data));
      };

      _ws.onclose = function() {
        setTimeout(() => setWs(null), 5000);
      };
      setWs(_ws);
    }
  }, [reid, ws]);

  const sendMessage = ({ reid, message }) => {
    return axios.post(
      `${process.env.REACT_APP_SERVER || ""}/api/chat/${reid}`,
      { message },
      { headers: { "Content-Type": "application/json" } }
    );
  };
  return (
    <div style={{ position: "relative", height: "100px", minHeight: "290px" }}>
      <MainContainer>
        <ChatContainer>
          <MessageList>
            {conversations.map((conv, i) => (
              <Message
                key={i}
                model={{
                  message: conv.message,
                  sender: conv.sender,
                  direction: conv.senderReid == reid ? "outgoing" : null,
                }}
              >
                <Message.Header sender={conv.sender}></Message.Header>
                {conv.senderReid != reid ? (
                  <Avatar
                    src={process.env.PUBLIC_URL + `/${conv.senderSex}.png`}
                    size="s"
                  />
                ) : null}
              </Message>
            ))}
          </MessageList>
          <MessageInput
            autoFocus
            attachButton={false}
            onSend={(message) =>
              sendMessage({ message, reid })
                .then(
                  setConversations([
                    ...conversations,
                    {
                      message,
                      sentTime: new Date().getTime().toString(),
                      sender: nickname,
                      senderReid: reid,
                      senderSex: sex,
                    },
                  ])
                )
                .catch()
            }
            placeholder="Type message here"
          />
        </ChatContainer>
      </MainContainer>
    </div>
  );
}
