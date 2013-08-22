node-batch-geocoder
===================

Node.js Batch Geocoder for the Google Maps API

# Example

```js
var Geocoder = require("../lib/batch-geocoder"),
  geocoder = new Geocoder("./geocode-cache.csv");

geocoder.on("finish", function(collection){
  console.log(collection);
});

geocoder.on("status", function(status){
  console.log(completed.current + '/' + completed.total);
});

geocoder.find([
  "Broadway, NYC",
  "Champs-Élysées, Paris",
  "Brandenburger Tor, Berlin",
  "Omotesandō, Tokyo",
  ...
]);
```