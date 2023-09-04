import { Graph } from "../../lib/util";
import { Scope } from "./scope";

export interface ValueProps {
  fn: () => any;
  refs?: string[];
}

export class Value extends Graph<Value> {
  scope: Scope;
  props: ValueProps;
  cb?: (v: Value) => void;
  cycle: number;
  fn?: () => any;
  value: any;

  constructor(scope: Scope, props: ValueProps, cb?: (v: Value) => void) {
    super();
    this.scope = scope;
    this.props = props;
    this.cb = cb;
    this.cycle = 0;
    this.fn = props.fn;
  }

  link(key: string) {
    this.props.refs?.forEach(ref => {
      const other = this.scope.lookupValue(ref);
      if (other) {
        this.addSrc(other);
      } else {
        //TODO link error
      }
    });
  }

  unlink() {
    Array.from(this.src).forEach(src => {
      this.delSrc(src);
    });
  }
}
