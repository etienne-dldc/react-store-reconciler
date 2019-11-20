import React from 'react';
import {
  Container,
  ReactStoreReconciler,
  NodeType,
} from './ReactStoreReconciler';
import { Subscription, SubscribeMethod } from 'suub';
import { Instance, InstanceIs } from './Instance';
import isPlainObject from 'is-plain-object';

const OPAQUE = Symbol('IS_ELEM');

// Not real type
export interface Element<T> {
  [OPAQUE]: T;
}

export type ElementStateType<T> = T extends Element<infer U> ? U : never;

export interface StateComponent<P, T> {
  (props: React.PropsWithChildren<P>, context?: any): Element<T> | null;
  displayName?: string;
}

export interface Store<S> {
  getState: () => S;
  subscribe: SubscribeMethod<void>;
  render: () => void;
}

export const ReactStoreNode = {
  static: createStatic,
  object: createObject,
  array: createArray,
};

export const ReactStore = {
  createStore,
  component: createComponent,
  memo: createMemoComponent,
  // return: createReturn,
  Node: ReactStoreNode,
};

function getState(instance: Instance): any {
  if (instance.dirty === false) {
    return instance.cache;
  }
  if (InstanceIs.Object(instance)) {
    instance.cache = {};
    Object.keys(instance.children).forEach(key => {
      instance.cache[key] = getState(instance.children[key]);
    });
  } else if (InstanceIs.Static(instance)) {
    instance.cache = instance.value;
  } else if (InstanceIs.Property(instance)) {
    instance.cache = getState(instance.children!);
  } else if (InstanceIs.Array(instance)) {
    instance.cache = instance.children.map(inst => getState(inst));
  } else {
    throw new Error(`Unhandled getState for ${(instance as any).type}`);
  }
  instance.dirty = false;
  return instance.cache;
}

type AllOptional<P = {}> = {} extends P
  ? true
  : P extends Required<P>
  ? false
  : true;

type ComponentFn = (props: any) => any;

type ExtractProps<F extends ComponentFn> = F extends (props: infer P) => any
  ? P
  : never;

export type ElementFactory<P, T> = AllOptional<P> extends true
  ? (props?: P & { key?: string | number }) => Element<T>
  : (props: P & { key?: string | number }) => Element<T>;

type ElementFactoryFromFn<F extends ComponentFn> = ElementFactory<
  ExtractProps<F>,
  ResolveType<ReturnType<F>>
>;

export type IState = {
  [key: string]:
    | IState
    | string
    | Element<any>
    | ((...args: Array<any>) => any)
    | number
    | boolean
    | object
    | null
    | undefined;
};

export type ResolveType<State> = State extends Element<infer T>
  ? T
  : State extends (...args: Array<any>) => any
  ? State
  : State extends Array<infer T>
  ? Array<ResolveType<T>>
  : State extends IState
  ? { [K in keyof State]: ResolveType<State[K]> }
  : State;

function createComponentInternal<F extends ComponentFn>(
  component: F,
  wrapper?: (val: any) => any
): ElementFactoryFromFn<F> {
  let Comp = (props: any) => {
    const out = component(props);
    return toElements(out);
  };
  if (wrapper) {
    Comp = wrapper(Comp);
  }
  return ((props: any) => React.createElement(Comp as any, props)) as any;
}

function createMemoComponent<P, T>(
  component: (props: P) => T
): ElementFactory<P, ElementStateType<T>> {
  return createComponentInternal(component, React.memo) as any;
}

function createComponent<F extends ComponentFn>(
  component: F
): ElementFactoryFromFn<F> {
  return createComponentInternal(component);
}

type IsStaticResult<T> =
  | { static: true }
  | { static: false; converted: Element<T> };

function isStatic<T>(obj: T): IsStaticResult<T> {
  if (React.isValidElement(obj)) {
    return { static: false, converted: obj as any };
  }
  if (Array.isArray(obj)) {
    let allStatic = true;
    const items = obj.map(item => {
      const res = isStatic(item);
      if (allStatic && res.static === false) {
        allStatic = false;
      }
      return res.static ? createStatic(item) : res.converted;
    });
    if (allStatic) {
      return { static: true };
    }
    return { static: false, converted: createArray(items) as any };
  }
  if (isPlainObject(obj)) {
    let allStatic = true;
    const items = Object.keys(obj).reduce((acc, key) => {
      const item = (obj as any)[key];
      const res = isStatic(item);
      if (allStatic && res.static === false) {
        allStatic = false;
      }
      acc[key] = res.static ? createStatic(item) : res.converted;
      return acc;
    }, {} as any);
    if (allStatic) {
      return { static: true };
    }
    return { static: false, converted: createObject(items) as any };
  }
  return { static: true };
}

function toElements<T>(obj: T): Element<ResolveType<T>> {
  const res = isStatic(obj);
  return res.static ? (createStatic(obj) as any) : res.converted;
}

function createElementInternal(
  type: NodeType,
  props: any,
  ...children: Array<any>
) {
  return React.createElement(type, props, ...children);
}

function createStatic<V>(value: V): Element<V> {
  return createElementInternal('static', { value }) as any;
}

function createArray<S extends Array<any>>(
  children: S
): Element<ResolveType<S>> {
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

function createStore<T extends Element<any>>(
  element: T
): Store<ElementStateType<T>> {
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
    // ReactStoreReconciler.injectIntoDevTools({
    //   bundleType: 1, // 0 for PROD, 1 for DEV
    //   version: '0.1.0', // version for your renderer
    //   rendererPackageName: 'react-store', // package name
    //   findFiberByHostInstance: () => {
    //     console.log(root.current?.fiber.return);

    //     return root.current?.fiber.return as any;
    //   },
    //   // findHostInstanceByFiber: ReactStoreReconciler.findHostInstance // host instance (root)
    // });
  };

  return {
    render,
    getState: () => {
      console.log(root.current);
      return getState(root.current!);
    },
    subscribe: sub.subscribe,
  };
}

function createObject<S extends { [key: string]: any }>(
  children: S
): Element<ResolveType<S>> {
  const resolved = Object.keys(children).map(key =>
    createElementInternal(
      'property',
      { name: key, key },
      toElements(children[key])
    )
  );
  return createElementInternal('object', {}, resolved) as any;
}
