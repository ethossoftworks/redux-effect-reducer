import { ReduxActionCreator } from "../util"
import { Effect, run, stream, dispatch, cancel } from "@ethossoftworks/redux-effect-reducer/effects"

export type WebSocketState = {
    connectionStatus: "Open" | "Closed"
    messages: string[]
    socket: WebSocket | null
}

const initialState: WebSocketState = {
    connectionStatus: "Closed",
    messages: [],
    socket: null,
}

const SOCKET_CANCEL = "websocketStream"

type WebSocketActions = ReduxActionCreator<typeof WebSocketActions>

export const WebSocketActions = {
    openSocket: () => ({ type: "WEBSOCKET/OPEN_SOCKET" } as const),
    sendMessage: () => ({ type: "WEBSOCKET/SEND_MESSAGE" } as const),
    closeSocket: () => ({ type: "WEBSOCKET/CLOSE_SOCKET" } as const),
    messageReceived: (message: string) => ({ type: "WEBSOCKET/MESSAGE_RECEIVED", message } as const),
    socketStatusChanged: (socket: WebSocket, status: "Open" | "Closed") =>
        ({ type: "WEBSOCKET/STATUS_CHANGED", status, socket } as const),
}

export function webSocketReducer(state: WebSocketState = initialState, action: WebSocketActions): WebSocketState {
    switch (action.type) {
        case "WEBSOCKET/STATUS_CHANGED":
            return {
                ...state,
                connectionStatus: action.status,
                socket: action.status === "Open" ? action.socket : null,
            }
        case "WEBSOCKET/MESSAGE_RECEIVED":
            return { ...state, messages: state.messages.concat(action.message) }
    }
    return state
}

export function webSocketEffectReducer(state: WebSocketState, action: WebSocketActions): Effect | void {
    switch (action.type) {
        case "WEBSOCKET/OPEN_SOCKET":
            return stream(
                (stream) => {
                    state.socket?.close()

                    const handleClose = () =>
                        stream.emit(dispatch(WebSocketActions.socketStatusChanged(socket, "Closed")))

                    const socket = new WebSocket("wss://echo.websocket.org")
                    socket.onopen = () => stream.emit(dispatch(WebSocketActions.socketStatusChanged(socket, "Open")))
                    socket.onclose = handleClose
                    socket.onerror = handleClose
                    socket.onmessage = (message) =>
                        stream.emit(dispatch(WebSocketActions.messageReceived(`Message Received: ${message.data}`)))

                    stream.onClose = () => {
                        socket?.close()
                        handleClose()
                    }
                },
                { cancelId: SOCKET_CANCEL }
            )
        case "WEBSOCKET/SEND_MESSAGE":
            return run(() => {
                state.socket?.send("Echo")
            })
        case "WEBSOCKET/CLOSE_SOCKET":
            return cancel(SOCKET_CANCEL)
    }
}
