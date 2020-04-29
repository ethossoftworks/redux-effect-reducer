import { MiddlewareAPI, Dispatch, Action, Middleware } from "redux"
import {
    Effect,
    EffectType,
    isEffect,
    EffectStream,
    all,
    StreamEffect,
    RunEffect,
    AllEffect,
    IntervalEffect,
    CancelEffect,
    DispatchEffect,
    SelectEffect,
    DebounceEffect,
    ThrottleEffect,
} from "./effects/effects"
import { allSettled } from "./util"
import { EffectLogger } from "./logger"

export type EffectReducerMap<S = any> = {
    [K in keyof S]?: EffectReducer<S[K]>
}

export type EffectReducer<S = any, A extends Action = Action> = (state: S, action: A) => Effect | void

export interface EffectMiddlewareContext {
    logger?: EffectLogger
    cancellables: Record<string | number, () => void>
    limiters: Record<string, EffectLimiterJob>
    dispatch: (action: Action) => void
    getState: () => any
}

export type EffectLimiterJob = {
    timestamp: number
    job: number | null
}

interface EffectRunnerMeta {
    rootInitiator: Action | void
    initiator: Action | Effect | void
    depth: number
}

export type EffectMiddlewareOptions = {
    logger?: EffectLogger
}

export function createEffectReducerMiddleware<S>(
    reducer: EffectReducer<S>,
    options: EffectMiddlewareOptions = {}
): Middleware {
    return (store: MiddlewareAPI) => {
        const context: EffectMiddlewareContext = {
            dispatch: store.dispatch,
            getState: store.getState,
            logger: options.logger,
            cancellables: {},
            limiters: {},
        }

        return (next: Dispatch) => (action: Action) => {
            const result = next(action)
            const effect = reducer(store.getState(), action)
            if (effect) {
                try {
                    _runEffect(effect, context, { depth: 0, rootInitiator: action, initiator: action })
                } catch (e) {
                    console.error(e)
                }
            }
            return result
        }
    }
}

export function combineEffectReducers<S>(reducerMap: EffectReducerMap<S>): EffectReducer<S> {
    const reducerKeys = Object.keys(reducerMap) as (keyof S)[]

    return (state, action) => {
        const effects: Effect[] = []

        for (let i = 0, l = reducerKeys.length; i < l; i++) {
            const key = reducerKeys[i]
            const reducer = reducerMap[key]

            if (reducer) {
                const effect = reducer(state[key], action)
                if (effect) {
                    effects.push(effect)
                }
            }
        }

        if (effects.length > 1) {
            return all(effects)
        } else if (effects.length === 1) {
            return effects[0]
        }
    }
}

export function runEffect(effect: Effect | void, context: EffectMiddlewareContext): Promise<void> {
    return _runEffect(effect, context, { depth: 0, rootInitiator: undefined, initiator: undefined })
}

async function _runEffect(
    effect: Effect | void,
    context: EffectMiddlewareContext,
    meta: EffectRunnerMeta
): Promise<void> {
    if (!effect) {
        return
    }

    context.logger?.log({
        effect: effect,
        depth: meta.depth,
        rootInitiator: meta.rootInitiator,
        initiator: meta.initiator,
        timestamp: performance.now(),
    })

    const nestedMeta = { depth: meta.depth + 1, rootInitiator: meta.rootInitiator, initiator: effect }

    switch (effect.type) {
        case EffectType.Run:
            return handleRunEffect(effect, context, nestedMeta)
        case EffectType.All:
            return handleAllEffect(effect, context, nestedMeta)
        case EffectType.Interval:
            return handleIntervalEffect(effect, context, nestedMeta)
        case EffectType.Cancel:
            return handleCancelEffect(effect, context, nestedMeta)
        case EffectType.Stream:
            return handleStreamEffect(effect, context, nestedMeta)
        case EffectType.Dispatch:
            return handleDispatchEffect(effect, context, nestedMeta)
        case EffectType.Select:
            return handleSelectEffect(effect, context, nestedMeta)
        case EffectType.Debounce:
            return handleDebounceEffect(effect, context, nestedMeta)
        case EffectType.Throttle:
            return handleThrottleEffect(effect, context, nestedMeta)
    }
}

async function handleRunEffect(effect: RunEffect, context: EffectMiddlewareContext, meta: EffectRunnerMeta) {
    const result = await effect.func(...effect.funcArgs)
    if (isEffect(result)) {
        await _runEffect(result, context, meta)
    }
}

async function handleAllEffect(effect: AllEffect, context: EffectMiddlewareContext, meta: EffectRunnerMeta) {
    if (effect.parallel) {
        await allSettled(effect.effects.map((effect) => _runEffect(effect, context, meta)))
    } else {
        for (let i = 0, l = effect.effects.length; i < l; i++) {
            await _runEffect(effect.effects[i], context, meta)
        }
    }
}

