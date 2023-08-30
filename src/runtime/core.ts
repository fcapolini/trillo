import { TreeNode } from "../lib/util";

const OUTER_PROPERTY = 'outer';
const RESERVED_PREFIX = '__';

// =============================================================================
// Context
// =============================================================================

export interface ContextProps {
  cycle: number;
  root: ScopeProps;
}

export class Context {
  props: ContextProps;
  scopes: Map<ScopeId, Scope>;
  root: Scope;

  constructor(props: ContextProps) {
    this.props = props;
    this.scopes = new Map();
    this.root = this.makeRoot(props.root);
  }

  protected makeRoot(props: ScopeProps) {
    return new Scope(this, null, props);
  }
}

// =============================================================================
// Scope
// =============================================================================

export type ScopeId = string;

export interface ScopeProps {
  id: ScopeId;
  name?: string;
  proxyHandler: ScopeProxyHandler;
  values?: { [key: string]: ValueProps };
  proxy: any;
  children?: ScopeProps[];
}

export class Scope extends TreeNode {
  context: Context;
  props: ScopeProps;
  cloneOf?: Scope;
  proxyHandler: ScopeProxyHandler;
  values: { [key: string]: Value };
  proxy = Proxy<any>;
  children: Scope[];

  constructor(
    context: Context,
    parent: Scope | null,
    props: ScopeProps,
    index = -1,
    cloneOf?: Scope
  ) {
    super(parent, index);
    context.scopes.set(props.id, this);
    this.context = context;
    this.props = props;
    this.cloneOf = cloneOf;
    this.proxyHandler = new ScopeProxyHandler(context, this);
    this.values = {};
    this.proxy = new Proxy<any>(this.values, this.proxyHandler);
    this.children = [];
    this.init();
  }

  dispose() {
    this.context.scopes.delete(this.props.id);
  }

  get parentScope(): Scope | null {
    return this.parent as any;
  }

  lookupValue(key: string): Value | null {
    return null;//tempdebug
  }

  protected init() {

  }
}

// =============================================================================
// ScopeProxyHandler
// =============================================================================

class ScopeProxyHandler implements ProxyHandler<any> {
  context: Context;
  scope: Scope;

  constructor(context: Context, scope: Scope) {
    this.context = context;
    this.scope = scope;
  }

  get(target: any, prop: string, receiver?: any) {
    if (prop === OUTER_PROPERTY) {
      return this.scope.parentScope?.proxy;
    }
    const value = this.scope.lookupValue(prop);
    // value && !value.props.passive && this.update(value);
    return value?.props.val;
  }

  set(target: any, prop: string, val: any, receiver?: any) {
    if (prop.startsWith(RESERVED_PREFIX)) {
      return false;
    }
    const value = this.scope.lookupValue(prop);
    if (value && !value.props.passive) {
      const old = value.props.val;
      value.props.val = val;
      // delete value.fn;
      // if (old == null ? value.props.val != null : old !== value.props.val) {
      //   value.cb && value.cb(value);
      //   this.propagate(value);
      // }
    }
    return !!value;
  }

  apply(target: any, thisArg: any, argumentsList: any[]) {
    return target.apply(this.scope.proxy, argumentsList);
  }

  // trigger(value: Value) {
  //   value.cb && value.cb(value);
  //   this.propagate(value);
  // }
}

// =============================================================================
// Value
// =============================================================================

export interface ValueProps {
  passive: boolean;
  val: any;
}

export class Value {
  scope: Scope;
  props: ValueProps;
  cb?: (v: any) => void;

  constructor(scope: Scope, props: ValueProps) {
    this.scope = scope;
    this.props = props;
  }
}
