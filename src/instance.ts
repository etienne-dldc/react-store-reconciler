export type InstanceCommon = {
  id: number;
  parent: Instance | null;
  dirty: boolean;
  cache: any;
};

type CreateInstances<T> = {
  [K in keyof T]: T[K] & { type: K } & InstanceCommon;
};

type Instances = CreateInstances<{
  State: { state: any };
  Object: { children: { [key: string]: Instance } };
  Property: { key: string; children: Instance | null };
}>;

type InstanceType = keyof Instances;

export type Instance<K extends InstanceType = InstanceType> = Instances[K];

const INSTANCES_OBJ: { [K in InstanceType]: null } = {
  Property: null,
  State: null,
  Object: null,
};

const INTANCES = Object.keys(INSTANCES_OBJ) as Array<InstanceType>;

export const InstanceIs: {
  [K in InstanceType]: (node: Instance) => node is Instance<K>;
} = INTANCES.reduce<any>((acc, key) => {
  acc[key] = (node: Instance) => node.type === key;
  return acc;
}, {});
