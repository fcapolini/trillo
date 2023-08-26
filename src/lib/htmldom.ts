import * as dom from "./dom";
import { normalizeText, peek, StringBuf } from "./util";
import HtmlParser from "./htmlparser";

export const SKIP_CONTENT_TAGS = new Set(['SCRIPT', 'STYLE']);
const NON_NORMALIZED_TAGS = { PRE: true, SCRIPT: true };

export interface HtmlPos {
  origin: number,
  i1: number,
  i2: number,
}

export class HtmlNode implements dom.DomNode {
  ownerDocument: dom.DomDocument | undefined;
  parentElement: dom.DomElement | undefined;
  nodeType: number;
  pos: HtmlPos;

  constructor(
    doc: HtmlDocument | undefined, parent: HtmlElement | undefined,
    type: number, i1: number, i2: number, origin: number
  ) {
    this.ownerDocument = doc;
    parent ? parent.addChild(this) : null;
    this.nodeType = type;
    this.pos = { origin: origin, i1: i1, i2: i2 };
  }

  get nextSibling(): dom.DomNode | null {
    let ret = null;
    if (this.parentElement) {
      const siblings = (this.parentElement as HtmlElement).children;
      const i = siblings.indexOf(this);
      if (i >= 0 && (i + 1) < siblings.length) {
        ret = siblings[i + 1];
      }
    }
    return ret;
  }

  remove(): HtmlNode {
    if (this.parentElement) {
      var i = (this.parentElement as HtmlElement).children.indexOf(this);
      if (i >= 0) {
        (this.parentElement as HtmlElement).children.splice(i, 1);
      }
      this.parentElement = undefined;
    }
    return this;
  }

  cloneNode(deep: boolean): dom.DomNode {
    return new HtmlNode(
      this.ownerDocument as HtmlDocument | undefined,
      undefined,
      this.nodeType,
      this.pos.i1, this.pos.i2, this.pos.origin
    );
  }

  toString(sort = false, plain = false, normalize = false) {
    var sb = new StringBuf();
    this.output(sb, sort, plain, normalize);
    return sb.toString();
  }

  output(sb: StringBuf, sort: boolean, plain: boolean, normalize: boolean): StringBuf {
    return sb;
  }
}

// http://xahlee.info/js/html5_non-closing_tag.html
export const VOID_ELEMENTS = new Set([
  'AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT',
  'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR',
  // obsolete
  'COMMAND', 'KEYGEN', 'MENUITEM'
]);

export class HtmlElement extends HtmlNode implements dom.DomElement {
  tagName: string;
  attributes: Map<string, HtmlAttribute>;
  children: Array<HtmlNode>;
  selfclose: boolean;

  classList: { add: (name: string) => void, remove: (name: string) => void };
  style: { setProperty: (k: string, v: string) => void, removeProperty: (k: string) => void };

  constructor(
    doc: HtmlDocument | undefined, parent: HtmlElement | undefined,
    name: string, i1: number, i2: number, origin: number
  ) {
    super(doc, parent, dom.ELEMENT_NODE, i1, i2, origin);
    this.tagName = name.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.selfclose = false;
    var that = this;
    this.classList = {
      add: function(name:string) {
        var a = that.attributes.get('class') as HtmlClassAttribute;
        !a ? a = that.setAttribute('class', '') as HtmlClassAttribute : null;
        a.add(name);
      },
      remove: function(name:string) {
        var a = that.attributes.get('class') as HtmlClassAttribute;
        if (a) {
          a.remove(name);
        }
      }
    };
    this.style = {
      setProperty: function(k:string, v:string) {
        var a = that.attributes.get('style') as HtmlStyleAttribute;
        a ??= that.setAttribute('style', '') as HtmlStyleAttribute;
        a.setProperty(k, v);
      },
      removeProperty: function(k:string) {
        var a = that.attributes.get('style') as HtmlStyleAttribute;
        if (a) {
          a.removeProperty(k);
        }
      },
    }
  }

  appendChild(n: dom.DomNode) {
    this.addChild(n);
  }

