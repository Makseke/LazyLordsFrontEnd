import React, {useEffect, useState, useCallback} from 'react';
import axios from 'axios';
import logo from './logo.svg';
import './Join.css';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { createBrowserHistory } from 'history';

export const browserHistory = createBrowserHistory();

function Join() {
    const [serverResponse, setServerResponse] = useState(null);
    const [players, setPlayers] = useState([]);
    const [inLobby, setInLobby] = useState(false);
    const [username, setUsername] = useState('');
    const [lobbyId, setLobbyId] = useState('');
    const [connectedLobbyId, setConnectedLobbyId] = useState('');
    const [stompClient, setStompClient] = useState(null);
    const [connectionTries, setConnectionTries] = useState(0);

    const connectWebSocket = useCallback(() => {
        const socket = new SockJS('http://127.0.0.1:8080/ws');
        const client = Stomp.over(socket);

        client.connect({}, function(frame) {
            setStompClient(client);
            setConnectionTries(0); // Reset the connection tries on successful connection
        }, function(error) {
            console.error('WebSocket connection error:', error);
            if (connectionTries < 3) {
                setTimeout(() => {
                    setConnectionTries(prev => prev + 1);
                    connectWebSocket();
                }, 5000); // Retry connection after 5 seconds
            } else {
                setServerResponse('Could not connect to WebSocket server. Please try again later.');
            }
        });

        socket.onclose = function() {
            console.warn('WebSocket connection closed. Attempting to reconnect...');
            if (connectionTries < 3) {
                setTimeout(() => {
                    setConnectionTries(prev => prev + 1);
                    connectWebSocket();
                }, 5000); // Retry connection after 5 seconds
            }
        };
    }, [connectionTries]);

    useEffect(() => {
        connectWebSocket();
    }, [connectWebSocket]);

    const handleButtonClick = async () => {
        try {
            const response = await axios.post('http://127.0.0.1:8080/join', {
                username: username,
                lobbyId: lobbyId
            });

            let conLobbyId = response.data;
            localStorage.setItem("lobbyId", conLobbyId);
            localStorage.setItem("name", username);
            setConnectedLobbyId(response.data);
            console.log('Received response: ', conLobbyId);

            stompClient.subscribe('/topic/lobby/' + conLobbyId, function(message) {
                const receivedData = JSON.parse(message.body);
                const eventType = receivedData.headers.type[0];
                if (eventType === 'update' || eventType === 'leave') {
                    setPlayers(receivedData.body.players);
                } else if (eventType === 'start') {
                    stompClient.unsubscribe('/topic/lobby/' + connectedLobbyId, function(message) {});
                    browserHistory.push({
                        pathname: '/lobby',
                        state: { lobbyId: connectedLobbyId }
                    });
                    window.location.reload();
                }
            });

            if (stompClient) {
                stompClient.send("/app/join/" + conLobbyId, {});
            }

            setInLobby(true);
        } catch (error) {
            setServerResponse("This user already exists in lobby");
            console.error('Error sending data: ', error);
        }
    };

    const leaveLobby = async () => {
        try {
            if (stompClient) {
                stompClient.send("/app/leave/" + connectedLobbyId, {}, username);
            }
            stompClient.unsubscribe('/topic/lobby/' + connectedLobbyId, function(message) {});
            setInLobby(false);
        } catch (error) {
            setServerResponse("Error leaving the lobby");
            console.error('Error sending data: ', error);
        }
    };

    const startGame = async () => {
        try {
            if (stompClient) {
                stompClient.send("/app/start/" + connectedLobbyId, {}, username);
            }
            stompClient.unsubscribe('/topic/lobby/' + connectedLobbyId, function(message) {});
            browserHistory.push({
                pathname: '/lobby',
                state: { lobbyId: connectedLobbyId }
            });
            window.location.reload();
        } catch (error) {
            setServerResponse("Error starting the game");
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
            <img src={logo} className="App-logo" alt="logo" />
            {inLobby === false && (
                <div>
                    <input type="text" value={username} onChange={handleUsernameInputChange} />
                    <input type="text" value={lobbyId} onChange={handleLobbyIdInputChange} />
                    <button onClick={handleButtonClick}>Join lobby</button>
                </div>
            )}
            {inLobby === true && (
                <div>
                    {connectedLobbyId && <p>Lobby ID: {connectedLobbyId}</p>}
                    {serverResponse && <p>{serverResponse}</p>}
                    <h3>Players: {players.length}</h3>
                    <ul>
                        {players.map((player, index) => (
                            <li key={index}>
                                {player.playerName} ({player.playerType})
                            </li>
                        ))}
                    </ul>
                    <button onClick={leaveLobby}>Leave lobby</button>
                    {lobbyId === "" && <button onClick={startGame}>Start game</button>}
                </div>
            )}
        </div>
    );
}

export default Join;
