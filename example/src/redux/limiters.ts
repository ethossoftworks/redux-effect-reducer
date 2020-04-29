import { ReduxActionCreator } from "../util"
import {
    Effect,
    dispatch,
    debounce,
    interval,
    sequence,
    cancel,
    throttle,
} from "@ethossoftworks/redux-effect-reducer/effects"

export type LimitersState = {
    debounceDelay: number
    debounceTimeout: number
    debounceMessages: string[]
    debounceSliderValue: number
    throttleDelay: number
    throttleEmitInterval: number
    throttleMessages: string[]
    isEmittingThrottleEvents: boolean
}

const initialState: LimitersState = {
    debounceSliderValue: 0,
    debounceDelay: 250,
    debounceTimeout: 0,
    debounceMessages: [],
    throttleDelay: 500,
    throttleEmitInterval: 500,
    throttleMessages: [],
    isEmittingThrottleEvents: false,
}

type LimitersActions = ReduxActionCreator<typeof LimitersActions>

export const LimitersActions = {
    debounceMessage: (value: number) => ({ type: "DEBOUNCE_MESSAGE", value } as const),
    debounceDelayChanged: (value: number) => ({ type: "DEBOUNCE_DELAY_CHANGED", value } as const),
    debounceTimeoutChanged: (value: number) => ({ type: "DEBOUNCE_TIMEOUT_CHANGED", value } as const),
    debounceSliderChanged: (value: number) => ({ type: "DEBOUNCE_SLIDER_CHANGED", value } as const),
    throttleDelayChanged: (value: number) => ({ type: "THROTTLE_DELAY_CHANGED", value } as const),
    throttleEmitIntervalChanged: (value: number) => ({ type: "THROTTLE_EMIT_INTERVAL_CHANGED", value } as const),
    throttleButtonClicked: () => ({ type: "THROTTLE_BUTTON_CLICKED" } as const),
    throttleEventEmitted: () => ({ type: "THROTTLE_EVENT_EMITTED" } as const),
    throttleMessage: () => ({ type: "THROTTLE_MESSAGE" } as const),
}

export function limitersReducer(state: LimitersState = initialState, action: LimitersActions): LimitersState {
    switch (action.type) {
        case "DEBOUNCE_SLIDER_CHANGED":
            return { ...state, debounceSliderValue: action.value }
        case "DEBOUNCE_MESSAGE":
            return { ...state, debounceMessages: state.debounceMessages.concat([`Effect Run: ${action.value}`]) }
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
        case "DEBOUNCE_SLIDER_CHANGED":
            return debounce(
                "debounceTest",
                dispatch(LimitersActions.debounceMessage(action.value)),
                state.debounceDelay,
                state.debounceTimeout === 0 ? -1 : state.debounceTimeout
            )
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