  insertBefore(n: dom.DomNode, ref: dom.DomNode | null) {
    this.addChild(n, ref ?? undefined);
  }

  removeChild(n: dom.DomNode) {
    (n as HtmlNode).remove();
  }

  get firstChild(): HtmlNode | undefined {
    return this.children.length > 0 ? this.children[0] : undefined;
  }

  get firstElementChild(): dom.DomElement | undefined {
    return this.getFirstElementChild();
  }

  get childElementCount(): number {
    let ret = 0;
    for (let n of this.children) {
      if (n.nodeType === dom.ELEMENT_NODE) {
        ret++;
      }
    }
    return ret;
  }

  get previousElementSibling(): HtmlElement | undefined {
    if (this.parentElement) {
      var i = (this.parentElement as HtmlElement).children.indexOf(this);
      while (--i >= 0) {
        var sibling = (this.parentElement as HtmlElement).children[i];
        if (sibling.nodeType === dom.ELEMENT_NODE) {
          return sibling as HtmlElement;
        }
      }
    }
    return undefined;
  }

  get nextElementSibling(): HtmlElement | undefined {
    const parent = this.parentElement as HtmlElement;
    if (parent) {
      var i = parent.children.indexOf(this);
      while (++i < parent.children.length) {
        var sibling = parent.children[i];
        if (sibling.nodeType === dom.ELEMENT_NODE) {
          return sibling as HtmlElement;
        }
      }
    }
    return undefined;
  }

  addChild(child: dom.DomNode, before?: dom.DomNode) {
    //TODO: as per specs we should make sure `child` gets unlinked
    // https://developer.mozilla.org/en-US/docs/Web/API/Node/appendChild
    // but this currently breaks preprocessor's tests:
    // (child as HtmlNode).remove();
    child.parentElement = this;
    var i = before ? this.children.indexOf(before as any) : -1;
    if (i < 0) {
      this.children.push(child as any);
    } else {
      this.children.splice(i, 0, child as any);
    }
  }

