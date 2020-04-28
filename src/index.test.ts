import { runTests, TestGroup } from "@ethossoftworks/knock-on-wood"
import { Action, createStore, applyMiddleware, combineReducers } from "redux"
import { createEffectReducerMiddleware, combineEffectReducers, runEffect } from "./middleware"
import {
    dispatch,
    run,
    parallel,
    sequence,
    timeout,
    stream,
    select,
    interval,
    cancel,
    EffectType,
    all,
    EffectStream,
    debounce,
    throttle,
} from "./effects/effects"
import { sleep, race } from "./util"
import isEqual from "lodash.isequal"
import { TestEffectMiddlewareContext } from "./test"
import { performance } from "perf_hooks"
import { SourceMapDevToolPlugin } from "webpack"
;(global as any).performance = performance
;(global as any).window = {
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
}

type ReduxActionCreator<T extends Record<string, (...args: any) => any>> = ReturnType<
    Extract<T[keyof T], (...args: any) => Action<string>>
>

type State = {
    state1: State1
    state2: State2
}

type State1 = {
    testNumber: number
    echoReceived: boolean
}

type State2 = { testNumber2: number; echoReceived2: boolean }

type TestActions = ReduxActionCreator<typeof TestActions>
const TestActions = {
    echo: (...args: any) => ({ type: "ECHO", args: args } as const),
    echoReceived: () => ({ type: "ECHO_RECEIVED" } as const),
    incrementNumber: () => ({ type: "INCREMENT_NUMBER" } as const),
    decrementNumber: () => ({ type: "DECREMENT_NUMBER" } as const),
}

const initialState1: State1 = {
    testNumber: 0,
    echoReceived: false,
}

const initialState2: State2 = {
    testNumber2: 5,
    echoReceived2: false,
}

function reducer1(state: State1 = initialState1, action: TestActions): State1 {
    switch (action.type) {
        case "INCREMENT_NUMBER":
            return {
                ...state,
                ...{ testNumber: state.testNumber + 1 },
            }
        case "ECHO_RECEIVED":
            return { ...state, ...{ echoReceived: true } }
        default:
            return state
    }
}

function reducer2(state: State2 = initialState2, action: TestActions): State2 {
    switch (action.type) {
        case "DECREMENT_NUMBER":
            return {
                ...state,
                ...{ testNumber: state.testNumber2 - 1 },
            }
        case "ECHO_RECEIVED":
            return { ...state, ...{ echoReceived2: true } }
        default:
            return state
    }
}

function effectReducer1(state: State1, action: TestActions) {
    switch (action.type) {
        case "ECHO":
            return dispatch(TestActions.echoReceived())
    }
}

function effectReducer2(state: State2, action: TestActions) {
    switch (action.type) {
        case "DECREMENT_NUMBER":
            if (state.testNumber2 === 0) {
                return cancel("decrement_interval")
            }
            break
        case "ECHO":
            return dispatch(TestActions.echoReceived())
    }
}

const testContext = (() => {
    const middlewareContext = new TestEffectMiddlewareContext()
    return {
        middlewareContext: middlewareContext,
        logger: middlewareContext.logger,
        dispatched: middlewareContext.dispatched,
    }
})()

