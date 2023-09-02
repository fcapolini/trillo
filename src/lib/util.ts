/* istanbul ignore file */

export class Tree<T> {
  parent: T | null;
  children: T[];

  constructor(parent: T | null, index = -1) {
    this.parent = null;
    this.children = [];
    parent && this.link(parent, index);
  }

  link(parent: T, index = -1) {
    this.unlink();
    this.parent = parent;
    const a = (parent as Tree<T>).children;
    a.splice(index < 0 ? a.length : index, 0, this as any);
  }

  unlink() {
    if (this.parent) {
      const a = (this.parent as any).children;
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

  addSub(sub: PubSub<T>) {
    this.subs.add(sub);
    sub.pubs.add(this);
  }

  delSub(sub: PubSub<T>) {
    this.subs.delete(sub);
    sub.pubs.delete(this);
  }

  unlink() {
    this.pubs.forEach(pub => {
      pub.delSub(this);
    });
  }

  updateSubs() {
    this.subs.forEach(sub => {
      try {
        sub.pubUpdate(this);
      } catch (ignored: any) {}
    });
  }

  abstract pubUpdate(pub: PubSub<T>): void;
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
