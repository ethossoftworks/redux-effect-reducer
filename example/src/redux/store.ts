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
;(window as any).effectLogger = new DefaultEffectLogger()

export type AppState = {
    countdown: CountdownState
    apiRequest: APIRequestState
    webSocket: WebSocketState
}

const reducer = combineReducers({
    countdown: countdownReducer,
    apiRequest: apiRequestReducer,
    webSocket: webSocketReducer,
})

const effectMiddleware = createEffectReducerMiddleware(
    combineEffectReducers({
        countdown: countdownEffectReducer,
        apiRequest: apiRequestEffectReducer,
        webSocket: webSocketEffectReducer,
    }),
    { logger: (window as any).effectLogger }
)

export const store = createStore(reducer, composeWithDevTools(applyMiddleware(effectMiddleware)))
