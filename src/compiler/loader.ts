import * as fs from "fs";
import path from "path";
import { ELEMENT_NODE, TEXT_NODE } from "../lib/dom";
import { HtmlDocument, HtmlElement, HtmlNode, HtmlPos, HtmlText } from "../lib/htmldom";
import HtmlParser, { HtmlException } from "../lib/htmlparser";

export const EMBEDDED_INCLUDE_FNAME = ':embedded:';

const INCLUDE_TAG = ':INCLUDE';
const IMPORT_TAG = ':IMPORT';
const INCLUDE_SRC = 'src';
const INCLUDE_AS = 'as';

// const DEFINE_TAG = ':DEFINE';
// const DEFINE_ARG = 'tag';
// const SLOT_TAG = ':SLOT';
// const SLOT_ARG = 'name';
// const SLOT_ATTR = ':slot';

// export const MARKDOWN_TAG = ':MARKDOWN';
// const MARKDOWN_DEFAULT_CLASS = 'reflectjs-markdown';

const MAX_RECURSIONS = 100;

interface Definition {
  name1: string,
  name2: string,
  e: HtmlElement,
  ext?: Definition,
}

export interface SourcePos {
  fname: string,
  line1: number,
  column1: number,
  line2: number,
  column2: number,
}

export interface VirtualFile {
  fname: string,
  content: string,
}

export default class Loader {
  rootPath: string;
  parser: HtmlParser;
  sources: Array<string>;
  macros: Map<string, Definition>;
  virtualFiles: Map<string, string> | undefined;

  constructor(rootPath: string, virtualFiles?: Array<VirtualFile>) {
    this.rootPath = rootPath;
    this.parser = new HtmlParser();
    this.sources = [];
    this.macros = new Map();
    if (virtualFiles) {
      this.virtualFiles = new Map();
      for (const v of virtualFiles) {
        const filePath = path.normalize(path.join(rootPath, v.fname));;
        this.virtualFiles.set(filePath, v.content);
      }
    }
  }

  reset(virtualFiles?: Array<VirtualFile>) {
    this.parser = new HtmlParser();
    this.sources = [];
    this.macros = new Map();
    if (virtualFiles) {
      this.virtualFiles = new Map();
      for (const v of virtualFiles) {
        const filePath = path.normalize(path.join(this.rootPath, v.fname));
        this.virtualFiles.set(filePath, v.content);
      }
    }
    return this;
  }

  async read(fname: string, embeddedInclude?: string): Promise<HtmlDocument | undefined> {
    if (!embeddedInclude) {
      // by specifying `embeddedInclude` we ensure `<head>` and `<body>`
      embeddedInclude = '<lib></lib>';
    }
    const ret = await this.readFile(fname, 0);
    if (ret) {
      if (embeddedInclude != null) {
        domEnsureHeadAndBody(ret);
        const head = domGetTop(ret, 'HEAD');
        if (head) {
          let inc = this.parser.parseDoc(embeddedInclude, EMBEDDED_INCLUDE_FNAME);
          if (inc.firstElementChild) {
            this.include(inc.firstElementChild as HtmlElement, head as HtmlElement, undefined);
          }
          this.joinAdjacentTexts(head);
        }
      }
      // this.processMarkdownDirectives(ret);
      // this.processMacros(ret);
    }
    return ret;
  }

  getOrigin(i: number): string {
    let fname = (i >= 0 && i < this.parser.origins.length
      ? this.parser.origins[i]
      : '');
    fname.startsWith(this.rootPath)
      ? fname = fname.substr(this.rootPath.length)
      : null;
    return fname;
  }

  //TODO: optimaze case of repeated calls with growing position, for the compiler
  getSourcePos(htmlPos?: HtmlPos): SourcePos | undefined {
    let ret: SourcePos | undefined;
    if (htmlPos) {
      const fname = this.getOrigin(htmlPos.origin);
      if (fname != null) {
        ret = { fname: fname, line1: 1, column1: 1, line2: 1, column2: 1 };
        const src = this.sources[htmlPos.origin];
        let i = 0, j;
        while ((j = src.indexOf('\n', i)) >= 0) {
          if (j >= htmlPos.i1) {
            ret.column1 = Math.max(0, (htmlPos.i1 - i) + 1);
            break;
          }
          i = j + 1;
          ret.line1++;
        }
        ret.line2 = ret.line1;
        while ((j = src.indexOf('\n', i)) >= 0) {
          if (j > htmlPos.i2) {
            ret.column2 = Math.max(0, (htmlPos.i2 - i) + 1);
            break;
          }
          i = j + 1;
          ret.line2++;
        }
      }
    }
    return ret;
  }

