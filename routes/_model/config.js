const Influx = require('influx');
var path = require('path');
var fs = require('fs-extra');


let cfgLocation = path.join('./DM3/','..','cfg');
let dbConfig;

dbConfig = fs.readJSONSync(path.join(cfgLocation,'db_config.json')).dbConfig;

const connection = new Influx.InfluxDB(dbConfig);

module.exports.influx = connection;
