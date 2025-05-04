import React, { useEffect, useState, useRef } from 'react';
import './Join.css';
import './Lobby.css';
import './header.css';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { browserHistory } from "./Join";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCentSign, faCircleQuestion, faDice, faLeftLong } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import { gsap } from "gsap";
import { NotificationsSystem } from './NotificationsSystem';

function Lobby() {
    const config = require('./constans.json');
    const [stompClient, setStompClient] = useState(Stomp.over(new SockJS(`http://${config.serverIp}:8081/ws`)));
    const [lobbyId, setLobbyId] = useState(sessionStorage.getItem('lobbyId'));
    const [activePlayer, setActivePlayer] = useState(sessionStorage.getItem("name"));
    const [hostName, setHostName] = useState("Host");
    const [market, setMarket] = useState([]);
    const [table, setTable] = useState([]);
    const [players, setPlayers] = useState([]);
    const [player] = useState(sessionStorage.getItem("name"));
    const [isMarket, setIsMarket] = useState(true);
    const [cardImages, setCardImages] = useState({});

    const [isRolled, setIsRolled] = useState(false);

    const [isRollButtonActive, setRollButtonActive] = useState(false);

    const cardRefs = useRef([]);
    const marketGridRef = useRef(null);

    const { Notifications, addNotification } = NotificationsSystem();

    useEffect(() => {
        gsap.from(cardRefs.current, {
            y: 50,
            opacity: 0,
            duration: 0.5,
            stagger: 0.1,
            ease: "power2.out",
            onComplete: () => {
                gsap.set(cardRefs.current, { opacity: 1 });
            }
        });
    }, [table]);

    const handleCardHover = (index, isHover, e) => {
        const card = cardRefs.current[index];
        if (!card) return;

        if (isHover) {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const normalizedX = (x / rect.width) * 2 - 1;
            const normalizedY = (y / rect.height) * 2 - 1;

            gsap.to(card, {
                scale: 1.1,
                y: -30,
                zIndex: 999,
                boxShadow: "0 15px 30px rgba(0,0,0,0.3)",
                rotationY: normalizedX * 10,
                rotationX: normalizedY * 5,
                transformPerspective: 1000,
                duration: 0.4,
                ease: "power2.out",
                overwrite: true
            });

        } else {
            gsap.to(card, {
                scale: 1,
                y: 0,
                zIndex: 1,
                boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                rotationY: 0,
                rotationX: 0,
                duration: 0.4,
                ease: "power2.inOut",
                overwrite: true
            });

            gsap.to(card.querySelectorAll('.effect, .description, .cost, .card-image'), {
                scale: 1,
                duration: 0.4,
                ease: "power2.inOut"
            });
        }
    };

    useEffect(() => {
        stompClient.connect({}, function (frame) {
            stompClient.subscribe(`/topic/game/${lobbyId}`, function (message) {
                const receivedData = JSON.parse(message.body);
                let eventType = "connect"

                try {
                    eventType = receivedData.headers.event[0];
                } catch (error) {
                    eventType = message.headers.event;
                }

                if (eventType === 'roll') {
                    console.log("ROLL EVENT");
                    setPlayers(receivedData.body.players)
                    setTimeout(rollTrue)

                    addNotification({
                        sender: activePlayer,
                        message: `Бросил кубик и выпало: ${receivedData.body.rollResult}`,
                        type: 'text'
                    });
                } else if (eventType === 'skip') {
                    console.log("SKIP EVENT")
                    setActivePlayer(receivedData.body.activePlayer)
                    setTimeout(rollFalse)
                } else if (eventType === 'buy') {
                    console.log("BUY EVENT")
                    setActivePlayer(receivedData.body.activePlayer)
                    setPlayers(receivedData.body.players)
                    setMarket(receivedData.body.market)
                    setTable(receivedData.body.market)
                    setTimeout(rollFalse)

                    const boughtCard = receivedData.body.boughtCard

                    if (boughtCard) {
                        addNotification({
                            sender: activePlayer,
                            message: 'Купил карту',
                            type: 'card',
                            card: {
                                ...boughtCard,
                                image: cardImages[boughtCard.imageId] || boughtCard.imageId
                            }
                        })
                    }
                } else if (eventType === 'connect') {
                    console.log("CONNECT EVENT")
                    setHostName(receivedData.hostName)
                    setPlayers(receivedData.players)
                    setMarket(receivedData.market)
                    setTable(receivedData.market)
                    setActivePlayer(receivedData.activePlayer)
                    setIsRolled(receivedData.isRolled)
                }

            });
        });

    }, []);

    useEffect(() => {
        const loadImages = async () => {
            const images = {};
            for (const card of table) {
                if (!cardImages[card.imageId]) {
                    images[card.imageId] = await fetchCardImage(card.imageId);
                }
            }
            setCardImages(prev => ({...prev, ...images}));
        };

        if (table.length > 0) {
            loadImages();
        }
    }, [table]);

    const rollFalse = async () => {
        console.log("ROLLED FALSE")
        setIsRolled(false)
    }

    const rollTrue = async () => {
        console.log("ROLLED TRUE")
        setIsRolled(true)
    }

    const getPlayerCards = async (playerName) => {
        try {
            const response = await axios.get(`http://${config.serverIp}:8081/game/` + lobbyId + "/" + playerName);
            setIsMarket(false)
            console.log(response.data.establishmentCards)
            setTable(response.data.establishmentCards)

        } catch (error) {
            console.error('Error sending data: ', error);
        }
    }

    const leaveGame = async () => {
        try {
            // if (stompClient) {
            //     stompClient.send("/app/game/leave" + lobbyId, {}, username);
            // }
            sessionStorage.removeItem("lobbyId");
            sessionStorage.removeItem("name");
            browserHistory.push({
                pathname: '/',
            });
            window.location.reload();

        } catch (error) {
            console.error('Error sending data: ', error);
        }
    };

    const showMarket = async () => {
        console.log("SHOW MARKET CARDS")
        setIsMarket(true)
        setTable(market)
    }

    const roll = async () => {
        console.log("ROLL")
        stompClient.send(`/app/game/${lobbyId}/roll/1`, {}, player);
    }

    const skip = async () => {
        console.log("SKIP")
        stompClient.send(`/app/game/${lobbyId}/skip`, {}, lobbyId);
    }

    const buy = async (cardId) => {
        console.log("BUY", cardId);
        stompClient.send(`/app/game/${lobbyId}/buy/${cardId}`, {}, player);
    };

    const canBuyCard = (cardCost) => {
        let playerDetails = players.find(playerDetailss => playerDetailss.playerName === activePlayer)
        return isMarket && activePlayer === player && cardCost <= playerDetails.coins;
    };

    const handleBuy = (cardId) => {
        if (isRolled && activePlayer === player && canBuyCard(table.find(card => card.id === cardId)?.cost)) {
            buy(cardId);
        }
    };

    const getDisplayEvents = (events) => {
        if (!events || events.length === 0) return '';

        if (events.length === 1) {
            return events[0].toString();
        }

        let isConsecutive = true;
        for (let i = 1; i < events.length; i++) {
            if (events[i] !== events[i - 1] + 1) {
                isConsecutive = false;
                break;
            }
        }

        if (isConsecutive) {
            return `${events[0]}-${events[events.length - 1]}`;
        } else {
            return events.join(', ');
        }
    };

    const fetchCardImage = async (imageId) => {
        try {
            const response = await axios.get(`http://${config.serverIp}:8081/image/${imageId}`, {
                responseType: 'arraybuffer'
            });
            const base64String = btoa(
                new Uint8Array(response.data)
                    .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            return `data:image/png;base64,${base64String}`;
        } catch (error) {
            console.error('Error loading card image:', error);
            return null; // или URL заглушки
        }
    };

    return (
        <div className="game">
            <header>
                <div className="left_content_block">
                    <button className="header_button" onClick={leaveGame}><FontAwesomeIcon icon={faLeftLong}
                                                                                           className="leave_icon"/>Выйти
                    </button>
                    {hostName && <h1>Игра {hostName}</h1>}
                </div>
                <div className="right_content_block">
                    <button className="info_button">Помощь<FontAwesomeIcon icon={faCircleQuestion}
                                                                           className="info_icon"/></button>

                </div>
            </header>
            <div className="under-header">
                <div className="menu-buttons">
                    <button className="marlet-button" onClick={showMarket}>Магазин</button>
                </div>
            </div>
            <div className="game-container">
                <div className="players-container">
                    <div className="header-container">
                        <div className="name-header">Игроки</div>
                        <div className="coins-header"><FontAwesomeIcon icon={faCentSign}/></div>
                    </div>
                    {players.map((player, index) => (
                        <li key={index}>
                            <div className="player-container">
                                <div
                                    className={`name-field ${player.playerName === activePlayer ? 'active' : ''}`}
                                    onClick={() => getPlayerCards(player.playerName)}>{player.playerName}</div>
                                <div className="coins-field">{player.coins}</div>
                            </div>
                        </li>
                    ))}
                </div>
                <div className="market-grid" ref={marketGridRef}>
                    {table.map((card, index) => {
                        const isAffordable = canBuyCard(card.cost);
                        return (
                            <div
                                ref={el => cardRefs.current[index] = el}
                                className={`card ${isAffordable && activePlayer === player && isRolled ? 'affordable' : ''}`}
                                key={card.id}
                                onClick={() => handleBuy(card.id)}
                                onMouseEnter={(e) => handleCardHover(index, true, e)}
                                onMouseLeave={() => handleCardHover(index, false)}
                                onMouseMove={(e) => {
                                    if (cardRefs.current[index] === e.currentTarget) {
                                        handleCardHover(index, true, e);
                                    }
                                }}
                            >
                                {card.count > 1 && (
                                    <div className="card-count-badge">
                                        {card.count}
                                    </div>
                                )}
                                <div className="effect">{getDisplayEvents(card.events)}</div>
                                <img
                                    src={cardImages[card.imageId] || card.imageId}
                                    alt={"OOOPS"}
                                    className="card-image"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'path/to/placeholder.png';
                                    }}
                                />
                                <div className="name">{card.name}</div>
                                <div className="description">{card.description}</div>
                                <div className="cost">{card.cost}</div>
                            </div>
                        );
                    })}
                </div>
                {
                    activePlayer === player && !isRolled && (
                        <>
                            <div
                                className={`roll_button ${!isRollButtonActive ? 'roll_button_active' : ''}`}
                                onClick={roll}
                            >
                                Кинуть кубик <FontAwesomeIcon className="dice-icon" icon={faDice}/>
                            </div>
                        </>
                    )
                }
                {
                    activePlayer === player && isRolled && (
                        <>
                            <div
                                className={`skip_button ${!isRollButtonActive ? 'skip_button_active' : ''}`}
                                onClick={skip}
                            >
                                Пропустить ход
                            </div>
                        </>
                    )
                }
            </div>
            <Notifications />
        </div>
    );
}

export default Lobby;
