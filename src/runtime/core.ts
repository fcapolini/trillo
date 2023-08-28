
// =============================================================================
// Context
// =============================================================================

export interface ContextProps {
  cycle?: number;
}

export class Context {
  props: ContextProps;
  scopes: Map<ScopeId, Scope>;
  root?: Scope;
  refreshLevel: number;
  pushLevel: number;

  constructor(props: ContextProps) {
    this.props = props;
    this.scopes = new Map();
    this.refreshLevel = this.pushLevel = 0;
  }

  refresh(scope: Scope, noincrement = false, noupdate = false) {
    this.refreshLevel++;
    try {
      this.props.cycle
        ? (noincrement ? null : this.props.cycle++)
        : this.props.cycle = 1;
      scope.unlinkValues();
      scope.linkValues();
      noupdate ? null : scope.updateValues();
    } catch (ignored: any) {}
    this.refreshLevel--;
    return this;
  }
}

// =============================================================================
// Scope
// =============================================================================

import { TreeNode } from "../lib/util";

export type ScopeId = string;

export interface ScopeProps {
  id: ScopeId;
  name?: string;
  values?: { [key: string]: ValueProps };
}

export class Scope extends TreeNode {
  context: Context;
  props: ScopeProps;
  cloneOf?: Scope;
  values?: { [key: string]: Value };

  constructor(context: Context, props: ScopeProps, cloneOf?: Scope) {
    super(null);
    this.context = context;
    this.props = props;
    this.cloneOf = cloneOf;
  }

  linkValues() {
  }

  unlinkValues() {
  }

  updateValues() {
  }
}

// =============================================================================
// Value
// =============================================================================

export interface ValueProps {
}

export class Value {

}
