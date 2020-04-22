import { ReduxActionCreator } from "../util"
import { Effect, interval, dispatch, cancel } from "@ethossoftworks/redux-effect-reducer/effects"

const COUNTDOWN_CANCEL = "countdown"
export type CountdownState = number
type CountdownActions = ReduxActionCreator<typeof CountdownActions>

export const CountdownActions = {
    countdownStarted: () => ({ type: "COUNTDOWN_STARTED" } as const),
    countdownPaused: () => ({ type: "COUNTDOWN_PAUSE" } as const),
    countdownReset: () => ({ type: "COUNTDOWN_RESET" } as const),
    countdownSecondElapsed: () => ({ type: "COUNTDOWN_SECOND_ELAPSED" } as const),
}

export function countdownReducer(state: CountdownState = 10, action: CountdownActions): CountdownState {
    switch (action.type) {
        case "COUNTDOWN_SECOND_ELAPSED":
            return state - 1
        case "COUNTDOWN_RESET":
            return 10
        default:
            return state
    }
}

export function countdownEffectReducer(state: CountdownState, action: CountdownActions): Effect | void {
    switch (action.type) {
        case "COUNTDOWN_STARTED":
            return interval(dispatch(CountdownActions.countdownSecondElapsed()), 1000, {
                cancelId: COUNTDOWN_CANCEL,
                runAtStart: false,
            })
        case "COUNTDOWN_PAUSE":
        case "COUNTDOWN_RESET":
            return cancel(COUNTDOWN_CANCEL)
        case "COUNTDOWN_SECOND_ELAPSED":
            return state === 0 ? cancel(COUNTDOWN_CANCEL) : undefined
    }
}
