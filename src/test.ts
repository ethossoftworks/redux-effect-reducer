import { Action } from "redux"
import { DefaultEffectLogger } from "./logger"
import { EffectMiddlewareContext, EffectLimiter } from "./middleware"

export class TestEffectMiddlewareContext implements EffectMiddlewareContext {
    dispatched: Action[] = []
    cancellables: Record<string | number, () => void> = {}
    limiters: Record<string, EffectLimiter> = {}
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
