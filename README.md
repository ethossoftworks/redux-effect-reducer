# Redux Effect Reducer

Redux Effect Reducer works by using a reducer-like function (an effect reducer) for side-effects. The effect reducer takes the current application state and an action as input and responds with an `Effect` object which describes the effect the middleware should execute. Redux Effect Reducer middleware then executes the effect returned from the effect reducer. The same input to the effect reducer will always produce the same output.

# Documentation
- [API](docs/api.md)
- [Testing](docs/testing.md)
- [Design](docs/design.md)
- [Example Project](example/)

# Features
- First class type support (written in TypeScript)
- Standard Redux middleware
- Async/Await based
- Multiple effects can respond to the same action
- A single effect can respond to multiple actions
- Composable effects
- Testable
- No external dependencies
- Optional effect logging

# Installation
`redux-effect-reducer` can be installed using NPM or Yarn. The scripts provided by the NPM package are UMD scripts and will also work as direct script tags.

## Install with Package Manager
```bash
yarn add @ethossoftworks/redux-effect-reducer
```

## Install with Script Tags
You may find the scripts in either the NPM package or from [releases](https://github.com/ethossoftworks/redux-effect-reducer/releases).
Both the `core`  and `effects` scripts must be loaded to use this library.

***Note: The effects scripts must be loaded before the core script. The core script depends on the effects script.***
```html
<script src="redux-effect-reducer.effects.js"></script>
<script src="redux-effect-reducer.core.js"></script>
<script>
    // ReduxEffectReducer.core
    // ReduxEffectReducer.effects
</script>
```
# Usage
`redux-effect-reducer` works with existing reducers and action creators, so you won't have to modify any existing code. To begin using `redux-effect-reducer` create an effect reducer and add the middleware to your store.

## Core Concepts
### Effect Reducer
* Effect reducers are very similar to normal state reducers. The only difference is that instead of returning new state, the effect reducer will return an `Effect` (or `void` if no effect should be executed).
* Effect reducers always have the latest state because they take the state returned from state reducers as an input parameter. There is no need to call `getState()` like you have to do with Thunks.

### Effect
* Effects are simply declarative objects; they do not execute anything themselves. They only describe the effect that the middleware should execute.
* Effects are composable. It is possible to build up effect chains by returning effects from effects.


## 1. Create an Effect Reducer
```typescript
// reducer.ts

import { Effect, run } from "@ethossoftworks/redux-effect-reducer/effects"

export function myEffectReducer(state: MyState, action: Action): Effect | void {
    switch (action.type) {
        case "MY_ACTION":
            // The `run` effect creator function returns a `RunEffect` and tells
            // the middleware run the provided function in response to an action
            return run(() => console.log("My Effect Ran!"))
    }
}

```
## 2. Add middleware to store
```typescript
// store.ts

import { createEffectReducerMiddleware } from "@ethossoftworks/redux-effect-reducer"

const effectMiddleware = createEffectReducerMiddleware(myEffectReducer)
export const store = createStore(reducer, applyMiddleware(effectMiddleware))
```
When you dispatch the action "MY_ACTION" you will see "My Effect Ran!" in the console.

# Example Project
For more examples, look at the [Example](example/) project.
