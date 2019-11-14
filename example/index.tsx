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

  return ReactStore.createState({
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

  return ReactStore.createMergeObject(
    ReactStore.createObject({
      counters: ReactStore.createArray(
        new Array(count)
          .fill(null)
          .map((v, i) =>
            ReactStore.createElement(CounterStateManager, { key: i })
          )
      ),
    }),
    ReactStore.createState({
      addCounter,
      removeCounter,
    })
  );
});

const rootElement = ReactStore.createElement(Counters, {});

const store = ReactStore.createStore(rootElement);

const Counter = React.memo<{ counter: CounterState }>(function Counter({
  counter,
}) {
  return (
    <div>
      <button onClick={counter.decrement}>-</button>
      <span>{counter.value}</span>
      <button onClick={counter.increment}>+</button>
    </div>
  );
});

function render() {
  const state = store.getState();
  ReactDOM.render(
    <div>
      <button onClick={state.addCounter}>Add counter</button>
      <button onClick={state.removeCounter}>Remove counter</button>
      {state.counters.map((counter, index) => (
        <Counter counter={counter} key={index} />
      ))}
    </div>,
    document.getElementById('root')
  );
}

store.subscribe(render);

store.render();

(window as any).render = render;
