# Datalyzer Measurement Migration Microservice - DM3

This node application accepts channels and migrates them in influx db.

After submitting a job we get a GUID which can be used to keep track of.

Set environment variable PORT = 3000

# API Specification

- URL : `http://<serverip>/api/migrationJobs` <br />
  METHOD :`POST` <br />
  POST BODY : <br />

  ```
  {
    "from": "flow,generator=edit,location=circular,method=av,number=1,site=LM-ED-041,units=mgd",
    "to": "flow,generator=edit,location=circ,method=av,number=1,site=LM-ED-041,units=mgd",
    "chunkSize" : 5256000, //time chunk in seconds
    "on_conflict" : 'merge' || 'drop' || 'quit' // quit by default
    "keep_tags": false, // (or) true // Copy the tags that were not overwritten or "nullified" into new series
    "delete_source_after_migration": true, // (or) false // after migration remove the series from source channel
    "dbConfig": {... node-influx connection config ...},
    "destinationDb": {... node-influx connection config ...} // optional, defaults to same db
  }
  ```

  <br />
  DESCRIPTION : <br />
    POST a job to the server to perform migration. The chunk size is in seconds which sets how much data must be moved in each iteration. If the job submission is successful a guid is generated which can be used to keep track of the job.

  The `dbConfig` parameter should contain [Influx connection information](https://node-influx.github.io/typedef/index.html#static-typedef-ISingleHostConfig), for feeding into the Node-Influx client

  'KEEP TAGS' MODE:

  With the regular operation of DM3 - without 'keep_tags' flag set - you have to explicitly define all the tags of the new series and any previously set tag will be discarded.

  But there are times you might want to rewrite only some tags from a group of series or even the from the whole measurement. You might also want to delete a tag altogether. In that case, you should make use of the 'keep_tags' feature, which is ideal in **migrations and data refactoring scenarios**.

  In this mode, tags defined in 'from' field describes the WHERE clause and tags defined in the 'to' field will **extend and preserve** the original ones. In case you wish to remove a tag, just set it empty, ex.: "meter="

<hr />

- URL : `http://<serverip>/api/migrationJobs` <br />
  METHOD: `GET` <br />
  URL PARAM : (optional) `guid = <unique guid>` <br />
  DESCRIPTION: <br />
  GET a detailed description of the JOB. If no URL parameter is passed it returns all the Jobs.

<hr />
