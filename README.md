# React Store Reconciler

> A custom React Reconciler to deal with data instead of render.

This is basically React except you return your state instead of JSX.

## ⚠️⚠️ EXPERIMENTAL ⚠️⚠️

This project is en experiment and should not be used in Production yet.

## Full power of React

Because this is React, you can use all the tool you're familiar with:

- `useEffect`
- Some custom hook fo data fetching ?
- Context

## Status

For now only what's needed to make the example work is implemented:

- Return `array`, `object`, `value`
- Add / remove on `array`

## Gist

```tsx
import React from 'react';
import ReactDOM from 'react-dom';
import ReactStore from 'react-store-reconciler';

interface CounterState {
  value: number;
  increment: () => void;
  decrement: () => void;
}

// This is almost a normal React Component...
const CounterStore = ReactStore.memo<CounterState, { index: number }>(
  ({ index }) => {
    const [counter, setCounter] = React.useState(0);

    console.log(`render counter store ${index}`);

    const increment = React.useCallback(() => {
      setCounter(p => p + 1);
    }, []);

    const decrement = React.useCallback(() => {
      setCounter(p => p - 1);
    }, []);

    const result = React.useMemo(
      () => ({
        value: counter,
        increment,
        decrement,
      }),
      [counter, decrement, increment]
    );

    // ... except instead of JSX you return some data
    // NOTE: we could return the result directly
    // but ReactStore.Node.value indicate that there are no sub-store and optimize update
    return ReactStore.Node.value(result);
  }
);

interface State {
  counters: Array<CounterState>;
  addCounter: () => void;
  removeCounter: () => void;
}

// Just like normal React, you can compose stores
const AppStore = ReactStore.component<State, {}>(() => {
  const [count, setCount] = React.useState(3);

  const addCounter = React.useCallback(() => {
    setCount(p => p + 1);
  }, []);

  const removeCounter = React.useCallback(() => {
    setCount(p => p - 1);
  }, []);

  // Here ReactStore.Node.object is only usefull for typings
  // we could also return the object directly in plain JS
  return ReactStore.Node.object({
    // return as many CounterStore as count
    counters: new Array(count)
      .fill(null)
      .map((v, i) => CounterStore({ index: i, key: i })),
    addCounter,
    removeCounter,
  });
});

// Now let's create some Components to render
// NOTE: we could use any other library to render (Vue, Preact, Angular...) !

const Counter = React.memo<{
  value: number;
  increment: () => void;
  decrement: () => void;
  index: number;
}>(function Counter({ value, decrement, increment, index }) {
  console.log(`render counter component ${index}`);
  return (
    <div>
      <button onClick={decrement}>-</button>
      <span>{value}</span>
      <button onClick={increment}>+</button>
    </div>
  );
});

const App = React.memo<{ state: State }>(({ state }) => {
  return (
    <div>
      <button onClick={state.addCounter}>Add counter</button>
      <button onClick={state.removeCounter}>Remove counter</button>
      <div>Sum: {state.counters.reduce((acc, v) => acc + v.value, 0)}</div>
      {state.counters.map((counter, index) => (
        <Counter
          value={counter.value}
          decrement={counter.decrement}
          increment={counter.increment}
          key={index}
          index={index}
        />
      ))}
    </div>
  );
});

// We create the store...
const store = ReactStore.createStore(AppStore());

// ...then subscribe
store.subscribe(() => {
  // when the state change
  const state = store.getState();
  // we render the app
  ReactDOM.render(<App state={state} />, document.getElementById('root'));
});

// start everything
store.render();
```
