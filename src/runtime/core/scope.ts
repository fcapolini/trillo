import { Tree } from "../../lib/util";
import { Context } from "./context";
import { Value } from "./value";

export interface ScopeProps {
  isRoot: boolean;
}

export class Scope extends Tree<Scope> {
  context: Context;
  props: ScopeProps;
  values: Map<string, Value>;

  constructor(context: Context, parent: Scope | null, props: ScopeProps) {
    super(parent);
    this.context = context;
    this.props = props;
    this.values = new Map();
  }

  linkValues() {
    this.values.forEach((v: Value) => {
      v.link();
    });
  }

  unlinkValues() {
    this.values.forEach((v: Value) => {
      v.unlink();
    });
  }

  lookupValue(key: string): Value | null {
    let ret = this.values.get(key);
    if (!ret && this.parent && !this.props.isRoot) {
      ret = this.parent.values.get(key);
    }
    if (!ret) {
      ret = this.context.global.values.get(key);
    }
    return ret || null;
  }
}
