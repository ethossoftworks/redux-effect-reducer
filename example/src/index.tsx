import ReactDOM from "react-dom"
import React, { useRef, useEffect } from "react"
import { Provider, useDispatch, useSelector } from "react-redux"
import { store, AppState } from "./redux/store"
import { ApiRequestActions } from "./redux/apiRequest"
import { CountdownActions } from "./redux/countdown"
import { WebSocketActions } from "./redux/websocket"
import { LimitersActions } from "./redux/limiters"

ReactDOM.render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById("root")
)

export function App() {
    const dispatch = useDispatch()
    const state = useSelector((state: AppState) => state)
    const throttleMessagesRef = useRef(null)
    const debounceMessagesRef = useRef(null)

    useEffect(() => {
        ;(throttleMessagesRef.current as any).scrollTop = (throttleMessagesRef.current as any).scrollHeight
        ;(debounceMessagesRef.current as any).scrollTop = (debounceMessagesRef.current as any).scrollHeight
    })

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
            <div className="section">
                <div className="section-title">Debounce</div>
                <div className="button-cont">
                    <button onClick={() => dispatch(LimitersActions.debounceButtonClicked())}>Click</button>
                </div>
                <div className="button-cont">
                    <div className="range-cont">
                        <div className="range-label">Debounce Delay</div>
                        <div className="range-bound-label range-min">100</div>
                        <input
                            type="range"
                            min="100"
                            max="1000"
                            step="10"
                            onChange={(e) => dispatch(LimitersActions.debounceDelayChanged(parseFloat(e.target.value)))}
                            value={state.limiters.debounceDelay}
                        />
                        <div className="range-bound-label range-max">1000</div>
                        <div className="range-value">{state.limiters.debounceDelay}ms</div>
                    </div>
                    <div className="range-cont">
                        <div className="range-label">Max Timeout</div>
                        <div className="range-bound-label range-min">Off</div>
                        <input
                            type="range"
                            min="0"
                            max="1000"
                            step="10"
                            onChange={(e) =>
                                dispatch(LimitersActions.debounceTimeoutChanged(parseFloat(e.target.value)))
                            }
                            value={state.limiters.debounceTimeout}
                        />
                        <div className="range-bound-label range-max">1000</div>
                        <div className="range-value">
                            {state.limiters.debounceTimeout === 0 ? "Off" : `${state.limiters.debounceTimeout}ms`}
                        </div>
                    </div>
                </div>
                <div className="message-cont" ref={debounceMessagesRef}>
                    {state.limiters.debounceMessages.map((m) => (
                        <div key={m}>{m}</div>
                    ))}
                </div>
            </div>
            <div className="section">
                <div className="section-title">Throttle</div>
                <div className="button-cont">
                    <button onClick={() => dispatch(LimitersActions.throttleButtonClicked())}>
                        {state.limiters.isEmittingThrottleEvents ? "Stop" : "Start"}
                    </button>
                </div>
                <div className="button-cont">
                    <div className="range-cont">
                        <div className="range-label">Throttle Delay</div>
                        <div className="range-bound-label range-min">50</div>
                        <input
                            type="range"
                            min="50"
                            max="1000"
                            step="10"
                            onChange={(e) => dispatch(LimitersActions.throttleDelayChanged(parseFloat(e.target.value)))}
                            value={state.limiters.throttleDelay}
                        />
                        <div className="range-bound-label range-max">1000</div>
                        <div className="range-value">{state.limiters.throttleDelay}ms</div>
                    </div>
                    <div className="range-cont">
                        <div className="range-label">Emit Interval</div>
                        <div className="range-bound-label range-min">50</div>
                        <input
                            type="range"
                            min="50"
                            max="1000"
                            step="10"
                            onChange={(e) =>
                                dispatch(LimitersActions.throttleEmitIntervalChanged(parseFloat(e.target.value)))
                            }
                            value={state.limiters.throttleEmitInterval}
                        />
                        <div className="range-bound-label range-max">1000</div>
                        <div className="range-value">{state.limiters.throttleEmitInterval}ms</div>
                    </div>
                </div>
                <div className="message-cont" ref={throttleMessagesRef}>
                    {state.limiters.throttleMessages.map((m) => (
                        <div key={m}>{m}</div>
                    ))}
                </div>
            </div>
        </div>
    )
}
