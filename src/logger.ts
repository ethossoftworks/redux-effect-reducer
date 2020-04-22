import { Action } from "redux"
import { Effect } from "./effects/effects"

export interface EffectLogger {
    log(effect: EffectLog): void
}

type EffectLog = {
    rootInitiator: Action | void
    initiator: Action | Effect | void
    timestamp: number
    effect: Effect
    depth: number
}

export class DefaultEffectLogger implements EffectLogger {
    logs: EffectLog[] = []

    constructor(private logLimit: number = -1) {}

    log(log: EffectLog) {
        if (this.logLimit !== -1 && this.logs.length >= this.logLimit) {
            this.logs.shift()
        }
        this.logs.push(log)
    }

    first() {
        return this.logs[0]
    }

    count() {
        return this.logs.length
    }

    get(index: number) {
        return index < 0 ? this.logs[this.logs.length - Math.abs(index)] : this.logs[index]
    }

    last() {
        return this.logs[this.logs.length - 1]
    }
}
