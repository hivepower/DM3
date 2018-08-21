// accept the post body with series details and also the new series to which it should be migrated.

/*
  If the new series is in the database
  If the new series is already in the influx db and has data in the given time range ! ERROR !! STOP DOING IT

*/
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
    	}
   }
  */
  //store the body
  let bodyData = req.body
  let migrateFromSeries = bodyData.from.seriesName;
  let migrateToSeries = bodyData.to.seriesName;
  let {chunkSize} = bodyData
  let influxConnection = bodyData.schema

  if(!migrateFromSeries || !migrateToSeries || !chunkSize) {
    res.statusMessage = "Body data is not complete. Make sure fromSeries, toSeries and chunkSize are set"
    res.status(500).end()
  }
  if(!influxConnection) {
    res.statusMessage = "Influx connection missing in bodyData"
    res.status(500).end()
  }

  console.log(new Date() + " /api/submitMigrationJob")

  Promise.all([m.seriesToChannel(migrateFromSeries), m.seriesToChannel(migrateToSeries)])
  .then((channelObjects) => {
    let fromChannel = channelObjects[0]
    let toChannel = channelObjects[1]

    m.checkChannelExists(fromChannel, influxConnection).then((exists) => {
      if(exists) {
        //there is data in source channel. check if there is data in destination if so dont migrate.
        m.checkChannelExists(toChannel, influxConnection).then((exists) => {
          if(exists){
            console.log('There is already data in destination channel! Migration failed !')
            res.statusMessage = "There is already data in destination channel! Migration failed !";
            res.status(400).end();
          } else {
              let guid = m.createMigrateTask(fromChannel, toChannel, chunkSize, influxConnection)
              res.statusMessage = "Migrate task created, GUID: " + guid
              res.status(200).end()
          }
        })
      } else {
        console.log('The source channel cannot be found in the InfluxDB !');
        res.statusMessage = "The source channel cannot be found in the InfluxDB !";
        res.status(400).end();
      }
    })
  })


}
