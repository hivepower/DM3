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

  console.log(new Date() + " /api/submitMigrationJob")

  Promise.all([m.seriesToChannel(migrateFromSeries), m.seriesToChannel(migrateToSeries)])
  .then((channelObjects) => {
    let fromChannel = channelObjects[0]
    let toChannel = channelObjects[1]

    m.checkChannelExists(fromChannel).then((exists) => {
      if(exists) {
        //there is data in source channel. check if there is data in destination if so dont migrate.
        m.checkChannelExists(toChannel).then((exists) => {
          if(exists){
            res.status(500).send({error : 'There is already data in destination channel! Migration failed !'})
          } else {
              m.createMigrateTask(fromChannel, toChannel, chunkSize)
              res.sendStatus(200)
          }
        })
      } else {
        res.status(200).send({error : 'The source channel cannot be found in the InfluxDB !'})
      }
    })
  })


}
