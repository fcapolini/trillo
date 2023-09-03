import * as core from "../core";
import { Scope } from "./scope";

export interface PageProps extends core.ContextProps {
  win: Window,
  dom: Element,
}

export class Page extends core.Context<PageProps> {
  win!: Window;
  doc!: Document;
  dom!: Element;

  constructor(props: PageProps, cb: (global: Scope) => void) {
    super(props, cb);
  }

  protected init() {
    const that = this;
    that.win = that.props.win;
    that.doc = that.props.dom.ownerDocument as unknown as Document;
    that.dom = that.props.dom;
    that.global.addValue('window', { fn: function() { return that.win; } });
    that.global.addValue('document', { fn: function() { return that.doc; } });
  }
}
