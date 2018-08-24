const { DateTime } = require('luxon');
const _ = require('underscore')
const moment = require('moment');

let friendlyLoop = (data, initResult,work) => {
  return new Promise((resolve,reject) => {
    const maxIdx = data.length - 1;
    let results = initResult;
    let worker = (idx,done) => {
      results = work(idx,data[idx],results);
      if (idx == maxIdx) {
        done(results);
        return;
      }
      setImmediate(worker.bind(null, idx+1, done));
    };
    worker(0,resolve);
  });
};

class MigrateTask {
  constructor(description, influx) {
    console.log("Migrate task created")
    this.guid = description.guid;
    this.chunkSize = description.chunkSize
    this.delete_source_after_migration = description.delete_source_after_migration
    this.summary ={
      done: false,
      status : "",
      fromChannel : "",
      toChannel : "",
      chunks: [],
      createdOn: '',
      completedOn: '',
      numberOfPointsProcessed: 0,
      totalChunks: 0,
      remianingChunks: 0,
      writeChunksProcessed: 0
    }
    this.summary.status = "Processing ..."
    this.summary.fromChannel = description.fromChannel
    this.summary.toChannel = description.toChannel
    this.summary.createdOn = moment().format()

    // console.log(this.chunkSize)
    // need to verify if there is data in the
    this.promise = Promise.resolve(this.summary)
    .then((d) => this.createChunksForMigration(d, influx)) // create a chunk array which has start and end dates
    .then((d) => this.beginMigration(d, influx)) // use the chunk array created in previous step and export each month data into CSV
    .catch((err) => {
      this.summary.done = true
      this.summary.status = "ERROR : " +  err.message
    })

  }

  createChunksForMigration(summary, influx) {
    //get the first date and last date of the channel from which we want to migrate
    return new Promise((resolve, reject) => {
      let fromChannel = summary.fromChannel
      let startDate = ""
      let endDate = ""
      let out_dates = []
      let getFirstDateInflux = `select * from ${fromChannel.measurement} where site = '${fromChannel.site}' and generator = '${fromChannel.generator}'
      and method = '${fromChannel.method}' and location = '${fromChannel.location}' and number='${fromChannel.number}' and units = '${fromChannel.units}'
      limit 1`

      let getEndDateInflux = `select * from ${fromChannel.measurement} where site = '${fromChannel.site}' and generator = '${fromChannel.generator}'
      and method = '${fromChannel.method}' and location = '${fromChannel.location}' and number='${fromChannel.number}' and units = '${fromChannel.units}'
      order by time desc limit 1`

      Promise.all([influx.query(getFirstDateInflux), influx.query(getEndDateInflux)]).then((values) => {

        startDate = values[0]
        endDate = values[1]
        endDate = DateTime.fromISO(endDate[0].time._nanoISO, {zone: 'utc'}).plus({months: 1}) // add one month to the end to make it complete
        let chunkStart = DateTime.fromISO(startDate[0].time._nanoISO, {zone: 'utc'}).set({day:1, hour:0, minute:0, seconds:0})
        let chunkEnd = chunkStart.plus({seconds: this.chunkSize})
        do {
          out_dates.push({
            start: chunkStart,
            end: chunkEnd
          });
          chunkStart = chunkEnd;
          chunkEnd = chunkEnd.plus({seconds:this.chunkSize})
          summary.totalChunks += 1
          summary.remianingChunks += 1
        } while(chunkStart.valueOf() <= endDate.valueOf())
        summary.chunks = out_dates
        resolve(summary)
      })
    })
  }

