import sirv from 'sirv';
import express from 'express';
import sapper from 'sapper';
import compression from 'compression';
import { manifest } from './manifest/server.js';
const app = express();

app.use(express.json());
app.use(sapper({manifest}))

app.listen(3030, () => {
	console.log("listening on port 3030")
})
//
// polka() // You can also use Express
// 	.use(
// 		compression({ threshold: 0 }),
// 		sirv('assets'),
// 		sapper({ manifest })
// 	)
// 	.listen(process.env.PORT)
// 	.catch(err => {
// 		console.log('error', err);
// 	})
