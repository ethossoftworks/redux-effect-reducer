import { useDispatch, useSelector } from "react-redux"
import { AppState } from "../redux/store"
import React from "react"
import { WebSocketActions } from "../redux/websocket"

export function WebSocket(): JSX.Element {
    const dispatch = useDispatch()
    const state = useSelector((state: AppState) => state.webSocket)

    return (
        <div className="section">
            <div className="section-title">WebSocket</div>
            <div className="button-cont">
                <button onClick={() => dispatch(WebSocketActions.openSocket())}>Connect</button>
                <button onClick={() => dispatch(WebSocketActions.sendMessage())}>Send Message</button>
                <button onClick={() => dispatch(WebSocketActions.closeSocket())}>Disconnect</button>
            </div>
            <div>Status: {state.connectionStatus}</div>
            <div>Messages:</div>
            <div className="message-cont">
                {state.messages.map((post, i) => (
                    <div key={i} className="socket-message">
                        {post}
                    </div>
                ))}
            </div>
        </div>
    )
}
