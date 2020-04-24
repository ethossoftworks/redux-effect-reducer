import { MiddlewareAPI, Dispatch, Action, Middleware } from "redux"
import { Effect, EffectType, isEffect, EffectStream, all, StreamEffect } from "./effects/effects"
import { allSettled } from "./util"
import { EffectLogger } from "./logger"

export type EffectReducerMap<S = any> = {
    [K in keyof S]?: EffectReducer<S[K]>
}

export type EffectReducer<S = any, A extends Action = Action> = (state: S, action: A) => Effect | void

export interface EffectMiddlewareContext {
    logger?: EffectLogger
    cancellables: Record<string | number, () => void>
    dispatch: (action: Action) => void
    getState: () => any
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
    } else if (context.logger) {
        context.logger.log({
            effect: effect,
            depth: meta.depth,
            rootInitiator: meta.rootInitiator,
            initiator: meta.initiator,
            timestamp: performance.now(),
        })
    }
    const nestedMeta = { depth: meta.depth + 1, rootInitiator: meta.rootInitiator, initiator: effect }

    switch (effect.type) {
        case EffectType.Run: {
            const result = await effect.func(...effect.funcArgs)
            if (isEffect(result)) {
                await _runEffect(result, context, nestedMeta)
            }
            break
        }
        case EffectType.All: {
            if (effect.parallel) {
                await allSettled(effect.effects.map((effect) => _runEffect(effect, context, nestedMeta)))
            } else {
                for (let i = 0, l = effect.effects.length; i < l; i++) {
                    await _runEffect(effect.effects[i], context, nestedMeta)
                }
            }
            break
        }
        case EffectType.Interval: {
            const cancelWrapper = { cancelled: false, cancel: () => {} }

            if (effect.cancelId) {
                context.cancellables[effect.cancelId] = () => {
                    cancelWrapper.cancelled = true
                    cancelWrapper.cancel()
                }
            }

            const runTask = async () => {
                const result = await (isEffect(effect.task)
                    ? _runEffect(effect.task, context, nestedMeta)
                    : effect.task(...effect.taskArgs))

                if (isEffect(result)) {
                    await _runEffect(result, context, nestedMeta)
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
            return
        }
        case EffectType.Cancel: {
            const cancel = context.cancellables[effect.cancelId]
            if (cancel) {
                cancel()
                delete context.cancellables[effect.cancelId]
            }
            break
        }
        case EffectType.Stream: {
            const stream = createEffectStreamProxy(effect, createEffectStream(), context, nestedMeta)
            if (effect.cancelId) {
                context.cancellables[effect.cancelId] = stream.close
            }
            effect.func(stream, ...effect.funcArgs)
            break
        }
        case EffectType.Dispatch: {
            context.dispatch(effect.action)
            break
        }
        case EffectType.Select: {
            const result = await effect.func(context.getState, ...effect.funcArgs)
            if (isEffect(result)) {
                await _runEffect(result, context, nestedMeta)
            }
            break
        }
    }
}

function createEffectStream(): EffectStream {
    return {
        emit: () => {},
        close: () => {},
        closed: false,
    }
}

function createEffectStreamProxy(
    effect: StreamEffect,
    stream: EffectStream,
    context: EffectMiddlewareContext,
    meta: EffectRunnerMeta
): EffectStream {
    return new Proxy(stream, {
        get: (target, member: keyof EffectStream) => {
            if (member === "emit") {
                return (effect: Effect) => {
                    if (target.closed) {
                        return
                    }
                    target.emit(effect)
                    _runEffect(effect, context, meta)
                }
            } else if (member === "close") {
                return () => {
                    if (target.onClose) {
                        target.onClose()
                    }

                    if (effect.cancelId) {
                        delete context.cancellables[effect.cancelId]
                    }

                    target.close()
                    target.closed = true
                }
            }
            return target[member]
        },
    })
}
