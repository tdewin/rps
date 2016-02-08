var moment = require('./moment.min.js'),
	filesize = require('./filesize-mod.js'),
	pureEngine = require('./pureengine.js'),
	logc = require('./test_pretty.js');

var engineObject = pureEngine.VeeamPureEngine()


function dataSize(s,c,d,gr,gy)
{
	return {
		fullmin:s*(c/100),
		incmin:s*(c/100)*(d/100),
		fullmax:Math.ceil((s*(c/100))*Math.pow((1+(gr/100)),(gy))),
		incmax:Math.ceil((s*(c/100)*(d/100))*Math.pow((1+(gr/100)),(gy)))
	}
}

function validaterps(config,result,expretention,fulls,datamm)
{
		var files = result.getWorstCaseFiles()
		var fullcount = 0
		
		logc("\n\n\nTest","yellow")
		if(files.length >= expretention) {
				logc("Seems to work RP "+files.length+" >= "+expretention,"green")
		}
		else
		{
				logc("Engine is for sure not performing correctly","red")
		}

		if(config.compressionDelta)
		{
				inc = config.sourceSize*(config.compressionDelta/100)*(config.changeRate/100)
		}
		
		for(var counter=0;counter < files.length;counter = counter + 1 ) {
			var f=files[counter]
			var data = f.getDataStats().f()
			if((new RegExp("[.]vbk$")).test(f.file))
			{
					fullcount++
					if(data >= datamm.fullmin && datamm.fullmax >= data)
					{
						logc(f.pointid+" "+f.file+" >> "+filesize(data) + " =~ "+filesize(datamm.fullmax),"green")
					}
					else
					{
						logc("!!!!!!!!!!! Point might be size invalid"+f.pointid+" "+f.file+" >> "+filesize(data)+ " !!=~ "+filesize(datamm.fullmax),"red")
					}
			} else {
					if(data >= datamm.incmin && datamm.incmax >= data)
					{
						logc(f.pointid+" "+f.file+" >> "+filesize(data) + " =~ "+filesize(datamm.incmax ),"green")
					}
					else
					{
						logc("!!!!!!!!!!! Point might be size invalid"+f.pointid+" "+f.file+" >> "+filesize(data) + " !=~ "+filesize(datamm.incmax ),"red")
					}
			}
		}
		if( fullcount <= fulls.max && fullcount >= fulls.min)
		{
			logc("Expected "+fulls.min+"-"+fulls.max+" fulls, seems ok","green")
		}
		else
		{
			logc("Expected "+fulls.min+"-"+fulls.max+" fulls","red")
		}
}
function execTest(engine,config,endIn)
{
		var backupResult = pureEngine.VeeamBackupResultObject()
		var start = moment().add({days:1}).startOf('day').add({hours:22});
		var end = endIn
		engine.reset()
		if(end === undefined) { end = engine.predictEndDate(backupConfiguration,start.clone(),interval) }
		engine.run(config,backupResult,start,interval,end)
		return backupResult 
}


	
var backupstyle = 0
var backupResult = 0
var retention = 14
var sourceSize = (1000*1024*1024*1024)
var interval = {hours:24}
var datamm = dataSize(sourceSize,50,10,0,0)

//reverse test
backupstyle = 2
retention = 14
var backupConfiguration = pureEngine.VeeamBackupConfigurationObject(backupstyle,retention,sourceSize);
backupConfiguration.activeWeek  = [0,0,0,0,0,0,1,0]
backupConfiguration.compression = 50
backupConfiguration.changeRate = 10
datamm = dataSize(sourceSize,50,10,0,0)
backupResult = execTest(engineObject,backupConfiguration)

validaterps(backupConfiguration,backupResult,retention,{min:3,max:3},datamm)

//fwd with 1 week
backupstyle = 1
retention = 2
var backupConfiguration = pureEngine.VeeamBackupConfigurationObject(backupstyle,retention,sourceSize);
backupConfiguration.activeWeek  = [0,0,0,0,0,0,1,0]
backupConfiguration.compression = 50
backupConfiguration.changeRate = 10
datamm = dataSize(sourceSize,50,10,0,0)
backupResult = execTest(engineObject,backupConfiguration)
validaterps(backupConfiguration,backupResult,(retention+6),{min:2,max:2},datamm)

//fwd with 1 month
backupstyle = 1
retention = 2
var backupConfiguration = pureEngine.VeeamBackupConfigurationObject(backupstyle,retention,sourceSize);
backupConfiguration.activateAllMonths()
backupConfiguration.compression = 50
backupConfiguration.changeRate = 10
datamm = dataSize(sourceSize,50,10,0,0)
backupResult = execTest(engineObject,backupConfiguration)
validaterps(backupConfiguration,backupResult,(retention+30),{min:2,max:2},datamm)

//forever incremental
backupstyle = 1
retention = 14
var backupConfiguration = pureEngine.VeeamBackupConfigurationObject(backupstyle,retention,sourceSize);
backupConfiguration.compression = 50
backupConfiguration.changeRate = 10
datamm = dataSize(sourceSize,50,10,0,0)
backupResult = execTest(engineObject,backupConfiguration)
validaterps(backupConfiguration,backupResult,14,{min:1,max:1},datamm)

//gfs
backupstyle = 3
retention = 14
var backupConfiguration = pureEngine.VeeamBackupConfigurationObject(backupstyle,retention,sourceSize);
backupConfiguration.GFS = {"W":6,"M":0,"Q":0,"Y":0}
backupConfiguration.compression = 50
backupConfiguration.changeRate = 10
datamm = dataSize(sourceSize,50,10,0,0)
backupResult = execTest(engineObject,backupConfiguration)
validaterps(backupConfiguration,backupResult,retention+6,{min:7,max:7},datamm)

//gfs multi shared
backupstyle = 3
retention = 14
var backupConfiguration = pureEngine.VeeamBackupConfigurationObject(backupstyle,retention,sourceSize);
backupConfiguration.GFS = {"W":6,"M":7,"Q":5,"Y":1}
backupConfiguration.compression = 50
backupConfiguration.changeRate = 10
datamm = dataSize(sourceSize,50,10,0,0)
backupResult = execTest(engineObject,backupConfiguration)
validaterps(backupConfiguration,backupResult,retention+14,{min:15,max:17},datamm)


//growth calculation
backupstyle = 1
retention = 14
var backupConfiguration = pureEngine.VeeamBackupConfigurationObject(backupstyle,retention,sourceSize);
backupConfiguration.compression = 50
backupConfiguration.changeRate = 10
backupConfiguration.simpleYearGrowth = 10
datamm = dataSize(sourceSize,50,10,10,3)
backupResult = execTest(engineObject,backupConfiguration,moment().add({years:3}))
validaterps(backupConfiguration,backupResult,14,{min:1,max:1},datamm)

//gfs multi shared growth
backupstyle = 3
retention = 14
var backupConfiguration = pureEngine.VeeamBackupConfigurationObject(backupstyle,retention,sourceSize);
backupConfiguration.GFS = {"W":6,"M":7,"Q":5,"Y":1}
backupConfiguration.compression = 50
backupConfiguration.changeRate = 10
datamm = dataSize(sourceSize,50,10,10,3)
backupConfiguration.simpleYearGrowth = 10
backupResult = execTest(engineObject,backupConfiguration,moment().add({years:3}))
validaterps(backupConfiguration,backupResult,retention+14,{min:15,max:17},datamm)