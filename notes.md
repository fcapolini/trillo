# Project setup

```bash
npm init -y
npm i -D typescript
npx tsc --init
mkdir dist
mkdir src
mkdir test
```

tsconfig.json:

```json
  "compilerOptions": {
    "target": "es2015",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    // "declaration": true,
    "removeComments": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  }
```

.gitignore:

```
node_modules
.nyc_output
coverage
dist
*.log
.DS_Store
```

src/index.ts:

```typescript
console.log('index.ts');
```

src/client.ts:

```typescript
console.log('client.ts');
```

.editorconfig:

```
# EditorConfig is awesome: https://EditorConfig.org

# top-most EditorConfig file
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

## Testing & Coverage

```bash
npm i -D mocha chai ts-node
npm i -D @types/mocha @types/chai
npm i -D nyc
```

package.json:

```json
{
  ...
  "scripts": {
    "test": "mocha --exit -r ts-node/register test/**/*.test.ts",
    "coverage": "nyc npm run test"
  }
  ...
```

tsconfig.json:

```json
{
  "include": ["src/**/*"], // don't include ./test/ dir
  ...
```

test/dummy.test.ts:

```typescript
import { assert } from "chai";

describe('dummy', function () {

  it("should succeed", () => {
    assert.isTrue(true);
  });

});
```

### Speedup

```bash
npm i -D @swc/core
```

tsconfig.json:

```json
{
  ...
  "ts-node": {
    "transpileOnly": true,
    "transpiler": "ts-node/transpilers/swc-experimental"
  },
  ...
```

### Server-side DOM

```bash
npm install happy-dom
```

- [happy-dom](https://github.com/capricorn86/happy-dom)
- [happy-dom usage](https://github.com/capricorn86/happy-dom/tree/master/packages/happy-dom#usage)

test/happy-dom.test.ts:

```typescript
import { assert } from "chai";
import { Window } from 'happy-dom';

describe('happy-dom', function () {

  it("should execute example", () => {
    const window = new Window();
    const document = window.document;
    document.body.innerHTML = '<div class="container"></div>';
    const container = document.querySelector('.container');
    const button = document.createElement('button');
    container.appendChild(button);
    assert.equal(
        document.body.innerHTML,
        `<div class="container"><button></button></div>`
    );
  });

});
```

### Esprima/ESCodeGen

```
npm i escodegen esprima estraverse
npm i -D @types/escodegen @types/esprima @types/estraverse
```

### Express

```
npm i express
npm i -D @types/express
npm i express-rate-limit
```

### browserify w/ tsify

- [tsify](https://github.com/TypeStrong/tsify)

```
npm install -D browserify tsify
```

`package.json` "scripts":

```json
    "test": "npm run build-client && mocha --exit -r ts-node/register test/**/*.test.ts",
    "coverage": "nyc npm run test",
    "build": "npm run build-server && npm run build-client",
    "build-client": "browserify src/client.ts -p tsify > dist/client.js",
    "build-server": "tsc"
```

### GitHub badges

- [ ] see [ci-badges-action](https://github.com/GaelGirodon/ci-badges-action)
  - gist
    - added [gist](https://gist.github.com/fcapolini/ee36283cfd3eb89ecdd1e5d23910682f)
    - created personal access token trillo-ci-badges-action
  - trillo repository
    - added env.GIST_ID
    - added secrets.GIST_TOKEN

### NPM publishing

- [ ] add "Publish Node.js Package" workflow [here](https://github.com/fcapolini/trillo/actions/new)
