import ReactDOM from "react-dom"
import React from "react"
import { Provider } from "react-redux"
import { store } from "./redux/store"
import { Debounce } from "./components/Debounce"
import { Throttle } from "./components/Throttle"
import { Countdown } from "./components/Countdown"
import { WebSocket } from "./components/WebSocket"
import { ApiRequest } from "./components/ApiRequest"

ReactDOM.render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById("root")
)

export function App() {
    return (
        <div className="section-cont">
            <ApiRequest />
            <Countdown />
            <WebSocket />
            <Debounce />
            <Throttle />
        </div>
    )
}
