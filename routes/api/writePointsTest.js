// let {influx} = require('../_model/config.js')
//
// export function post(req, res, next) {
//   influx.writePoints(
//     [
//       {
//         measurement: 'tide',
//         tags: {
//           unit: 'in',
//           number: ''
//         },
//         fields: { height: 123 }
//       },
//       {
//         measurement: 'tide',
//         tags: {
//           unit: 'in'
//         },
//         fields: { height: 124 }
//       }
//     ]
//   )
//     res.sendStatus(200)
// }