  setAttribute(
    name: string, value?: string, quote?: string,
    i1?: number, i2?: number, origin?: number
  ): HtmlAttribute|undefined {
    var a = this.attributes.get(name);
    if (!a) {
      if (value != undefined) {
        if (name === 'class') {
          a = new HtmlClassAttribute(name, value, quote ? quote : '"',
              i1, i2, origin);
        } else if (name === 'style') {
          a = new HtmlStyleAttribute(name, value, quote ? quote : '"',
              i1, i2, origin);
        } else {
          a = new HtmlAttribute(name, value, quote ? quote : '"',
              i1, i2, origin);
        }
        this.attributes.set(name, a);
      }
    } else {
      if (value == undefined) {
        this.attributes.delete(name);
      } else {
        a.value = value;
        a.quote = quote ? quote : a.quote;
        if (i1 && i2 && origin) {
          a.pos1 = { origin: origin, i1: i1, i2: i2 };
        }
      }
    }
    return a;
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  getAttribute(name: string): string | undefined {
    var a = this.attributes.get(name);
    return a?.value;
  }

  getAttributeNames(sort = false): Array<string> {
    var ret = new Array<string>();
    this.attributes.forEach((_, key) => {
      ret.push(key);
    });
    if (sort) {
      ret = ret.sort((a, b) => (a > b ? 1 : (a < b ? -1 : 0)));
    }
    return ret;
  }

  isVoid(): boolean {
    return VOID_ELEMENTS.has(this.tagName);
  }

  getFirstElementChild(): dom.DomElement | undefined {
    for (var i in this.children) {
      var n = this.children[i];
      if (n.nodeType === dom.ELEMENT_NODE) {
        return n as unknown as dom.DomElement;
      }
    }
    return undefined;
  }

  get childNodes(): dom.DomNodeList {
    return {
      length: this.children.length,
      item: (i) => {
        if (i >= 0 && i < this.children.length) {
          return (this.children[i] as dom.DomNode);
        } else {
          return undefined;
        }
      },
      forEach: (cb) => {
        var i = 0;
        for (var child of this.children.slice()) {
          cb(child as dom.DomNode, i++);
        }
      },
    }
  }

  get innerHTML() {
    var sb = new StringBuf();
    for (var i in this.children) {
      this.children[i].output(sb, false, true, false);
    }
    return sb.toString();
  }

  set innerHTML(s: string) {
    while (this.children.length > 0) {
      this.children[this.children.length - 1].remove();
    }
    var doc = HtmlParser.parse(s);
    for (var i in doc.children) {
      var c = doc.children[i];
      this.addChild(c);
    }
  }

  set innerText(s: string) {
    s = s.split('<').join('&lt;');
    s = s.split('\n').join('<br />');
    if (this.children.length == 1 && this.children[0].nodeType == dom.TEXT_NODE) {
      (this.children[0] as HtmlText).nodeValue = s;
    } else {
      while (this.children.length > 0) {
        this.children[this.children.length - 1].remove();
      }
      new HtmlText(this.ownerDocument as HtmlDocument, this, s, 0, 0, 0);
    }
  }

  get outerHTML() {
    var sb = new StringBuf();
    this.output(sb, false, true, false);
    return sb.toString();
  }

  cloneNode(deep: boolean): dom.DomNode {
    const ret = new HtmlElement(
      this.ownerDocument as HtmlDocument | undefined,
      undefined,
      this.tagName,
      this.pos.i1, this.pos.i2, this.pos.origin
    );
    this.attributes.forEach((v, k) => {
      ret.setAttribute(k, v.value);
    });
    ret.selfclose = this.selfclose;
    if (deep) {
      this.children.forEach(n => {
        ret.addChild(n.cloneNode(deep));
      });
    }
    return ret;
  }

  override output(
    sb: StringBuf, sort: boolean, plain: boolean, normalize: boolean
  ): StringBuf {
    var name = this.tagName.toLowerCase();
    sb.add('<'); sb.add(name);

    this.outputAttributes(sb, sort, plain);

    if (this.isVoid()) {
      sb.add(' />');
    } else {
      sb.add('>');
      if (normalize && Reflect.has(NON_NORMALIZED_TAGS, this.tagName)) {
        const last: HtmlText = peek(this.children);
        if (last && last.nodeType === dom.TEXT_NODE) {
          const res = /\n\s+$/.exec(last.nodeValue);
          res && (last.nodeValue = last.nodeValue.substring(0, res.index + 1));
        }
      }
      const flag = normalize && !Reflect.has(NON_NORMALIZED_TAGS, this.tagName);
      for (var i in this.children) {
        this.children[i].output(sb, sort, plain, flag);
      }
      sb.add('</'); sb.add(name); sb.add('>');
    }
    return sb;
  }

  outputAttributes(sb: StringBuf, sort: boolean, plain: boolean) {
    var keys = this.getAttributeNames();
    if (sort) {
      keys = keys.sort((a, b) => (a > b ? 1 : (a < b ? -1 : 0)));
    }
    for (var key of keys) {
      var a = this.attributes.get(key);
      a?.output(sb, sort, plain);
    }
  }

  addEventListener(t: string, l: (ev: any) => void) {
    // console.log(`${this.tagName}.addEventListener("${t}")`);
  }
  removeEventListener(t: string, l: (ev: any) => void) { }

  scan(cb: (n: HtmlElement) => boolean, recursive: boolean): HtmlElement | undefined {
    for (const n of this.children) {
      if (n.nodeType === dom.ELEMENT_NODE) {
        if (cb(n as HtmlElement)) {
          return n as HtmlElement;
        }
        if (recursive) {
          const ret = (n as HtmlElement).scan(cb, true);
          if (ret) {
            return ret;
          }
        }
      }
    }
    return undefined;
  }

  // ===================================================================================
  // private
  // ===================================================================================

  // from haxe-htmlparser: htmlparser.HtmlTools.hx
  static escape(text: string, chars = ""): string {
    var r = text;
    if (chars.indexOf('<') >= 0) r = r.split("<").join("&lt;");
    if (chars.indexOf('>') >= 0) r = r.split(">").join("&gt;");
    if (chars.indexOf('"') >= 0) r = r.split('"').join("&quot;");
    if (chars.indexOf("'") >= 0) r = r.split("'").join("&apos;");
    if (chars.indexOf(" ") >= 0) r = r.split(" ").join("&nbsp;");
    if (chars.indexOf("\n") >= 0) r = r.split("\n").join("&#xA;");
    if (chars.indexOf("\r") >= 0) r = r.split("\r").join("&#xD;");
    return r;
  }

}

export class HtmlDocument extends HtmlElement implements dom.DomDocument {

