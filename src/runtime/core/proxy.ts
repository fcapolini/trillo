import { Context } from "./context";
import { Scope } from "./scope";
import { Value } from "./value";

export class ScopeProxyHandler implements ProxyHandler<any> {

  constructor(protected context: Context, protected scope: Scope) {}

  get(target: any, key: string, receiver: any): any {
    const value = this.scope.lookupValue(key);
    return value ? this.update(value) : undefined;
  }

  private update(v: Value) {
    if (v.fn && v.cycle < this.context.cycle) {
      v.cycle = this.context.cycle;
      const old = v.value;
      this.eval(v);
      if (old == null ? v.value != null : old !== v.value) {
        v.cb && v.cb(v);
        v.dst && this.context.refreshLevel < 1 && this.propagate(v);
      }
    }
    return v.value;
  }

  private eval(value: Value) {
    try {
      value.value = value.fn?.apply((value.scope as Scope).proxy);
    } catch (ex: any) {
      //TODO: filter errors due to `data` being null/undefined
      //TODO: should we assume null / empty string as result?
      //TODO: (+ use v.ValueProps.pos if available)
      console.log(ex);
    }
  }

  private propagate(value: Value) {
    if (this.context.pushLevel < 1) {
      this.context.cycle = (this.context.cycle ?? 0) + 1;
    }
    this.context.pushLevel++;
    try {
      const that = this;
      value.dst?.forEach(function(v) {
        that.update(v as Value);
      });
    } catch (ignored: any) {}
    this.context.pushLevel--;
  }
}
