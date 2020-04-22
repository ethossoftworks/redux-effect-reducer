# Design
`redux-effect-reducer` was created because no other side-effects middleware solved all of the problems with asynchronous in a way that didn't sacrifice something important to me.

## Problems with Existing Solutions
### Redux Thunk
- Necessitates impure action creators
- Difficult to trace where a Thunk was dispatched from because they don’t respond to pure actions
- A Thunk can't react to different actions; it has to be explicitly dispatched
- Thunks are not easily composed
- Thunks are not easily testable
- Modifies `dispatch()` type to accept `any` instead of `AnyAction`

### Redux Saga
- Generator API can be cumbersome
- `call()` effect creator does not have safe types for arguments or return values; generic parameters have to be provided
- Any saga, whether deeply nested or not, can listen/wait for actions and launch additional effects in multiple places making it more difficult to know why an effect was run
- Saga design promotes coupling tasks with the store that aren't necessarily associated with the store. Many forked sagas are spawned to handle complex business logic while maintaining a connection to the store

### Redux Loop
- Non-standard reducers
- No ability to respond to streams of data easily (i.e. WebSockets or observables)
- No intervals or timeouts (although there is a pull request for this feature)
- Using `getState()` requires passing a Symbol as an argument
- `run` command requires success and failure action creator parameters to be tightly coupled to the promise’s return values

## Redux Effect Reducer Key Design Features
### `redux-effect-reducer` is type safe
It is very important for me to make sure that the whole API is as type safe as possible. This not only helps catch bugs at compile time, but it also makes development so much nicer with IDE code completion and type definition lookups. `redux-effect-reducer` is written in TypeScript and all of the types are automatically generated; there will never be a discrepancy between the type definitions and the library code.

### `redux-effect-reducer` is based on async/await, not generators
Generators are very powerful, there is no question about that. The problem with generators is that the API can be difficult to work with. Generators also allow different return types from the same function. Async/Await is a simpler API and is much easier to consume for other functions. I do wish Promises had error types allowed, but [Outcome](https://www.npmjs.com/package/@ethossoftworks/outcome) handles that issue.

### `redux-effect-reducer` is testable
Tasting is very important for obvious reasons. Testing helps make robust, quality software. `redux-effect-reducer` provides comparable, declarative effect objects to allow for simple testing/debugging. All effect creators and effect reducers are pure and allow for much more predictability. In addition, `redux-effect-reducer` provides high quality effect logging so you can know when your effects ran, why your effects ran, and what they did.

### `redux-effect-reducer` is standard Redux middleware
Several other middleware libraries break conventions or add several new concepts for handling effects. I wanted `redux-effect-reducer` to reuse as many core concepts as possible. This helps reduce the cognitive load and make code easier to understand. The only fully new concept introduced by `redux-effect-reducer` is its `Effect` type. An effect reducer is very close to an ordinary reducer allowing for smaller cognitive overheat. `redux-effect-reducer` is really a quite simple middleware. There are no new bells and whistles and no existing Redux implementation changes that need to happen.

### `redux-effect-reducer` effects can respond to any action
I went back and forth on this for a while. The first time I came across `redux-saga` in the wild, I was confused how side-effects were being executed. There was no clear indication where a particular function was being invoked. Once I understood how sagas worked I came to understand how powerful it was to be able to respond to any action from anywhere. The main downfall with sagas in this regard is that responding to actions is registered in either the root saga or another saga altogether which tend to live in a completely separate part of the codebase. Since effects are responding to actions, that code that handles the reaction should live in close proximity with all other code that reacts to actions (reducers and action creators).

Thunks lose out on this great feature and require the user to explicitly invoke them. While this is initially easier to reason about, it does not allow for flexible or loosely-coupled code.

### Effects are composable
My initial core requirement was that every effect could compose other effects. It is this composing of effects that makes them useful. The thing I wanted to be careful about was making the composition predictable and to promote good habits. Any saga is allowed to listen/wait for an action and then respond however it wants. While this is extremely powerful, I think it creates a difficult trail to follow and it promotes bad habits where too much business logic is tied to a saga. In `redux-effect-reducer`, child effects are only run by returning an effect from within a parent effect (with the exception of streams). This prevents multiple effects from being started in different places within an effect and leaves an easily traceable effect causation trail.