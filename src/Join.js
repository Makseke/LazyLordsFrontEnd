import React, {useEffect, useState, useCallback} from 'react';
import axios from 'axios';
import logo from './logo.png';
import background_image from './bgimage.png';
import background_mask from './mask.svg';
import './Join.css';
import './header.css';
import './error.css';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import {createBrowserHistory} from 'history';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faArrowsRotate, faCircleQuestion, faCopy, faLeftLong} from '@fortawesome/free-solid-svg-icons';

export const browserHistory = createBrowserHistory();

function Join() {
    const [players, setPlayers] = useState([]);
    const [inLobby, setInLobby] = useState(false);
    const [username, setUsername] = useState('');
    const [hostName, setHostName] = useState('');
    const [lobbyId, setLobbyId] = useState('');
    const [connectedLobbyId, setConnectedLobbyId] = useState('');

    const [stompClient, setStompClient] = useState(null);
    const [connectionTries, setConnectionTries] = useState(0);

    const [lobbySize, setLobbySize] = useState(5);
    const [avatar, setAvatar] = useState(null);
    const [error, setError] = useState(null);

    let avatarId = Math.floor(Math.random() * (3 - 1 + 1)) + 1;

    const config = require('./constans.json');

    const connectWebSocket = useCallback(() => {
        console.log('CONNECT WEB CONNECT');
        const socket = new SockJS(`http://${config.serverIp}:8081/ws`);
        const client = Stomp.over(socket);

        client.connect({}, () => {
            setStompClient(client);
            setConnectionTries(0);
        }, (error) => {
            console.error('WebSocket connection error:', error);
            scheduleReconnect();
        });

        socket.onclose = () => {
            console.warn('WebSocket connection closed. Attempting to reconnect...');
            scheduleReconnect();
        };
    }, []);

    const scheduleReconnect = useCallback(() => {
        if (connectionTries < 3) {
            setTimeout(() => {
                setConnectionTries(prev => prev + 1);
                connectWebSocket();
            }, 5000);
        }
    }, [connectionTries, connectWebSocket]);

    useEffect(() => {
        connectWebSocket();
        updateAvatar();

        return () => {
            if (stompClient) {
                stompClient.disconnect();
            }
        };
    }, []);

    const handleError = (error) => {
        setError(error.response.data.message);
        setTimeout(() => {
            setError(null);
        }, 5000);
        console.log(error);
    };

    const handleButtonClick = async () => {
        if (!stompClient) {
            console.error('WebSocket client not connected!');
            return;
        }

        try {
            const response = await axios.post(`http://${config.serverIp}:8081/join`, {
                username,
                lobbyId,
                avatarId
            });

            const conLobbyId = response.data;
            sessionStorage.setItem("lobbyId", conLobbyId);
            sessionStorage.setItem("name", username);
            setConnectedLobbyId(conLobbyId);


            stompClient.subscribe(`/topic/lobby/${conLobbyId}`, (message) => {
                const receivedData = JSON.parse(message.body);
                const eventType = receivedData.headers.event[0];
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

            stompClient.send(`/app/join/${conLobbyId}`, {});
            setInLobby(true);
        } catch (error) {
            handleError(error);
        }
    };

    const leaveLobby = async () => {
        try {
            if (stompClient) {
                stompClient.send(`/app/leave/${connectedLobbyId}`, {}, username);
                stompClient.unsubscribe(`/topic/lobby/${connectedLobbyId}`);
            }
            sessionStorage.removeItem("lobbyId");
            sessionStorage.removeItem("name");
            setInLobby(false);
        } catch (error) {
            handleError(error);
        }
    };

    const startGame = async () => {
        try {
            if (stompClient) {
                stompClient.send(`/app/start/${connectedLobbyId}`, {}, username);
                stompClient.unsubscribe(`/topic/lobby/${connectedLobbyId}`);
                browserHistory.push({
                    pathname: '/lobby',
                    state: {lobbyId: connectedLobbyId}
                });
                window.location.reload();
            }
        } catch (error) {
            handleError(error);
        }
    };

    const copyLobbyId = () => {
        const textarea = document.createElement('textarea');
        textarea.value = connectedLobbyId;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    };

    const updateAvatarId = async () => {
        let newId = avatarId;
        do {
            newId = Math.floor(Math.random() * (3 - 1 + 1)) + 1
        } while (newId === avatarId);

        avatarId = newId;
        await updateAvatar();
    };

    const updateAvatar = async () => {
        await axios.get(`http://${config.serverIp}:8081/image/avatar_${avatarId}`, {
            responseType: 'arraybuffer'
        }).then(response => {
            const base64String = btoa(
                new Uint8Array(response.data)
                    .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            setAvatar(`data:image/png;base64,${base64String}`);
        })
            .catch(error => {
                console.log(error);
            });
    };

    const handleInputChange = (setter) => (event) => {
        setter(event.target.value);
    };

    return (
        <div className="App">
            <header>
                <div className="left_content_block">
                    {inLobby &&
                        <button className="header_button" onClick={leaveLobby}><FontAwesomeIcon icon={faLeftLong}
                                                                                                className="leave_icon"/>Назад
                        </button>}
                    {inLobby && <h1>Комната {hostName}</h1>}
                </div>
                <div className="right_content_block">
                    <button className="info_button">Помощь <FontAwesomeIcon icon={faCircleQuestion}
                                                                            className="info_icon"/></button>
                </div>
            </header>
            <div className="App-content">
                <img src={logo} className="App-logo" alt="logo"/>
                {!inLobby ? (
                    <div className="join_screen">
                        <div className="user_info_block">
                            <div className="avatar_block">
                                <img src={avatar} alt="Avatar" className="avatar_image"/>
                                <div className="avatar_bg"></div>
                                <div className="update_avatar_button" onClick={updateAvatarId}><FontAwesomeIcon
                                    icon={faArrowsRotate} className="update_icon"/></div>
                            </div>
                            <div className="player_name_field">
                                <p>Имя игрока</p>
                                <input type="text" value={username} placeholder="Имя игрока"
                                       onChange={handleInputChange(setUsername)}/>
                            </div>
                        </div>

                        <input type="text" value={lobbyId} placeholder="ID комнаты"
                               onChange={handleInputChange(setLobbyId)}/>
                        <button onClick={handleButtonClick}>Начать</button>
                    </div>
                ) : (
                    <div>
                        {connectedLobbyId && (
                            <div className="lobby_id_body">
                                <p>ID комнаты</p>
                                <p className="lobby_id_field" onClick={copyLobbyId}>{connectedLobbyId} <FontAwesomeIcon
                                    icon={faCopy}/></p>
                            </div>
                        )}
                        <h3>Игроки</h3>
                        <ul>
                            {players.map((player, index) => (
                                <li key={index}>
                                    <div className="player-field">{player.playerName} ({player.playerType})</div>
                                </li>
                            ))}
                            {players.length < lobbySize && Array.from({length: lobbySize - players.length}, (_, i) => (
                                <li key={i}>
                                    <div className="player-field invite-friend">Пригласить друга</div>
                                </li>
                            ))}
                        </ul>
                        {lobbyId === "" && <button onClick={startGame}>Начать игру</button>}
                    </div>
                )}
            </div>
            <img src={background_mask} alt={"BG MASK"} className="App-mask"/>
            <img src={background_image} alt={"BG IMAGE"} className="App-bgimage"/>
            {error && (
                <div className="error-message">
                    <p>{error}</p>
                </div>
            )}
        </div>
    );
}

export default Join;