  constructor(origin: number) {
    super(undefined, undefined, "#document", 0, 0, origin);
    this.ownerDocument = this;
    this.selfclose = true;
  }

  get head(): dom.DomElement | undefined {
    return (this.firstElementChild as HtmlElement | undefined)?.scan(
      e => e.tagName === 'HEAD',
      false
    );
  }

  get body(): dom.DomElement | undefined {
    return (this.firstElementChild as HtmlElement | undefined)?.scan(
      e => e.tagName === 'BODY',
      false
    );
  }

  createElement(tagName: string): dom.DomElement {
    var ret = new HtmlElement(this, undefined, tagName, 0, 0, 0);
    return ret;
  }

  createComment(text: string): dom.DomComment {
    var ret = new HtmlComment(this, undefined, text, 0, 0, 0);
    return ret;
  }

  createTextNode(text: string): dom.DomTextNode {
    var ret = new HtmlText(this, undefined, text, 0, 0, 0, false);
    return ret;
  }

  override output(
    sb: StringBuf, sort: boolean, plain: boolean, normalize: boolean
  ): StringBuf {
    for (var i in this.children) {
      this.children[i].output(sb, sort, plain, normalize);
    }
    return sb;
  }
}

export class HtmlText extends HtmlNode implements dom.DomTextNode {
  escape: boolean;
  nodeValue: string;

  constructor(
    doc: HtmlDocument | undefined, parent: HtmlElement | undefined,
    text: string, i1: number, i2: number, origin: number, escape?: boolean
  ) {
    super(doc, parent, dom.TEXT_NODE, i1, i2, origin);
    if (escape == undefined) {
      if (parent && SKIP_CONTENT_TAGS.has(parent.tagName)) {
        escape = false;
      } else {
        escape = true;
      }
    }
    this.escape = escape;
    this.nodeValue = (escape ? htmlUnescape(text) : text);
  }

  cloneNode(deep: boolean): dom.DomNode {
    const ret = new HtmlText(
      this.ownerDocument as HtmlDocument | undefined,
      undefined,
      this.nodeValue,
      this.pos.i1, this.pos.i2, this.pos.origin,
      false
    );
    ret.escape = this.escape;
    return ret;
  }

