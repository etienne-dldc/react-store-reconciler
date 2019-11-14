import React from 'react';
import { Container, reconcilerInstance, NodeType } from './reconciler';
import { Subscription, SubscribeMethod } from 'suub';
import { Instance, InstanceIs } from './instance';

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
  createElement,
  createState,
  createObject,
  createArray,
  createMergeObject,
};

function createElementInternal(
  type: NodeType,
  props: any,
  ...children: Array<any>
) {
  return React.createElement(type, props, ...children);
}

function createElement<S, P>(
  component: StateComponent<P, S>,
  props: P
): StateElement<S> {
  return React.createElement(component as any, props) as any;
}

function createState<S>(state: S): StateElement<S> {
  return createElementInternal('state', { state }) as any;
}

type Children = { [key: string]: StateElement<any> };

function createObject<S extends Children>(
  children: S
): StateElement<{ [K in keyof S]: S[K]['result'] }> {
  const resolved = children
    ? Object.keys(children).map(key =>
        createElementInternal('property', { name: key, key }, children[key])
      )
    : [];
  return createElementInternal('object', {}, resolved) as any;
}

type StrKeyed = { [key: string]: any };

function createMergeObject<
  L extends StateElement<StrKeyed>,
  R extends StateElement<StrKeyed>
>(left: L, right: R): StateElement<L['result'] & R['result']> {
  return createElementInternal('merge-object', {}, left, right) as any;
}

function createArray<S extends Array<StateElement<any>>>(
  children: S
): StateElement<
  { [K in keyof S]: S[K] extends StateElement<infer T> ? T : never }
> {
  return createElementInternal('array', {}, children) as any;
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
