import * as core from "../core";
import { Page } from "./page";

export interface ScopeProps extends core.ScopeProps {

}

export class Scope extends core.Scope {

  constructor(context: Page, parent: Scope | null, props: ScopeProps) {
    super(context, parent, props);
  }

}
