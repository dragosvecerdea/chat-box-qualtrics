import logo from './logo.svg';
import './App.css';
import Chat from './Chat';
import React, { useEffect, useState } from 'react';

import {useLocation, BrowserRouter as Router, useParams} from 'react-router-dom';
import axios from 'axios';
function App() {
  const location = useLocation();
  const [reid, setReid] = useState(); 
  const [nickname, setNickname] = useState();
  useEffect(() => {
    setReid(new URLSearchParams(location.search.toString()).get('reid'))
    reid && axios.get(`/api/nickname/${reid}`).then((res) => setNickname(res.data)).catch()
  }, [])
  return (
    <div className="App">
      <Chat reid={reid} nickname={nickname}></Chat>
    </div>
  );
}

export default App;
