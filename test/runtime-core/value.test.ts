import { assert } from "chai";
import * as core from "../../src/runtime/core";

describe('runtime core: value', () => {

  it('single value (1)', () => {
    let cbCalls = 0;
    let cbValue = undefined;

    const app = new core.Context({ cycle: 0 }, global => {
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

    const app = new core.Context({ cycle: 0 }, global => {
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
    assert.equal(app.global.get('y'), 20);
    assert.equal(cbCalls, 1);
    assert.equal(cbValue, 20);

    app.global.set('x', 11);
    assert.equal(cbCalls, 2);
    assert.equal(cbValue, 22);
    assert.equal(app.global.get('y'), 22);
  });

});
