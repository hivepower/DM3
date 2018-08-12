class MigrateTask {
  constructor(description, fromChannel, toChannel, influx) {
    this.guid = description.guid;
    this.summary ={
      done: false,
      status : "",
      fromChannel : "",
      toChannel : ""
    }
    this.summary.status = "Processing ..."
    this.summary.fromChannel = fromChannel
    this.summary.toChannel = toChannel

    this.promise = Promise.resolve(summary)
    .then((d) => this.generateChunks(d))
    .then((d) => this.exportQuery(d, influx))
    .then((fileContents) => this.writeFile(fileContents))
    .catch((err) => {
        this.summary = {
          done: true,
          status: err,
        };
      });
  }

    exportQuery(description, influx) {
      return new Promise((resolve, reject) => {
        // in the description there is from and to channels
        // get the first entry of the from channel get its date and chunk each monthto create queries for each month
        let {queries} = description
        const fileContents = {data:[]};

        let influxQueries = []; // array of influx query promises

        // each chunk will have start and end date
        for(const chunk in queries) {
          let q = `select value from "${chunk.measurement}"
                    where site = '${chunk.site}' and generator = '${chunk.generator}' and method = '${chunk.method}' and location = '${chunk.location}'
                    and units = '${chunk.units}' and number = '${chunk.number}'
                    and time >= '${chunk.startDate}' and time <= '${chunk.endDate}' group by *`;
          influxQueries.push(influx.query(q));
        }
        Promise.all(influxQueries).then(resultSet => {
          let processResultsChain = Promise.resolve();
          for (let results of resultSet) {
            processResultsChain = processResultsChain.then(() => {
              let groups = results.groups();
              var pending = [];
              let meta = groups.tags;

              // this may be long-running, so we want to yield to event loop in-between elements if needed.
              let rowsPromise = friendlyLoop(g.rows,[],(idx,row,result) => {
                if (fix_dst_override) {
                  result.push([config.overrides(meta.site, row.time.toISOString()), row.value]);
                }
                else {
                  result.push([row.time.toISOString(), row.value]);
                }
                return result;
              });

              // collect processed text rows into fileContents object
              let collector = rowsPromise.then(textRows => {
                fileContents.data.push({series: meta, rows: textRows});
                this.summary.queueLength -= 1;
                let pctDone = (this.summary.nSeries - this.summary.queueLength) / this.summary.nSeries;
                this.summary.pctDone = parseFloat(Math.round(pctDone * 10000) / 100).toFixed(2);
              });
              pending.push(collector);
              return Promise.all(pending); // return a thenable list
            })
          }
          processResultsChain.then(() => {
            queryResolve(fileContents)
          });
        })
      })
    }

    writeFile(fileContents, out_dir) {
      return new Promise((writeFileResolve,rejectWrite) => {

      }
    }
}
