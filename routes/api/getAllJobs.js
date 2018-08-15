let m = require('../_model/model.js')

export function get(req, res, next) {
  console.log(new Date() + "/api/getAllJobs")
  res.status(200).send(m.migrateTasks)
}
