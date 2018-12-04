const Influx = require('influx');
let m = require('../_model/model.js')
var path = require('path');
const _ = require('underscore')

export function post (req, res, next) {
    console.log(new Date() + "POST: /api/migrationJob")
    /*

      Body format :
      {
      	"from": {
      		seriesName : "flow,generator=edit,location=circ,method=av,number=1,site=LM-ED-041,units=mgd"
      	},
      	"to": {
      		seriesName : "flow,generator=edit,location=circ,method=av,number=1,site=LM-ED-041,units=mgd"
      	},
        "chunkSize" "256000000" // time in seconds
        "override_destination" : false // false by default
        "delete_source_after_migration" : false //false by default
        "dbConfig" : {
          "host" : <hostname>,
          "port": <port> 8086?,
          "username" : <username>,
          "password": <password>,
          "database": <database>
        }
      }
     }
    */
    //store the body
    let bodyData = req.body
    let migrateFromSeries = bodyData.from.seriesName;
    let migrateToSeries = bodyData.to.seriesName;
    let chunkSize = parseInt(bodyData.chunkSize)
    let influxConnection = "";
    let override_destination = (bodyData.override_destination == 'true')
    let delete_source_after_migration = (bodyData.delete_source_after_migration == 'true') // set to false if not set

    if(!bodyData.dbConfig) {
      res.statusMessage = "Influx connection details missing in bodyData"
      res.status(400).send("Influx connection details missing in bodyData")
      res.end()
    } else {
      console.log(bodyData.dbConfig);
      influxConnection = new Influx.InfluxDB(bodyData.dbConfig);
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

      let jobDescription = m.createJobDescription(fromChannel, toChannel, chunkSize, influxConnection, delete_source_after_migration)

      m.checkChannelExists(fromChannel, influxConnection).then((exists) => {
        if(exists) {
          //there is data in source channel. check if there is data in destination
          m.checkChannelExists(toChannel, influxConnection).then((exists) => {
            if(exists){
              if(override_destination == true) {
                //drop points here from the series and then call migrate data
                console.log("Data found in destination ! Dropping series !")
                m.dropDestinationSeries(toChannel, influxConnection).then(() => {
                  let guid = m.createMigrateTask(fromChannel, toChannel, influxConnection, jobDescription)
                  res.status(200).send("Migrate task created, GUID: " + guid)
                  res.end()
                }).catch((err) => {
                  console.log("Error dropping points !" + err)
                  m.migrateTasks[jobDescription.guid].summary.status = "Error dropping points !" + err
                  res.status(500).send(err)
                  res.end()
                })
              } else {
                console.log('There is already data in destination channel! Migration failed !')
                m.migrateTasks[jobDescription.guid].summary.status = "There is already data in destination channel! Migration failed !"
                res.status(400).send("There is already data in destination channel! Migration failed ! GUID : " + jobDescription.guid);
                res.end()
              }

            } else {
                let guid = m.createMigrateTask(fromChannel, toChannel, influxConnection, jobDescription)

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
