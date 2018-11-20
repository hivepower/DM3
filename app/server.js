import sirv from 'sirv';
import express from 'express';
import sapper from 'sapper';
import compression from 'compression';
import { manifest } from './manifest/server.js';
const app = express();
const { PORT = 3000 } = process.env;

app.use(express.json());
app.use(sapper({manifest}))

app.listen(PORT, () => {
	console.log(`listening on port ${PORT}`)
})
