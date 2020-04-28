import { ReduxActionCreator } from "../util"
import {
    Effect,
    dispatch,
    debounce,
    interval,
    sequence,
    cancel,
    throttle,
    run,
} from "@ethossoftworks/redux-effect-reducer/effects"

export type LimitersState = {
    debounceDelay: number
    debounceTimeout: number
    debounceMessages: string[]
    throttleDelay: number
    throttleEmitInterval: number
    throttleMessages: string[]
    isEmittingThrottleEvents: boolean
}

const initialState: LimitersState = {
    debounceDelay: 500,
    debounceTimeout: 0,
    debounceMessages: [],
    throttleDelay: 500,
    throttleEmitInterval: 500,
    throttleMessages: [],
    isEmittingThrottleEvents: false,
}

type LimitersActions = ReduxActionCreator<typeof LimitersActions>

export const LimitersActions = {
    debounceMessage: () => ({ type: "DEBOUNCE_MESSAGE" } as const),
    debounceDelayChanged: (value: number) => ({ type: "DEBOUNCE_DELAY_CHANGED", value } as const),
    debounceTimeoutChanged: (value: number) => ({ type: "DEBOUNCE_TIMEOUT_CHANGED", value } as const),
    debounceButtonClicked: () => ({ type: "DEBOUNCE_BUTTON_CLICKED" } as const),
    throttleDelayChanged: (value: number) => ({ type: "THROTTLE_DELAY_CHANGED", value } as const),
    throttleEmitIntervalChanged: (value: number) => ({ type: "THROTTLE_EMIT_INTERVAL_CHANGED", value } as const),
    throttleButtonClicked: () => ({ type: "THROTTLE_BUTTON_CLICKED" } as const),
    throttleEventEmitted: () => ({ type: "THROTTLE_EVENT_EMITTED" } as const),
    throttleMessage: () => ({ type: "THROTTLE_MESSAGE" } as const),
}

export function limitersReducer(state: LimitersState = initialState, action: LimitersActions): LimitersState {
    switch (action.type) {
        case "DEBOUNCE_MESSAGE":
            return { ...state, debounceMessages: state.debounceMessages.concat([`Run: ${performance.now()}`]) }
        case "DEBOUNCE_DELAY_CHANGED":
            return { ...state, debounceDelay: action.value }
        case "DEBOUNCE_TIMEOUT_CHANGED":
            return { ...state, debounceTimeout: action.value }
        case "THROTTLE_DELAY_CHANGED":
            return { ...state, throttleDelay: action.value }
        case "THROTTLE_EMIT_INTERVAL_CHANGED":
            return { ...state, throttleEmitInterval: action.value }
        case "THROTTLE_BUTTON_CLICKED":
            return { ...state, isEmittingThrottleEvents: !state.isEmittingThrottleEvents }
        case "THROTTLE_MESSAGE":
            return { ...state, throttleMessages: state.throttleMessages.concat([`Run: ${performance.now()}`]) }
        default:
            return state
    }
}

export function limitersEffectReducer(state: LimitersState, action: LimitersActions): Effect | void {
    switch (action.type) {
        case "DEBOUNCE_BUTTON_CLICKED":
            return debounce(
                "debounceTest",
                dispatch(LimitersActions.debounceMessage()),
                state.debounceDelay,
                state.debounceTimeout === 0 ? -1 : state.debounceTimeout
            )
        case "DEBOUNCE_BUTTON_CLICKED":
            if (state.isEmittingThrottleEvents) {
                return interval(dispatch(LimitersActions.throttleEventEmitted()), state.throttleEmitInterval, {
                    cancelId: "throttleEmitter",
                })
            }
            break
        case "THROTTLE_EMIT_INTERVAL_CHANGED":
            if (state.isEmittingThrottleEvents) {
                return sequence(
                    cancel("throttleEmitter"),
                    interval(dispatch(LimitersActions.throttleEventEmitted()), state.throttleEmitInterval, {
                        cancelId: "throttleEmitter",
                    })
                )
            }
            break
        case "THROTTLE_BUTTON_CLICKED":
            return !state.isEmittingThrottleEvents
                ? cancel("throttleEmitter")
                : interval(dispatch(LimitersActions.throttleEventEmitted()), state.throttleEmitInterval, {
                      cancelId: "throttleEmitter",
                  })
        case "THROTTLE_EVENT_EMITTED":
            return throttle("throttleTest", dispatch(LimitersActions.throttleMessage()), state.throttleDelay)
    }
}
