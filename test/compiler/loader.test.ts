import { assert } from "chai";
import Loader, { domGetTop } from "../../src/compiler/loader";
import { ELEMENT_NODE, TEXT_NODE } from "../../src/lib/dom";
import { HtmlAttribute, HtmlDocument, HtmlElement } from "../../src/lib/htmldom";
import { normalizeText } from "../../src/lib/util";

const ROOTPATH = process.cwd() + '/test/compiler/loader';
const loader = new Loader(ROOTPATH);

describe("compiler: loader", () => {

  it("should complain about missing file", async () => {
    let msg = '';
    try {
      await loader.reset().read('inexistent.html');
    } catch (ex:any) {
      msg = `${ex}`;
    }
    assert.equal(msg, 'Could not read file "inexistent.html"');
  });

  it("should read the single test001.html UFT-8 file", async () => {
    const doc = await loader.reset().read('test001.html');
    assert.exists(doc);
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(doc?.toString(), '<html utf8-value="€"><head></head><body></body></html>');
  });

  // =========================================================================
  // inclusion
  // =========================================================================

  it("should follow test002.html inclusion chain", async () => {
    const doc = await loader.reset().read('test002.html');
    assert.exists(doc);
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(doc?.toString(), '<html><head></head><body><div>Test 2</div></body></html>');
  });

  it("should include test002includes.html inclusions twice", async () => {
    const doc = await loader.reset().read('test002includes.html');
    assert.exists(doc);
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(doc?.toString(), '<html><head></head><body><div>Test 2</div><div>Test 2</div></body></html>');
  });

  it("should import test002imports.html inclusions once", async () => {
    const doc = await loader.reset().read('test002imports.html');
    assert.exists(doc);
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(doc?.toString(), '<html><head></head><body><div>Test 2</div></body></html>');
  });

  it("should forbid access to files outside root path", async () => {
    var msg = '';
    try {
      const doc = await loader.reset().read('test003.html');
    } catch (ex:any) {
      msg = `${ex}`;
    }
    assert.equal(msg, 'Forbidden file path "../dummy.htm"');
  });

  it("should complain of missing src in includes", async () => {
    var msg = '';
    try {
      const doc = await loader.reset().read('test004.html');
    } catch (ex:any) {
      msg = `${ex}`;
    }
    assert.equal(msg, 'test004.html:1 col 8: Missing "src" attribute');
  });

  it("should remove adjacent text nodes", async () => {
    const doc = await loader.reset().read('test005.html');
    assert.isFalse(adjacentTextNodes(doc));
  });

  it("should pass include root attributes to target element", async () => {
    const doc = await loader.reset().read('testIncludedRootAttributesShouldPassToTargetElement.html');
    assert.isFalse(adjacentTextNodes(doc));
    var head = doc ? domGetTop(doc, 'HEAD') : undefined;
    assert.equal(head?.getAttribute(':overriddenAttribute'), '1');
    assert.equal(head?.getAttribute(':attribute1'), 'hi');
    assert.equal(head?.getAttribute(':attribute2'), 'there');
    assert.equal(head?.getAttribute(':attribute3'), '2');
  });

  it("should accept textual includes (text)", async () => {
    const doc = await loader.reset().read('testTextualIncludeText.html');
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(doc?.toString(), '<html><head></head><body>This is a "text"</body></html>');
  });

  it("should accept textual includes (CSS)", async () => {
    const doc = await loader.reset().read('testTextualIncludeCSS.html');
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(doc?.toString(), '<html><head><style>body { color: red; }</style></head><body></body></html>');
  });

  it("should accept textual includes (JS)", async () => {
    const doc = await loader.reset().read('testTextualIncludeJS.html');
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(doc?.toString(), `<html><head><script type="text/javascript">console.log('hi'.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#x27;"))\n</script></head><body></body></html>`);
  });

  // =========================================================================
  // macros
  // =========================================================================

  // it("should expand an empty macro", async () => {
  //   const doc = await loader.reset().read('test101.html');
  //   assert.isFalse(adjacentTextNodes(doc));
  //   assert.equal(doc?.toString(), '<html><head></head><body><div></div></body></html>');
  // });

  // it("should expand a macro with text", async () => {
  //   const doc = await loader.reset().read('test102.html');
  //   assert.isFalse(adjacentTextNodes(doc));
  //   assert.equal(doc?.toString(), '<html><head></head><body><span>[[text]]</span></body></html>');
  // });

  // it("should follow macro inheritance", async () => {
  //   const doc = await loader.reset().read('test103.html');
  //   assert.isFalse(adjacentTextNodes(doc));
  //   assert.equal(doc?.toString(), '<html><head></head><body><span><b>[[text]]</b></span></body></html>');
  // });

  // it("should add attributes and content to expanded macros", async () => {
  //   const doc = await loader.reset().read('test104.html');
  //   assert.isFalse(adjacentTextNodes(doc));
  //   assert.equal(doc?.toString(), '<html><head></head><body><span class="title"><b>[[text]]</b>OK</span></body></html>');
  // });

  // it("should keep non-overridden macro attributes", async () => {
  //   const doc = await loader.reset().read('test201.html');
  //   assert.isFalse(adjacentTextNodes(doc));
  //   assert.equal(normalizeText(doc?.toString()), normalizeText('<html>\n'
  //     + '<head></head><body>\n'
  //     + '		<div class="pippo">localhost</div>\n'
  //     + '	</body>\n'
  //   + '</html>'));
  // });

  // it("should replace overridden macro attributes", async () => {
  //   const doc = await loader.reset().read('test202.html');
  //   assert.isFalse(adjacentTextNodes(doc));
  //   assert.equal(normalizeText(doc?.toString()), normalizeText('<html>\n'
  //     + '<head></head><body>\n'
  //     + '		<div class="pluto">localhost</div>\n'
  //     + '	</body>\n'
  //   + '</html>'));
  // });

  // it("should let macro define their `default` slot", async () => {
  //   const doc = await loader.reset().read('test203.html');
  //   assert.isFalse(adjacentTextNodes(doc));
  //   assert.equal(normalizeText(doc?.toString()), normalizeText('<html>\n'
  //     + '<head></head><body>\n'
  //     + '		<div class="pippo">\n'
  //     + '			title: <b>localhost</b>\n'
  //     + '		</div>\n'
  //     + '	</body>\n'
  //   + '</html>'));
  // });

  // it("should let users nest macros (1)", async () => {
  //   const doc = await loader.reset().read('test204.html');
  //   assert.isFalse(adjacentTextNodes(doc));
  //   assert.equal(normalizeText(doc?.toString()), normalizeText(`<html>
  //     <head>
  //     </head>
  //     <body>
  //       <div class=\"kit-page\">
  //         <div class=\"kit-nav\"></div>
  //       </div>
  //     </body>
  //   </html>`));
  // });

  // it("should let users nest macros (2)", async () => {
  //   const doc = await loader.reset().read('testNestedMacros1.html');
  //   assert.isFalse(adjacentTextNodes(doc));
  //   assert.equal(normalizeText(doc?.toString()), normalizeText(`<html>
  //     <head>
  //     </head>
  //     <body>
  //       <div class=\"kit-page\">
  //         <div class=\"kit-nav\"><div>[[pageScrollY]] ([[pageScrollDeltaY]])</div></div>
  //       </div>
  //     </body>
  //   </html>`));
  // });

  // it("should support [[*]] attributes in macros", async () => {
  //   const doc = await loader.reset().read('testAttributesInMacro.html');
  //   assert.equal(normalizeText(doc?.toString(false, true)), normalizeText(`<html>
  //     <head></head><body>
  //       <div :ok=[[true]]>
  //         <span :class-ok=[[ok]]></span>
  //       </div>
  //     </body>
  //   </html>`));
  // });

  // it("should let users extend macros (1)", async () => {
  //   const doc = await loader.reset().read('testExtendedMacro1.html');
  //   assert.isFalse(adjacentTextNodes(doc));
  //   assert.equal(normalizeText(doc?.toString()), normalizeText(`<html>
  //     <head>
  //     </head>
  //     <body>
  //       <div class="kit-item">
  //         <label>
  //           <input type="radio" />
  //           Item1
  //         </label>
  //         <span class="badge rounded-pill">badge</span>
  //       </div>

  //       <div class="kit-item">
  //         <label>
  //           <input type="radio" />
  //           Item2
  //         </label>
  //         <span class="badge rounded-pill">badge</span>
  //       </div>
  //     </body>
  //   </html>`));
  // });

  // it("should limit recursive inclusions", async () => {
  //   var msg = '';
  //   try {
  //     await loader.reset().read('testRecursiveInclude.html');
  //   } catch (ex:any) {
  //     msg = `${ex}`;
  //   }
  //   assert.equal(msg, 'Too many nested includes/imports "testRecursiveInclude.html"');
  // });

  // it("should limit recursive macros", async () => {
  //   var msg = '';
  //   try {
  //     await loader.reset().read('testRecursiveMacro.html');
  //   } catch (ex:any) {
  //     msg = `${ex}`;
  //   }
  //   assert.equal(msg, 'Too many nested macros "DUMMY-TAG"');
  // });

  // =========================================================================
  // virtual files
  // =========================================================================

  it("should 'read' virtual files", async () => {
    var loader = new Loader(ROOTPATH, [{
      fname: 'dummy.html',
      content: '<html><body>Dummy</body></html>'
    }]);
    const doc = await loader.read('dummy.html');
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(normalizeText(doc?.toString()), normalizeText(
      `<html><head></head><body>Dummy</body></html>`
    ));
  });

  // =========================================================================
  // source position
  // =========================================================================

  it("source position 1", async () => {
    var loader = new Loader(ROOTPATH, [{
      fname: 'dummy.html',
      content:
        '<!DOCTYPE html>\n' +
        '<html :v=[[\n' +
        "' * 2 ]]>\n" +
        '<head></head>\n' +
        '<body></body>\n' +
        '</html>\n'
    }]);
    const doc = await loader.read('dummy.html') as HtmlDocument;
    const root = doc.firstElementChild as HtmlElement;
    assert.equal(root.tagName, 'HTML');
    const attr = root.attributes.get(':v') as HtmlAttribute;
    assert.exists(attr);
    const sourcePos = loader.getSourcePos(attr.pos2);
    assert.equal(sourcePos?.line1, 2);
    assert.equal(sourcePos?.column1, 12);
    assert.equal(sourcePos?.line2, 3);
    assert.equal(sourcePos?.column2, 7);
  });

  // =========================================================================
  // output
  // =========================================================================

  it("should output [[]]-quoted attributes as standard ones", async () => {
    var loader = new Loader(ROOTPATH, [{
      fname: 'dummy.html',
      content: '<html><body :v=[[x < 1 && y === "a"]]>Dummy</body></html>'
    }]);
    const doc = await loader.read('dummy.html');
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(normalizeText(doc?.toString()), normalizeText(
      `<html><head></head><body :v="[[x &lt; 1 && y === &quot;a&quot;]]">Dummy</body></html>`
    ));
  });

  // =========================================================================
  // <:markdown> directive
  // =========================================================================

//   it('should render markdown', async () => {
//     var loader = new Loader(ROOTPATH, [{
//       fname: 'dummy.html',
//       content: `<html><body><:markdown>
// # Intro
// Here is some *markdown* text.
//       </:markdown></body></html>`
//     }]);
//     const doc = await loader.read('dummy.html');
//     //NOTE: the preprocessor doesn't remove the <:markdown> tag
//     //itself, that's done by the page compiler so it knows
//     //its content are static (i.e. `[[` strings don't mean expression)
//     assert.equal(normalizeText(doc?.toString()), normalizeText(
//       `<html><head></head><body><:markdown class="reflectjs-markdown">` +
//       `<h1 id="intro" tabindex="-1"><a class="header-anchor" href="#intro">Intro</a></h1>
//         <p>Here is some <em>markdown</em> text.</p>
//       </:markdown></body></html>`
//     ));
//   });

});

// =============================================================================
// util
// =============================================================================

function adjacentTextNodes(doc?:HtmlDocument): boolean {
  var ret = false;
  function f(e:HtmlElement) {
    var prevType = -1;
    for (var n of e.children) {
      if (n.nodeType === TEXT_NODE && n.nodeType === prevType) {
        ret = true;
      }
      if (n.nodeType == ELEMENT_NODE) {
        f(n as HtmlElement);
      }
      if (ret) {
        break;
      }
      prevType = n.nodeType;
    }
  }
  var root = doc?.getFirstElementChild();
  root ? f(root as HtmlElement) : null;
  return ret;
}
