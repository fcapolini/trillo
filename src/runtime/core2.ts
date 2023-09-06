
// =============================================================================
// Context
// =============================================================================

export interface ContextProps {
  global: ScopeProps;
}

export class Context {
  props: ContextProps;
  global: Scope;
  lastId: number;
  cycle: number;
  refreshLevel: number;
  pushLevel: number;

  constructor(props: ContextProps, cb: (ctx: Context) => void) {
    this.props = props;
    this.global = new Scope(this, null, props.global);
    this.lastId = 0;
    this.cycle = 0;
    this.refreshLevel = 0;
    this.pushLevel = 0;
    cb(this);
    this.global.linkValues();
    this.refresh();
  }

  nextId() {
    return ++this.lastId;
  }

  refresh(scope?: Scope, noincrement?: boolean, noupdate?: boolean) {
    this.refreshLevel++;
    try {
      scope || (scope = this.global);
      noincrement || (this.cycle++);
      scope.unlinkValues();
      scope.linkValues();
      noupdate || (scope.updateValues());
    } catch (ignored: any) {}
    this.refreshLevel--;
  }
}

// =============================================================================
// Scope
// =============================================================================

export interface ScopeProps {
  key?: string;
}

export class Scope {
  context: Context;
  parent: Scope | null;
  props: ScopeProps;
  object: any;
  proxy: any;

  constructor(context: Context, parent: Scope | null, props: ScopeProps) {
    this.context = context;
    this.parent = parent;
    this.props = props;
    this.object = {
      /*
        we use the prototype chain for simulating scope nesting
      */
      __proto__: parent?.proxy,
      /*
        reserved properties
      */
      __scope__: this,
      __name__: props.key,
      __values__: new Map<string, Value>(),
      __children__: [],
    }
    this.proxy = new Proxy(this.object, Scope.handler);
    parent && parent.object.__children__.push(this.proxy);
    if (props.key) {
      (parent ?? this).object[props.key] = this.proxy;
    }
  }

  static handler = {
    get(target: any, prop: string, receiver: any) {
      let ret = Reflect.get(target, prop, receiver);
      if (ret && ret instanceof Value) {
        ret = ret.get();
      }
      return ret;
    },

    set(target: any, prop: string, val: any, receiver?: any): boolean {
      let v = Reflect.get(target, prop, receiver);
      if (v && v instanceof Value) {
        v = v.set(val);
        return true;
      }
      target[prop] = val;
      return true;
    }
  }

  linkValues() {
    this.object.__values__.forEach((v: Value, k: string) => {
      v.link();
    });
    this.object.__children__.forEach((proxy: any) => {
      proxy.__scope__.linkValues();
    });
  }

  unlinkValues() {
    this.object.__values__.forEach((v: Value, k: string) => {
      v.unlink();
    });
    this.object.__children__.forEach((proxy: any) => {
      proxy.__scope__.unlinkValues();
    });
  }

  updateValues() {
    this.object.__values__.forEach((v: Value, k: string) => {
      this.proxy[k];
    });
    this.object.__children__.forEach((proxy: any) => {
      proxy.__scope__.updateValues();
    });
  }

  lookup(key: string, canAscend = true): any {
    let ret: any;
    let scope = this;
    do {
      ret = scope.object.__values__.get(key);
      if (!ret && scope.object.hasOwnProperty(key)) {
        ret = scope.object[key];
      }
      scope = scope.parent as any;
    } while (!ret && scope && canAscend);
    return ret;
  }

  // lookupRef(ref: string): Value | undefined {
  //   const path = ref.split('.');
  //   let ret = this.lookup(path[0]);
  //   if (!ret) {
  //     return undefined;
  //   }
  //   //TODO path
  //   return ret;
  // }
}

// =============================================================================
// Value
// =============================================================================

export interface ValueProps {
  key?: string;
  fun: () => any;
  refs?: string[];
  cb?: (v: any) => void;
}

export class Value {
  scope: Scope;
  props: ValueProps;
  value: any;
  cycle: number;
  fun?: () => any;
  src: Set<Value>;
  dst: Set<Value>;

  constructor(scope: Scope, props: ValueProps, value?: any) {
    this.scope = scope;
    this.props = props;
    this.value = value;
    this.cycle = 0;
    this.fun = props.fun;
    this.src = new Set();
    this.dst = new Set();
    const key = props.key ?? `__v_${scope.context.nextId()}__`;
    scope.object.__values__.set(key, this);
    scope.object[key] = this;
  }

  link() {
    this.props.refs?.forEach(ref => {
      const other = this.scope.lookup(ref);
      if (other && other instanceof Value) {
        this.src.add(other);
        other.dst.add(this);
      }
    });
  }

  unlink() {
    const others: Value[] = [];
    this.src.forEach(other => others.push(other));
    others.forEach(other => {
      this.src.delete(other);
      other.dst.delete(this);
    });
  }

  get() {
    const ctx = this.scope.context;
    if (this.fun && this.cycle < ctx.cycle) {
      this.cycle < ctx.cycle;
      const old = this.value;
      this.eval();
      if (old == null ? this.value != null : old !== this.value) {
        this.props.cb && this.props.cb(this.value);
        if (this.dst.size && ctx.refreshLevel < 1) {
          this.propagate();
        }
      }
    }
    return this.value;
  }

  set(v: any) {
    const ctx = this.scope.context;
    const old = this.value;
    this.value = v;
    delete this.fun;
    if (old == null ? this.value != null : old !== this.value) {
      this.props.cb && this.props.cb(this.value);
      if (this.dst.size && ctx.refreshLevel < 1) {
        this.propagate();
      }
    }
  }

  eval() {
    try {
      this.value = this.props.fun.call(this.scope.proxy);
    } catch (err: any) {
      //TODO
    }
  }

  propagate() {
    const ctx = this.scope.context;
    if (ctx.pushLevel < 1) {
      ctx.cycle++;
    }
    ctx.pushLevel++;
    try {
      this.dst.forEach(dst => dst.get());
    } catch (ignored: any) {}
    ctx.pushLevel--;
  }
}
