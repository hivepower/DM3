const { DateTime } = require("luxon");
const _ = require("underscore");
const moment = require("moment");

let make_clauses = function (channelObject) {
  let q = `"${channelObject.measurement}"`;
  q += " where 1=1 ";
  if (Object.keys(channelObject).length > 1) {
    let and_str = "";
    for (var k in channelObject) {
      if (k == "measurement") {
        continue;
      }
      q += `${and_str} "${k}"='${channelObject[k]}'`;
      and_str = " and";
    }
  }
  return q;
};

let friendlyLoop = (data, initResult, work) => {
  return new Promise((resolve, reject) => {
    const maxIdx = data.length - 1;
    let results = initResult;
    let worker = (idx, done) => {
      results = work(idx, data[idx], data.groupsTagsKeys, results);
      if (idx == maxIdx) {
        done(results);
        return;
      }
      setImmediate(worker.bind(null, idx + 1, done));
    };
    worker(0, resolve);
  });
};

class MigrateTask {
  constructor(fromChannel, toChannel, description, src_influx, dest_influx) {
    console.log("Migrate task created");
    this.guid = description.guid;
    this.chunkSize = description.chunkSize;
    this.keepTags = description.keep_tags;
    this.delete_source_after_migration =
      description.delete_source_after_migration;
    this.chunks = [];
    this.summary = {
      done: false,
      status: "",
      fromChannel: "",
      toChannel: "",
      createdOn: "",
      completedOn: "",
      numberOfPointsProcessed: 0,
      totalChunks: 0,
      remianingChunks: 0,
      writeChunksProcessed: 0,
    };
    this.summary.status = "Processing ...";
    this.summary.fromChannel = fromChannel;
    this.summary.toChannel = toChannel;
    this.summary.createdOn = moment().format("YYYY MMMM Do, h:mm:ss a");

    // console.log(this.chunkSize)
    // need to verify if there is data in the
    this.promise = Promise.resolve(this.summary)
      .then((d) => this.createChunksForMigration(d, src_influx)) // create a chunk array which has start and end dates
      .then((d) => this.beginMigration(d, src_influx, dest_influx)) // use the chunk array created in previous step and export each month data into CSV
      .catch((err) => {
        this.summary.done = true;
        this.summary.status = "ERROR : " + err.message;
      });
  }

  createChunksForMigration(summary, influx) {
    //get the first date and last date of the channel from which we want to migrate
    return new Promise((resolve, reject) => {
      let fromChannel = summary.fromChannel;
      let startDate = "";
      let endDate = "";
      let out_dates = [];
      let getFirstDateInflux =
        "select * from " + make_clauses(fromChannel) + " limit 1";
      let getEndDateInflux =
        "select * from " +
        make_clauses(fromChannel) +
        " order by time desc limit 1";

      Promise.all([
        influx.query(getFirstDateInflux),
        influx.query(getEndDateInflux),
      ]).then((values) => {
        startDate = values[0];
        endDate = values[1];
        endDate = DateTime.fromISO(endDate[0].time._nanoISO, {
          zone: "utc",
        }).plus({ months: 1 }); // add one month to the end to make it complete
        let chunkStart = DateTime.fromISO(startDate[0].time._nanoISO, {
          zone: "utc",
        }).set({ day: 1, hour: 0, minute: 0, seconds: 0 }); // set to start of the month
        let chunkEnd = chunkStart.plus({ seconds: this.chunkSize });
        do {
          out_dates.push({
            start: chunkStart,
            end: chunkEnd,
          });
          chunkStart = chunkEnd;
          chunkEnd = chunkEnd.plus({ seconds: this.chunkSize });
          summary.totalChunks += 1;
          summary.remianingChunks += 1;
        } while (chunkStart.valueOf() <= endDate.valueOf());
        this.chunks = out_dates;
        resolve(summary);
      });
    });
  }

  beginMigration(summary, src_influx, dest_influx) {
    return new Promise((migrationResolve, migrationReject) => {
      // here create a promise which calls export task and import task for each month
      let { fromChannel } = summary;
      let { toChannel } = summary;
      let tagsObj = _.omit(toChannel, "measurement");
      let migrateDataPromise = Promise.resolve();
      let chunks = this.chunks;
      this.summary.tagsObj = tagsObj;

      _.each(chunks, (chunk) => {
        let startDate = chunk["start"];
        let endDate = chunk["end"];
        let q =
          "select value from " +
          make_clauses(fromChannel) +
          `and time >= '${startDate}' and time <= '${endDate}' group by *`;

        migrateDataPromise = migrateDataPromise.then(() => {
          // var pending = [];
          return new Promise((resolve, reject) => {
            src_influx
              .query(q)
              .then((resultData) => this.createInfluxDBPoints(resultData))
              .then((points) => this.writeDataToInflux(points, dest_influx))
              .then(() => resolve())
              .catch((err) => {
                console.log(err);
                migrationReject(err);
              });
          });
        });
      });
      migrateDataPromise.then(() => {
        if (this.delete_source_after_migration) {
          console.log("Deleting source points ...");
          this.deleteSourceSeries(fromChannel, src_influx).then((done) => {
            if (done) {
              summary.done = true;
              summary.status = "Completed";
              this.summary.completedOn = moment().format(
                "YYYY MMMM Do, h:mm:ss a"
              );
              migrationResolve({ reallyDone: true });
            }
          });
        } else {
          summary.done = true;
          summary.status = "Completed";
          this.summary.completedOn = moment().format("YYYY MMMM Do, h:mm:ss a");
          migrationResolve({ reallyDone: true });
        }
      });
    });
  }

  deleteSourceSeries(fromChannel, influx) {
    return new Promise((resolve, reject) => {
      let drop_q = "drop series from " + make_clauses(fromChannel);
      influx
        .query(drop_q)
        .then(() => {
          resolve(true);
        })
        .catch((err) => {
          reject(err);
        });
    });
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
    this.summary.remianingChunks -= 1;
    // console.log("calling create points")
    if (resultData.length > 0) {
      return friendlyLoop(resultData, [], (idx, row, tagsKeys, result) => {
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

        let newTags;
        if (this.keepTags) {
          newTags = _.extend(_.pick(row, tagsKeys), this.summary.tagsObj);
          newTags = _.omit(newTags, (value) => {
            return _.isEmpty(value);
          });
        } else {
          newTags = this.summary.tagsObj;
        }

        result.push({
          measurement: this.summary.toChannel.measurement,
          tags: newTags,
          fields: { value: row.value },
          timestamp: row.time,
        });

        return result;
      });
    } else {
      return null;
    }
  }

  writeDataToInflux(points, influx) {
    // console.log("calling write points")
    this.summary.writeChunksProcessed += 1;
    if (points) {
      return new Promise((writeResolve, writeReject) => {
        influx
          .writePoints(points)
          .then(() => {
            writeResolve();
          })
          .catch((err) => writeReject(err));
      });
    }
  }
}

module.exports = { MigrateTask, make_clauses };
