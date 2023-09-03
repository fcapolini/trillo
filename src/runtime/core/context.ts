import { Scope } from "./scope";

export interface ContextProps {
}

export class Context<T> {
  props: T;
  global: Scope;
  cycle: number;
  refreshLevel: number;
  pushLevel: number;

  constructor(props: T, cb: (global: Scope) => void) {
    this.props = props;
    this.global = new Scope(this, null, { isRoot: true });
    this.cycle = 0;
    this.refreshLevel = 0;
    this.pushLevel = 0;
    this.init();
    cb(this.global);
    this.refresh();
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

  protected init() {}
}
