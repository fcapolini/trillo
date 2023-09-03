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

  link() {
    let that: Value | undefined;
    this.props.refs?.forEach(key => {
      if ((that = this.scope.lookupValue(key)) !== undefined) {
        this.addSrc(that);
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
