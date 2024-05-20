import React, {useEffect, useState} from 'react';
import axios from 'axios';
import logo from './logo.svg';
import './Join.css';
import './Lobby.css';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import {browserHistory} from "./Join";

function Lobby() {
    const [stompClient, setStompClient] = useState(Stomp.over(new SockJS('http://127.0.0.1:8080/ws')));
    const [lobbyId, setLobbyId] = useState("");

    useEffect(() => {
        setLobbyId(localStorage.getItem("lobbyId"))

        stompClient.connect({}, function (frame) {
            stompClient.subscribe('/topic/game/' + localStorage.getItem('lobbyId'), function (message) {
                const receivedData = JSON.parse(message.body);
            });
        });

    }, []);

    const leaveGame = async () => {
        try {
            // if (stompClient) {
            //     stompClient.send("/app/game/leave" + lobbyId, {}, username);
            // }
            browserHistory.push({
                pathname: '/',
            });
            window.location.reload();

        } catch (error) {
            console.error('Error sending data: ', error);
        }
    };

    return (
        <div className="game">
        <header>
            <div>
                <button onClick={leaveGame}>Back</button>
            </div>
        </header>
        <div>
        <div>
            <h1>Game</h1>
        </div>
        </div>
        </div>
    );
}

export default Lobby;