  override output(
    sb: StringBuf, sort: boolean, plain: boolean, normalize: boolean
  ): StringBuf {
    if (this.nodeValue != null) {
      const s = this.nodeValue
        ? (this.escape ? htmlEscape2(this.nodeValue) : this.nodeValue)
        : '';
      sb.add(normalize && s ? normalizeText(s) as string : s);
    }
    return sb;
  }
}

// https://www.w3docs.com/snippets/javascript/how-to-html-encode-a-string.html
function htmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/'/g, "&apos;")
    .replace(/"/g, '&quot;')
    .replace(/>/g, '&gt;')
    .replace(/</g, '&lt;');
}
function htmlEscape2(str: string): string {
  return str
    .replace(/'/g, "&apos;")
    .replace(/"/g, '&quot;')
    .replace(/>/g, '&gt;')
    .replace(/</g, '&lt;');
}
function htmlUnescape(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export class HtmlComment extends HtmlNode implements dom.DomComment {
  nodeValue: string;

  constructor(
    doc: HtmlDocument | undefined, parent: HtmlElement | undefined,
    text: string, i1: number, i2: number, origin: number
  ) {
    super(doc, parent, dom.COMMENT_NODE, i1, i2, origin);
    this.nodeValue = text;
  }

  cloneNode(deep: boolean): dom.DomNode {
    return new HtmlComment(
      this.ownerDocument as HtmlDocument | undefined,
      undefined,
      this.nodeValue,
      this.pos.i1, this.pos.i2, this.pos.origin
    );
  }

  override output(
    sb: StringBuf, sort: boolean, plain: boolean, normalize: boolean
  ): StringBuf {
    sb.add('<!--');
    if (this.nodeValue) {
      sb.add(this.nodeValue);
    }
    sb.add('-->');
    return sb;
  }
}

// =============================================================================
// HtmlAttribute
// =============================================================================

export class HtmlAttribute {
  name: string;
  value: string;
  quote?: string;
  pos1?: HtmlPos;
  pos2?: HtmlPos;

  constructor(
    name: string, value: string, quote?: string,
    i1?: number, i2?: number, origin?: number
  ) {
    this.name = name;
    this.value = value;
    this.quote = quote;
    if (origin && i1 && i2) {
      this.pos1 = {origin:origin, i1:i1, i2:i2};
    }
  }

  output(sb: StringBuf, sort: boolean, plain: boolean) {
    sb.add(' '); sb.add(this.name);
    var outputValue = this.getOutputValue(sort, plain);
    if (outputValue !== ''/* || this.quote*/) {
      if (plain) {
        var q = this.quote ? this.quote : '"';
        sb.add('='); sb.add(q === '[' ? '[[' : q);
        if (q === '[') {
          sb.add(outputValue);
        } else {
          sb.add(HtmlElement.escape(outputValue, q));
        }
        sb.add(q === '[' ? ']]' : q);
      } else {
        var q = this.quote === "'" ? "'" : '"';
        sb.add('='); sb.add(q);
        this.quote === "[" && sb.add('[[');
        sb.add(HtmlElement.escape(outputValue, "<>\r\n" + q));
        this.quote === "[" && sb.add(']]');
        sb.add(q);
      }
    }
  }

  getOutputValue(sort: boolean, plain: boolean): string {
    return this.value;
  }
}

class HtmlClassAttribute extends HtmlAttribute {
  classes?: Set<string>;

  constructor(
    name: string, value: string, quote?: string,
    i1?: number, i2?: number, origin?: number
  ) {
    super(name, value, quote, i1, i2, origin);
  }

  add(name: string) {
    !this.classes ? this.classes = new Set() : null;
    this.classes.add(name.trim());
  }

  remove(name: string) {
    this.classes ? this.classes.delete(name.trim()) : null;
  }

  override output(sb: StringBuf, sort: boolean, plain: boolean) {
    if (this.value != '' || (this.classes && this.classes.size > 0)) {
      super.output(sb, sort, plain);
    }
  }

  //TODO: sort
  override getOutputValue(sort: boolean, plain: boolean): string {
    var sb = new StringBuf();
    sb.add(this.value);
    if (this.classes) {
      this.classes.forEach(c => {
        sb.add(' ');
        sb.add(c);
      });
    }
    return sb.toString().trim();
  }
}

class HtmlStyleAttribute extends HtmlAttribute {
  styles?: Map<string,string>;

  constructor(
    name: string, value: string, quote?: string,
    i1?: number, i2?: number, origin?: number
  ) {
    super(name, value, quote, i1, i2, origin);
    this.value = value;
  }

  setProperty(k: string, v: string) {
    !this.styles ? this.styles = new Map() : null;
    v ? this.styles.set(k, v) : this.styles.delete(k);
  }

  removeProperty(k: string) {
    this.styles ? this.styles.delete(k.trim()) : null;
  }

  override output(sb: StringBuf, sort: boolean, plain: boolean) {
    if (this.value !== '' || (this.styles && this.styles.size > 0)) {
      super.output(sb, sort, plain);
    }
  }

  //TODO: sort
  override getOutputValue(sort: boolean, plain: boolean): string {
    var sb = new StringBuf();
    var s = this.value.trim();
    if (s !== '') {
      sb.add(s);
      !s.endsWith(';') ? sb.add(';') : null;
    }
    if (this.styles) {
      this.styles.forEach((v, k) => {
        sb.add(k); sb.add(':');
        sb.add(v); sb.add(';');
      });
    }
    return sb.toString().trim();
  }
}
