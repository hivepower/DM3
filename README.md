# Datalyzer Measurement Migration Microservice - DM3

This node application accepts channels and migrates them in influx db.

After submitting a job we get a GUID which can be used to keep track of.

Set environment variable PORT = 3030

# API Specification
* URL : `http://<serverip>/api/migrationJobs` <br />
  METHOD :`POST` <br />
  POST BODY : <br />
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
       "dbConfig" : {
         "host" : <hostname>,
         "port": <port> 8086?,
         "username" : <username>,
         "password": <password>,
         "database": <database>
       }
  }
  ```
  <br />
  DESCRIPTION : <br />
    POST a job to the server to perform migration. The chunk size is in seconds which sets how much data must be moved in each iteration. Provide a connection details of influx server using "dbConfig" in body parameter. If the job submission is successful a guid is generated which can be used to keep track of the job

<hr />

* URL : `http://<serverip>/api/migrationJobs` <br />
  METHOD: `GET` <br />
  URL PARAM : (optional) `guid = <unique guid>` <br />
  DESCRIPTION: <br />
    GET a detailed description of the JOB. If no URL parameter is passed it returns all the Jobs.

<hr />
