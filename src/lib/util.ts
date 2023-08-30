/* istanbul ignore file */

export class TreeNode {
  parent: TreeNode | null;
  children: TreeNode[];

  constructor(parent: TreeNode | null, index = -1) {
    this.parent = null;
    this.children = [];
    parent && this.link(parent, index);
  }

  link(parent: TreeNode, index = -1) {
    this.unlink();
    this.parent = parent;
    const a = parent.children;
    a.splice(index < 0 ? a.length : index, 0, this);
  }

  unlink() {
    if (this.parent) {
      const a = this.parent.children;
      const i = a.indexOf(this);
      i >= 0 && a.splice(i, 1);
      this.parent = null;
    }
  }
}

export abstract class PubSub<T> {
  pubs: Set<PubSub<T>>;
  subs: Set<PubSub<T>>;

  constructor() {
    this.pubs = new Set();
    this.subs = new Set();
  }

  addPub(d: PubSub<T>) {
    this.pubs.add(d);
    d.subs.add(this);
  }

  removePub(d: PubSub<T>) {
    this.pubs.delete(d);
    d.subs.delete(this);
  }

  clearPubs() {
    this.pubs.forEach(d => {
      this.removePub(d);
    });
  }

  notifySubs(v: T) {
    this.subs.forEach(d => {
      try {
        d.onPub(v);
      } catch (ignored: any) {}
    });
  }

  abstract onPub(v: T): void;
}

export class StringBuf {
  parts: string[];

  constructor() {
    this.parts = [];
  }

  add(s: string) {
    this.parts.push(s);
  }

  toString() {
    return this.parts.join('');
  }
}

export function normalizeText(s?: string): string | undefined {
  return s?.split(/\n\s+/).join('\n').split(/\s{2,}/).join(' ');
}

export function normalizeSpace(s?: string): string | undefined {
  return s?.split(/\s+/).join(' ');
}

export function regexMap(
  re: RegExp, s: string, cb: (match: RegExpExecArray) => string
): string {
  const _re = re.flags.indexOf('g') >= 0 ? re : new RegExp(re, 'g' + re.flags);
  let sb = new StringBuf(), i = 0;
  for (let match; !!(match = _re.exec(s)); i = match.index + match[0].length) {
    match.index > i && sb.add(s.substring(i, match.index));
    sb.add(cb(match));
  }
  s.length > i && sb.add(s.substring(i));
  return sb.toString();
}

export function peek(a: any[]): any {
  return (a.length > 0 ? a[a.length - 1] : undefined);
}
