import { assert } from "chai";
import * as core from "../../../src/runtime/core";

describe('runtime: core/value', () => {

  it('single value (1)', () => {
    const app = new core.Context({ cycle: 0 }, global => {
      global.addValue('x', { fn: () => 10 });
    });
    assert.equal(app.global.get('x'), 10);
  });

});
