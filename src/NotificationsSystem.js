import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './Notifications.css';
import axios from "axios";
import config from "./constans.json";

export const NotificationsSystem = () => {
    const [notifications, setNotifications] = useState([]);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const panelRef = useRef(null);
    const toggleRef = useRef(null);
    const tempNotificationsRef = useRef([]);

    const addNotification = (notification) => {
        const newNotification = {
            ...notification,
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString()
        };

        setNotifications(prev => [...prev, newNotification]);

        if (!isPanelOpen) {
            const tempNotification = { ...newNotification, tempId: Date.now() };
            tempNotificationsRef.current = [...tempNotificationsRef.current, tempNotification];

            setTimeout(() => {
                tempNotificationsRef.current = tempNotificationsRef.current.filter(n => n.tempId !== tempNotification.tempId);
            }, 5000);
        }
    };

    const togglePanel = () => {
        setIsPanelOpen(!isPanelOpen);
    };

    useEffect(() => {
        if (panelRef.current) {
            gsap.to(panelRef.current, {
                x: isPanelOpen ? 0 : '100%',
                duration: 0.5,
                ease: "power3.inOut"
            });
        }
    }, [isPanelOpen]);

    const NotificationItem = ({ notification, isTemp = false }) => {
        const itemRef = useRef(null);

        useEffect(() => {

            // if (itemRef.current) {
            //     gsap.from(itemRef.current, {
            //         x: 200,
            //         rotation: -90,
            //         opacity: 0,
            //         duration: 0.7,
            //         ease: "back.out(1.7)",
            //         onComplete: () => {
            //             gsap.to(itemRef.current, {
            //                 y: -10,
            //                 duration: 0.3,
            //                 yoyo: true,
            //                 repeat: 1,
            //                 ease: "sine.inOut"
            //             });
            //         }
            //     });
            // }

            return () => {
                if (itemRef.current) {
                    gsap.killTweensOf(itemRef.current);
                }
            };
        }, []);

        return (
            <div
                ref={itemRef}
                className={`notification-item ${isTemp ? 'temp' : ''} ${notification.type || 'text'}`}
            >
                {notification.type === 'card' ? (
                    <div className="notification-card">
                        <div className="notification-header">
                            <span className="notification-sender">{notification.sender}</span>
                            <span className="notification-time">{notification.timestamp}</span>
                        </div>
                        <div className="card-preview">
                            <div className="card-effect">{notification.card.events.join(', ')}</div>
                            <img
                                src={notification.image}
                                alt={notification.card.name}
                                className="card-image"
                            />
                            <div className="card-name">{notification.card.name}</div>
                            <div className="card-cost">{notification.card.cost}</div>
                        </div>
                        <div className="notification-message">{notification.message}</div>
                    </div>
                ) : (
                    <>
                        <div className="notification-header">
                            <span className="notification-sender">{notification.sender}</span>
                            <span className="notification-time">{notification.timestamp}</span>
                        </div>
                        <div className="notification-message">{notification.message}</div>
                    </>
                )}
            </div>
        );
    };

    const Notifications = () => {
        return (
            <>
            {/* Боковая панель */}
                <div
                    ref={panelRef}
                    className="notifications-panel"
                >
                    <div className="notifications-header">
                        <h3>История событий</h3>
                    </div>
                    <div className="notifications-list">
                        {notifications.map(notification => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                            />
                        ))}
                    </div>
                </div>

                {/* Кнопка переключения панели */}
                <div
                    ref={toggleRef}
                    className="panel-toggle"
                    onClick={togglePanel}
                >
                    {isPanelOpen ? '✕' : '≡'}
                </div>

                {/* Временные уведомления (только когда панель закрыта) */}
                {!isPanelOpen && (
                    <div className="temp-notifications-container">
                        {tempNotificationsRef.current.map(notification => (
                            <NotificationItem
                                key={notification.tempId}
                                notification={notification}
                                isTemp={true}
                            />
                        ))}
                    </div>
                )}
            </>
        );
    };

    return { Notifications, addNotification };
};