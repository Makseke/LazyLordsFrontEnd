import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Lobby() {
    const [lobbyData, setLobbyData] = useState(null);

    useEffect(() => {
        const intervalId = setInterval(() => {
            updateLobby();
        }, 5000);

        // Вызываем updateLobby при первой загрузке страницы
        updateLobby();

        // Очищаем интервал при разmonting компонента
        return () => clearInterval(intervalId);
    }, []);

    const updateLobby = async () => {
        try {
            const response = await axios.get('http://127.0.0.1:8080/lazylords/lobby', {
                params: {
                    lobbyId: localStorage.getItem('lobbyId')
                }
            });
            setLobbyData(response.data);
            console.log("UPDATED")
        } catch (error) {
            console.error('Error sending data: ', error);
        }
    };

    return (
        <div>
            <h1>Lobby</h1>
            <p>Lobby ID: {localStorage.getItem('lobbyId')}</p>
            {lobbyData && (
                <div>
                    <h2>Players:</h2>
                    <ul>
                        {lobbyData.players.map((player, index) => (
                            <li key={index}>
                                {player.playerName} ({player.playerType})
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default Lobby;
