let _ = require('underscore')
let moment = require('moment')
let {MigrateTask, make_clauses} = require('./migrate_task.js');
const Guid = require('guid');

let migrateTasks = {};

module.exports.migrateTasks = migrateTasks; // hashed dict of Promises


module.exports.createJobDescription = function(fromChannel, toChannel, chunkSize, src_influx, dest_influx, delete_source_after_migration) {
  const guid = Guid.create().value;
  let description = {}
  description.guid = guid;
  description.chunkSize = chunkSize
  description.delete_source_after_migration = delete_source_after_migration
  description.summary = {}
  description.summary.totalChunks = 0
  description.summary.writeChunksProcessed = 0
  description.summary.status = "Task Created ..."
  description.summary.fromChannel = fromChannel
  description.summary.toChannel = toChannel
  description.summary.createdOn = moment().format('YYYY MMMM Do, h:mm:ss a')
  description.summary.completedOn = "NA"
  migrateTasks[guid] = description
  return description
}


module.exports.seriesToChannel = function(seriesName) {
  return new Promise((resolve, reject) => {
    if(seriesName == ''){
      console.log("Series name is empty")
      reject("series name empty");
    }
    // this function inputs a series name and returns a channelObject
    //"flow,generator=edit,location=circ,method=av,number=1,site=LM-ED-041,units=mgd"
    let series_tags = seriesName.split(',');
    let resObj = { measurement: series_tags.shift() };
    _.each(series_tags, (t_pair) => {
      kv = t_pair.split('=');
      resObj[kv[0]] = kv[1];
    });
    resolve(resObj)
  })

}

module.exports.checkChannelExists = function(channelObject, influx) {
  // query the influx db and see if the channel exists
  return new Promise((resolve, reject) => {
    q = "select count(*) from " + make_clauses(channelObject);
    influx.query(q)
    .then((res) => {
      if( res[0] ){
        if(res[0].count_value > 0) {
          //found channel
          resolve(true)
        } else {
          resolve(false)
        }
      } else {
        resolve(false)
      }
    })
  })
}



module.exports.createMigrateTask = function(fromChannel, toChannel, src_influx, dest_influx, description) {
  task = new MigrateTask(fromChannel, toChannel, description, src_influx, dest_influx);
  migrateTasks[description.guid] = task
  return description.guid
}

module.exports.dropDestinationSeries = function(channel, influx) {
  return new Promise((resolve, reject) => {
    let q = "drop series from " + make_clauses(channel);
    influx.query(q)
    .then(() => {
      resolve(true)
    }).catch((err) => {
      reject(err)
    })
  })
}