  // =========================================================================
  // includes
  // =========================================================================

  private async readFile(
    fname: string,
    nesting: number,
    currPath?: string,
    once = false,
    includedBy?: HtmlElement
  ): Promise<HtmlDocument | undefined> {
    if (nesting >= MAX_RECURSIONS) {
      throw new PreprocessorError(`Too many nested includes/imports "${fname}"`);
    }
    let ret: HtmlDocument;
    fname.startsWith('/') ? currPath = undefined : null;
    !currPath ? currPath = this.rootPath : null;
    const filePath = path.normalize(path.join(currPath, fname));
    currPath = path.dirname(filePath);
    if (!filePath.startsWith(this.rootPath)) {
      throw new PreprocessorError(`Forbidden file path "${fname}"`);
    }
    if (once && this.parser.origins.indexOf(filePath) >= 0) {
      return undefined;
    }
    let text;
    try {
      if (this.virtualFiles?.has(filePath)) {
        text = this.virtualFiles.get(filePath) as string;
      } else {
        text = await fs.promises.readFile(filePath, { encoding: 'utf8' });
      }
    } catch (ex: any) {
      const msg = `Could not read file "${fname}"`;
      const f = (includedBy
        ? this.parser.origins[includedBy.pos.origin]
        : undefined);
      let pos = (includedBy ? includedBy.pos.i1 : undefined);
      throw new PreprocessorError(msg, f, this.rootPath, pos);
    }
    const extension = path.extname(filePath).toLowerCase();
    if (extension === '.html' || extension === '.htm') {
      // module inclusion
      try {
        this.sources.push(text.endsWith('\n') ? text : text + '\n');
        ret = this.parser.parseDoc(text, filePath);
        await this.processIncludes(ret, currPath, nesting);
      } catch (ex: any) {
        if (ex instanceof HtmlException) {
          throw new PreprocessorError(ex.msg, ex.fname, this.rootPath,
            ex.pos, ex.row, ex.col);
        }
        if (ex instanceof PreprocessorError) {
          throw ex;
        }
        throw new PreprocessorError('' + ex);
      }
    } else {
      // textual inclusion
      const origin = this.parser.origins.length;
      this.sources.push(text.endsWith('\n') ? text : text + '\n');
      this.parser.origins.push(filePath);
      ret = new HtmlDocument(origin);
      const root = new HtmlElement(
        ret.ownerDocument as HtmlDocument, ret, 'lib',
        0, 0, origin
      );
      new HtmlText(root.ownerDocument as HtmlDocument, root, text, 0, 0, origin, false);
    }
    return ret;
  }

  private async processIncludes(doc: HtmlDocument, currPath: string, nesting: number) {
    const tags = new Set([INCLUDE_TAG, IMPORT_TAG]);
    const includes = lookupTags(doc, tags);
    for (const e of includes) {
      let src = e.getAttribute(INCLUDE_SRC);
      if (src && (src = src.trim()).length > 0) {
        let as = e.getAttribute(INCLUDE_AS);
        await this.processInclude(e, src, e.tagName === IMPORT_TAG, currPath, nesting, as);
      } else {
        throw new HtmlException(
          'Missing "src" attribute', this.parser.origins[e.pos.origin],
          e.pos.i1, this.sources[e.pos.origin]
        );
      }
    }
  }

  private async processInclude(
    e: HtmlElement, src: string, once: boolean, currPath: string, nesting: number,
    as?: string
  ) {
    const parent = e.parentElement as HtmlElement;
    if (parent) {
      const i = parent.children.indexOf(e) + 1;
      const before = (i < parent.children.length ? parent.children[i] : undefined);
      e.remove();
      const doc = await this.readFile(src, nesting + 1, currPath, once, e);
      if (doc != null) {
        const root = doc.getFirstElementChild();
        if (root) {
          if (as) {
            this.embed(root as HtmlElement, parent, before, as)
          } else {
            this.include(root as HtmlElement, parent, before);
          }
        }
      }
      this.joinAdjacentTexts(parent);
    }
  }

