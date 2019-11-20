import Reconciler, { HostConfig } from 'react-reconciler';
import { Instance, InstanceIs } from './Instance';

export type NodeType = 'static' | 'object' | 'property' | 'array';
type Props = any;

export type Container = { current: Instance | null; onUpdate: () => void };

type TextInstance = Instance;
type HydratableInstance = any;
type PublicInstance = any;
type HostContext = {};
type UpdatePayload =
  | {
      type: 'replace-value';
      value: any;
    }
  | {
      type: 'rename-property';
      oldProperty: string;
      newProperty: string;
    };
type ChildSet = any;
type TimeoutHandle = any;
type NoTimeout = -1;

let instanceCounter = 0;

function setDirty(instance: Instance) {
  if (instance.dirty === false) {
    instance.dirty = true;
    if (instance.parent) {
      setDirty(instance.parent);
    }
  }
}

const StateHostConfig: HostConfig<
  NodeType,
  Props,
  Container,
  Instance,
  TextInstance,
  HydratableInstance,
  PublicInstance,
  HostContext,
  UpdatePayload,
  ChildSet,
  TimeoutHandle,
  NoTimeout
> = {
  now: Date.now,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  noTimeout: -1,
  supportsMutation: true,
  isPrimaryRenderer: false,
  supportsPersistence: false,
  supportsHydration: false,

  getRootHostContext: () => {
    return {};
  },
  getChildHostContext: () => {
    return {};
  },
  // Text (ignore)
  shouldSetTextContent: () => false,
  createTextInstance: () => null as any,
  resetTextContent: () => {},
  commitTextUpdate: () => {},

  createInstance: (
    type,
    newProps,
    _rootContainerInstance,
    _hostContext,
    internalInstanceHandle
  ) => {
    const common = {
      id: instanceCounter++,
      fiber: internalInstanceHandle,
      parent: null,
      dirty: true,
      cache: null,
    };
    if (type === 'static') {
      return {
        type: 'Static',
        value: newProps.value,
        ...common,
      };
    }
    if (type === 'property') {
      return {
        type: 'Property',
        key: newProps.name,
        children: null,
        ...common,
      };
    }
    if (type === 'object') {
      return {
        type: 'Object',
        ...common,
        children: {},
      };
    }
    if (type === 'array') {
      return {
        type: 'Array',
        ...common,
        children: [],
      };
    }
    console.warn(`Invalid type ${type}`);
    throw new Error(`Invalid type ${type}`);
  },
  appendInitialChild: (parent, child) => {
    if (InstanceIs.Property(parent)) {
      parent.children = child;
      child.parent = parent;
      return;
    }
    if (InstanceIs.Object(parent)) {
      if (InstanceIs.Property(child)) {
        if (child.children === null) {
          throw new Error('No children ?');
        }
        (parent.children as any)[child.key] = child;
        child.parent = parent;
        return;
      }
      return;
    }
    if (InstanceIs.Array(parent)) {
      parent.children.push(child);
      child.parent = parent;
      return;
    }
    if (InstanceIs.Static(parent)) {
      throw new Error('children of static ??');
    }
    throw new Error('whaat ?');
  },
  finalizeInitialChildren: () => false,
  prepareForCommit: () => {},
  resetAfterCommit: container => {
    container.onUpdate();
  },
  commitMount: () => {
    console.log('commitMount');
  },
  appendChildToContainer: (parent, child) => {
    parent.current = child;
  },
  prepareUpdate: (instance, _type, oldProps, newProps) => {
    return getUpdatePayload(instance, oldProps, newProps);
  },
  commitUpdate: (instance, updatePayload) => {
    if (InstanceIs.Static(instance) && updatePayload.type === 'replace-value') {
      instance.value = updatePayload.value;
      setDirty(instance);
      return;
    }
    if (
      InstanceIs.Property(instance) &&
      updatePayload.type === 'rename-property'
    ) {
      instance.key = updatePayload.newProperty;
      setDirty(instance);
      return;
    }
    console.log('commitUpdate');
  },
  appendChild: (parent, child) => {
    if (InstanceIs.Array(parent)) {
      parent.children.push(child);
      child.parent = parent;
      setDirty(parent);
      return;
    }
    console.log('appendChild', { parent, child });
  },
  insertBefore: () => {
    console.log('appendChild');
    // parentInstance.insertBefore(child, beforeChild);
  },
  removeChild: (parent, child) => {
    if (InstanceIs.Array(parent)) {
      parent.children.splice(parent.children.indexOf(child), 1);
      setDirty(parent);
      return;
    }
    console.log('removeChild');
    // parentInstance.removeChild(child);
  },
  insertInContainerBefore: () => {
    console.log('insertInContainerBefore');
    // container.insertBefore(child, beforeChild);
  },
  removeChildFromContainer: container => {
    console.log('removeChildFromContainer');
    container.current = null;
  },

  // Other
  shouldDeprioritizeSubtree: () => false,
  getPublicInstance: () => {},
  scheduleDeferredCallback: () => {},
  cancelDeferredCallback: () => {},
};

function getUpdatePayload(
  instance: Instance,
  oldProps: any,
  newProps: any
): UpdatePayload | null {
  if (InstanceIs.Static(instance)) {
    if (oldProps.value !== newProps.value) {
      return {
        type: 'replace-value',
        value: newProps.value,
      };
    }
    return null;
  }
  if (InstanceIs.Array(instance)) {
    // console.log({ oldProps, newProps });
    return null;
  }
  if (InstanceIs.Property(instance)) {
    if (oldProps.name !== newProps.name) {
      return {
        type: 'rename-property',
        oldProperty: oldProps.name,
        newProperty: newProps.name,
      };
    }
    return null;
  }
  if (InstanceIs.Object(instance)) {
    // console.log({ oldProps, newProps });
    return null;
  }
  console.warn(`Unhandled update of ${(instance as any).type}`);
  return null;
}

export const ReactStoreReconciler = Reconciler(StateHostConfig);