const Tests: TestGroup<typeof testContext> = {
    context: testContext,
    beforeEach: async (context) => {
        context.middlewareContext = new TestEffectMiddlewareContext()
        context.logger = context.middlewareContext.logger
        context.dispatched = context.middlewareContext.dispatched
    },
    tests: {
        testDispatch: async ({ assert, context: { logger, middlewareContext, dispatched } }) => {
            const effect = dispatch(TestActions.echo("DISPATCH"))
            await runEffect(effect, middlewareContext)
            assert(
                logger.first().effect.type === EffectType.Dispatch &&
                    isEqual(logger.first().effect, dispatch(TestActions.echo("DISPATCH"))) &&
                    isEqual(dispatched[0], TestActions.echo("DISPATCH"))
            )
        },
        testRun: async ({ assert, context: { logger, middlewareContext } }) => {
            const effect = run(async () => {
                await sleep(500)
                return dispatch(TestActions.echo("RUN_COMPLETED"))
            })
            await runEffect(effect, middlewareContext)
            assert(
                logger.count() === 2 &&
                    logger.first().effect.type === EffectType.Run &&
                    isEqual(logger.get(1).effect, dispatch(TestActions.echo("RUN_COMPLETED")))
            )
        },
        testParallel: async ({ assert, fail, context: { logger, middlewareContext } }) => {
            const effect = parallel(run(effectSleep, 500), run(effectSleep, 500), run(effectSleep, 500))
            setTimeout(() => fail("Parallel timed out"), 1000)
            await runEffect(effect, middlewareContext)
            const expected = parallel(run(effectSleep, 500), run(effectSleep, 500), run(effectSleep, 500))
            assert(logger.first().effect.type === EffectType.All && isEqual(logger.first().effect, expected))
        },
        testSequence: async ({ assert, fail, context: { logger, dispatched, middlewareContext } }) => {
            const effect = sequence(
                run(effectSleep, 500),
                run(effectSleep, 500),
                dispatch(TestActions.echo("SEQUENCE_COMPLETE"))
            )
            setTimeout(() => {
                if (logger.count() === 4) fail("Sequence finished too soon")
            }, 900)
            await runEffect(effect, middlewareContext)
            assert(
                logger.first().effect.type === EffectType.All &&
                    isEqual(dispatched[dispatched.length - 1], TestActions.echo("SEQUENCE_COMPLETE"))
            )
        },
        testParallelInSequence: async ({ assert, context: { logger, middlewareContext } }) => {
            const effect = sequence(
                dispatch(TestActions.echo("PARALLEL_IN_SEQUENCE_START")),
                parallel(
                    run(async () => {
                        await sleep(500)
                        return dispatch(TestActions.echo("PARALLEL_IN_SEQUENCE"))
                    })
                ),
                dispatch(TestActions.echo("PARALLEL_IN_SEQUENCE_STOP"))
            )
            await runEffect(effect, middlewareContext)
            assert(
                logger.count() === 6 &&
                    isEqual(logger.get(1).effect, dispatch(TestActions.echo("PARALLEL_IN_SEQUENCE_START"))) &&
                    isEqual(logger.get(5).effect, dispatch(TestActions.echo("PARALLEL_IN_SEQUENCE_STOP")))
            )
        },
        testInterval: async ({ assert, context: { logger, middlewareContext } }) => {
            const effect = interval(dispatch(TestActions.decrementNumber()), 1000, { cancelId: "decrement_interval" })
            runEffect(effect, middlewareContext)
            await sleep(3000)
            assert(
                logger.count() >= 4 &&
                    logger.first().effect.type === EffectType.Interval &&
                    isEqual(logger.get(-1).effect, dispatch(TestActions.decrementNumber()))
            )
            runEffect(cancel("decrement_interval"), middlewareContext)
        },
        testCancelInterval: async ({ fail, assert, context: { logger, middlewareContext } }) => {
            const start = performance.now()
            setTimeout(() => runEffect(cancel("decrement_interval"), middlewareContext), 500)
            const effect = interval(dispatch(TestActions.decrementNumber()), 500, { cancelId: "decrement_interval" })
            await runEffect(effect, middlewareContext)

            if (performance.now() - start < 450 || performance.now() - start > 600) {
                fail(
                    `Interval is not awaiting properly. Was expected to take ~500ms and instead took ${
                        performance.now() - start
                    }`
                )
            }

            await sleep(1000)
            assert(
                logger.count() <= 4 &&
                    logger.first().effect.type === EffectType.Interval &&
                    isEqual(logger.last().effect, cancel("decrement_interval"))
            )
        },
        testTimeout: async ({ assert, fail, context: { middlewareContext, dispatched } }) => {
            const start = performance.now()
            setTimeout(() => {
                if (dispatched.length > 0) {
                    fail("Dispatch did not wait for timeout")
                }
            }, 500)
            await runEffect(timeout(dispatch(TestActions.echo("TIMEOUT")), 1000), middlewareContext)
            assert(performance.now() - start >= 950 && isEqual(dispatched[0], TestActions.echo("TIMEOUT")))
        },
        testImmediateTimeoutCancellation: async ({ fail, context: { logger, middlewareContext } }) => {
            const start = performance.now()
            setTimeout(() => runEffect(cancel("immediate_cancel"), middlewareContext), 100)
            await runEffect(
                timeout(dispatch(TestActions.echo("TIMEOUT_CANCELLATION")), 1000, { cancelId: "immediate_cancel" }),
                middlewareContext
            )
            if (performance.now() - start <= 90 || performance.now() - start > 150) {
                fail("Timeout not awaiting properly")
            }

            await sleep(1000)
            if (middlewareContext.dispatched.length > 0) {
                fail("Timeout did not actually cancel")
            }
        },
        testNestedTimeoutAwait: async ({ fail, context: { middlewareContext } }) => {
            const effect = timeout(
                parallel(
                    dispatch(TestActions.echo("1")),
                    run(async () => {
                        await sleep(1000)
                        return sequence(run(effectSleep, 1000), dispatch(TestActions.echo("2")))
                    })
                ),
                1000
            )

            const start = performance.now()
            await runEffect(effect, middlewareContext)
            if (performance.now() - start < 3000) {
                fail("Timeout didn't wait for nested effects")
            } else if (middlewareContext.dispatched.length !== 2) {
                fail()
            }
        },
        testStream: async ({ assert, context: { logger, middlewareContext } }) => {
            const streamEffect = stream(
                (stream) => {
                    const interval = setInterval(() => stream.emit(dispatch(TestActions.echo("STREAM"))), 100)
                    stream.onClose = () => {
                        stream.emit(dispatch(TestActions.echo("STREAM_CLOSED")))
                        clearInterval(interval)
                    }
                },
                { cancelId: "stream" }
            )
            runEffect(streamEffect, middlewareContext)
            await sleep(1000)
            await runEffect(cancel("stream"), middlewareContext)
            assert(
                logger.count() > 10 &&
                    isEqual(logger.get(-2).effect, cancel("stream")) &&
                    isEqual(logger.last().effect, dispatch(TestActions.echo("STREAM_CLOSED")))
            )
        },
        testCancellableCleanup: async ({ assert, context: { middlewareContext } }) => {
            const effect = parallel(
                timeout(dispatch(TestActions.echo("")), 500, { cancelId: "cancellable_cleanup_timeout" }),
                stream((stream) => stream.close(), { cancelId: "cancellable_cleanup_stream" })
            )
            await runEffect(effect, middlewareContext)
            assert(Object.keys(middlewareContext.cancellables).length === 0)
        },
        testSelect: async ({ fail, context: { middlewareContext } }) => {
            const store = createStore(reducer1)
            const effect = sequence(
                select((getState: () => State1) => {
                    if (getState().testNumber !== 0) fail()
                }),
                dispatch(TestActions.incrementNumber()),
                select((getState: () => State1) => {
                    if (getState().testNumber !== 1) fail()
                })
            )
            await runEffect(effect, { ...middlewareContext, dispatch: store.dispatch, getState: store.getState })
        },
        testDebounce: async ({ assert, context: { middlewareContext, logger, dispatched } }) => {
            for (let i = 0; i < 10; i++) {
                const effect = debounce("debounce_test", dispatch(TestActions.echo("debounce")), 250)
                runEffect(effect, middlewareContext)
                await sleep(100)
            }

            assert(logger.logs.length >= 10)
            assert(dispatched.length == 0)
            await sleep(250)
            assert(dispatched.length == 1)

            middlewareContext.logger.logs.splice(0, middlewareContext.logger.logs.length)
            middlewareContext.dispatched.splice(0, middlewareContext.dispatched.length)

            for (let i = 0; i < 10; i++) {
                const effect = debounce("debounce_test2", dispatch(TestActions.echo("debounce")), 250, 400)
                runEffect(effect, middlewareContext)
                await sleep(100)
            }

            assert(logger.logs.length >= 10)
            assert(dispatched.length == 2)
            await sleep(300)
            assert(dispatched.length == 3)
        },
        testThrottle: async ({ assert, context: { middlewareContext, logger, dispatched } }) => {
            for (let i = 0; i < 10; i++) {
                const effect = throttle("throttle_test", dispatch(TestActions.echo("throttle")), 250, false)
                runEffect(effect, middlewareContext)
                await sleep(100)
            }

            assert(logger.logs.length >= 10)
            assert(dispatched.length == 4)
            await sleep(250)
            assert(dispatched.length == 4)

            middlewareContext.logger.logs.splice(0, middlewareContext.logger.logs.length)
            middlewareContext.dispatched.splice(0, middlewareContext.dispatched.length)

            for (let i = 0; i < 9; i++) {
                const effect = throttle("throttle_test2", dispatch(TestActions.echo("throttle")), 250, true)
                runEffect(effect, middlewareContext)
                await sleep(100)
            }

            assert(logger.logs.length >= 10)
            assert(dispatched.length == 4)
            await sleep(150)
            assert(dispatched.length == 5)
        },
        testAPIRequest: async ({ assert, context: { logger, middlewareContext } }) => {
            const effect = sequence(
                dispatch(TestActions.echo("LOADING")),
                run(async () => {
                    try {
                        await fetch("https://google.com", { mode: "no-cors" })
                        return dispatch(TestActions.echo("RESPONSE_SUCCEEDED"))
                    } catch (e) {
                        return dispatch(TestActions.echo("RESPONSE_FAILED"))
                    }
                }),
                dispatch(TestActions.echo("NOT_LOADING"))
            )

            await runEffect(effect, middlewareContext)
            assert(logger.count() === 5 && isEqual(logger.get(4).effect, dispatch(TestActions.echo("NOT_LOADING"))))
        },
        testEffectReducer: async ({ fail }) => {
            const effect = effectReducer2({ testNumber2: 5, echoReceived2: false }, TestActions.decrementNumber())
            if (effect !== undefined) {
                fail("Effect reducer returned effect when none was expected")
            }

            const effect2 = effectReducer2({ testNumber2: 0, echoReceived2: false }, TestActions.decrementNumber())
            if (!isEqual(effect2, cancel("decrement_interval"))) {
                fail("Effect reducer was expected to return effect")
            }
        },
        testStoreIntegration: async ({ assert, context: { logger } }) => {
            const effectMiddleware = createEffectReducerMiddleware(effectReducer1, { logger: logger })
            const store = createStore(reducer1, applyMiddleware(effectMiddleware))
            store.dispatch(TestActions.echo())
            assert(
                logger.count() === 1 &&
                    isEqual(logger.first().effect, dispatch(TestActions.echoReceived())) &&
                    store.getState().echoReceived === true
            )
        },
        testCombineEffectReducers: async ({ assert, context: { logger } }) => {
            const effectMiddleware = createEffectReducerMiddleware(
                combineEffectReducers<State>({ state1: effectReducer1, state2: effectReducer2 }),
                { logger: logger }
            )
            const store = createStore(
                combineReducers({ state1: reducer1, state2: reducer2 }),
                applyMiddleware(effectMiddleware)
            )

            store.dispatch(TestActions.echo())
            assert(
                store.getState().state1.echoReceived === true &&
                    store.getState().state2.echoReceived2 === true &&
                    logger.count() === 3 // all() from combine reducers and 2 dispatches
            )
        },
        testEffectComparability: async ({ assert, fail }) => {
            for (const type of Object.values(EffectType)) {
                compareEffect(type)
            }

            function compareEffect(type: string) {
                switch (type) {
                    case EffectType.All: {
                        assert(
                            isEqual(
                                all([dispatch({ type: "TEST" }), dispatch({ type: "TEST" })]),
                                all([dispatch({ type: "TEST" }), dispatch({ type: "TEST" })])
                            )
                        )
                        return
                    }
                    case EffectType.Cancel: {
                        assert(isEqual(cancel("test"), cancel("test")))
                        return
                    }
                    case EffectType.Dispatch: {
                        assert(isEqual(dispatch({ type: "TEST" }), dispatch({ type: "TEST" })))
                        return
                    }
                    case EffectType.Interval: {
                        function intervalFunc(test: number) {}
                        assert(
                            isEqual(
                                interval(intervalFunc, 500, { args: [1] }),
                                interval(intervalFunc, 500, { args: [1] })
                            )
                        )
                        return
                    }
                    case EffectType.Run: {
                        function runFunc(test: number) {}
                        assert(isEqual(run(runFunc, 1), run(runFunc, 1)))
                        return
                    }
                    case EffectType.Select: {
                        function selectFunc(getState: () => number, test: number) {}
                        assert(isEqual(select(selectFunc, 1), select(selectFunc, 1)))
                        return
                    }
                    case EffectType.Stream: {
                        function streamFunc(stream: EffectStream, test: number) {}
                        assert(isEqual(stream(streamFunc, { args: [1] }), stream(streamFunc, { args: [1] })))
                        return
                    }
                    case EffectType.Debounce: {
                        assert(
                            isEqual(
                                debounce("debounce_test", dispatch(TestActions.echo("Hello")), 500, 500),
                                debounce("debounce_test", dispatch(TestActions.echo("Hello")), 500, 500)
                            )
                        )
                        return
                    }
                    case EffectType.Throttle: {
                        assert(
                            isEqual(
                                throttle("throttle_test", dispatch(TestActions.echo("Hello")), 500),
                                throttle("throttle_test", dispatch(TestActions.echo("Hello")), 500)
                            )
                        )
                        return
                    }
                    default:
                        fail(`Effect type ${type} was not tested for comparability`)
                }
            }
        },
        testRace: async ({ fail }) => {
            const { test1, test2 } = await race({
                test1: sleep(500),
                test2: Promise.reject(1),
            })

            if (test1 !== undefined || test2 !== undefined) {
                fail()
            }

            const { test3, test4 } = await race({
                test3: sleep(1000),
                test4: (async () => {
                    await sleep(500)
                    return 1
                })(),
            })

            if (test4 !== 1) {
                fail()
            }
        },
    },
}

async function effectSleep(duration: number) {
    await sleep(duration)
    return
}

runTests(Tests).catch((e) => {})
