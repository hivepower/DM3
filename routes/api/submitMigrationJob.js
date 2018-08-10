// accept the post body with series details and also the new series to which it should be migrated.

/*
  If the new series is in the database
  If the new series is already in the influx db and has data in the given time range ! ERROR !! STOP DOING IT

*/
let m = require('../_model/model.js')
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

  console.log(new Date() + " /api/submitMigrationJob")

  let fromChannel = m.seriesToChannel(migrateFromSeries)
  let toChannel = m.seriesToChannel(migrateToSeries)

  if(m.checkFromSeriesExists(fromChannel)){
    // influx was able to find the source data in influx db
    ExportTask(fromChannel, toChannel);
  } else {
    //influx was not able to find the source series. End the migration job with error flag
  }
}
