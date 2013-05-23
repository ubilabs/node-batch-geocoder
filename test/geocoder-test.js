var vows = require("vows"),
  assert = require("assert"),
  events = require("events"),
  fs = require("fs"),
  gc = require("../lib/geocoder");

vows.describe("geocode").addBatch({
  "Do not create a instance" : {
    topic: function() {
      return new gc();
    },
    "Object is not create": function(topic) {
      assert.equal(topic.message,"path must be a string");
    }
  },
  "Create a instance" : {
    topic: function() {
      return new gc("./dbfile.cgg");
    },
    "Object is create": function(topic) {
      assert.instanceOf(topic,gc);
    },
    "Object has a Write Stream to file": function(topic) {
      assert.isObject(topic.dbfile);
    },
    "Object has parsed old Data": function(topic) {
      assert.isObject(topic.data);
    }
  }
}).addBatch({
  "Geocode one address and save to file": {
    topic: function() {
      var geocoder,
        address = ["Juliusstraße 25, Hamburg, Germany"],
        promise = new(events.EventEmitter);
      fs.unlinkSync("./dbfile.cgg");
      geocoder = new gc("./dbfile.cgg");
      geocoder.on("finish", function (res) {
        promise.emit("success", res);
      });
      geocoder.find(address);
      return promise;
    },
    "Return value is a Object" : function(err, result) {
      assert.isObject(result);
    },
    "Return contains the right address": function(err, result){
      var location;
      location = result["Juliusstraße 25, Hamburg, Germany"];
      assert.isObject(location);
    },
    "Address has the right lat": function(err, result){
      var location;
      location = result["Juliusstraße 25, Hamburg, Germany"];
      assert.isNumber(location.lat);
      assert.equal(location.lat, 53.5612782);
    },
    "Address has the right lng": function(err, result){
      var location;
      location = result["Juliusstraße 25, Hamburg, Germany"];
      assert.isNumber(location.lng);
      assert.equal(location.lng, 9.9610992);
    },
    "Dbfile contains only one adress": function(err, result){
      var fileContents = fs.readFileSync("./dbfile.cgg").toString();
      assert.equal(fileContents.split("\n").length-1, 1);
    },
    "Dbfile contains the right address": function(err, result){
      var fileContents = fs.readFileSync("./dbfile.cgg").toString();
      assert.equal(fileContents, "Juliusstraße 25, Hamburg, Germany;53.5612782;9.9610992\n");
    }

  }
}).addBatch({
  "Geocode one wrong address and save to file": {
    topic: function() {
      var geocoder,
        address = ["xdfagsf, asdf adsf a,a sdfa dsf"],
        promise = new(events.EventEmitter);
      fs.unlinkSync("./dbfile.cgg");
      geocoder = new gc("./dbfile.cgg");
      geocoder.on("finish", function (res) {
        promise.emit("success", res);
      });
      geocoder.find(address);
      return promise;
    },
    "Return value is a Object" : function(err, result) {
      assert.isObject(result);
    },
    "Return contains the right address": function(err, result){
      var location;
      location = result["xdfagsf, asdf adsf a,a sdfa dsf"];
      assert.isUndefined(location);
    },
    "Dbfile contains only one adress": function(err, result){
      var fileContents = fs.readFileSync("./dbfile.cgg").toString();
      assert.equal(fileContents.split("\n").length-1, 1);
    },
    "Dbfile contains the right address": function(err, result){
      var fileContents = fs.readFileSync("./dbfile.cgg").toString();
      assert.equal(fileContents, "xdfagsf, asdf adsf a,a sdfa dsf;ZERO_RESULTS\n");
    }

  }
}).addBatch({
  "Remove File after tests are done": {
    topic: function(){
      fs.unlinkSync("./dbfile.cgg");
      return fs.existsSync("./dbfile.cgg");
    },
    "File has been removed": function(topic){
      assert.isFalse(topic);
    }
  }
}).run();
