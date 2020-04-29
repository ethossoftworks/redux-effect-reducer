import React, { useRef, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { LimitersActions } from "../redux/limiters"
import { AppState } from "../redux/store"

export function Debounce(): JSX.Element {
    const dispatch = useDispatch()
    const state = useSelector((state: AppState) => state.limiters)
    const debounceMessagesRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (debounceMessagesRef.current) {
            debounceMessagesRef.current.scrollTop = debounceMessagesRef.current.scrollHeight
        }
    })

    return (
        <div className="section">
            <div className="section-title">Debounce</div>
            <div className="range-cont range-cont--primary">
                <div className="range-label">Debounced Slider</div>
                <input
                    type="range"
                    min="0"
                    max="1000"
                    step="10"
                    onChange={(e) => dispatch(LimitersActions.debounceSliderChanged(parseFloat(e.target.value)))}
                    value={state.debounceSliderValue}
                />
                <div className="range-value">{state.debounceSliderValue}</div>
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
                        value={state.debounceDelay}
                    />
                    <div className="range-bound-label range-max">1000</div>
                    <div className="range-value">{state.debounceDelay}ms</div>
                </div>
                <div className="range-cont">
                    <div className="range-label">Max Timeout</div>
                    <div className="range-bound-label range-min">Off</div>
                    <input
                        type="range"
                        min="0"
                        max="1000"
                        step="10"
                        onChange={(e) => dispatch(LimitersActions.debounceTimeoutChanged(parseFloat(e.target.value)))}
                        value={state.debounceTimeout}
                    />
                    <div className="range-bound-label range-max">1000</div>
                    <div className="range-value">
                        {state.debounceTimeout === 0 ? "Off" : `${state.debounceTimeout}ms`}
                    </div>
                </div>
            </div>
            <div className="message-cont" ref={debounceMessagesRef}>
                {state.debounceMessages.map((m) => (
                    <div key={m}>{m}</div>
                ))}
            </div>
        </div>
    )
}
