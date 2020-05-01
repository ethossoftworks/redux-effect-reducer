# API
* [Middleware API](#Middleware-API)
    * [createEffectReducerMiddleware](#createEffectReducerMiddleware)
    * [combineEffectReducers](#combineEffectReducers)
    * [runEffect](#runEffect)
* [Effect Creators](#Effect-Creators)
    * [run](#run)
    * [all](#all)
    * [sequence](#sequence)
    * [parallel](#parallel)
    * [dispatch](#dispatch)
    * [interval](#interval)
    * [timeout](#timeout)
    * [stream](#stream)
    * [cancel](#cancel)
    * [select](#select)
    * [debounce](#debounce)
    * [throttle](#throttle)
* [Utils](#Utils)
    * [race](#race)
    * [allSettled](#allSettled)
    * [sleep](#sleep)
    * [retry](#retry)
    * [isEffect](#isEffect)
* [Interfaces](#Interface)
    * [EffectFunc](#EffectFunc)
    * [StreamEffectFunc](#StreamEffectFunc)
    * [SelectEffectFunc](#SelectEffectFunc)
    * [EffectLogger](#EffectLogger)
    * [EffectLog](#EffectLog)
    * [EffectMiddlewareContext](#EffectMiddlewareContext)
* [Classes](#Classes)
    * [TestEffectMiddlewareContext](#TestEffectMiddlewareContext)
    * [DefaultEffectLogger](#DefaultEffectLogger)

## Middleware API
### `createEffectReducerMiddleware()`
```typescript
function createEffectReducerMiddleware<S>(reducer: EffectReducer<S>, options?: EffectMiddlewareOptions): Middleware

type EffectMiddlewareOptions = {
    logger?: EffectLogger
}
```
Creates the middleware to be applied to the store.

* `reducer`: The root effect reducer. You can combine multiple effect reducers into one by using `combineEffectReducers()`
* `options`
    * `logger`: You may pass an optional `EffectLogger` to the middleware which helps with testing and debugging. `EffectLoggers` are described more in the [testing](testing.md) section.

#### Example
```typescript
function myEffectReducer(state: MyState, action: Action): Effect | void {
    // Add your effect reducer logic here
}

const effectMiddleware = createEffectReducerMiddleware(myEffectReducer)
```

&nbsp;
### `combineEffectReducers()`
```typescript
function combineEffectReducers<S>(reducerMap: EffectReducerMap<S>): EffectReducer<S>
```
Combines several effect reducers similar to how redux's `combineReducers` function works.
* `reducerMap`: The map of effect reducers. The map keys must be the same keys used for your state. The values are your effect reducers.

#### Example
```typescript
    const rootEffectReducer = combineEffectReducers({
        subStateA: substateAEffectReducer, // Receives subStateA as state parameter
        subStateB: substateBEffectReducer, // Receives subStateB as state parameter
    })

    const effectMiddleware = createEffectReducerMiddleware(rootEffectReducer)
```

&nbsp;
### `combineRootEffectReducers()`
```typescript
function combineRootEffectReducers<S>(...effectReducers: EffectReducer<S>[]): EffectReducer<S>
```
Combines several top-level effect reducers into one. The key difference between this and `combineEffectReducers` is that all effect reducers in `combineRootEffectReducers()` receive the full state tree. This is useful if you have several effect reducers that you want to have access to the full state. `combineRootEffectReducers()` may also be used alongside `combineEffectReducer()`.
* `effectReducers`: The effect reducers to combine. Each effect reducer receives the full state tree.

#### Example
```typescript
    const rootEffectReducer = combineRootEffectReducers(
        exampleEffectReducer1, // Receives full state tree as state parameter
        exampleEffectReducer2, // Receives full state tree as state parameter
    )

    const effectMiddleware = createEffectReducerMiddleware(rootEffectReducer)
```

&nbsp;
### `runEffect()`
```typescript
function runEffect(effect: Effect | void, context: EffectMiddlewareContext): Promise<void>
```
Runs an effect outside of the middleware. This should be used exclusively for testing. This function returns a promise that will resolve when the effect has completed (except for stream effects). NOTE: The effect will only run its own direct effect tree. Dispatching an action will not cause a related effect to run for that action. Testing a reaction to a nested dispatch requires testing with an actual store.
* `effect`: The effect to execute
* `context`: The context for the effect to run

#### Example
```typescript
const effect = run(async () => {
    await sleep(500)
    console.log("The effect ran!")
})
await runEffect(effect, new TestMiddlewareContext())
```

&nbsp;
## Effect Creators
### `run()`
```typescript
function run<T extends EffectFunc>(func: T, ...args: Parameters<T>) => RunEffect
```
Runs either an anonymous function or a named function with passed in arguments. The passed in function can be async or a plain function. The function can return an Effect or nothing.

#### Example
```typescript
export function myEffectReducer(state: MyState, action: Action): Effect | void {
    switch (action.type) {
        case "MY_ACTION":
            return run(randomApiRequest, "http://google.com")
        case "MY_OTHER_ACTION":
            return run(async () => {
                // Do stuff here...
                return dispatch({ type: "STUFF_FINISHED" })
            })
    }
}

function randomApiRequest(url: string) {
    // Do stuff here...
    if (success) {
        return dispatch({ type: "API_REQUEST_SUCCESS" })
    }
}
```

&nbsp;
### `all()`
```typescript
function all(effects: Effect[], options?: { parallel?: boolean | undefined }) => AllEffect
```
Runs an array of effects. `sequence()` and `parallel()` effect creators compose `all()` and are preferable for normal use. If a parallel effect is used inside of a non-parallel effect (a sequence), the sequence will wait for all parallel effects to finish before proceeding.
* `effects`: The array of effects to execute
* `options`
    * `parallel`: If true, all effects are run in parallel. The `all` effect will not complete until every effect has finished. If false, all effects are run in sequence one after the other. Default is `true`.

#### Example
```typescript
export function myEffectReducer(state: MyState, action: Action): Effect | void {
    switch (action.type) {
        case "MY_ACTION":
            return all(
                run(() => console.log("Something is happening"))
                run(() => console.log("Another something is happening at the same time"))
            )
    }
}
```

&nbsp;
### `sequence()`
```typescript
function sequence(...effects: Effect[]) => AllEffect
```
Runs effects in a sequence. `sequence()` composes `all()` and sets the `parallel` option to `false`.

#### Example
```typescript
export function myEffectReducer(state: MyState, action: Action): Effect | void {
    switch (action.type) {
        case "MY_ACTION":
            return sequence(
                dispatch({ type: "LOADING" }),
                run(async () => {
                    try {
                        await fetch("https://google.com", { mode: "no-cors" })
                        return dispatch({ type: "RESPONSE_SUCCEEDED" })
                    } catch (e) {
                        return dispatch({ type: "RESPONSE_FAILED" })
                    }
                }),
                dispatch({ type: "NOT_LOADING" })
            )
    }
}
```

&nbsp;
### `parallel()`
```typescript
function parallel(...effects: Effect[]) => AllEffect
```
Runs effects in parallel. `parallel()` composes `all()` and sets the `parallel` option to `true`.

#### Example
```typescript
export function myEffectReducer(state: MyState, action: Action): Effect | void {
    switch (action.type) {
        case "MY_ACTION":
            return parallel(
                run(loadPostsPage, "http://example.com/posts/1"),
                run(loadPostsPage, "http://example.com/posts/2"),
                run(loadPostsPage, "http://example.com/posts/3"),
            )
    }
}
```

&nbsp;
### `dispatch()`
```typescript
function dispatch(action: Action<any>) => DispatchEffect
```
Dispatches an action to the store.

#### Example
```typescript
export function myEffectReducer(state: MyState, action: Action): Effect | void {
    switch (action.type) {
        case "MY_ACTION":
            // This is just an example to show usage, don't respond to an action by dispatching another action
            return dispatch({ type: "RESPONSE_ACTION" })
    }
}
```

&nbsp;
### `interval()`
```typescript
function interval<T extends Effect | EffectFunc>(task: T, delay: number, options?: IntervalEffectCreatorOptions<T>) => IntervalEffect

type IntervalEffectCreatorOptions<T> = {
    args?: T extends EffectFunc ? Parameters<T> : any[]
    cancelId?: string | number
    runAtStart?: boolean
    repeat?: boolean
}
```
Runs a function or effect at an interval.
* `task`: The effect or function to run at an interval. The task is composable and is able to return effects that will be executed.
* `delay`: The amount of time in milliseconds to pause before executing the task again. Unlike `window.setInterval()` The delay timer will not start until the task and any spawned effect children have completed. This prevents the same effect from overlapping itself if the previous execution takes longer than normal.
* `options`
    * `args`: If the provided task is a named function, arguments may be passed here.
    * `cancelId`: A user provided string or number to identify this particular task. If a cancel Id is passed, the middleware will register the cancel Id and allow the task to be cancelled using the `cancel()` effect creator. The same cancel id may be used for multiple cancellable effects creating a cancellable group that will all be cancelled when using the `cancel()` effect creator.

        ***Note: canceling an interval will not immediately stop/cancel any actively running effects or spawned children. If the task has started, it will run to completion before cancelling.***
    * `runAtStart`: If true, the task will be run immediately. If false, the task will wait for the specified `delay` before running. Default is `true`.
    * `repeat`: If true, the task will repeat at the specified interval. If false, the task will not repeat (this is mainly used for timeouts). Default is `true`.

#### Example
```typescript
export function myEffectReducer(state: MyState, action: Action): Effect | void {
    switch (action.type) {
        case "MY_ACTION":
            return interval(dispatch({ type: "ACTION_EVERY_SECOND" }), 1000)
        case "MY_ACTION_2":
            return interval(async () => console.log("This runs every second"), 1000)
    }
}
```

&nbsp;
### `timeout()`
```typescript
function timeout<T extends Effect | EffectFunc>(task: T, delay: number, options?: {
    args?: (T extends EffectFunc ? Parameters<T> : any[]) | undefined
    cancelId?: string | number | undefined
}) => IntervalEffect
```
Composes the `interval()` effect creator to provide a simple timeout that can be optionally cancelled if a cancel id is provided.
* `task`: The effect or function to run after the specified delay. The task is composable and is able to return effects that will be executed.
* `delay`: The amount of time in milliseconds to pause before executing the task
* `options`:
    * `cancelId`: A user provided string or number to identify this particular task. If a cancelId is passed, the middleware will register the cancel id and
    allow the task to be cancelled using the `cancel()` effect creator. The same cancel id may be used for multiple cancellable effects creating a cancellable group that will all be cancelled when using the `cancel()` effect creator.

        ***Note: canceling an interval will not immediately stop/cancel any actively running effects or spawned children. If the task has started, it will run to completion before cancelling.***

#### Example
```typescript
export function myEffectReducer(state: MyState, action: Action): Effect | void {
    switch (action.type) {
        case "MY_ACTION":
            return timeout(dispatch({ type: "5_SECONDS_ELAPSED" }), 5000)
    }
}
```

&nbsp;
### `stream()`
```typescript
function stream: <T extends StreamEffectFunc>(func: T, options?: {
    args?: OmitFirstParameter<T> | undefined
    cancelId?: string | number | undefined
}) => StreamEffect

type OmitFirstParameter<T> = T extends (first: any, ...rest: infer I) => any ? I : []
```
Allows handling of streams of data by providing an EffectStream to emit many effects over time.
* `func`: A function with a `stream` as the first parameter. Any additional parameters (for a named function) must be passed in the `options.args` property. This effect is the only effect that does not allow effect composition by returning an effect. This is mainly because it is unnecessary with access to an `EffectStream`.
* `options`
    * `args`: If a named function is used for the `func` parameter, you may pass arguments here.
    * `cancelId`: A user provided string or number to identify this particular stream. If a cancelId is passed, the middleware will register the cancel id and allow the stream to be cancelled using the `cancel()` effect creator. The same cancel id may be used for multiple cancellable effects creating a cancellable group that will all be cancelled when using the `cancel()` effect creator. Stream cancellation only calls `stream.onClose()`. The user is responsible for stopping all other related ongoing tasks.

#### Example
```typescript
export function myEffectReducer(state: MyState, action: Action): Effect | void {
    switch (action.type) {
        case "MY_ACTION":
            return stream((stream) => {
                const subscription = action.someObservable.subscribe((message) => {
                    stream.emit(dispatch({ type: "STREAM_MESSAGE", message }))
                })

                stream.onClose = () => {
                    stream.emit(dispatch({ type: "STREAM_CLOSED" }))
                    subscription.unsubscribe()
                }
            })
    }
}
```

&nbsp;
### `cancel()`
```typescript
function cancel(cancelId: string | number) => CancelEffect
```
Cancels a cancelable Effect. Only effects that compose `StreamEffect` and `IntervalEffect` are cancelable.
* `cancelId`: The id of the cancellable to cancel. Repeated cancels of the same cancel Id will not do anything.

#### Example
```typescript
export function myEffectReducer(state: MyState, action: Action): Effect | void {
    switch (action.type) {
        case "MY_ACTION":
            return timeout(dispatch({ type: "DIFFERENT_ACTION" }), 5000, { cancelId: "myTimeout" })
        case "CANCEL_THING":
            return cancel("myTimeout")
    }
}
```

&nbsp;
### `select()`
```typescript
function select<S, F extends SelectEffectFunc<any>>(func: F, ...args: OmitFirstParameter<F>) => SelectEffect<S>
```
Allows retrieval of current state. This is useful for retrieving fresh state in a long-running effect (like an interval or stream). `select()` should be used sparingly as it breaks the unidirectional data flow Redux was intended for. Instead, new state should only be retrieved by responding to a newly dispatched action.
* `func`: A function with a `getState` function as its first parameter. Any additional parameters (for a named function) must be passed in the `args` parameter.
* `args`: Arguments for the `func` parameter. This is only used if the `func` parameter is a named function.

#### Example
```typescript
export function myEffectReducer(state: MyState, action: Action): Effect | void {
    switch (action.type) {
        case "MY_ACTION":
            // This is a terrible example, don't poll state to determine if a user is authenticated
            return interval(select((getState) => {
                if (!getState().user.isAuthenticated) {
                    return dispatch({ type: "USER_LOGGED_OUT" })
                }
            }, 5000))
    }
}
```

&nbsp;
### `debounce()`
```typescript
function debounce(debounceId: string, effect: Effect, delay: number, maxTimeout: number = -1) => DebounceEffect
```
Delays execution of `effect` until no more debounce effects with the same debounce id have be executed within the specified `delay` or `maxTimeout` window. This prevents the provided effect from being executed too frequently. A typical example is a range slider: Most of the time, you want the value to update immediately in Redux but you also want to wait until the user has stopped moving the slider for a certain amount of time before persisting the value to a database.
* `debounceId`: The user-specified unique identifier for the debounce effect for the middleware to keep track of the last time the effect was run
* `effect`: The effect to be debounced
* `delay`: The amount of time to wait after the last debounce effect before running the provided effect
* `maxTimeout`: Max timeout overrides the delay and is a way to ensure that the provided effect will fire at a certain interval regardless of the delay. Default is `-1` (no max timeout)

#### Example
```typescript
export function myEffectReducer(state: MyState, action: Action): Effect | void {
    switch (action.type) {
        case "VERY_FREQUENT_ACTION":
            return debounce(action.type, run(() => {
                persistValueToDisk(state.value)
            }), 500)
    }
}
```

&nbsp;
### `throttle()`
```typescript
function throttle(throttleId: string, effect: Effect, delay: number, emitLast: boolean = true) => ThrottleEffect
```
Throttles execution of `effect` to prevent `effect` from running too frequently. Throttle is similar to debounce but differs in the fact that the effect will be executed the first time instead of waiting for the specified delay.
* `debounceId`: The user-specified unique identifier for the throttle effect for the middleware to keep track of the last time the effect was run
* `effect`: The effect to be throttled
* `delay`: The minimum amount of time allowed between throttle calls before allowing `effect` to be executed
* `emitLast`: If the input to the throttle stops in the middle of the delay time period, throttle will store the last emitted throttle effect and run it when it would next be able to

#### Example
```typescript
export function myEffectReducer(state: MyState, action: Action): Effect | void {
    switch (action.type) {
        case "VERY_FREQUENT_ACTION":
            return throttle(action.type, run(() => {
                sendValueToServer(state.value)
            }), 1000)
    }
}
```

&nbsp;
## Utils
### `race()`
```typescript
function race<T extends Record<string, Promise<any>>>(promises: T): Promise<{
    [K in keyof T]: UnwrapPromise<T[keyof T]> | undefined;
}>

type UnwrapPromise<T> = T extends Promise<infer R> ? R : T
```
Allows for racing between several different promises. Each promise's result is mapped to an object similar to Redux-Saga's `race()` function. Only the winning promise's result is set in the object. All other values will be undefined.

All errors that aren't handled by the promises are swallowed and are returned as undefined.

#### Example
```typescript
const { result, timeout } = await race({
    timeout: sleep(5000),
    result: somePromise(),
})

if (timeout !== undefined || result == undefined) {
    return
}
console.log(result)
```

&nbsp;
### `allSettled()`
```typescript
allSettled<T>(promises: Promise<T>[]): Promise<T[]>
```
A typed polyfill for `Promise.allSettled()`.

#### Example
```typescript
const [result1, result2] = await allSettled([doSomething(), doSomething2()])
```

&nbsp;
### `sleep()`
```typescript
sleep(duration: number): Promise<boolean>
```
A Promise that sleeps for the given duration and then resolves with `true`.

#### Example
```typescript
async function() {
    await sleep(1000)
    doSomething()
}
```

&nbsp;
### `retry()`
```typescript
retry(func: () => Promise<any>, retryCount: number): Promise<any>
```
Retries the `func` the `retryCount` number of times before resolving or rejecting.

#### Example
```typescript
async function() {
    try {
        const connection = await retry(attemptConnection(), 5)
    } catch(e) {
        console.log("Couldn't connect")
        return
    }
}
```

&nbsp;
### `isEffect()`
```typescript
function isEffect(effect: any): effect is Effect
```
A type guard for checking if an object is an effect or not.

#### Example
```typescript
const maybeEffect = run(() => console.log("Am I an Effect?"))
console.log(isEffect(maybeEffect)) // Prints 'true'
```

&nbsp;
## Interfaces
### `Effect`
```typescript
type Effect = RunEffect | DispatchEffect | AllEffect | IntervalEffect | CancelEffect | StreamEffect | SelectEffect<any>
```
A union type of all different Effect types

&nbsp;
### `EffectFunc`
```typescript
type EffectFunc = (...args: any[]) => Promise<Effect | void> | Effect | void
```
Used for `run()`, `interval()`, and `timeout()` effects. This type can take any amount of parameters and .

&nbsp;
### `StreamEffectFunc`
```typescript
type StreamEffectFunc = (stream: EffectStream, ...args: any[]) => void
```
Used for `stream()` effects. This type always takes an `EffectStream` as its first parameter and can take any other arguments as well.

&nbsp;
### `SelectEffectFunc`
```typescript
type SelectEffectFunc<S> = (getState: () => S, ...args: any[]) => Promise<Effect | void> | Effect | void
```
Used for `select()` effects. This type always takes a function that returns state as its first parameter. It can take any amount of additional arguments as well. It can return either an Effect, a Promise of an effect, void, or a Promise of void

&nbsp;
### `EffectStream`
```typescript
interface EffectStream {
    emit(effect: Effect): void
    close(): void
    onClose?: () => void
    closed: boolean
}
```
EffectStreams are passed into `StreamEffectFunc` functions. They allow continuous emitting of Effects.
* `emit()`: Emits any Effect to the stream
* `close()`: Closes the effect stream. This will call the `onClose()` handler and set the `closed` value to true. Once a stream is closed, no more effects will be emitted to the middleware.
* `onClose()`: A handler that gets invoked when the stream is closed either with a `cancel()` effect or a direct `stream.close()` invocation.  When a stream is closed and the handler is fired, you will have one last opportunity to emit an effect. After the `onClose` handler is run, no more effects may be emitted.
* `closed`: A boolean value representing if the stream is closed or not

&nbsp;
### `EffectLogger`
```typescript
interface EffectLogger {
    log(effect: EffectLog): void
}
```
An interface for logging effects. This can be used for testing or for debugging in `runEffect()` or `createEffectReducerMiddleware()`.

&nbsp;
### `EffectLog`
```typescript
type EffectLog = {
    rootInitiator: Action | void
    initiator: Action | Effect | void
    timestamp: number
    effect: Effect
    depth: number
}
```
An individual log record used in an `EffectLogger`
* `rootInitiator`: The action that initiated the full chain of effects. `rootInitiator` will be undefined if the effect originated from `runEffect()`
* `initiator`: The direct parent initiator of the effect. `initiator` will be undefined if the effect originated from `runEffect()`
* `timestamp`: A high resolution timestamp representing when the effect was executed since the beginning of browser context
* `effect`: The effect that was executed
* `depth`: The depth of the effect within its call tree. 0 means this is the root effect. A depth of 3 means the effect has 3 parent initiators

&nbsp;
### `EffectMiddlewareContext`
```typescript
interface EffectMiddlewareContext {
    logger?: EffectLogger
    cancellables: Record<string | number, () => void>
    limiters: Record<string | EffectLimiterJob>
    dispatch: (action: Action) => void
    getState: () => any
}
```
The context that provides handling for different effects to the middleware. Used in `runEffect()`.
* `logger`: An optional logger for tracking executed effects
* `cancellables`: A plain object for keeping track of all cancellable effects. This should always be `{}`.
* `limiters`: A plain object for keeping track of limiting effects like `debounce` and `throttle`. This should always be `{}`.
* `dispatch()`: Handles all `dispatch()` effects
* `getState()`: Handles all `select()` effects

&nbsp;
## Classes
### `TestEffectMiddlewareContext`
```typescript
class TestEffectMiddlewareContext implements EffectMiddlewareContext {
    dispatched: Action[]
    cancellables: Record<string | number, (() => void)[]>
    logger: DefaultEffectLogger

    constructor(state?: any)

    dispatch(action: Action): void
    getState(): any
}
```
A standard implementation of `EffectMiddlewareContext` used in testing. It keeps track of all effects via the `logger` and all dispatched actions via the `dispatched` property.

&nbsp;
### `DefaultEffectLogger`
```typescript
export declare class DefaultEffectLogger implements EffectLogger {
    logs: EffectLog[]
    constructor(logLimit?: number)
    log(log: EffectLog): void
    first(): EffectLog
    count(): number
    get(index: number): EffectLog
    last(): EffectLog
}
```
The default effect logger.
* `logs`: Contains all of the effect logs. This is a FIFO (first-in-first-out) array.
* `constructor(logLimit)`: You may optionally provide a limit of logs to keep. Once the limit is reached, the first item in the array will be shifted off and the new effect will be pushed on top. Default is `-1` which is unlimited
* `first()`: Returns the first logged effect
* `count()`: Returns the number of logs
* `get()`: Get a log at a specific index. If you use a negative number it will return from the end of the log array. For example, `get(-1)` will return the last item in the logs array
* `last()`: Returns the last logged effect