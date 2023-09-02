import { PubSub } from "../../lib/util";
import { Scope } from "./scope";

export interface ValueProps {
  refs: string[];
}

export class Value extends PubSub<Value> {
  scope: Scope;
  props: ValueProps;

  constructor(scope: Scope, props: ValueProps) {
    super();
    this.scope = scope;
    this.props = props;
  }

  link() {
    let that: Value | null;
    this.props.refs.forEach(key => {
      if ((that = this.scope.lookupValue(key)) !== null) {
        that.addSub(this);
      } else {

      }
    });
  }

  pubUpdate(pub: Value) {

  }
}