  beginMigration(summary, influx) {
    return new Promise((migrationResolve, migrationReject) => {
      // here create a promise which calls export task and import task for each month
      let {fromChannel} = summary
      let {toChannel} = summary
      let tags = _.omit(toChannel, 'measurement')
      let migrateDataPromise = Promise.resolve();
      let {chunks} = summary
      let tagsObj = {
      number: this.summary.toChannel.number,
      units: this.summary.toChannel.units,
      generator: this.summary.toChannel.generator,
      site: this.summary.toChannel.site
      }
      // the writepoints API will not work if there is a empty tag i.e : method=''
      // Hence its best we build a list of tag to use it when creating Ipoints object
      if(toChannel.location) {
        tagsObj.location = this.summary.toChannel.location
      }
      if(toChannel.method) {
        tagsObj.method = this.summary.toChannel.method
      }
      this.summary.tagsObj = tagsObj

      _.each(chunks, (chunk) => {
        let startDate = chunk['start']
        let endDate = chunk['end']
        let q = `select value from "${fromChannel.measurement}"
        where site = '${fromChannel.site}' and generator = '${fromChannel.generator}' and method = '${fromChannel.method}'
        and location = '${fromChannel.location}' and number='${fromChannel.number}' and units = '${fromChannel.units}'
        and time >= '${startDate}' and time <= '${endDate}'group by *`;

        migrateDataPromise = migrateDataPromise.then(() => {
          // var pending = [];
          return new Promise((resolve, reject) => {
            influx.query(q)
            .then((resultData) => this.createInfluxDBPoints(resultData))
            .then((points) => this.writeDataToInflux(points, influx))
            .then(() => resolve())
            .catch((err) => {
              console.log(err)
              migrationReject(err)
            })
          })
        })
      })
      migrateDataPromise.then(() => {
        if(this.delete_source_after_migration) {
          console.log("Deleting source points ...")
          this.deleteSourceSeries(fromChannel, influx).then((done) => {
            if(done) {
              summary.done = true
              summary.status = "Completed"
              this.summary.completedOn = moment().format()
              migrationResolve({'reallyDone':true})
            }
          })
        } else {
          summary.done = true
          summary.status = "Completed"
          this.summary.completedOn = moment().format()
          migrationResolve({'reallyDone':true})
        }
        })
    })
  }

  deleteSourceSeries(fromChannel, influx) {
    return new Promise((resolve, reject) => {
      console.log(`drop series from "${fromChannel.measurement}" where "site"='${fromChannel.site}' and "generator"='${fromChannel.generator}'
      and "units"='${fromChannel.units}' and "method"='${fromChannel.method}' and "location"='${fromChannel.location}' and "number"='${fromChannel.number}'`)

      influx.query(`drop series from "${fromChannel.measurement}" where "site"='${fromChannel.site}' and "generator"='${fromChannel.generator}'
      and "units"='${fromChannel.units}' and "method"='${fromChannel.method}' and "location"='${fromChannel.location}' and "number"='${fromChannel.number}'`)
      .then(() => {
        resolve(true)
      }).catch((err) => {
        reject(err)
      })
    })
  }

  createInfluxDBPoints(resultData) {
    /* resultData
    { time:
      { 2018-06-01T08:15:07.000Z
        _nanoISO: '2018-06-01T08:15:07Z',
        getNanoTime: [Function: getNanoTimeFromISO],
        toNanoISOString: [Function: toNanoISOStringFromISO] },
     value: 2.459868,
     generator: 'scada',
     location: 'upstream',
     method: 'mousehouse',
     number: '1',
     site: 'CSO-002',
     units: 'in' },
    */
    this.summary.remianingChunks -= 1
    // console.log("calling create points")
    if(resultData.length > 0) {
    return friendlyLoop(resultData, [], (idx, row, result) => {
      /* [{
          measurement: 'tide',
          tags: {
            unit: 'in'
          },
          fields: { height: 123 }
        },
        {
          measurement: 'tide',
          tags: {
            unit: 'in'
          },
          fields: { height: 124 }
        }]*/

          result.push({measurement: this.summary.toChannel.measurement,
            tags: this.summary.tagsObj,
            fields: {value: row.value},
            timestamp: row.time
            })


      return result
    })
  } else {
    return null
  }
  }

  writeDataToInflux(points, influx)   {
    // console.log("calling write points")
    this.summary.writeChunksProcessed += 1
    if(points) {
      return new Promise((writeResolve, writeReject) => {
        influx.writePoints(points)
        .then(() => {
          writeResolve()
        })
        .catch((err) => writeReject(err))
      })
    }

  }
}

module.exports = MigrateTask;
