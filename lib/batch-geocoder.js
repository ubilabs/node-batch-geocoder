exports.Geocoder = Geocoder;
/**
 * Parse .csv files to .cgg
 */
var fs = require("fs"),
  sys = require("sys"),
  Model = require("fishbone"),
  Stagger = require("stagger"),
  googlemaps = require('googlemaps');

var Geocoder = Model({
  counter: 0,
  requestCounter:0,
  staggerCount: 2,
  errors: 0,
  running: false,

  /**
   * init the Geocoder
   *
   * @param {string}  dbfile  Path to the db file
   */
  init: function (dbfile, clientId, privateKey) {
    this.parseDBFile(dbfile);
    if (privateKey && clientId) {
      googlemaps.config("google-private-key", privateKey);
      googlemaps.config("google-client-id", clientId);
      this.staggerCount = 10;
    }
    this.retries= {};

    this.stagger = new Stagger({requestsPerSecond: this.staggerCount});

    this.stagger.on("finish", function(event){
      this.finish();
    }.bind(this));

    this.dbfile = fs.createWriteStream(dbfile, {flags: 'a'});
    this.addresses = [];

  },

  /**
   * Parse the Database file
   *
   * @param {buffer}  dbfile  The dbfile Buffer
   */
  parseDBFile: function (dbfile) {
    this.data = {};
    if (!fs.existsSync(dbfile)) {
      return;
    }
    var fileContent = fs.readFileSync(dbfile, "utf8"),
      lines = fileContent.split(/\n/);

    lines.forEach(function (line) {
      var entry = line.split(';'),
        address = entry[0];

      if (entry.length < 3) {
        this.data[address] = {error: true};
        return;
      }

      this.data[address] = {
        lat: parseFloat(entry[1]),
        lng: parseFloat(entry[2])
      };

    }, this);

  },


  /**
   * add addresses to the search
   *
   * @param {array} addresses Contains all the addresses that are asked.
   */
  find: function (addresses) {
    if (this.addresses.length) {
      this.addresses = this.addresses.concat(addresses);
    } else {
      this.addresses = addresses;
      this.collection = {};
    }
    this.requestAddress();
  },

  /**
   * find the address
   */
  requestAddress: function () {
    var cache, address;
    if (this.counter < this.addresses.length) {
      address = this.addresses[this.counter];
      cache = this.data[address];

      if (cache) {
        if(!cache.lat) {
          if (cache.error) {
            this.errors++;
          }
        } else {
          this.collection[address] = cache;
        }
      }

      if (!this.data[address]) {
        this.stagger.push(this.geocode(address));
        this.data[address]={};
        this.requestCounter++;
      }

      setImmediate(this.next);
      return;
    }

    if(!this.requestCounter){
      this.finish();
      return;
    }

    if(!this.running) {
      this.running = true;
      this.stagger.start();
    }
  },

  /**
   * Return a callback function for the stagger module to execute
   *
   * @param {String}  address   Contains the current address
   */
  geocode: function(address){
    return function(callback){
      googlemaps.geocode(address.replace("'",""), function(err, response){
          this.onCompleteHandler(err, response, address);
          callback(address);
      }.bind(this));
    }.bind(this);

  },
  /**
   *  Recalls the requestAddress Method
   */
  next: function () {
    this.counter++;
    this.requestAddress();
  },

  /**
   *  On Complete Handler
   *
   *  @param  {error}   error   error Object
   *  @param  {object}  response Contains the return of the request as a JSON
   */
  onCompleteHandler: function (error, response, address) {
    if (error) {
      console.log(error);
      return;
    }
    this.requestCounter--;

    if (response.status !== "OK") {
      this.onErrorHandler(response.status, address);
      return;
    }
    this.retries = 0;

    var latLng = response.results[0].geometry.location;

    this.collection[address] = latLng;
    this.data[address] = latLng;

    this.dbfile.write([address, latLng.lat, latLng.lng].join(';') + "\n");
    this.trigger('status', [this.counter, this.counter - this.requestCounter - this.errors, this.errors]);


  },

  onErrorHandler: function (error, address) {
    this.errors++;
    switch (error) {
      case "OVER_QUERY_LIMIT":
        console.log(error);
        this.retries = this.retries+1 || 1;

        if (this.retries < 20) {
          this.stagger.push(this.geocode(address));
          this.requestCounter++;
          return;
        }

        return;
      default:
        // Handles ZERO_RESULT and INVALID_REQUEST
        break;
    }
    this.data[address] = {error:true};
    this.dbfile.write(address + ";" + error + "\n");
  },

  /**
   * Handle the finish event and emit the finish event
   */
  finish: function() {
      this.running = false;
      this.trigger('finish', this.collection);
      this.stagger.stop();
      this.addresses = [];
      this.counter = 0;
  }

});

module.exports = Geocoder;
