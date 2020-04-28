import { Action } from "redux"

type OmitFirstParameter<T> = T extends (first: any, ...rest: infer I) => any ? I : []

export enum EffectType {
    All = "@EFFECTS/ALL",
    Cancel = "@EFFECTS/CANCEL",
    Dispatch = "@EFFECTS/DISPATCH",
    Interval = "@EFFECTS/INTERVAL",
    Run = "@EFFECTS/RUN",
    Stream = "@EFFECTS/STREAM",
    Select = "@EFFECTS/SELECT",
    Debounce = "@EFFECTS/DEBOUNCE",
    Throttle = "@EFFECTS/THROTTLE",
}

export type Effect =
    | RunEffect
    | DispatchEffect
    | AllEffect
    | IntervalEffect
    | CancelEffect
    | StreamEffect
    | SelectEffect<any>
    | DebounceEffect
    | ThrottleEffect

const EffectSymbol = Symbol("Effect")

export type RunEffect = {
    type: EffectType.Run
    func: EffectFunc
    funcArgs: any[]
    [EffectSymbol]: boolean
}

export type DispatchEffect = {
    type: EffectType.Dispatch
    action: Action
    [EffectSymbol]: boolean
}

export type AllEffect = {
    type: EffectType.All
    effects: Effect[]
    parallel: boolean
    [EffectSymbol]: boolean
}

export type IntervalEffect = {
    type: EffectType.Interval
    task: EffectFunc | Effect
    taskArgs: any[]
    cancelId?: string | number
    delay: number
    runAtStart: boolean
    repeat: boolean
    [EffectSymbol]: boolean
}

export type CancelEffect = {
    type: EffectType.Cancel
    cancelId: string | number
    [EffectSymbol]: boolean
}

export type StreamEffect = {
    type: EffectType.Stream
    func: StreamEffectFunc
    funcArgs: any[]
    cancelId?: string | number
    [EffectSymbol]: boolean
}

export type SelectEffect<S> = {
    type: EffectType.Select
    func: SelectEffectFunc<S>
    funcArgs: any[]
    [EffectSymbol]: boolean
}

export type DebounceEffect = {
    type: EffectType.Debounce
    debounceId: string
    effect: Effect
    delay: number
    maxTimeout: number
    [EffectSymbol]: boolean
}

export type ThrottleEffect = {
    type: EffectType.Throttle
    throttleId: string
    effect: Effect
    delay: number
    emitLast: boolean
    [EffectSymbol]: boolean
}

export interface EffectStream {
    emit(effect: Effect): void
    close(): void
    onClose?: () => void
    closed: boolean
}

export type EffectFunc = (...args: any[]) => Promise<Effect | void> | Effect | void
export type StreamEffectFunc = (stream: EffectStream, ...args: any[]) => void
export type SelectEffectFunc<S> = (getState: () => S, ...args: any[]) => Promise<Effect | void> | Effect | void

export const run = <T extends EffectFunc>(func: T, ...args: Parameters<T>): RunEffect =>
    Object.freeze({
        type: EffectType.Run,
        func,
        funcArgs: args,
        [EffectSymbol]: true,
    })

export const dispatch = (action: Action): DispatchEffect =>
    Object.freeze({
        type: EffectType.Dispatch,
        action,
        [EffectSymbol]: true,
    })

export const all = (effects: Effect[], options: { parallel?: boolean } = { parallel: true }): AllEffect =>
    Object.freeze({
        type: EffectType.All,
        effects,
        parallel: options.parallel !== undefined ? options.parallel : true,
        [EffectSymbol]: true,
    })

export const sequence = (...effects: Effect[]): AllEffect => all([...effects], { parallel: false })
export const parallel = (...effects: Effect[]): AllEffect => all([...effects], { parallel: true })

type IntervalEffectCreatorOptions<T> = {
    args?: T extends EffectFunc ? Parameters<T> : any[]
    cancelId?: string | number
    runAtStart?: boolean
    repeat?: boolean
}

export const interval = <T extends EffectFunc | Effect>(
    task: T,
    delay: number,
    options: IntervalEffectCreatorOptions<T> = { runAtStart: true, repeat: true }
): IntervalEffect =>
    Object.freeze({
        type: EffectType.Interval,
        task,
        taskArgs: options.args !== undefined ? options.args : [],
        cancelId: options.cancelId,
        delay: delay,
        runAtStart: options.runAtStart !== undefined ? options.runAtStart : true,
        repeat: options.repeat !== undefined ? options.repeat : true,
        [EffectSymbol]: true,
    })

export const timeout = <T extends EffectFunc | Effect>(
    task: T,
    delay: number,
    options: { args?: T extends EffectFunc ? Parameters<T> : any[]; cancelId?: string | number } = {}
): IntervalEffect =>
    interval(task, delay, { args: options.args, runAtStart: false, repeat: false, cancelId: options.cancelId })

export const cancel = (cancelId: string | number): CancelEffect =>
    Object.freeze({
        type: EffectType.Cancel,
        cancelId,
        [EffectSymbol]: true,
    })

export const stream = <T extends StreamEffectFunc>(
    func: T,
    options: { args?: OmitFirstParameter<T>; cancelId?: string | number } = {}
): StreamEffect =>
    Object.freeze({
        type: EffectType.Stream,
        func,
        funcArgs: options.args !== undefined ? options.args : [],
        cancelId: options.cancelId,
        [EffectSymbol]: true,
    })

export const select = <S, F extends SelectEffectFunc<any>>(func: F, ...args: OmitFirstParameter<F>): SelectEffect<S> =>
    Object.freeze({
        type: EffectType.Select,
        func,
        funcArgs: args,
        [EffectSymbol]: true,
    })

export const debounce = (debounceId: string, effect: Effect, delay: number, maxTimeout: number = -1): DebounceEffect =>
    Object.freeze({
        type: EffectType.Debounce,
        debounceId: debounceId,
        effect,
        maxTimeout,
        delay,
        [EffectSymbol]: true,
    })

export const throttle = (throttleId: string, effect: Effect, delay: number, emitLast: boolean = true): ThrottleEffect =>
    Object.freeze({
        type: EffectType.Throttle,
        throttleId: throttleId,
        effect,
        emitLast,
        delay,
        [EffectSymbol]: true,
    })

export function isEffect(effect: any): effect is Effect {
    return effect && effect[EffectSymbol] === true
}
