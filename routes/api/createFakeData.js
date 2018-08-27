const moment = require('moment');
const fs = require('fs-extra');

export function get(req, res, next) {
  let endDate = moment()

  let startDate =  new moment().subtract(6, 'months');
  console.log(startDate.month())
  console.log(endDate.month())
  let stream = fs.createWriteStream('mydata.txt', {'flags': 'a'})

  stream.on('drain', function() {
    console.log("calling drain")
    writeData(stream, startDate, endDate);
  })

  stream.on('finish', () => {
      console.log('wrote all data to file');
      res.status(200).end()
  });

  writeData(stream, startDate, endDate);
}

function writeData (stream, startDate, tempDate) {
  do {
      stream.write("level,"+ "site=CSO-002,generator=scada,units=in,method=mousehouse,location=upstream,number=1"+ " value="+ Math.random() + " "+startDate.unix() + '\n')
      startDate = startDate.add(5, 'minutes')
  } while(startDate.month() <= tempDate.month())
  stream.end()
}