  private embed(
    root: HtmlElement, parent: HtmlElement, before: HtmlNode | undefined, as: string
  ) {
    const parts = as?.split(/\s+/) as string[];
    if (parts.length > 0 && root.firstChild?.nodeType === TEXT_NODE) {
      const t = root.firstChild.remove() as HtmlText;
      const e = parent.ownerDocument?.createElement(parts[0]) as HtmlElement;
      e.appendChild(t);
      t.escape = false;
      parent.addChild(e, before);
      for (let i = 1; i < parts.length; i++) {
        const attr = parts[i].split('=');
        const key = attr[0].trim();
        if (key.length > 0) {
          let val = attr.length > 1 ? attr[1].trim() : '""';
          if ((val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          e.setAttribute(key, val);
        }
      }
    }
  }

  private include(root: HtmlElement, parent: HtmlElement, before?: HtmlNode) {
    for (let n of root.children.slice()) {
      parent.addChild(n.remove(), before);
    }
    // cascade root attributes
    root.attributes.forEach((a, k) => {
      if (a && !parent.attributes.has(k)) {
        parent.attributes.set(k, a);
      }
    });
  }

  // =========================================================================
  // markdown
  // =========================================================================
  // mdAttrs = require('markdown-it-attrs');
  // mdAnchor = require('markdown-it-anchor');
  // mdHighlight = require('markdown-it-highlightjs');
  // md = require('markdown-it')()
  //   .set({ html: true })
  //   .use(this.mdAttrs)
  //   .use(this.mdAnchor, { permalink: this.mdAnchor.permalink.headerLink() })
  //   .use(this.mdHighlight);

  // private processMarkdownDirectives(doc: HtmlDocument) {
  //   let ee = lookupTags(doc, new Set<string>([MARKDOWN_TAG]));
  //   for (let e of ee) {
  //     this.processMarkdownDirective(e);
  //   }
  // }

  // private processMarkdownDirective(e: HtmlElement) {
  //   const p = e.parentElement as HtmlElement;
  //   const src = e.innerHTML;
  //   const dst = this.md.render(src);
  //   e.innerHTML = dst;
  //   if (!e.getAttribute('class')) {
  //     e.setAttribute('class', MARKDOWN_DEFAULT_CLASS);
  //   }
  //   // while (e.firstChild) {
  //   //   p.insertBefore(e.firstChild.remove(), e);
  //   // }
  //   // e.remove();
  // }

  // =========================================================================
  // macros
  // =========================================================================

  // private processMacros(doc: HtmlDocument) {
  //   this.collectMacros(doc, 0);
  //   this.expandMacros(doc, 0);
  // }

  // // -------------------------------------------------------------------------
  // // collect
  // // -------------------------------------------------------------------------

  // private collectMacros(p: HtmlElement, nesting: number) {
  //   let macros = lookupTags(p, new Set<string>([DEFINE_TAG]));
  //   for (let e of macros) {
  //     this.collectMacro(e, nesting);
  //   }
  // }

  // private collectMacro(e: HtmlElement, nesting: number) {
  //   let tag = e.getAttribute(DEFINE_ARG);
  //   if (!tag || (tag = tag.trim()).length === 0) {
  //     throw new HtmlException(
  //       this.parser.origins[e.pos.origin], 'Missing "tag" attribute',
  //       e.pos.i1, this.sources[e.pos.origin]
  //     );
  //   }
  //   let columnPrefix = tag.startsWith(':');
  //   columnPrefix ? tag = tag.substr(1) : null;
  //   let names = tag.split(':');
  //   names.length < 2 ? names.push('div') : null;
  //   if (!/^[_a-zA-Z0-9]+-[-:_a-zA-Z0-9]+$/.test(names[0])
  //     || !/^[-_a-zA-Z0-9]+$/.test(names[1])) {
  //     throw new HtmlException(
  //       this.parser.origins[e.pos.origin],
  //       'Bad "tag" attribute (missing "-" in custom tag name)',
  //       e.pos.i1, this.sources[e.pos.origin]
  //     );
  //   }
  //   columnPrefix ? names[0] = ':' + names[0] : null;
  //   names[0] = names[0].toUpperCase();
  //   names[1] = names[1].toUpperCase();
  //   let parent = e.parentElement as HtmlElement;
  //   if (parent) {
  //     e.remove();
  //     this.joinAdjacentTexts(parent);
  //   }
  //   e.setAttribute(DEFINE_ARG, undefined);
  //   this.expandMacros(e, nesting);
  //   this.macros.set(names[0], {
  //     name1: names[0],
  //     name2: names[1],
  //     e: e,
  //     ext: this.macros.get(names[1])
  //   });
  // }

  // private collectSlots(p: HtmlElement) {
  //   let ret = new Map<string, HtmlElement>();
  //   let tags = new Set<string>();
  //   tags.add(SLOT_TAG);
  //   let slots = lookupTags(p, tags);
  //   for (let e of slots) {
  //     let s = e.getAttribute(SLOT_ARG);
  //     let names = (s ? s.split(',') : undefined);
  //     if (names) {
  //       for (let i in names) {
  //         let name = names[i];
  //         if ((name = name.trim()).length < 1
  //           || ret.has(name)) {
  //           throw new HtmlException(
  //             this.parser.origins[e.pos.origin],
  //             'Bad/duplicated "name" attribute',
  //             e.pos.i1, this.sources[e.pos.origin]
  //           );
  //         }
  //         ret.set(name, e);
  //       }
  //     }
  //   }
  //   if (!ret.has('default')) {
  //     let e = new HtmlElement(p.ownerDocument as HtmlDocument, p, SLOT_TAG,
  //       p.pos.i1, p.pos.i2, p.pos.origin);
  //     e.setAttribute(SLOT_ARG, 'default');
  //     ret.set('default', e);
  //   }
  //   return ret;
  // }

  // // -------------------------------------------------------------------------
  // // expand
  // // -------------------------------------------------------------------------

  // private expandMacros(p: HtmlElement, nesting: number) {
  //   let that = this;
  //   function f(p: HtmlElement) {
  //     let ret = false;
  //     for (let n of p.children.slice()) {
  //       if (n.nodeType === ELEMENT_NODE) {
  //         let name = (n as HtmlElement).tagName;
  //         let def = that.macros.get(name);
  //         if (def != null) {
  //           let e = that.expandMacro(n as HtmlElement, def, nesting);
  //           p.addChild(e, n);
  //           n.remove();
  //           ret = true;
  //         } else {
  //           that.expandMacros(n as HtmlElement, nesting);
  //         }
  //       }
  //     }
  //     return ret;
  //   }
  //   if (f(p)) {
  //     this.joinAdjacentTexts(p);
  //   }
  // }

  // private expandMacro(use: HtmlElement, def: Definition, nesting: number): HtmlElement {
  //   if (nesting >= MAX_RECURSIONS) {
  //     let err = new HtmlException(
  //       this.parser.origins[use.pos.origin],
  //       '',
  //       use.pos.i1,
  //       this.sources[use.pos.origin]
  //     );
  //     throw new PreprocessorError(
  //       `Too many nested macros "${use.tagName}"`, err.fname, this.rootPath,
  //       err.pos, err.row, err.col
  //     );
  //   }
  //   let ret: any = null;
  //   if (def.ext != null) {
  //     let e = new HtmlElement(def.e.ownerDocument as HtmlDocument, undefined, def.e.tagName,
  //       use.pos.i1, use.pos.i2, use.pos.origin);
  //     def.e.attributes.forEach(a => {
  //       let a2 = e.setAttribute(a.name, a.value, a.quote,
  //         a.pos1?.i1, a.pos1?.i2, a.pos1?.origin);
  //       a2 ? a2.pos2 = a.pos1 : null;
  //     });
  //     e.innerHTML = def.e.innerHTML;
  //     ret = this.expandMacro(e, def.ext, nesting + 1);
  //   } else {
  //     ret = new HtmlElement(def.e.ownerDocument as HtmlDocument, undefined, def.name2,
  //       use.pos.i1, use.pos.i2, use.pos.origin);
  //     def.e.attributes.forEach(a => {
  //       let a2 = ret.setAttribute(
  //         a.name, a.value, a.quote,
  //         a.pos1?.i1, a.pos1?.i2, a.pos1?.origin
  //       );
  //       a2 ? a2.pos2 = a.pos1 : null;
  //     });
  //     ret.innerHTML = def.e.innerHTML;
  //   }
  //   this.populateMacro(use, ret, nesting);
  //   return ret;
  // }

  // private populateMacro(src: HtmlElement, dst: HtmlElement, nesting: number) {
  //   src.attributes.forEach(a => {
  //     let a2 = dst.setAttribute(
  //       a.name, a.value, a.quote,
  //       a.pos1?.i1, a.pos1?.i2, a.pos1?.origin
  //     );
  //     a2 ? a2.pos2 = a.pos1 : null;
  //   });
  //   let slots = this.collectSlots(dst);
  //   for (let n of src.children.slice()) {
  //     let slotName = 'default', s;
  //     if (
  //       n.nodeType === ELEMENT_NODE &&
  //       ((s = (n as HtmlElement).getAttribute(SLOT_ATTR)))
  //     ) {
  //       slotName = s;
  //     }
  //     let slot = slots.get(slotName);
  //     if (slot) {
  //       (slot.parentElement as HtmlElement | undefined)?.addChild(n, slot);
  //     } else {
  //       let err = new HtmlException(
  //         this.parser.origins[n.pos.origin],
  //         '',
  //         n.pos.i1,
  //         this.sources[n.pos.origin]
  //       );
  //       throw new PreprocessorError(
  //         `unknown slot "${slotName}"`, err.fname, this.rootPath,
  //         err.pos, err.row, err.col
  //       );
  //     }
  //   }
  //   slots.forEach(e => {
  //     let p = e.parentElement as HtmlElement;
  //     if (p) {
  //       e.remove();
  //       this.joinAdjacentTexts(p);
  //     }
  //   });
  //   this.expandMacros(dst, nesting + 1);
  // }

  // =========================================================================
  // util
  // =========================================================================

  // this was required by aremel1 which identified text nodes by index and so
  // needed the index be consistent in the server and in the client (adjacent
  // text nodes would become a single one when transferred to the browser)
  private joinAdjacentTexts(e: HtmlElement) {
    let prevTextNode: HtmlText | undefined = undefined;
    for (let n of e.children.slice()) {
      if (n.nodeType === TEXT_NODE) {
        if (prevTextNode != null) {
          prevTextNode.nodeValue += (n as HtmlText).nodeValue;
          n.remove();
        } else {
          prevTextNode = n as HtmlText;
        }
      } else {
        prevTextNode = undefined;
      }
    }
  }

}

export class PreprocessorError {
  msg: string;
  fname?: string;
  pos?: number;
  row?: number;
  col?: number;

  constructor(
    msg: string, fname?: string, rootPath?: string,
    pos?: number, row?: number, col?: number
  ) {
    this.msg = msg;
    this.fname = (rootPath && fname && fname.startsWith(rootPath)
      ? fname.substring(rootPath.length + (rootPath.endsWith('/') ? 0 : 1))
      : fname);
    this.pos = (pos ? pos : 0);
    this.row = row;
    this.col = col;
  }

  toString() {
    return this.fname
      ? `${this.fname}:${this.row} col ${this.col}: ${this.msg}`
      : this.msg;
  }
}

// =============================================================================
// util
// =============================================================================

export function domGetTop(doc: HtmlDocument, name: string): HtmlElement | undefined {
  let root = doc.getFirstElementChild() as HtmlElement;
  if (root) {
    for (let n of root.children) {
      if (n.nodeType === ELEMENT_NODE && (n as HtmlElement).tagName === name) {
        return n as HtmlElement;
      }
    }
  }
  return undefined;
}

export function lookupTags(p: HtmlElement, tags: Set<string>): Array<HtmlElement> {
  let ret = new Array<HtmlElement>();
  function f(p: HtmlElement) {
    for (let n of p.children) {
      if (n.nodeType === ELEMENT_NODE) {
        if (tags.has((n as HtmlElement).tagName)) {
          ret.push(n as HtmlElement);
        } else {
          f(n as HtmlElement);
        }
      }
    }
  }
  f(p);
  return ret;
}

function domEnsureHeadAndBody(doc: HtmlDocument) {
  let e = doc.getFirstElementChild() as HtmlElement | undefined, body, head;
  if (!(body = domGetTop(doc, 'BODY'))) {
    body = new HtmlElement(doc, e, 'BODY', 0, 0, doc.pos.origin);
  }
  if (!(head = domGetTop(doc, 'HEAD'))) {
    head = new HtmlElement(doc, undefined, 'HEAD', 0, 0, doc.pos.origin);
    e?.addChild(head, body);
  }
}
