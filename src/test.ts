import { Action } from "redux"
import { DefaultEffectLogger } from "./logger"
import { EffectMiddlewareContext } from "./middleware"

export class TestEffectMiddlewareContext implements EffectMiddlewareContext {
    dispatched: Action[] = []
    cancellables: Record<string | number, () => void> = {}
    logger = new DefaultEffectLogger()

    constructor(private state?: any) {
        // Bind to this instance so that when the middleware calls it the `this` parameter isn't undefined
        this.getState = this.getState.bind(this)
    }

    dispatch(action: Action) {
        this.dispatched.push(action)
    }

    getState() {
        return this.state
    }
}
