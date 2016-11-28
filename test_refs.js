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



var start = moment("2012-12-15 22:00:00")




var backupConfiguration = pureEngine.VeeamBackupConfigurationObject(3,14,1000);
backupConfiguration.changeRate = 5

backupConfiguration.refs = 1
backupConfiguration.refsMethod = 3
logc("hours 0-24")
for(var i=0;i<24;i++) {
	logc(i+": "+backupConfiguration.refsdiffperct(start.clone(),start.clone().add(i,"hours")),"green");
}
logc("day 0-30")
for(var i=0;i<31;i++) {
	logc(i+": "+backupConfiguration.refsdiffperct(start.clone(),start.clone().add(i,"days")),"green");
}
logc("weeks 1-6")
for(var i=1;i<7;i++) {
	logc(i+": "+backupConfiguration.refsdiffperct(start.clone(),start.clone().add(i,"weeks")),"green");
}
logc("months 1-12")
for(var i=1;i<13;i++) {
	logc(i+": "+backupConfiguration.refsdiffperct(start.clone(),start.clone().add(i,"months")),"green");
}
logc("years 1-4")
for(var i=1;i<5;i++) {
	logc(i+": "+backupConfiguration.refsdiffperct(start.clone(),start.clone().add(i,"years")),"green");
}
