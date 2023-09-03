import { assert } from "chai";
import { Context } from "../../../src/runtime/core/context"
import { Scope } from "../../../src/runtime/core/scope"
import { Value } from "../../../src/runtime/core/value"

describe('runtime: core/value', () => {

  it('single passive value', () => {
    const app = new Context({ cycle: 0 }, global => {
      global.addValue('x', { fn: () => 10 });
    });
    assert.equal(app.global.get('x'), 10);
    // assert.equal(app.props.cycle, 1);
    // assert.equal(app.global.values.get('x')?.props.cycle, 1);
    // assert.equal(app.global.values.get('x')?.value, 10);
  });

});
