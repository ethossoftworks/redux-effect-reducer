import React, { useRef, useEffect } from "react"
import { LimitersActions } from "../redux/limiters"
import { useDispatch, useSelector } from "react-redux"
import { AppState } from "../redux/store"

export function Throttle(): JSX.Element {
    const dispatch = useDispatch()
    const state = useSelector((state: AppState) => state.limiters)
    const throttleMessagesRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (throttleMessagesRef.current) {
            throttleMessagesRef.current.scrollTop = throttleMessagesRef.current.scrollHeight
        }
    })

    return (
        <div className="section">
            <div className="section-title">Throttle</div>
            <div className="button-cont">
                <button onClick={() => dispatch(LimitersActions.throttleButtonClicked())}>
                    {state.isEmittingThrottleEvents ? "Stop" : "Start"}
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
                        value={state.throttleDelay}
                    />
                    <div className="range-bound-label range-max">1000</div>
                    <div className="range-value">{state.throttleDelay}ms</div>
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
                        value={state.throttleEmitInterval}
                    />
                    <div className="range-bound-label range-max">1000</div>
                    <div className="range-value">{state.throttleEmitInterval}ms</div>
                </div>
            </div>
            <div className="message-cont" ref={throttleMessagesRef}>
                {state.throttleMessages.map((m) => (
                    <div key={m}>{m}</div>
                ))}
            </div>
        </div>
    )
}
