
// =============================================================================
// Context
// =============================================================================

export interface ContextProps {
  globalKey?: string;
}

export class Context {
  props: ContextProps;
  global: Scope;
  lastId: number;

  constructor(props: ContextProps, cb: (ctx: Context) => void) {
    this.props = props;
    this.global = new Scope(this, null, {
      key: props.globalKey
    });
    this.lastId = 0;
    cb(this);
    this.global.linkValues();
  }

  nextId() {
    return ++this.lastId;
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
      if (ret instanceof Value) {
        ret = ret.get();
      }
      return ret;
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
  cb?: (v: any) => void;
  refs?: string[];
}

export class Value {
  scope: Scope;
  props: ValueProps;
  value: any;
  cycle: number;
  src: Set<Value>;
  dst: Set<Value>;

  constructor(scope: Scope, props: ValueProps, value?: any) {
    this.scope = scope;
    this.props = props;
    this.value = value;
    this.cycle = 0;
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
    try {
      const v = this.props.fun.call(this.scope.proxy);
      if (v == null ? this.value != null : v !== this.value) {
        this.value = v;
        this.props.cb && this.props.cb(v);
      }
    } catch (err: any) {
      //TODO
      console.log(err);
    }
    return this.value;
  }
}
