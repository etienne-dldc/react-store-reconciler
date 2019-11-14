import Reconciler, { HostConfig } from 'react-reconciler';
import { shallowEqual } from './utils';
import { Instance, InstanceIs } from './instance';

type Type = 'state' | 'property' | 'object';
type Props = any;

export type Container = { current: Instance | null; onUpdate: () => void };

type TextInstance = Instance;
type HydratableInstance = any;
type PublicInstance = any;
type HostContext = {};
type UpdatePayload = { state: any; onUpdate: () => void };
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
  Type,
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
    parent.current = child;
  },
  prepareUpdate: (
    instance,
    _type,
    oldProps,
    newProps,
    rootContainerInstance
  ) => {
    if (InstanceIs.State(instance)) {
      if (shallowEqual(oldProps.state, newProps.state) === false) {
        return {
          state: newProps.state,
          onUpdate: rootContainerInstance.onUpdate,
        };
      }
      return null;
    }
    throw new Error(`Unhandled update of ${instance.type}`);
  },
  commitUpdate: (instance, updatePayload) => {
    if (InstanceIs.State(instance)) {
      instance.state = updatePayload.state;
      setDirty(instance);
      updatePayload.onUpdate();
      return;
    }
  },
  appendChild: () => {
    console.log('appendChild');
    // parentInstance.appendChild(child);
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

export const reconcilerInstance = Reconciler(StateHostConfig);
