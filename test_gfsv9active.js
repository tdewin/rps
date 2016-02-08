var moment = require('./moment.min.js'),
	filesize = require('./filesize-mod.js'),
	pureEngine = require('./pureengine.js'),
	logc = require('./test_pretty.js');

var engineObject = pureEngine.VeeamPureEngine()
engineObject.loglevel = 3

function runtest(start,interval,end,config,engine) {
	var backupResult = pureEngine.VeeamBackupResultObject()
	engine.reset()
	engine.run(config,backupResult,start,interval,end)
	
	for(var c=0;c<engine.log.length;c=c+1) {
			console.log(engine.log[c])
	}
	
	var files = backupResult.getWorstCaseFiles()
	for(var counter=0;counter < files.length;counter = counter + 1 ) {
		var f=files[counter]
		logc(f.toString(),"yellow")	
	}
	console.log("")
	console.log("")
	var files = backupResult.getFiles()
	for(var counter=0;counter < files.length;counter = counter + 1 ) {
		var f=files[counter]
		logc(f.toString(),"green")	
	}
	console.log("")	
	
	
}

var start = moment()
var end = moment("2025-02-15 22:00:00")
var interval = {hours:24}

var backupConfiguration = pureEngine.VeeamBackupConfigurationObject(3,14,1000);
backupConfiguration.GFS = {"W":4,"M":4,"Q":5,"Y":5}
backupConfiguration.GFSActiveFull = 0
if(process.argv && process.argv[2] == 1) {
	backupConfiguration.GFSActiveFull = 1
}

runtest(start.clone(),interval,end.clone(),backupConfiguration,engineObject)

