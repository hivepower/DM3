# Datalyzer Measurement Migration Microservice - DM3

This node application accepts channels and migrates them in influx db.

After submitting a job we get a GUID which can be used to keep track of.

# API Specification
* URL : POST - <serverip>/api/submitMigrationJob
  DATA: BODY -
  ```
  {
	   "from": {
		     "seriesName" : "level,site=CSO-002,generator=scada,units=in,method=mousehouse,location=upstream,number=1"
	    },
	    "to": {
		     "seriesName" : "level,site=CSO-005,generator=scada,units=in,method=mousehouse,location=upstream,number=1"
	     },
	     "chunkSize" : 5256000
  }
  ```
  POST a job to the server to perform migration. The chunk size is in seconds which sets how much data must be moved in each iteration. If the job submission is successful a guid is generated which can be used to keep track of the job

* URL : GET - <serverip>/api/getJobStatus
  DATA: HEADERS
    guid : <guid>

  GET a detailed description of the JOB using the job guid.


* URL : GET - <serverip>/api/getAllJobs

  GET all the jobs submitted
