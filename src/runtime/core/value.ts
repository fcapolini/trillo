import { Scope } from "./scope";

export interface ValueProps {
  fn: () => any;
  refs?: string[];
}

export class Value {
  scope: Scope;
  props: ValueProps;
  cb?: (v: Value) => void;
  cycle: number;
  src: Set<Value>;
  dst: Set<Value>;
  fn?: () => any;
  value: any;

  constructor(scope: Scope, props: ValueProps, cb?: (v: Value) => void) {
    this.scope = scope;
    this.props = props;
    this.cb = cb;
    this.cycle = 0;
    this.src = new Set();
    this.dst = new Set();
    this.fn = props.fn;
  }

  link() {
    let that: Value | undefined;
    this.props.refs?.forEach(key => {
      if ((that = this.scope.lookupValue(key)) !== undefined) {
        that.dst.add(this);
        this.src.add(that);
      } else {
        //TODO link error
      }
    });
  }

  unlink() {
    this.src.forEach(v => {
      v.dst.delete(this);
    });
    this.src.clear();
  }
}
