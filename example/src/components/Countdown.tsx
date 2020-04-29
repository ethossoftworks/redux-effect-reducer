import React from "react"
import { CountdownActions } from "../redux/countdown"
import { useDispatch, useSelector } from "react-redux"
import { AppState } from "../redux/store"

export function Countdown(): JSX.Element {
    const dispatch = useDispatch()
    const state = useSelector((state: AppState) => state.countdown)

    return (
        <div className="section">
            <div className="section-title">Countdown</div>
            <div className="button-cont">
                <button onClick={() => dispatch(CountdownActions.countdownStarted())}>Start Countdown</button>
                <button onClick={() => dispatch(CountdownActions.countdownPaused())}>Pause Countdown</button>
                <button onClick={() => dispatch(CountdownActions.countdownReset())}>Reset Countdown</button>
            </div>
            <div>{state}</div>
        </div>
    )
}
