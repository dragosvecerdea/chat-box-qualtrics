import styles from "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
} from "@chatscope/chat-ui-kit-react";
import React from "react";

export default function Chat() 
{ 
    return (
    <div style={{ position: "relative", height: "500px" }}>
        <MainContainer>
            <ChatContainer>
            <MessageList>
            {[...Array(5)].map((x, i) =>
            <Message
                key={i}
                model={{
                    message: "Hello my friend",
                    sentTime: "just now",
                    sender: "Joe",
          }}
            >
                <Message.Header sender={'Joe'}></Message.Header>
                </Message>
            )}
                        {[...Array(5)].map((x, i) =>
            <Message
                key={i}
                model={{
                    message: "Hello my friend",
                    sentTime: "just now",
                    sender: "Joe",
                    direction: 'outgoing'
          }}
            >                </Message>
            )}
      </MessageList>
      <MessageInput placeholder="Type message here" />
    </ChatContainer>
  </MainContainer>
</div>); 
}