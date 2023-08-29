
// =============================================================================
// Context
// =============================================================================

export interface ContextProps {
  cycle: number;
  root: ScopeProps;
}

export class Context {
  props: ContextProps;
  scopes: Map<ScopeId, Scope>;
  root: Scope;

  constructor(props: ContextProps) {
    this.props = props;
    this.scopes = new Map();
    this.root = this.makeRoot(props.root);
  }

  protected makeRoot(props: ScopeProps) {
    return new Scope(this, null, props);
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
  children?: ScopeProps[];
}

export class Scope extends TreeNode {
  context: Context;
  props: ScopeProps;
  cloneOf?: Scope;
  values?: { [key: string]: Value };

  constructor(
    context: Context,
    parent: Scope | null,
    props: ScopeProps,
    index = -1,
    cloneOf?: Scope
  ) {
    super(parent, index);
    this.context = context;
    this.props = props;
    this.cloneOf = cloneOf;
    context.scopes.set(props.id, this);
  }

  dispose() {
    this.context.scopes.delete(this.props.id);
  }
}

// =============================================================================
// Value
// =============================================================================

export interface ValueProps {
}

export class Value {

}
