import React from 'react';
import {
  Container,
  ReactStoreReconciler,
  NodeType,
} from './ReactStoreReconciler';
import { Subscription, SubscribeMethod } from 'suub';
import { Instance, InstanceIs } from './Instance';
import isPlainObject from 'is-plain-object';

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
  } else if (InstanceIs.Value(instance)) {
    instance.cache = instance.value;
  } else if (InstanceIs.Property(instance)) {
    instance.cache = getState(instance.children!);
  } else if (InstanceIs.Array(instance)) {
    instance.cache = instance.children.map(inst => getState(inst));
  } else if (InstanceIs.MergeObject(instance)) {
    instance.cache = {
      ...(instance.left ? getState(instance.left) : {}),
      ...(instance.right ? getState(instance.right) : {}),
    };
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

export const ReactStoreNode = {
  value: createValue,
  object: createObject,
  array: createArray,
};

export const ReactStore = {
  createStore,
  component: createComponent,
  memo: createMemoComponent,
  Node: ReactStoreNode,
};

type AllOptional<P = {}> = {} extends P
  ? true
  : P extends Required<P>
  ? false
  : true;

type CreateElement<P, T> = AllOptional<P> extends true
  ? (props?: P & { key?: string | number }) => StateElement<T>
  : (props: P & { key?: string | number }) => StateElement<T>;

export type IState = {
  [key: string]:
    | IState
    | string
    | StateElement<any>
    | ((...args: Array<any>) => any)
    | number
    | boolean
    | object
    | null
    | undefined;
};

export type ResolveType<State> = State extends StateElement<infer T>
  ? T
  : State extends (...args: Array<any>) => any
  ? State
  : State extends Array<infer T>
  ? Array<ResolveType<T>>
  : State extends IState
  ? { [K in keyof State]: ResolveType<State[K]> }
  : State;

function createComponentInternal<T, P>(
  component: (props: P) => T | StateElement<T>,
  wrapper?: (val: any) => any
): CreateElement<P, ResolveType<T>> {
  let Comp = (props: P) => {
    const out = component(props);
    return toElements(out);
  };
  if (wrapper) {
    Comp = wrapper(Comp);
  }
  return ((props: P) => React.createElement(Comp as any, props)) as any;
}

function createMemoComponent<T, P = {}>(
  component: (props: P) => T | StateElement<T>
): CreateElement<P, ResolveType<T>> {
  return createComponentInternal(component, React.memo) as any;
}

function createComponent<T, P = {}>(
  component: (props: P) => T | StateElement<T>
): CreateElement<P, ResolveType<T>> {
  return createComponentInternal(component);
}

function toElements<T>(obj: any): StateElement<T> {
  if (React.isValidElement(obj)) {
    return obj as any;
  }
  if (Array.isArray(obj)) {
    return createArray(obj) as any;
  }
  if (isPlainObject(obj)) {
    return createObject(obj);
  }
  return createElementInternal('value', { value: obj }) as any;
}

function createElementInternal(
  type: NodeType,
  props: any,
  ...children: Array<any>
) {
  return React.createElement(type, props, ...children);
}

function createValue<V>(value: V): StateElement<V> {
  return createElementInternal('value', { value }) as any;
}

function createArray<S extends Array<any>>(
  children: S
): StateElement<ResolveType<S>> {
  let changed = false;
  const items = children.map(item => {
    const next = toElements(item);
    if (changed === false && next === item) {
      changed = true;
    }
    return next;
  });
  return createElementInternal('array', {}, changed ? items : children) as any;
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
    const container = ReactStoreReconciler.createContainer(root, false, false);
    const parentComponent = null;
    ReactStoreReconciler.updateContainer(
      element,
      container,
      parentComponent,
      () => {}
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

function createObject<S extends { [key: string]: any }>(
  children: S
): StateElement<ResolveType<S>> {
  const resolved = Object.keys(children).map(key =>
    createElementInternal(
      'property',
      { name: key, key },
      toElements(children[key])
    )
  );
  return createElementInternal('object', {}, resolved) as any;
}
