import { createStore, combineReducers, applyMiddleware } from "redux"
import { composeWithDevTools } from "redux-devtools-extension"
import { countdownReducer, countdownEffectReducer, CountdownState } from "./countdown"
import {
    createEffectReducerMiddleware,
    combineEffectReducers,
    DefaultEffectLogger,
} from "@ethossoftworks/redux-effect-reducer"
import { APIRequestState, apiRequestReducer, apiRequestEffectReducer } from "./apiRequest"
import { WebSocketState, webSocketReducer, webSocketEffectReducer } from "./websocket"
import { limitersReducer, LimitersState, limitersEffectReducer } from "./limiters"
;(window as any).effectLogger = new DefaultEffectLogger()

export type AppState = {
    countdown: CountdownState
    apiRequest: APIRequestState
    webSocket: WebSocketState
    limiters: LimitersState
}

const reducer = combineReducers({
    countdown: countdownReducer,
    apiRequest: apiRequestReducer,
    webSocket: webSocketReducer,
    limiters: limitersReducer,
})

const effectMiddleware = createEffectReducerMiddleware(
    combineEffectReducers({
        countdown: countdownEffectReducer,
        apiRequest: apiRequestEffectReducer,
        webSocket: webSocketEffectReducer,
        limiters: limitersEffectReducer,
    }),
    { logger: (window as any).effectLogger }
)

export const store = createStore(reducer, composeWithDevTools(applyMiddleware(effectMiddleware)))
