import styles from "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  ConversationHeader,
} from "@chatscope/chat-ui-kit-react";
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Chat({ reid, nickname = "Ioana" }) {
  const [conversations, setConversations] = useState([]);
  const [ws, setWs] = useState({});

  useEffect(() => {
    if (reid) {
      axios
        .get(`${process.env.REACT_APP_SERVER || ""}/api/chat/${reid}`)
        .then((res) => setConversations(res.data));
      let _ws = new WebSocket(
        `${process.env.REACT_APP_WS_SERVER ||
          "wss://chat-box-qualtrics.herokuapp.com"}`
      );
      _ws.onopen = (event) => {
        _ws.send(reid);
      };

      _ws.onmessage = function({ data }) {
        axios
          .get(`${process.env.REACT_APP_SERVER || ""}/api/chat/${reid}`)
          .then((res) => setConversations(res.data));
      };
      setWs(_ws);
    }
  }, [reid]);

  const sendMessage = ({ reid, message }) => {
    return axios.post(
      `${process.env.REACT_APP_SERVER || ""}/api/chat/${reid}`,
      { message },
      { headers: { "Content-Type": "application/json" } }
    );
  };
  return (
    <div style={{ position: "relative", height: "100px", minHeight: "400px" }}>
      <MainContainer>
        <ChatContainer>
          <ConversationHeader>
            <ConversationHeader.Content
              userName="Experiment 1"
              info="Topic ..."
            />
            <ConversationHeader.Actions></ConversationHeader.Actions>
          </ConversationHeader>
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
                {conv.senderReid === reid ? (
                  <Message.Header sender={conv.sender}></Message.Header>
                ) : null}
              </Message>
            ))}
          </MessageList>
          <MessageInput
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
