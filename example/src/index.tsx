import ReactDOM from "react-dom"
import React from "react"
import { Provider, useDispatch, useSelector } from "react-redux"
import { store, AppState } from "./redux/store"
import { ApiRequestActions } from "./redux/apiRequest"
import { CountdownActions } from "./redux/countdown"
import { WebSocketActions } from "./redux/websocket"

ReactDOM.render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById("root")
)

export function App() {
    const dispatch = useDispatch()
    const state = useSelector((state: AppState) => state)

    return (
        <div className="section-cont">
            <div className="section">
                <div className="section-title">API Request</div>
                <div className="button-cont">
                    <button onClick={() => dispatch(ApiRequestActions.loadPosts())}>Load Posts</button>
                </div>

                <div> {state.apiRequest.isLoading ? "Loading..." : null}</div>
                <ol>
                    {state.apiRequest.posts.map((post, i) => (
                        <li key={i} className="post-title">
                            {post}
                        </li>
                    ))}
                </ol>
            </div>
            <div className="section">
                <div className="section-title">Countdown</div>
                <div className="button-cont">
                    <button onClick={() => dispatch(CountdownActions.countdownStarted())}>Start Countdown</button>
                    <button onClick={() => dispatch(CountdownActions.countdownPaused())}>Pause Countdown</button>
                    <button onClick={() => dispatch(CountdownActions.countdownReset())}>Reset Countdown</button>
                </div>
                <div>{state.countdown}</div>
            </div>
            <div className="section">
                <div className="section-title">WebSocket</div>
                <div className="button-cont">
                    <button onClick={() => dispatch(WebSocketActions.openSocket())}>Connect</button>
                    <button onClick={() => dispatch(WebSocketActions.sendMessage())}>Send Message</button>
                    <button onClick={() => dispatch(WebSocketActions.closeSocket())}>Disconnect</button>
                </div>
                <div>Status: {state.webSocket.connectionStatus}</div>
                <div>Messages:</div>
                <div className="message-cont">
                    {state.webSocket.messages.map((post, i) => (
                        <div key={i} className="socket-message">
                            {post}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
