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
    if(new URLSearchParams(location.search.toString()).get('reid')) {
      setReid(new URLSearchParams(location.search.toString()).get('reid'))
      axios.get(`${process.env.SERVER_URL}/api/nickname/${reid}`).then((res) => setNickname(res.data)).catch()
    }
  })
  return (
    <div className="App">
      {reid && nickname ? (<Chat reid={reid} nickname={nickname}></Chat>) : null}
    </div>
  );
}

export default App;
