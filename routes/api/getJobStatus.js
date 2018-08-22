let m = require('../_model/model.js')
export function get(req, res, next) {
  console.log(new Date() + "/api/getJobStatus")
  let guid = req.headers.guid;
  let jobDetails = m.migrateTasks[guid]
  if(! jobDetails) {
    res.status(200).send("There is not job with that GUID")
    res.end()
  } else {
    res.status(200).send(m.migrateTasks[guid])
    res.end()
  }
}
