import React from 'react';
import { Container, reconcilerInstance, NodeType } from './reconciler';
import { Subscription, SubscribeMethod } from 'suub';
import { Instance, InstanceIs } from './instance';
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

export const ReactStore = {
  createStore,
  createComponent,
  createValue,
};

type CreateElement<P, T> = (props: P) => StateElement<T>;

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

function createComponent<P, T>(
  component: (props: P) => T | StateElement<T>
): CreateElement<P, ResolveType<T>> {
  const Comp = (props: P) => {
    const out = component(props);
    return toElements(out);
  };
  return (props: P) => React.createElement(Comp as any, props) as any;
}

function toElements<T>(obj: any): StateElement<T> {
  if (React.isValidElement(obj)) {
    return obj as any;
  }
  if (Array.isArray(obj)) {
    let changed = false;
    const items = obj.map(item => {
      const next = toElements(item);
      if (changed === false && next === item) {
        changed = true;
      }
      return next;
    });
    return createArray((changed ? items : obj) as any) as any;
  }
  if (isPlainObject(obj)) {
    const resolved = Object.keys(obj).map(key =>
      createElementInternal(
        'property',
        { name: key, key },
        toElements(obj[key])
      )
    );
    return createElementInternal('object', {}, resolved) as any;
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

// function createElement<S, P>(
//   component: StateComponent<P, S>,
//   props: P
// ): StateElement<S> {
//   return React.createElement(component as any, props) as any;
// }

function createValue<V>(value: V): StateElement<V> {
  return createElementInternal('value', { value }) as any;
}

// type Children = { [key: string]: StateElement<any> };

// function createObject<S extends Children>(
//   children: S
// ): StateElement<{ [K in keyof S]: S[K]['result'] }> {
//   const resolved = children
//     ? Object.keys(children).map(key =>
//         createElementInternal('property', { name: key, key }, children[key])
//       )
//     : [];
//   return createElementInternal('object', {}, resolved) as any;
// }

// type StrKeyed = { [key: string]: any };

// function createMergeObject<
//   L extends StateElement<StrKeyed>,
//   R extends StateElement<StrKeyed>
// >(left: L, right: R): StateElement<L['result'] & R['result']> {
//   return createElementInternal('merge-object', {}, left, right) as any;
// }

function createArray<S extends Array<StateElement<any>>>(
  children: S
): StateElement<
  { [K in keyof S]: S[K] extends StateElement<infer T> ? T : never }
> {
  return createElementInternal('array', {}, children) as any;
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
