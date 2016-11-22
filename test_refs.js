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


backupConfiguration.refs = 1
logc(backupConfiguration.refsdiff(start.clone(),start.clone().add(1,"days")),"green");
logc(backupConfiguration.refsdiff(start.clone(),start.clone().add(1,"weeks")),"green");
logc(backupConfiguration.refsdiff(start.clone(),start.clone().add(2,"weeks")),"green");
logc(backupConfiguration.refsdiff(start.clone(),start.clone().add(4,"weeks")),"green");
logc(backupConfiguration.refsdiff(start.clone(),start.clone().add(1,"month")),"green");
logc(backupConfiguration.refsdiff(start.clone(),start.clone().add(2,"month")),"green");
logc(backupConfiguration.refsdiff(start.clone(),start.clone().add(3,"month")),"green");
logc(backupConfiguration.refsdiff(start.clone(),start.clone().add(4,"month")),"green");
logc(backupConfiguration.refsdiff(start.clone(),start.clone().add(5,"month")),"green");
logc(backupConfiguration.refsdiff(start.clone(),start.clone().add(6,"month")),"green");
logc(backupConfiguration.refsdiff(start.clone(),start.clone().add(1,"years")),"green");
logc(backupConfiguration.refsdiff(start.clone(),start.clone().add(2,"years")),"green");
logc(backupConfiguration.refsdiff(start.clone(),start.clone().add(3,"years")),"green");
logc(backupConfiguration.refsdiff(start.clone(),start.clone().add(4,"years")),"green");

