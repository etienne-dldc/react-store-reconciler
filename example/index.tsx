import React from 'react';
import ReactDOM from 'react-dom';
import ReactStore, { ElementStateType, ElementFactory } from '../src';

type CounterStoreProps = { index: number };

type CounterStoreState = {
  value: number;
  increment: () => void;
  decrement: () => void;
};

// This is almost a normal React Component...
const CounterStore: ElementFactory<
  CounterStoreProps,
  CounterStoreState
> = ReactStore.memo(({ index }) => {
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
  return result;
});

// Just like normal React, you can compose stores
const AppStore = ReactStore.component(() => {
  const [count, setCount] = React.useState(3);

  const addCounter = React.useCallback(() => {
    setCount(p => p + 1);
  }, []);

  const removeCounter = React.useCallback(() => {
    setCount(p => p - 1);
  }, []);

  // we could also return the object directly in plain JS
  return {
    // return as many CounterStore as count
    counters: new Array(count)
      .fill(null)
      .map((v, i) => CounterStore({ index: i, key: i })),
    addCounter,
    removeCounter,
  };
});

const storeRootElem = AppStore();

type State = ElementStateType<typeof storeRootElem>;

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
const store = ReactStore.createStore(storeRootElem);

// ...then subscribe
// store.subscribe(() => {
//   // when the state change
//   const state = store.getState();
//   // we render the app
//   ReactDOM.render(<App state={state} />, document.getElementById('root'));
// });

// start everything
store.render();

ReactDOM.render(<div>Hello React</div>, document.getElementById('root2'));
