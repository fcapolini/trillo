import { Scope } from "./scope";

export interface ContextProps {
}

export class Context {
  props: ContextProps;
  global: Scope;

  constructor(props: ContextProps) {
    this.props = props;
    this.global = this.makeGlobalScope();
  }

  protected makeGlobalScope(): Scope {
    return new Scope(this, null, {
      isRoot: true,
    });
  }
}
