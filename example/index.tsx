import React from 'react';
import ReactDOM from 'react-dom';
import { ReactStore } from '../src/index';

interface CounterState {
  value: number;
  increment: () => void;
  decrement: () => void;
}

const CounterStateManager = ReactStore.createComponent<{}, CounterState>(() => {
  const [counter, setCounter] = React.useState(0);

  const increment = React.useCallback(() => {
    setCounter(p => p + 1);
  }, []);

  const decrement = React.useCallback(() => {
    setCounter(p => p - 1);
  }, []);

  return ReactStore.createValue({
    value: counter,
    increment,
    decrement,
  });
});

const Counters = ReactStore.createComponent(() => {
  const [count, setCount] = React.useState(3);

  const addCounter = React.useCallback(() => {
    setCount(p => p + 1);
  }, []);

  const removeCounter = React.useCallback(() => {
    setCount(p => p - 1);
  }, []);

  return {
    counters: new Array(count)
      .fill(null)
      .map((v, i) => CounterStateManager({ key: i })),
    addCounter,
    removeCounter,
  };
});

const rootElement = Counters({});

const store = ReactStore.createStore(rootElement);

const Counter = React.memo<{ counter: CounterState; index: number }>(
  function Counter({ counter, index }) {
    return (
      <div>
        <button onClick={counter.decrement}>-</button>
        <span>{counter.value}</span>
        <button onClick={counter.increment}>+</button>
      </div>
    );
  }
);

function render() {
  const state = store.getState();
  ReactDOM.render(
    <div>
      <button onClick={state.addCounter}>Add counter</button>
      <button onClick={state.removeCounter}>Remove counter</button>
      <div>Sum: {state.counters.reduce((acc, v) => acc + v.value, 0)}</div>
      {state.counters.map((counter, index) => (
        <Counter counter={counter} key={index} index={index} />
      ))}
    </div>,
    document.getElementById('root')
  );
}

store.subscribe(render);

store.render();
