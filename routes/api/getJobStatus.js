let m = require('../_model/model.js')
export function get(req, res, next) {
  console.log(new Date() + "/api/getJobStatus")
  let guid = req.headers.guid;
  console.log(m.migrateTasks[guid])
}
