var Geocoder = require("../lib/batch-geocoder"),
  geocoder = new Geocoder("./dbfile.cgg"),
  addresses = [],
  i=0;

geocoder.on("finish", function(collection){
  console.log(collection);
});
geocoder.on("status", function(status){
  console.log(status);
});

geocoder.on("error", function(status){
  console.log("Something went wrong", status);
});

for(i=0; i < 10; i++){
  addresses.push("Juliusstraße "+ i + ", Hamburg, Germany");
}
geocoder.find(addresses);