async function handleIntervalEffect(effect: IntervalEffect, context: EffectMiddlewareContext, meta: EffectRunnerMeta) {
    const cancelWrapper = { cancelled: false, cancel: () => {} }

    if (effect.cancelId) {
        context.cancellables[effect.cancelId] = () => {
            cancelWrapper.cancelled = true
            cancelWrapper.cancel()
        }
    }

    const runTask = async () => {
        const result = await (isEffect(effect.task)
            ? _runEffect(effect.task, context, meta)
            : effect.task(...effect.taskArgs))

        if (isEffect(result)) {
            await _runEffect(result, context, meta)
        }
    }

    while (true) {
        if (cancelWrapper.cancelled) {
            break
        } else if (effect.runAtStart) {
            await runTask()
        }

        await new Promise((resolve) => {
            cancelWrapper.cancel = () => resolve()
            setTimeout(resolve, effect.delay)
        })

        if (cancelWrapper.cancelled) {
            break
        } else if (!effect.runAtStart) {
            await runTask()
        }

        if (!effect.repeat) {
            break
        }
    }

    if (effect.cancelId) {
        delete context.cancellables[effect.cancelId]
    }
}

async function handleCancelEffect(effect: CancelEffect, context: EffectMiddlewareContext, meta: EffectRunnerMeta) {
    const cancel = context.cancellables[effect.cancelId]
    if (cancel) {
        cancel()
        delete context.cancellables[effect.cancelId]
    }
}

async function handleStreamEffect(effect: StreamEffect, context: EffectMiddlewareContext, meta: EffectRunnerMeta) {
    const stream = new DefaultEffectStream(effect, context, meta)
    if (effect.cancelId) {
        context.cancellables[effect.cancelId] = stream.close.bind(stream)
    }
    effect.func(stream, ...effect.funcArgs)
}

async function handleDispatchEffect(effect: DispatchEffect, context: EffectMiddlewareContext, meta: EffectRunnerMeta) {
    context.dispatch(effect.action)
}

async function handleSelectEffect(effect: SelectEffect<any>, context: EffectMiddlewareContext, meta: EffectRunnerMeta) {
    const result = await effect.func(context.getState, ...effect.funcArgs)
    if (isEffect(result)) {
        await _runEffect(result, context, meta)
    }
}

async function handleDebounceEffect(effect: DebounceEffect, context: EffectMiddlewareContext, meta: EffectRunnerMeta) {
    const limiter = context.limiters[effect.debounceId]
    if (limiter && limiter.job) {
        clearTimeout(limiter.job)
    }

    const job = window.setTimeout(() => {
        delete context.limiters[effect.debounceId]
        _runEffect(effect.effect, context, meta)
    }, effect.delay)

    if (!limiter || effect.maxTimeout == -1) {
        context.limiters[effect.debounceId] = { timestamp: performance.now(), job: job }
        return
    }

    if (performance.now() - limiter.timestamp >= effect.maxTimeout) {
        window.clearTimeout(job)
        context.limiters[effect.debounceId] = { timestamp: performance.now(), job: null }
        _runEffect(effect.effect, context, meta)
        return
    }

    context.limiters[effect.debounceId] = { timestamp: limiter.timestamp, job: job }
}

async function handleThrottleEffect(effect: ThrottleEffect, context: EffectMiddlewareContext, meta: EffectRunnerMeta) {
    const limiter = context.limiters[effect.throttleId]
    if (limiter && limiter.job) {
        clearTimeout(limiter.job)
    }

    if (!limiter) {
        context.limiters[effect.throttleId] = { timestamp: performance.now(), job: null }
        _runEffect(effect.effect, context, meta)
        return
    }

    if (effect.emitLast) {
        if (performance.now() - limiter.timestamp >= effect.delay) {
            context.limiters[effect.throttleId] = { timestamp: performance.now(), job: null }
            _runEffect(effect.effect, context, meta)
        } else {
            const nextScheduled = effect.delay - (performance.now() - limiter.timestamp)
            const job = window.setTimeout(() => {
                context.limiters[effect.throttleId] = { timestamp: performance.now(), job: null }
                _runEffect(effect.effect, context, meta)
            }, nextScheduled)

            context.limiters[effect.throttleId] = { timestamp: limiter.timestamp, job: job }
        }
        return
    }

    if (performance.now() - limiter.timestamp >= effect.delay) {
        context.limiters[effect.throttleId] = { timestamp: performance.now(), job: null }
        _runEffect(effect.effect, context, meta)
    }
}

class DefaultEffectStream implements EffectStream {
    onClose?: () => void = undefined
    closed: boolean = false

    constructor(
        private effect: StreamEffect,
        private context: EffectMiddlewareContext,
        private meta: EffectRunnerMeta
    ) {}

    emit(effect: Effect) {
        if (this.closed) {
            return
        }
        _runEffect(effect, this.context, this.meta)
    }

    close() {
        if (this.effect.cancelId) {
            delete this.context.cancellables[this.effect.cancelId]
        }

        if (this.onClose) {
            this.onClose()
        }
        this.closed = true
    }
}
