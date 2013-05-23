exports.Geocoder = Geocoder;
/**
 * Parse .csv files to .cgg
 */
var fs = require("fs"),
  sys = require("sys"),
  Model = require("fishbone"),
  googlemaps = require('googlemaps');

var Geocoder = Model({
  counter: 0,
  staggerTime: 500,
  retries: 0,
  errors: 0,

  /**
   * init the Geocoder
   *
   * @param {string}  dbfile  Path to the db file
   */
  init: function (dbfile) {
    this.parseDBFile(dbfile);

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
        lat: entry[1],
        lng: entry[2]
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
      return true;
    }
    this.addresses = addresses;
    this.collection = {};
    this.requestAddress();
  },

  /**
   * find the address
   */
  requestAddress: function () {
    var cache,
      proxy;
    if (typeof(setImmediate) !== 'function') {
      proxy = function(callback) {
        setTimeout(callback, 1);
      };
    }else{
      proxy = setImmediate;
    }
    if (this.counter < this.addresses.length) {
      this.currentAddress = this.addresses[this.counter];
      this.lastRequest = new Date();
      cache = this.data[this.currentAddress];


      if (cache) {
        if (cache.error) {
          this.errors++;
          proxy(this.next);
          return;
        }

        this.collection[this.currentAddress] = cache;
        proxy(this.next);
        return;
      }

      if (this.retries < 20) {
        googlemaps.geocode(this.currentAddress, this.onCompleteHandler);
        return;
      }

      this.errors++;
      this.next();
      return;
    }
    this.trigger('finish', this.collection);
    this.addresses = [];
    this.counter = 0;
  },

  /**
   *  Recalls the requestAddress Method
   */
  next: function () {
    this.trigger('status', [this.counter, this.counter - this.errors, this.errors]);
    this.counter++;
    this.requestAddress();
  },

  /**
   *  On Complete Handler
   *
   *  @param  {error}   error   error Object
   *  @param  {object}  response Contains the return of the request as a JSON
   */
  onCompleteHandler: function (error, response) {
    if (error) {
      console.log(error);
      this.requestAddress();
      return;
    }

    if (response.status !== "OK") {
      this.onErrorHandler(response.status);
      return;
    }
    this.retries = 0;

    var latLng = response.results[0].geometry.location;
      duration = new Date() - this.lastRequest,
      nextRequest = this.staggerTime - duration;

    this.collection[this.currentAddress] = latLng;
    this.data[this.currentAddress] = latLng;

    this.dbfile.write([this.currentAddress, latLng.lat, latLng.lng].join(';') + "\n");

    if (nextRequest > 0) {
      setTimeout(this.next, nextRequest);
      return;
    }
    this.next();
  },

  onErrorHandler: function (error) {
    this.errors++;
    switch (error) {
      case "OVER_QUERY_LIMIT":
        console.log(error);
        this.retries++;

        if (this.retries < 20) {
          setTimeout(this.next, this.staggerTime * this.retries * 1000);
          return;
        }

        this.next();
        return;
      default:
        // Handles ZERO_RESULT and INVALID_REQUEST
        break;
    }
    this.data[this.currentAddress] = {error:true};
    this.dbfile.write(this.currentAddress + ";" + error + "\n");
    this.next();
  }

});

module.exports = Geocoder;
