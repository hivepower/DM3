let _ = require('underscore')
let {influx} = require('./config.js')

module.exports.seriesToChannel = function(seriesName) {
  if(seriesName == ''){
    console.log("Series name is empty")

  }
  // this function inputs a series name and returns a channelObject
  // seriesName : "level,site=FS-NB-001,generator=edit,units=in, method=,location=,number=1"
  let arrayObject = seriesName.split(',')
  let measurement = arrayObject[0]
  let site = arrayObject[1].split('=')[1]
  let generator = arrayObject[2].split('=')[1]
  let units = arrayObject[3].split('=')[1]
  let method = arrayObject[4].split('=')[1]
  let location = arrayObject[5].split('=')[1]
  let number = arrayObject[6].split('=')[1]

  return({
    measurement, site, generator, units, method, location, number
  })
}

module.exports.checkChannelExists = function(channelObject) {
  // query the influx db and see if the channel exists
  return new Promise((resolve, reject) => {


    influx.query(`select count(*) from "${channelObject.measurement}" where "site"='${channelObject.site}' and "generator"='${channelObject.generator}'
    and "units"='${channelObject.units}' and "method"='${channelObject.method}' and "location"='${channelObject.location}' and "number"='${channelObject.number}'`)
    .then((res) => {
      console.log(res[0].count_value)
      if(res[0].count_value > 0){
        //found channel
        resolve(true)
      } else {
        resolve(false)
      }

    })
  })

}
