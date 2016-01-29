var moment = require('./moment.min.js'),
	filesize = require('./filesize-mod.js'),
	pureEngine = require('./pureengine.js');

var engineObject = pureEngine.VeeamPureEngine()

function logc(text,color)
{
		//http://www.tldp.org/HOWTO/Bash-Prompt-HOWTO/x329.html
		normal = "\033[0;37m"
		prefix = normal
 
		if(color == "red") { prefix = "\033[1;31m" }
		else if (color == "green") { prefix = "\033[1;32m"}
		else if (color == "yellow") { prefix = "\033[1;33m"}
		
		console.log(prefix+text+normal)
}

function runtest(start,end,backupConfiguration) {
	var current = start.clone()
	var previous = start.clone().subtract(1,'days')
	console.log(current.format("dddd YYYY-MM-DD T HH"))

	while (current <= end) {
		//logc("\n"+current.format("YYYY-MM-DDTHHmmss"),"green")
		markers = engineObject.getGFSMarkers(backupConfiguration,previous,current)
		if (markers.touched) {
			builder = ""
			$.each(["w","m","q","y"], function(key,val) {
				if(markers[val] > 0) {
					builder += "\t"+val+markers[val+"gfs"].format("YY-MM-DDTHHmmss \t")
				} else {
					builder += "\t                "
				}
			})
			logc(previous.format("dddd YYYY-MM-DDTHHmmss \t")+"  -  "+current.format("dddd YYYY-MM-DDTHHmmss \t"),"green")
			logc(builder)
			console.log("\n")
			console.log("\n")
		}
		previous = current.clone()
		current = current.add(1,"days")
	}
	console.log("\n")
}

var start = moment("2012-12-15 23:00:00")
var end = moment("2015-02-01 23:00:00")


var backupConfiguration = pureEngine.VeeamBackupConfigurationObject(3,14,1000);
backupConfiguration.GFS = {"W":6,"M":4,"Q":5,"Y":5}
backupConfiguration.GFSMonthlyDayOfMonth = 15
runtest(start.clone(),end.clone(),backupConfiguration)

