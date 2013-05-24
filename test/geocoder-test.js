var vows = require("vows"),
  assert = require("assert"),
  events = require("events"),
  fs = require("fs"),
  Geocoder = require("../lib/geocoder");

vows.describe("geocode").addBatch({
  "Do not create a geocoder instance if cache file is missing" : {
    topic: function() {
      return new Geocoder();
    },
    "Geocoder object is not created because cache file is missing": function(topic) {
      assert.equal(topic.message,"path must be a string");
    }
  },
  "Create a geocoder instance if a valid parameter is submitted" : {
    topic: function() {
      return new Geocoder("./dbfile.cgg");
    },
    "Object is created, because a valid parameter was passed": function(topic) {
      assert.instanceOf(topic,Geocoder);
    },
    "Object has a Write Stream to file, because cache file is writable": function(topic) {
      assert.isObject(topic.dbfile);
    },
    "Cached data has been parsed and is usable.": function(topic) {
      assert.isObject(topic.data);
    }
  }
}).addBatch({
  "Geocode one address and save it to the cache file": {
    topic: function() {
      var geocoder,
        address = ["Juliusstraße 25, Hamburg, Germany"],
        promise = new(events.EventEmitter);
      fs.unlinkSync("./dbfile.cgg");
      geocoder = new Geocoder("./dbfile.cgg");
      geocoder.on("finish", function (res) {
        promise.emit("success", res);
      });
      geocoder.find(address);
      return promise;
    },
    "Return value from geocoding is an object" : function(err, result) {
      assert.isObject(result);
    },
    "Return value object contains the right address": function(err, result){
      var location;
      location = result["Juliusstraße 25, Hamburg, Germany"];
      assert.isObject(location);
    },
    "Address has the right latitude": function(err, result){
      var location;
      location = result["Juliusstraße 25, Hamburg, Germany"];
      assert.isNumber(location.lat);
      assert.equal(location.lat, 53.5612782);
    },
    "Address has the right longitude": function(err, result){
      var location;
      location = result["Juliusstraße 25, Hamburg, Germany"];
      assert.isNumber(location.lng);
      assert.equal(location.lng, 9.9610992);
    },
    "Cache file contains only one address": function(err, result){
      var fileContents = fs.readFileSync("./dbfile.cgg").toString();
      assert.equal(fileContents.split("\n").length-1, 1);
    },
    "Cache file contains the right address": function(err, result){
      var fileContents = fs.readFileSync("./dbfile.cgg").toString();
      assert.equal(fileContents, "Juliusstraße 25, Hamburg, Germany;53.5612782;9.9610992\n");
    }

  }
}).addBatch({
  "Geocode an address with a ' in it": {
    topic: function(){
      var geocoder,
        address = ["Juliu'sstraße 25, Hamburg, Germany"],
        promise = new(events.EventEmitter);
      fs.unlinkSync("./dbfile.cgg");
      geocoder = new Geocoder("./dbfile.cgg");
      geocoder.on("finish", function (res) {
        promise.emit("success", res);
      });
      geocoder.find(address);
      return promise;
    },
    "Return value from geocoding is an object" : function(err, result){
      assert.isObject(result);
    },
    "Return value object contains the right address": function(err, result){
      var location;
      location = result["Juliu'sstraße 25, Hamburg, Germany"];
      assert.isObject(location);
    }

  }
}).addBatch({
  "Geocode one wrong address and save it to cache file": {
    topic: function() {
      var geocoder,
        address = ["xdfagsf, asdf adsf a,a sdfa dsf"],
        promise = new(events.EventEmitter);
      fs.unlinkSync("./dbfile.cgg");
      geocoder = new Geocoder("./dbfile.cgg");
      geocoder.on("finish", function (res) {
        promise.emit("success", res);
      });
      geocoder.find(address);
      return promise;
    },
    "Return value from geocoding is an Object" : function(err, result) {
      assert.isObject(result);
    },
    "Return value object contains no address": function(err, result){
      var location;
      location = result["xdfagsf, asdf adsf a,a sdfa dsf"];
      assert.isUndefined(location);
    },
    "Cache file contains only one line": function(err, result){
      var fileContents = fs.readFileSync("./dbfile.cgg").toString();
      assert.equal(fileContents.split("\n").length-1, 1);
    },
    "Cache file contains the right data": function(err, result){
      var fileContents = fs.readFileSync("./dbfile.cgg").toString();
      assert.equal(fileContents, "xdfagsf, asdf adsf a,a sdfa dsf;ZERO_RESULTS\n");
    }

  }
}).addBatch({
  "Add multiple addresses to the cue at once": {
    topic: function(){
      var geocoder,
        address = ["Juliusstraße 25, Hamburg, Germany",
          "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA"],
        promise = new(events.EventEmitter);
      fs.unlinkSync("./dbfile.cgg");
      geocoder = new Geocoder("./dbfile.cgg");
      geocoder.on("finish", function (res) {
        promise.emit("success", res);
      });
      geocoder.find(address);
      return promise;
    },
    "Count of results in the return object is right": function(err, result){
      var address = ["Juliusstraße 25, Hamburg, Germany",
            "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA"],
        i;
      assert.isObject(result);
      for(i = 0; i < address.length; i++) {
        assert.isObject(result[address[i]]);
      }
    }
  }
}).addBatch({
  "Add multiple addresses to the cue not at the same time": {
    topic: function(){
      var geocoder,
        address = ["Juliusstraße 25, Hamburg, Germany",
          "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA"],
        i,
        promise = new(events.EventEmitter);
      fs.unlinkSync("./dbfile.cgg");
      geocoder = new Geocoder("./dbfile.cgg");
      geocoder.on("finish", function (res) {
        promise.emit("success", res);
      });
      for(i = 0; i < address.length; i++){
        geocoder.find([ address[i] ]);
      }
      return promise;
    },
    "Count of the objects in the results is right(should be 2)": function(err, result){
      var address = ["Juliusstraße 25, Hamburg, Germany",
            "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA"],
        i;
      assert.isObject(result);
      for(i = 0; i < address.length; i++) {
        assert.isObject(result[address[i]]);
      }
    }
  }
}).addBatch({
  "Remove File after tests are done": {
    topic: function(){
      fs.unlinkSync("./dbfile.cgg");
      return fs.existsSync("./dbfile.cgg");
    },
    "No File exists": function(topic){
      assert.isFalse(topic);
    }
  }
}).export(module);
