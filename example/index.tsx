import React from 'react';
import ReactDOM from 'react-dom';
import ReactStore from '../src';

interface CounterState {
  value: number;
  increment: () => void;
  decrement: () => void;
}

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

    return ReactStore.Node.value({
      value: counter,
      increment,
      decrement,
    });
  }
);

interface State {
  counters: Array<CounterState>;
  addCounter: () => void;
  removeCounter: () => void;
}

const AppStore = ReactStore.component<State, {}>(() => {
  const [count, setCount] = React.useState(3);

  const addCounter = React.useCallback(() => {
    setCount(p => p + 1);
  }, []);

  const removeCounter = React.useCallback(() => {
    setCount(p => p - 1);
  }, []);

  return ReactStore.Node.object({
    counters: new Array(count)
      .fill(null)
      .map((v, i) => CounterStore({ index: i, key: i })),
    addCounter,
    removeCounter,
  });
});

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

const store = ReactStore.createStore(AppStore());

store.subscribe(() => {
  const state = store.getState();
  ReactDOM.render(<App state={state} />, document.getElementById('root'));
});

store.render();
