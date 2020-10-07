const Influx = require('influx');
let m = require('../_model/model.js')
var path = require('path');
const _ = require('underscore')

export function post (req, res, next) {
    console.log(new Date() + "POST: /api/migrationJob")
    /*

      Body format :
      {
        "from": "flow,generator=edit,location=circular,method=av,number=1,site=LM-ED-041,units=mgd",
        "to": "flow,generator=edit,location=circ,method=av,number=1,site=LM-ED-041,units=mgd",
        "chunkSize" : 5256000, //time chunk in seconds
        "on_conflict" : 'merge' || 'drop' || 'quit' // quit by default
        "delete_source_after_migration": true, // (or) false // after migration remove the series from source channel
        "dbConfig": {... node-influx connection config ...}
      }
    */
    //store the body
    let bodyData = req.body
    let migrateFromSeries = bodyData.from;
    let migrateToSeries = bodyData.to;
    let chunkSize = parseInt(bodyData.chunkSize)
    let src_influx;
    let dest_influx;
    let on_conflict = bodyData.on_conflict ? bodyData.on_conflict : 'quit';
    let delete_source_after_migration = (bodyData.delete_source_after_migration == true) // set to false if not set

    console.log(bodyData)

    if(!bodyData.dbConfig) {
      res.statusMessage = "Influx connection details missing in bodyData"
      res.status(400).send("Influx connection details missing in bodyData")
      res.end()
    } else {
      console.log(bodyData.dbConfig);
      src_influx = new Influx.InfluxDB(bodyData.dbConfig);
      if(bodyData.destinationDb) {
        dest_influx = new Influx.InfluxDB(bodyData.destinationDb);
      }
      else {
        dest_influx = src_influx;
      }
    }


    if(!migrateFromSeries || !migrateToSeries || !chunkSize) {
      res.statusMessage = "Body data is not complete. Make sure fromSeries, toSeries and chunkSize are set"
      res.status(400).send("Body data is not complete. Make sure fromSeries, toSeries and chunkSize are set")
      res.end()
    }




    Promise.all([m.seriesToChannel(migrateFromSeries), m.seriesToChannel(migrateToSeries)])
    .then((channelObjects) => {
      let fromChannel = channelObjects[0]
      let toChannel = channelObjects[1]

      let jobDescription = m.createJobDescription(fromChannel, toChannel, chunkSize, src_influx, dest_influx, delete_source_after_migration)

      console.log(new Date() + ` From Channel`);
      console.log(fromChannel);
      console.log(new Date() + ` To Channel`);
      console.log(toChannel);

      m.checkChannelExists(fromChannel, src_influx).then((exists) => {
        if(exists) {
          //there is data in source channel. check if there is data in destination
          m.checkChannelExists(toChannel, dest_influx).then((exists) => {
            if(exists){
              if(on_conflict == 'drop') {
                //drop points here from the series and then call migrate data
                console.log(new Date() + "Data found in destination on conflict policy set to drop ! Dropping series !")
                m.dropDestinationSeries(toChannel, dest_influx).then(() => {
                  let guid = m.createMigrateTask(fromChannel, toChannel, src_influx, dest_influx, jobDescription)
                  res.status(200).send("Migrate task created, GUID: " + guid)
                  res.end()
                }).catch((err) => {
                  console.log("Error dropping points !" + err)
                  m.migrateTasks[jobDescription.guid].summary.status = "Error dropping points !" + err
                  res.status(500).send(err)
                  res.end()
                })
              }
              else if(on_conflict == 'merge') {
                console.log(new Date() + ` Data found in destination channel. Conflict policy set to merge. Merging series.`);
                let guid = m.createMigrateTask(fromChannel, toChannel, src_influx, dest_influx, jobDescription)
                res.status(200).send("Migrate task created, GUID: " + guid)
                res.end()
              }
               else {
                console.log('There is already data in destination channel! Migration failed !')
                m.migrateTasks[jobDescription.guid].summary.status = "There is already data in destination channel! Migration failed !"
                res.status(400).send("There is already data in destination channel! Migration failed ! GUID : " + jobDescription.guid);
                res.end()
              }
            } else {
                let guid = m.createMigrateTask(fromChannel, toChannel, src_influx, dest_influx, jobDescription)

                res.status(200).send("Migrate task created, GUID: " + guid)
                res.end()
            }
          })
        } else {
          console.log('There is no data in the source channel !');
          m.migrateTasks[jobDescription.guid].summary.status = "There is no data in the source channel !"
          res.status(200).send("There is no data in the source channel ! GUID : " + jobDescription.guid)
          res.end()
        }
      })
    })

}

export function get (req, res, next) {
  /*
  there are 2 parts in get
  1. You can get all the jobs ever ran on the server by the end point GET: /api/migrationJobs
  2. You can get specific job details by GET: /api/migrationJobs?guid=<guid>
  */

  if(req.query.guid) {
    // the query is for a specific JOB ID so query only that
    console.log(new Date() + "GET: /api/migrationJob?guid=<>")
    let guid = req.query.guid;
    let jobDetails = m.migrateTasks[guid]

    if(! jobDetails) {
      res.status(200).send("There is not job with that GUID")
      res.end()
    } else {
      jobDetails = _.omit(jobDetails, 'chunks')
      res.status(200).send(m.migrateTasks[guid])
      res.end()
    }
  } else {
    console.log(new Date() + "GET: /api/migrationJob")
    let resObj = {}
    let objLength = Object.keys(m.migrateTasks).length // there are n objects in this dictonary
    //iterate from the last object to the oldest
    for(let i = objLength-1 ; i >= 0 ; i--) {
        resObj[Object.keys(m.migrateTasks)[i]] = _.omit(Object.values(m.migrateTasks)[i], 'chunks')
    }

    res.status(200).send(resObj)
  }

}
