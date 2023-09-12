import { assert } from "chai";
import { Context, Scope, Value } from "../../src/runtime/core2";

describe('runtime: core2', () => {

  it('prototype chain (1)', () => {
    let scope!: Scope;

    const ctx = new Context({ global: {} }, ctx => {
      new Value(ctx.global, {
        key: 'x',
        fun: function() { return 10; }
      })

      scope = new Scope(ctx, ctx.global, { key: 'scope' });
      new Value(scope, {
        key: 'y',
        fun: function() { return this.x * 2; }
      });
    });

    assert.equal(scope.proxy.y, 20);
  });

  it('value callback (1)', () => {
    let scope!: Scope;
    let cbCount = 0;
    let cbValue = undefined;

    const ctx = new Context({ global: {} }, ctx => {
      new Value(ctx.global, {
        key: 'x',
        fun: function() { return 10; }
      })

      scope = new Scope(ctx, ctx.global, {});
      new Value(scope, {
        key: 'y',
        fun: function() { return this.x * 2; },
        cb: v => { cbCount++; cbValue = v; },
      });
    });

    assert.equal(scope.proxy.y, 20);
    assert.equal(cbCount, 1);
    assert.equal(cbValue, 20);
  });

  it('dependency (1)', () => {
    let scope!: Scope;
    let cbCount = 0;
    let cbValue = undefined;

    const ctx = new Context({ global: {} }, ctx => {
      new Value(ctx.global, {
        key: 'x',
        fun: function() { return 10; }
      })

      scope = new Scope(ctx, ctx.global, {});
      new Value(scope, {
        key: 'y',
        fun: function() { return this.x * 2; },
        cb: v => { cbCount++; cbValue = v; },
        refs: ['x']
      });
    });

    assert.equal(scope.proxy.y, 20);
    assert.equal(cbCount, 1);
    assert.equal(cbValue, 20);

    ctx.global.proxy.x = 11;
    assert.equal(cbCount, 2);
    assert.equal(cbValue, 22);
    assert.equal(scope.proxy.y, 22);
  });

  it('dependency (2)', () => {
    let scope!: Scope;
    let cbCount = 0;
    let cbValue = undefined;

    const ctx = new Context({ global: {} }, ctx => {
      // new Value(ctx.global, {
      //   key: 'x',
      //   fun: function() { return 10; }
      // })
      new Value(ctx.global, {
        key: 'y',
        fun: function() { return this.scope.x * 2; },
        cb: v => { cbCount++; cbValue = v; },
        refs: ['scope.x']
      });

      scope = new Scope(ctx, ctx.global, { key: 'scope' });
      // new Value(scope, {
      //   key: 'y',
      //   fun: function() { return this.x * 2; },
      //   cb: v => { cbCount++; cbValue = v; },
      //   refs: ['x']
      // });
      new Value(scope, {
        key: 'x',
        fun: function() { return 10; }
      })
    });

    assert.equal(ctx.global.proxy.y, 20);
    assert.equal(cbCount, 1);
    assert.equal(cbValue, 20);

    scope.proxy.x = 11;
    assert.equal(cbCount, 2);
    assert.equal(cbValue, 22);
    assert.equal(ctx.global.proxy.y, 22);
  });

});
