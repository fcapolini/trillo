import { Scope } from "./scope";

export interface ContextProps {
}

export class Context {
  props: ContextProps;
  global: Scope;
  cycle: number;
  refreshLevel: number;
  pushLevel: number;

  constructor(props: ContextProps, cb: (global: Scope) => void) {
    this.props = props;
    this.global = this.makeGlobalScope();
    this.cycle = 0;
    this.refreshLevel = 0;
    this.pushLevel = 0;
    cb(this.global);
    this.init();
    this.refresh();
  }

  init() {
    this.global.linkValues();
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

  protected makeGlobalScope(): Scope {
    return new Scope(this, null, {
      isRoot: true,
    });
  }
}
