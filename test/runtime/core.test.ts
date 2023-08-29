import { assert } from "chai";
import { Context, Scope, Value } from "../../src/runtime/core"

describe('runtime: core', () => {

  it('should create a context w/ root scope', () => {
    const context = new Context({
      cycle: 0,
      root: {
        id: '0',
        name: 'root'
      }
    });
    assert.equal(context.scopes.size, 1);
    assert.equal(context.scopes.get('0')?.props.name, 'root');
  })

});
