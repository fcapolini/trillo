import { assert } from "chai";
import * as core from "../../src/runtime/core";

describe('runtime: core', () => {

  it('single value (1)', () => {
    let cbCalls = 0;
    let cbValue = undefined;

    const app = new core.Context({}, global => {
      global.addValue('x', { fn: function() {
        return 10;
      } }, (v) => {
        cbCalls++;
        cbValue = v.value;
      });
    });

    assert.equal(app.global.get('x'), 10);
    assert.equal(cbCalls, 1);
    assert.equal(cbValue, 10);

    app.global.set('x', 11);
    assert.equal(cbCalls, 2);
    assert.equal(cbValue, 11);
    assert.equal(app.global.get('x'), 11);
  });

  it('dependent value (1)', () => {
    let cbCalls = 0;
    let cbValue = undefined;

    const app = new core.Context({}, global => {
      global.addValue('x', { fn: function() {
        return 10;
      } });

      global.addValue('y', { fn: function() {
        return this.x * 2;
      }, refs: ['x'] }, (v) => {
        cbCalls++;
        cbValue = v.value;
      });
    });
    assert.equal(cbCalls, 1);
    assert.equal(cbValue, 20);
    assert.equal(app.global.get('y'), 20);

    app.global.set('x', 11);
    assert.equal(cbCalls, 2);
    assert.equal(cbValue, 22);
    assert.equal(app.global.get('y'), 22);
  });

  it('dependent value (2)', () => {
    let cbCalls = 0;
    let cbValue = undefined;

    const app = new core.Context({}, global => {
      global.addValue('x', { fn: function() {
        return this.y + 1;
      }, refs: ['y'] });

      global.addValue('y', { fn: function() {
        return this.x * 2;
      }, refs: ['x'] }, (v) => {
        cbCalls++;
        cbValue = v.value;
      });
    });
    assert.equal(cbCalls, 1);
    assert.isNaN(cbValue);
    assert.isNaN(app.global.get('y'));

    app.global.set('x', 11);
    assert.equal(cbCalls, 2);
    assert.equal(cbValue, 22);
    assert.equal(app.global.get('y'), 22);
  });

  it('dependent values (1)', () => {
    const cbCalls = [0, 0];
    const cbValue = [undefined, undefined];

    const app = new core.Context({}, global => {
      global.addValue('x', { fn: function() {
        return 10;
      } });

      global.addValue('y', { fn: function() {
        return this.x * 2;
      }, refs: ['x'] }, (v) => {
        cbCalls[0]++;
        cbValue[0] = v.value;
      });

      global.addValue('z', { fn: function() {
        return this.x * 3;
      }, refs: ['x'] }, (v) => {
        cbCalls[1]++;
        cbValue[1] = v.value;
      });
    });
    assert.equal(cbCalls[0], 1);
    assert.equal(cbValue[0], 20);
    assert.equal(app.global.get('y'), 20);
    assert.equal(cbCalls[1], 1);
    assert.equal(cbValue[1], 30);
    assert.equal(app.global.get('z'), 30);

    app.global.set('x', 11);
    assert.equal(cbCalls[0], 2);
    assert.equal(cbValue[0], 22);
    assert.equal(app.global.get('y'), 22);
    assert.equal(cbCalls[1], 2);
    assert.equal(cbValue[1], 33);
    assert.equal(app.global.get('z'), 33);
  });

  it('dependent values (2)', () => {
    const cbCalls = [0, 0];
    const cbValue = [undefined, undefined];

    const app = new core.Context({}, global => {
      global.addValue('x', { fn: function() {
        return 10;
      } });

      global.addValue('y', { fn: function() {
        return this.x * 2;
      }, refs: ['x'] }, (v) => {
        cbCalls[0]++;
        cbValue[0] = v.value;
      });

      global.addValue('z', { fn: function() {
        return this.x * 3 + this.y;
      }, refs: ['x', 'y'] }, (v) => {
        cbCalls[1]++;
        cbValue[1] = v.value;
      });
    });
    assert.equal(cbCalls[0], 1);
    assert.equal(cbValue[0], 20);
    assert.equal(app.global.get('y'), 20);
    assert.equal(cbCalls[1], 1);
    assert.equal(cbValue[1], 50);
    assert.equal(app.global.get('z'), 50);

    app.global.set('x', 11);
    assert.equal(cbCalls[0], 2);
    assert.equal(cbValue[0], 22);
    assert.equal(app.global.get('y'), 22);
    assert.equal(cbCalls[1], 2);
    assert.equal(cbValue[1], 55);
    assert.equal(app.global.get('z'), 55);
  });

});
