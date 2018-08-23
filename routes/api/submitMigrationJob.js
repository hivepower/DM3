// accept the post body with series details and also the new series to which it should be migrated.

/*
  If the new series is in the database
  If the new series is already in the influx db and has data in the given time range ! ERROR !! STOP DOING IT

*/
const Influx = require('influx');
let m = require('../_model/model.js')
var path = require('path');
export function post(req, res, next) {
  /*
    Body format :
    {
    	"from": {
    		seriesName : "level,site=FS-NB-001,generator=edit,units=in, method=,location=,number=1"
    	},
    	"to": {
    		seriesName : "level,site=FS-NB-001,generator=edit,units=in, method=,location=,number=1"
    	},
      "chunkSize" "256000000" // time in seconds
      "override_destination" : false // false by default
      "delete_source_after_migration" : false //false by default
   }
  */
  //store the body
  let bodyData = req.body
  let migrateFromSeries = bodyData.from.seriesName;
  let migrateToSeries = bodyData.to.seriesName;
  let {chunkSize} = bodyData
  let influxConnection = "";
  let override_destination = (bodyData.override_destination == 'true')
  let delete_source_after_migration = (bodyData.delete_source_after_migration == 'true') // set to false if not set

  if(!bodyData.dbConfig) {
    res.statusMessage = "Influx connection details missing in bodyData"
    res.status(500).end()
  } else {
    influxConnection = new Influx.InfluxDB(bodyData.dbConfig);
  }


  if(!migrateFromSeries || !migrateToSeries || !chunkSize) {
    res.statusMessage = "Body data is not complete. Make sure fromSeries, toSeries and chunkSize are set"
    res.status(500).end()
  }


  console.log(new Date() + " /api/submitMigrationJob")

  Promise.all([m.seriesToChannel(migrateFromSeries), m.seriesToChannel(migrateToSeries)])
  .then((channelObjects) => {
    let fromChannel = channelObjects[0]
    let toChannel = channelObjects[1]

    m.checkChannelExists(fromChannel, influxConnection).then((exists) => {
      if(exists) {
        //there is data in source channel. check if there is data in destination
        m.checkChannelExists(toChannel, influxConnection).then((exists) => {
          if(exists){
            if(override_destination == true) {
              //drop points here from the series and then call migrate data
              console.log("Data found in destination ! Dropping series !")
              m.dropDestinationSeries(toChannel, influxConnection).then(() => {
                let guid = m.createMigrateTask(fromChannel, toChannel, chunkSize, influxConnection, delete_source_after_migration)
                res.stautsText = "Migrate task created, GUID: " + guid
                res.status(200).send("Migrate task created, GUID: " + guid)
                res.end()
              }).catch((err) => {
                console.log("Error dropping points !" + err)
                res.statusText = "Error dropping points !" + err
                res.status(500).send(err)
                res.end()
              })
            } else {
              console.log('There is already data in destination channel! Migration failed !')
              res.statusText = "There is already data in destination channel! Migration failed !"
              res.status(400).send("There is already data in destination channel! Migration failed !");
              res.end()
            }

          } else {
              let guid = m.createMigrateTask(fromChannel, toChannel, chunkSize, influxConnection, delete_source_after_migration)
              res.statusText = "Migrate task created, GUID: " + guid
              res.status(200).send("Migrate task created, GUID: " + guid)
              res.end()
          }
        })
      } else {
        console.log('The source channel cannot be found in the InfluxDB !');
        res.statusText = "The source channel cannot be found in the InfluxDB !"
        res.status(400).send("The source channel cannot be found in the InfluxDB !")
        res.end()
      }
    })
  })


}
