# Datalyzer Measurement Migration Microservice - DM3

This node application accepts channels and migrates them in influx db.

After submitting a job we get a GUID which can be used to keep track of.

Set environment variable PORT = 3030

# API Specification
* URL : POST - <serverip>/api/submitMigrationJob
  DATA:
  In Post body
  ```
  {
	   "from": {
		     "seriesName" : "level,site=CSO-002,generator=scada,units=in,method=mousehouse,location=upstream,number=1"
	    },
	    "to": {
		     "seriesName" : "level,site=CSO-005,generator=scada,units=in,method=mousehouse,location=upstream,number=1"
	     },
	     "chunkSize" : 5256000 //time chunk in seconds
       "override_destination" : "true" (or) "false" //if there is data in the destination override it
       "delete_source_after_migration": "true" (or) "false" // after migration remove the series from source channel
  }
  ```
  Description : <br />
  POST a job to the server to perform migration. The chunk size is in seconds which sets how much data must be moved in each iteration. If the job submission is successful a guid is generated which can be used to keep track of the job

<hr />

* URL : GET - <serverip>/api/getJobStatus <br />
  DATA: In headers <br />
    ` guid : <guid> `

<br />  GET a detailed description of the JOB using the job guid.

<hr />

* URL : GET - <serverip>/api/getAllJobs
  <br />
  GET all the jobs submitted
