# Trillo.js

**Reactive Isomorphic HTML**

```html
<html>
  <body :count=[[0]] :did-init=[[setInterval(() => count++, 1000)]]>
    Count: [[count]]
  </body>
</html>
```

* page logic is initially executed in the server
* emitted page contains text "Count: 0"
* the client takes over execution and updates text over time
