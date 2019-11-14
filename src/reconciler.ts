import Reconciler, { HostConfig } from 'react-reconciler';
import { shallowEqual } from './utils';
import { Instance, InstanceIs } from './instance';

export type NodeType =
  | 'state'
  | 'property'
  | 'object'
  | 'array'
  | 'merge-object';
type Props = any;

export type Container = { current: Instance | null; onUpdate: () => void };

type TextInstance = Instance;
type HydratableInstance = any;
type PublicInstance = any;
type HostContext = {};
type UpdatePayloadItem =
  | {
      type: 'replace-state';
      state: any;
    }
  | {
      type: 'rename-property';
      oldProperty: string;
      newProperty: string;
    };
type UpdatePayload = {
  action: UpdatePayloadItem;
  onUpdate: () => void;
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
  setTimeout: window.setTimeout,
  clearTimeout: window.clearTimeout,
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

  createInstance: (type, newProps) => {
    const common = {
      id: instanceCounter++,
      parent: null,
      dirty: true,
      cache: null,
    };
    if (type === 'state') {
      return {
        type: 'State',
        state: newProps.state,
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
    if (type === 'merge-object') {
      return {
        type: 'MergeObject',
        ...common,
        left: null,
        right: null,
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
    if (InstanceIs.MergeObject(parent)) {
      if (parent.left === null) {
        parent.left = child;
      } else {
        parent.right = child;
      }
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
    if (InstanceIs.State(parent)) {
      throw new Error('children of state ??');
    }
    throw new Error('whaat ?');
  },
  finalizeInitialChildren: () => false,
  prepareForCommit: () => {},
  resetAfterCommit: () => {},
  commitMount: () => {
    console.log('commitMount');
  },
  appendChildToContainer: (parent, child) => {
    console.log('appendChildToContainer');
    parent.current = child;
  },
  prepareUpdate: (
    instance,
    _type,
    oldProps,
    newProps,
    rootContainerInstance
  ) => {
    const action = getUpdatePayload(instance, oldProps, newProps);
    if (action) {
      return {
        action,
        onUpdate: rootContainerInstance.onUpdate,
      };
    }
    return null;
  },
  commitUpdate: (instance, updatePayload) => {
    if (
      InstanceIs.State(instance) &&
      updatePayload.action.type === 'replace-state'
    ) {
      instance.state = updatePayload.action.state;
      setDirty(instance);
      updatePayload.onUpdate();
      return;
    }
    if (
      InstanceIs.Property(instance) &&
      updatePayload.action.type === 'rename-property'
    ) {
      instance.key = updatePayload.action.newProperty;
      setDirty(instance);
      updatePayload.onUpdate();
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
  removeChild: () => {
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
): UpdatePayloadItem | null {
  if (InstanceIs.State(instance)) {
    if (shallowEqual(oldProps.state, newProps.state) === false) {
      return {
        type: 'replace-state',
        state: newProps.state,
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
  if (InstanceIs.MergeObject(instance)) {
    // console.log({ oldProps, newProps });
    return null;
  }
  console.warn(`Unhandled update of ${(instance as any).type}`);
  return null;
}

export const reconcilerInstance = Reconciler(StateHostConfig);
