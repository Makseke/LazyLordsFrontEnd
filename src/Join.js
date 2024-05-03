import React, { useState } from 'react';
import axios from 'axios';
import logo from './logo.svg';
import './Join.css';
import { createBrowserHistory } from 'history';

export const browserHistory = createBrowserHistory();


function Join() {
  const [serverResponse, setServerResponse] = useState(null);

  const [username, setUsername] = useState('');
  const [lobbyId, setLobbyId] = useState('');
  const inputElements = document.querySelectorAll('input[type="text"]');

  inputElements.forEach((inputElement) => {
    inputElement.addEventListener('mouseover', () => {
      inputElement.style.transition = 'box-shadow 0.3s ease';
      inputElement.style.boxShadow = '0 0 100px rgba(51, 153, 255, 0.5)';
    });

    inputElement.addEventListener('mouseout', () => {
      inputElement.style.transition = 'box-shadow 0.3s ease';
      inputElement.style.boxShadow = 'none';
    });
  });

  const handleButtonClick = async () => {
    try {
      const response = await axios.post('http://127.0.0.1:8080/lazylords/join', {
        username: username,
        lobbyId: lobbyId
      });

      localStorage.setItem("lobbyId", response.data)
      console.log(response.data.lobbyId)
      browserHistory.push({
        pathname: '/lobby',
        state: { lobbyId: response.data }
      });
      window.location.reload();
    } catch (error) {
      setServerResponse("This user already exist in lobby")
      console.error('Error sending data: ', error);
    }
  };

  const handleUsernameInputChange = (event) => {
    setUsername(event.target.value);
  };

  const handleLobbyIdInputChange = (event) => {
    setLobbyId(event.target.value);
  };

  return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />

          <input type="text" value={username} onChange={handleUsernameInputChange} />
          <input type="text" value={lobbyId} onChange={handleLobbyIdInputChange} />
          <button onClick={handleButtonClick}>Send data</button>

          {serverResponse && <p>{serverResponse}</p>}
        </header>
      </div>
  );
}

export default Join;
