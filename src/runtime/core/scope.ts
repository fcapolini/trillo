import { Tree } from "../../lib/util";
import { Context } from "./context";
import { ScopeProxyHandler } from "./proxy";
import { Value, ValueProps } from "./value";

export interface ScopeProps {
  isRoot: boolean;
}

export class Scope extends Tree<Scope> {
  context: Context<any>;
  props: ScopeProps;
  proxyHandler: ScopeProxyHandler;
  values: Map<string, Value>;
  proxy: any;

  constructor(context: Context<any>, parent: Scope | null, props: ScopeProps) {
    super(parent);
    this.context = context;
    this.props = props;
    this.proxyHandler = new ScopeProxyHandler(context, this);
    this.values = new Map();
    this.proxy = new Proxy<any>(this.values, this.proxyHandler);
  }

  get(key: string): any {
    return this.proxy[key];
  }

  set(key: string, val: any) {
    this.proxy[key] = val;
  }

  eval(key: string) {
    const value = this.values.get(key);
    value && this.proxyHandler.eval(value);
  }

  trigger(key: string) {
    const value = this.values.get(key);
    value && this.proxyHandler.trigger(value);
  }

  addValue(key: string, props: ValueProps, cb?: (v: any) => void): Value {
    const ret = new Value(this, props, cb);
    this.values.set(key, ret);
    return ret;
  }

  linkValues() {
    this.values.forEach((v: Value) => {
      v.link();
    });
    this.children.forEach(child => {
      child.linkValues();
    });
  }

  unlinkValues() {
    this.values.forEach((v: Value) => {
      v.unlink();
    });
    this.children.forEach(child => {
      child.unlinkValues();
    });
  }

  lookupValue(key: string): Value | undefined {
    let ret = this.values.get(key);
    if (!ret && this.parent && !this.props.isRoot) {
      ret = this.parent.lookupValue(key);
    }
    if (!ret) {
      ret = this.context.global.values.get(key);
    }
    return ret;
  }

  updateValues() {
    this.values.forEach((v, k) => {
      this.proxy[k];
    });
    this.children.forEach(scope => {
      scope.updateValues();
    });
  }
}
