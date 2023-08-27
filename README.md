# Trillo.js

![version](https://img.shields.io/github/package-json/v/fcapolini/trillo?style=flat-square)
![license](https://img.shields.io/github/license/fcapolini/trillo?style=flat-square)
![codeql](https://img.shields.io/github/actions/workflow/status/fcapolini/trillo/codeql.yml?branch=main&style=flat-square&label=codeql)
![build](https://img.shields.io/github/actions/workflow/status/fcapolini/trillo/node.js.yml?branch=main&style=flat-square)
![tests](https://img.shields.io/endpoint?style=flat-square&url=https://gist.githubusercontent.com/fcapolini/ee36283cfd3eb89ecdd1e5d23910682f/raw/trillo-junit-tests.json)
![coverage](https://img.shields.io/endpoint?style=flat-square&url=https%3A%2F%2Fgist.githubusercontent.com%2Ffcapolini%2Fee36283cfd3eb89ecdd1e5d23910682f%2Fraw%2Ftrillo-cobertura-coverage.json)

## Reactive [Isomorphic](https://en.wikipedia.org/wiki/Isomorphic_JavaScript) HTML

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
