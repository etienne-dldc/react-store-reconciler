import React from "react";
import ReactDOM from "react-dom";
import { ReactStore } from "./renderer/index";

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
    decrement
  });
});

const rootElement = ReactStore.createObject({
  counterA: ReactStore.createElement(CounterStateManager, {}),
  counterB: ReactStore.createElement(CounterStateManager, {})
});

const store = ReactStore.createStore(rootElement);

const Counter = React.memo<{ counter: CounterState }>(function Counter({
  counter
}) {
  return (
    <div>
      <button onClick={counter.decrement}>-</button>
      <span>{counter.value}</span>
      <button onClick={counter.increment}>+</button>
    </div>
  );
});

store.subscribe(() => {
  const state = store.getState();
  ReactDOM.render(
    <div>
      <Counter counter={state.counterA} />
      <Counter counter={state.counterB} />
    </div>,
    document.getElementById("root")
  );
});

store.render();
