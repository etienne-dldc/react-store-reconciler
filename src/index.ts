import React from 'react';
import { Container, reconcilerInstance } from './reconciler';
import { Subscription, SubscribeMethod } from 'suub';
import { Instance, InstanceIs } from './instance';

type Children = { [key: string]: StateElement<any> };

const IS_ELEM = Symbol('IS_ELEM');

// Not real type
export interface StateElement<T> {
  type: typeof IS_ELEM;
  result: T;
}

export interface StateComponent<P, T> {
  (props: React.PropsWithChildren<P>, context?: any): StateElement<T> | null;
  displayName?: string;
}

function getState(instance: Instance): any {
  if (instance.dirty === false) {
    return instance.cache;
  }
  if (InstanceIs.Object(instance)) {
    instance.cache = {};
    Object.keys(instance.children).forEach(key => {
      instance.cache[key] = getState(instance.children[key]);
    });
  } else if (InstanceIs.State(instance)) {
    instance.cache = instance.state;
  } else if (InstanceIs.Property(instance)) {
    instance.cache = getState(instance.children!);
  } else {
    throw new Error(`Unhandled getState for ${(instance as any).type}`);
  }
  instance.dirty = false;
  return instance.cache;
}

interface Store<S> {
  getState: () => S;
  subscribe: SubscribeMethod<void>;
  render: () => void;
}

export const ReactStore = {
  createStore,
  createComponent,
  createElement,
  createState,
  createObject,
};

function createElement<S, P>(
  component: StateComponent<P, S>,
  props: P
): StateElement<S> {
  return React.createElement(component as any, props) as any;
}

function createState<S>(state: S): StateElement<S> {
  return React.createElement('state', { state }) as any;
}

function createObject<S extends Children>(
  children: S
): StateElement<{ [K in keyof S]: S[K]['result'] }> {
  const resolved = children
    ? Object.keys(children).map(key =>
        React.createElement('property', { name: key, key }, children[key])
      )
    : [];

  return React.createElement('object', {}, resolved) as any;
}

function createComponent<P, T>(
  component: StateComponent<P, T>
): StateComponent<P, T> {
  return component;
}

function createStore<T extends StateElement<any>>(
  element: T
): Store<T['result']> {
  const sub = Subscription.create();

  const root: Container = {
    current: null,
    onUpdate: () => {
      sub.call();
    },
  };

  const render = () => {
    const container = reconcilerInstance.createContainer(root, false, false);
    const parentComponent = null;
    reconcilerInstance.updateContainer(
      element,
      container,
      parentComponent,
      () => {
        root.onUpdate();
      }
    );
  };

  return {
    render,
    getState: () => {
      return getState(root.current!);
    },
    subscribe: sub.subscribe,
  };
}
