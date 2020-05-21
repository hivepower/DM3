# Datalyzer Measurement Migration Microservice - DM3

This node application accepts channels and migrates them in influx db.

After submitting a job we get a GUID which can be used to keep track of.

Set environment variable PORT = 3000

# API Specification
* URL : `http://<serverip>/api/migrationJobs` <br />
  METHOD :`POST` <br />
  POST BODY : <br />
  ```
  {
    "from": "flow,generator=edit,location=circular,method=av,number=1,site=LM-ED-041,units=mgd",
    "to": "flow,generator=edit,location=circ,method=av,number=1,site=LM-ED-041,units=mgd",
    "chunkSize" : 5256000, //time chunk in seconds
    "on_conflict" : 'merge' || 'drop' || 'quit' // quit by default
    "delete_source_after_migration": true, // (or) false // after migration remove the series from source channel
    "dbConfig": {... node-influx connection config ...},
    "destinationDb": {... node-influx connection config ...} // optional, defaults to same db
  }
  ```
  <br />
  DESCRIPTION : <br />
    POST a job to the server to perform migration. The chunk size is in seconds which sets how much data must be moved in each iteration. If the job submission is successful a guid is generated which can be used to keep track of the job.

    The `dbConfig` parameter should contain [Influx connection information](https://node-influx.github.io/typedef/index.html#static-typedef-ISingleHostConfig), for feeding into the Node-Influx client

<hr />

* URL : `http://<serverip>/api/migrationJobs` <br />
  METHOD: `GET` <br />
  URL PARAM : (optional) `guid = <unique guid>` <br />
  DESCRIPTION: <br />
    GET a detailed description of the JOB. If no URL parameter is passed it returns all the Jobs.

<hr />
