import logo from './logo.svg';
import './App.css';
import Chat from './Chat';
import React, { useEffect, useState } from 'react';
import * as dotenv from 'dotenv'


import {useLocation, BrowserRouter as Router, useParams} from 'react-router-dom';
import axios from 'axios';
dotenv.config()

console.log('HERE', process.env)
function App() {
  const location = useLocation();
  const [reid, setReid] = useState(); 
  const [nickname, setNickname] = useState();
  useEffect(() => {
    setReid(new URLSearchParams(location.search.toString()).get('reid'))
    reid && axios.get(`${process.env.REACT_APP_SERVER || ''}/api/nickname/${reid}`).then((res) => setNickname(res.data)).catch()
  }, [])
  return (
    <div className="App">
      <Chat reid={reid} nickname={nickname}></Chat>
    </div>
  );
}

export default App;
