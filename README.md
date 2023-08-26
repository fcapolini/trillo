# Trillo.js

[![CodeQL](https://github.com/fcapolini/trillo/actions/workflows/codeql.yml/badge.svg)](https://github.com/fcapolini/trillo/actions/workflows/codeql.yml)
[![Node.js CI](https://github.com/fcapolini/trillo/actions/workflows/node.js.yml/badge.svg)](https://github.com/fcapolini/trillo/actions/workflows/node.js.yml)

**Reactive [Isomorphic](https://en.wikipedia.org/wiki/Isomorphic_JavaScript) HTML**

```html
<html>
  <body :count=[[0]] did:init=[[setInterval(() => count++, 1000)]]>
    Count: [[count]]
  </body>
</html>
```

* page logic is initially executed in the server
* emitted page contains text "Count: 0"
* the client takes over execution and updates text over time
