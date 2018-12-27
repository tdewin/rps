/*
MODEL PART:


VeeamBackupFile:
	The backup file is just a representation of a backup file including date, size, name

	file = filename
	parent = related vbk file
	type F = vbk
	type R = vrb
	type I = vib
	type S = vbk synthetic
	type G = GFS
	type D = vm disk 
	type P = snapshot
	
	
	createDate = when is the file originally created
	modifyDate = when is the file last modified, initially the same as createDate
	pointDate = which restore point is this file holding
	
	
	gfstype W = vbk weekly
	gfstype M = vbk monthly
	gfstype Q = vbk quaretely
	gfstype Y = vbk weekly
	
	
	pointids should be recalculated after every run and not be heavily used (or only after a good recalculation) as they are more informative then actually values
	
	As special instance is the null object to identify empty objects
	
VeeamBackupConfiguration:
	Configuration for a backup
	
	style = 1 = incremental
	style = 2 = reverse incremental
	style = 3 = backup copy job (with GFS support)
	style = 4 = VMware Replica 
	
	simplePoints = retention points
	sourceSize = size of the used vmdk
	
	//you can override the following default after creating the object
	vbc.compression = 40
	vbc.changeRate = 5
	
*/

/*
	Legacy Inheritance from link list mode (significantly slower in js)
*/
if (typeof exports === 'object')
{
	var moment = require('./moment.min.js'),
	filesize = require('./filesize-mod.js'),
	jquery = require('./jquery-mini.js');
	
	exports.VeeamBackupConfigurationObject = function (style,simplePoints,sourceSize) {
		return VeeamBackupConfigurationObject(style,simplePoints,sourceSize)
	}
	exports.VeeamBackupResultObject = function() {
		return VeeamBackupResultObject()
	}
	exports.VeeamPureEngine = function() {
		return VeeamPureEngine()
	}
}
function ReFSLinked(lnkdpt,disct) 
{
	//discount in bytes (bytes already stored in previous chain)
	return {
		linkedpoint:lnkdpt,
		discount:disct
	}
}
function VeeamBackupDataStats(f,s,c,d,t)
{
	return {
		file:f,
		source:s,
		compression:c,
		transferCompression:t,
		changeRate:d,
		refsLinked:0,
		f:function () { 
			if (this.refsLinked) {
				return this.file-this.refsLinked.discount
			} else {
				return this.file 
			}
		},
		s:function () { return this.source },
		c:function () { return this.compression },
		t:function () { return this.transferCompression },
		d:function () { return this.changeRate },
		clone:function () { 
			var clone = VeeamBackupDataStats(this.file,this.source,this.compression,this.changeRate,this.transferCompression);
			if(this.refsLinked !== undefined && this.refsLinked != 0)
			{
				clone.refsLinked = ReFSLinked(""+this.refsLinked.linkedpoint,this.refsLinked.discount)
			}
			return clone  },
		fullclone:function () {
			var clone = VeeamBackupDataStats(this.source*(this.compression/100),this.source,this.compression,100,this.transferCompression);
			if(this.refsLinked !== undefined && this.refsLinked != 0)
			{
				clone.refsLinked = ReFSLinked(""+this.refsLinked.linkedpoint,this.refsLinked.discount)
			}
			return clone
		},
		sd:function () { return parseInt((this.source*this.changeRate)/100) },
		trans:function () { return parseInt(((this.source*this.changeRate)/100)*(this.transferCompression/100)) }
	}
}
function VeeamBackupFileObject(file,parent,type,dataStats,createDate,pointDate)
{
	var VeeamBackupFileObj = VeeamBackupFileObjectInheritable(file,parent,type,dataStats,createDate,pointDate)
	return VeeamBackupFileObj
}
function VeeamBackupFileObjectInheritable(file,parent,type,dataStats,createDate,pointDate)
{
	var VeeamBackupFileObj = new Object();
	VeeamBackupFileObj.file = file
	VeeamBackupFileObj.parent = parent
	VeeamBackupFileObj.type = type
	VeeamBackupFileObj.origType = type
	//if you want to detect a vbk that was originally a full backup
	VeeamBackupFileObj.createDate = 0
	VeeamBackupFileObj.modifyDate = 0
	VeeamBackupFileObj.pointDate = 0
	VeeamBackupFileObj.suid = moment().format("ss:SSS")
	VeeamBackupFileObj.uid = 0
	VeeamBackupFileObj.origuid = 0
	VeeamBackupFileObj.flaggedForDeletion = 0

	
	VeeamBackupFileObj.recycled = 0
	
	if(type != 0 && createDate != 0 && pointDate !=0)
	{
		VeeamBackupFileObj.createDate = createDate.clone()
		VeeamBackupFileObj.modifyDate = createDate.clone()
		VeeamBackupFileObj.pointDate = pointDate.clone()
		
		VeeamBackupFileObj.uid = pointDate.format("YY-MM-DD HH")+"-"+Math.floor(Math.random()*1000000000)+"-"+VeeamBackupFileObj.suid
		VeeamBackupFileObj.origuid = VeeamBackupFileObj.uid
	}
	

	//VeeamBackupFileObj.fileSize = dataStats.file
	VeeamBackupFileObj.dataStats = dataStats

	VeeamBackupFileObj.getDataStats = function() { return this.dataStats }
	VeeamBackupFileObj.setDataStats = function(dataStatsIn) {
		//this.fileSize = dataStatsIn.file
		this.dataStats = dataStatsIn
	}
	
	VeeamBackupFileObj.getRefsLinked = function() {
		if (this.dataStats && this.dataStats.refsLinked !== undefined && this.dataStats.refsLinked != 0) { return this.dataStats.refsLinked}
		return 0
	}
	
	VeeamBackupFileObj.pointid = -1
	VeeamBackupFileObj.flagForKeepId = 0
	
	VeeamBackupFileObj.GFSType = []
	VeeamBackupFileObj.GFSPointids = {W:0,M:0,Q:0,Y:0}
	
	
	
	//G acts like an archive flag.
	VeeamBackupFileObj.isGFS = function() {
		return (this.type == "G" || this.type == "H")
	}
	VeeamBackupFileObj.isGFSType = function (type)
	{
		return ($.inArray(type,this.GFSType) != -1)
	}
	VeeamBackupFileObj.pushGFSType = function (type)
	{
		if($.inArray(type,this.GFSType) == -1)
		{
			this.GFSType.push(type)
		}
	}
	VeeamBackupFileObj.isFull = function() {
		return ($.inArray(this.type,["G","S","F","D","L","H"]) != -1)
	}
	VeeamBackupFileObj.isVBK = function() {
		return ($.inArray(this.type,["G","S","F","L","H"]) != -1)
	}
	VeeamBackupFileObj.isMarkedForGFS = function() {
		return (this.GFSType.length > 0)
	}

	VeeamBackupFileObj.clone = function() {
		var cloneObj = VeeamBackupFileNullObject()
		if(type != 0 && createDate != 0 && pointDate !=0)
		{
			cloneObj = VeeamBackupFileObject(this.file,VeeamBackupFileNullObject(),this.type,this.getDataStats().clone(),this.createDate.clone(),this.pointDate.clone())
		}
		cloneObj.pointid = this.pointid
		cloneObj.flagForKeepId = this.flagForKeepId
		cloneObj.origuid = this.origuid
		var origObj = this
		
		if(this.modifyDate)
		{
			cloneObj.modifyDate = this.modifyDate.clone()
		}

		cloneObj.setDataStats(this.getDataStats().clone())
		
		
		$.each(this.GFSType,function( key, gfstype ) {
			cloneObj.pushGFSType(gfstype)
			cloneObj.GFSPointids[gfstype] = origObj.GFSPointids[gfstype]
		})

		return cloneObj
	}

	VeeamBackupFileObj.realFileNameStr = function () {
		var ext = "vbk"
		if (this.type == "I") { 
			ext = "vib" 
		} else if (this.type == "R") { 
			ext = "vrb" 
		}
		return this.pointDate.format("YYYY-MM-DDTHHmmss")+"."+ext
	}
	
	VeeamBackupFileObj.fullfile = function () {
		return this.pointDate.format("dd YY-MM-DD HH ")+"h "+this.file//+"-"+this.suid
	}
	VeeamBackupFileObj.modifyStr = function () {
		return this.modifyDate.format("dd YY-MM-DD HH ")
	}
	
	VeeamBackupFileObj.toString = function () {
		var keptFor = this.flagForKeepId
		if(keptFor != 0) { keptFor = " ("+keptFor+")" }
		else { keptFor = ""}
	
		var retString = " "+this.type+" >> "+this.fullfile()+"\t<< "+filesize(this.getDataStats().f(), {base: 2,round: 0})+"\t"+this.pointid+keptFor+" MOD "+this.modifyStr()
		if(this.isMarkedForGFS())
		{
			if(this.isGFS())
			{
				retString = retString + " " + this.GFSPointids["W"] + "W "+ this.GFSPointids["M"] + "M "+ this.GFSPointids["Q"] + "Q "+ this.GFSPointids["Y"] + "Y "
			}
			else
			{
				retString = retString + " PARENT "+this.parent.fullfile() + " " + this.GFSPointids["W"] + "W "+ this.GFSPointids["M"] + "M "+ this.GFSPointids["Q"] + "Q "+ this.GFSPointids["Y"] + "Y "
			}
		}
		else
		{
			retString = retString +" PARENT "+this.parent.fullfile()
		}
		return retString
	}
	VeeamBackupFileObj.toRetentionString = function () {
		var keptFor = this.flagForKeepId
		if(keptFor != 0) { keptFor = " ("+keptFor+")" }
		else { keptFor = ""}
	
		var retString = ""+this.pointid+keptFor
		if(this.isMarkedForGFS())
		{
			if(this.isGFS())
			{
				retString = retString + " " + this.GFSPointids["W"] + "W "+ this.GFSPointids["M"] + "M "+ this.GFSPointids["Q"] + "Q "+ this.GFSPointids["Y"] + "Y "
			}
			else
			{
				retString = retString+ " " + this.GFSPointids["W"] + "W "+ this.GFSPointids["M"] + "M "+ this.GFSPointids["Q"] + "Q "+ this.GFSPointids["Y"] + "Y "
			}
		}
		return retString
	}
	VeeamBackupFileObj.simpleGFSStr = function(val,postfix)
	{
			if(val != 0 && val != -1)
			{ 
				return val+""+postfix+" "
			}
			return ""
	}
	//VeeamBackupFileObj.GFSPointids = {W:0,M:0,Q:0,Y:0}
	VeeamBackupFileObj.activeGFS = function() {
			var active = 0
			var p = this
			$.each(["W","M","Q","Y"],function(k,v) {
				if (p.GFSPointids[v] > 0) { active = 1 }
			})
			return active;
	}
	
	VeeamBackupFileObj.toSimpleRetentionString = function () {
		var keptFor = this.flagForKeepId
		if(keptFor != 0) { keptFor = " ("+keptFor+")" }
		else { keptFor = ""}
	
		//don't show -1
		var retString = ""
		if(this.pointid > 0) {
			retString += this.pointid+keptFor
		}
		
		if(this.activeGFS())
		{
			if (retString != "") { retString += " "}
			retString += this.simpleGFSStr(this.GFSPointids["W"],"W")+this.simpleGFSStr(this.GFSPointids["M"],"M")+this.simpleGFSStr(this.GFSPointids["Q"],"Q")+this.simpleGFSStr(this.GFSPointids["Y"],"Y")
		}

		return retString
	}
	
	VeeamBackupFileObj.isnn = function () {
		return 1
	}
	VeeamBackupFileObj.isnull = function () {
		return 0
	}
	return VeeamBackupFileObj
}

function VeeamBackupFileNullObject()
{
	var VeeamBackupFileObjNull = VeeamBackupFileObjectInheritable(0,0,0,VeeamBackupDataStats(0,0,0,0,0),0,0);

	VeeamBackupFileObjNull.fullfile = function () { return "<null>" }
	VeeamBackupFileObjNull.modifyStr = function () { return "<null>" }
	VeeamBackupFileObjNull.toString = function() { return "<null>" }
	
	VeeamBackupFileObjNull.isnn = function () { return 0 }
	VeeamBackupFileObjNull.isnull = function () { return 1 }
	
	return VeeamBackupFileObjNull
}


function VeeamBackupConfigurationObject(style,simplePoints,sourceSize)
{
	var VeeamBackupConfigurationObj = new Object();
	VeeamBackupConfigurationObj.style = style
	VeeamBackupConfigurationObj.simplePoints = simplePoints
	
	VeeamBackupConfigurationObj.sourceSize = sourceSize
	VeeamBackupConfigurationObj.initialSize = sourceSize
	VeeamBackupConfigurationObj.compression = 50
	//with 0, we just reuse the default compression
	VeeamBackupConfigurationObj.compressionDelta = 0
	VeeamBackupConfigurationObj.changeRate = 10
	
	//at first run date will be set to exectime if it 0. You can manually override the date
	//impact mainly the filesize
	VeeamBackupConfigurationObj.startDate = 0
	VeeamBackupConfigurationObj.simpleYearGrowth = 0
	
	VeeamBackupConfigurationObj.refs = 0
	VeeamBackupConfigurationObj.refsMethod = 4
	
	VeeamBackupConfigurationObj.refsdiffperct = function (childdate,rootdate) {
		var base = 100
		var daydiff = childdate.diff(rootdate, 'days')*1.0
		daydiff = (daydiff < 0)?-daydiff:daydiff;
		
		//inject limit is required so that we will not inject more than the actual change rate.
		//especially important with the method 3 since it grows to fast the first days
		//var injectlimit = ((daydiff)*this.changeRate)/2+(this.changeRate/2)
		var daydiffmin = (daydiff < 1)?1:daydiff;
		
		var injectlimit = (daydiffmin)*this.changeRate
		
		if (this.refs == 1) {
			if (this.refsMethod == 1) {
				
				base = (this.changeRate)
				
				//if 10% -> 10 (base) + 20 + 2*10 = 50%
				// 5% -> 5 + 20 + 2*5 = 35%
				opyear = 20+2*this.changeRate

				base = base + parseInt(opyear*(daydiff/365.0))
								
			}
			else if (this.refsMethod == 2) {
				//fooplot function : ((x-1)/365)^(2/3)*(3*5+15)+5
				//hits 10% at 30 days && 35% at 1year
				base = this.changeRate
				
				var powbender = (2/3)
				base = Math.ceil((Math.pow((daydiff)/365,powbender)*(this.changeRate*3 + 15 ))+this.changeRate)
				 
				
				
			} else if (this.refsMethod == 3)  {
				//fooplot function : ((x-1)/365)^(1/3)*(2*10+60)+10            || ((x-1)/365)^(1/3)*(2*5+60)+5
				//hits 25% at 7 days && 35% at 30 days && 75% at 1 year
				
				base = this.changeRate
				
				
				var powbender = (1/3)
				base = Math.ceil((Math.pow((daydiff)/365,powbender)*(this.changeRate*2 + 60 ))+this.changeRate)
				//console.log(base) 
			} else if (this.refsMethod == 4) {

				if (daydiff < 2 ) {
					base = this.changeRate
				} else if(daydiff < 14) { //1 week but less then 2 weeks
					base = this.changeRate*3
				} else if (daydiff < 38) { //31+7
					base = this.changeRate*5
				} else if (daydiff < 100) { //31*3+7
					base = this.changeRate*9
				} else if (daydiff < 193) { //31*6+7
					base = this.changeRate*12
				} else if (daydiff < 286) { //31*9+7
					base = this.changeRate*15
				} else if (daydiff < 379) { //365+14
					base = this.changeRate*18
				} else {
					base = 100
				}
	
			}
			
			
		} 
		if (base > 100 || base < 0 || isNaN(base)) { base = 100 }
		if (base > injectlimit ) { base = injectlimit }
		if (base < this.changeRate) { base = this.changeRate}
		return base 
	}
	
	
	var tb = (1024*1024*1024*1024)
	
	VeeamBackupConfigurationObj.buckets = []
	VeeamBackupConfigurationObj.buckets[0] = {"MAX":(10*tb),"EASER":1.05}
	VeeamBackupConfigurationObj.buckets[1] = {"MAX":(20*tb),"EASER":0.66}
	VeeamBackupConfigurationObj.buckets[2] = {"MAX":(100*tb),"EASER":0.4}
	VeeamBackupConfigurationObj.buckets[3] = {"MAX":(500*tb),"EASER":0.25}
	VeeamBackupConfigurationObj.buckets[4] = {"MAX":(-1),"EASER":0.10}
	
	VeeamBackupConfigurationObj.replicaWorkSpaceMultiPerc = 3
	
	//use these function allowing for data grow module to be implemented later
	VeeamBackupConfigurationObj.getSourceSize = function(calcdate) {
		var toReturn = this.sourceSize
		
		if(this.startDate != 0 && this.simpleYearGrowth != 0 )
		{
			toReturn = this.sourceSize*(Math.pow((1+(this.simpleYearGrowth/100)),(calcdate.diff(this.startDate,'days')/365)))
		}
		
		return toReturn
	}
	VeeamBackupConfigurationObj.getFullSize = function (calcdate) {
		return this.getSourceSize(calcdate)*(this.compression/100)
	}
	VeeamBackupConfigurationObj.getIncrementalSize = function (calcdate) {
		var toReturn = this.getSourceSize(calcdate)*(this.changeRate/100)*(this.compression/100)
		if(this.compressionDelta)
		{
			toReturn = this.getSourceSize(calcdate)*(this.changeRate/100)*(this.compressionDelta/100)
		}
		return toReturn
	}
	
	VeeamBackupConfigurationObj.getFullDataStats = function (calcdate) {
		var sourcevar = this.getSourceSize(calcdate)
		var compressionvar = this.compression; 
		var transferCompression = this.compression;
		
		//replica are never compressed
		if(this.style == 4) { 
			compressionvar = 100
		}
		
		var filevar = sourcevar*(compressionvar/100)
		return VeeamBackupDataStats(filevar,sourcevar,compressionvar,100,transferCompression)
	}
	
	VeeamBackupConfigurationObj.getIncrementalDataStats = function (calcdate) {
		var sourcevar = this.getSourceSize(calcdate)
	
		var compressionvar = this.compression
		if(this.compressionDelta)
		{
			compressionvar = compressionDelta
		}
		var transferCompression = compressionvar;
		
		//replica are never compressed
		if(this.style == 4) { 
			compressionvar = 100
		}
		
		
		var filevar = sourcevar*(this.changeRate/100)*(compressionvar/100)
			
		return VeeamBackupDataStats(filevar,sourcevar,compressionvar,this.changeRate,transferCompression)
	}
	
	
	
	
	
	//only valid for styl 1 and 2
	VeeamBackupConfigurationObj.activeWeek  = [0,0,0,0,0,0,0]
	
	//only valid for style 1 
	VeeamBackupConfigurationObj.synthetic = [0,0,0,0,0,0,0]	
	
	//default saturday, first if enabled in a month
	VeeamBackupConfigurationObj.activeMonthDay  = 5
	VeeamBackupConfigurationObj.activeMonthWeek  = 1
	VeeamBackupConfigurationObj.activeMonths = [0,0,0,0,0,0,0,0,0,0,0,0]
		
	VeeamBackupConfigurationObj.activateAllMonths = function () {
		this.activeMonths = [1,1,1,1,1,1,1,1,1,1,1,1]
	}
	

	VeeamBackupConfigurationObj.distanceMonths = function () {
			var maxdist = 0
			var cdist = 0
			var ml = this.activeMonths.length
			for (var i = 0;i < 24;i++)
			{
					if(this.activeMonths[i%ml] == 0)
					{
							cdist += 1
					} else {
							if (cdist > maxdist)
							{
								maxdist = cdist
							}
							cdist = 0
					}
			}
			return maxdist
	}

	//should we go through transform algorithm, with other words, are there any fulls being done ever
	//v8 whats new ;)
	VeeamBackupConfigurationObj.doTransform = function () {
		var dotransform = 1
		if($.inArray(1,this.synthetic) != -1)
		{
			dotransform = 0
		}
		else if($.inArray(1,this.activeWeek) != -1)
		{
			dotransform = 0
		}
		else if($.inArray(1,this.activeMonths) != -1)
		{
			dotransform = 0
		}
			
		return dotransform
	}
	
	//if active month = 1
	//if active week = 2
	//if synthetic = 3
	VeeamBackupConfigurationObj.doFull = function () {
		var doFull = 0
	
		if($.inArray(1,this.activeMonths) != -1)
		{
			doFull = 1
		}
		else if($.inArray(1,this.activeWeek) != -1)
		{
			doFull = 2
		}
		else if($.inArray(1,this.synthetic) != -1)
		{
			doFull = 3
		}
		return doFull
	}

	
	//only valid for style 3
	VeeamBackupConfigurationObj.GFS = {"W":0,"M":0,"Q":0,"Y":0}
	
	//v9 active full
	VeeamBackupConfigurationObj.GFSActiveFull = 0

	
	//weekly defaults
	VeeamBackupConfigurationObj.GFSWeeklyDay = 6
	VeeamBackupConfigurationObj.GFSWeeklyHour = 22
		
	//monthly defaults
	VeeamBackupConfigurationObj.GFSMonthlyDay = 6
	VeeamBackupConfigurationObj.GFSMonthlyMonthWeek = 1
	//if you set the day of month, it will get priority, set to 32 for last day
	VeeamBackupConfigurationObj.GFSMonthlyDayOfMonth = 0
		
	//Q defaults
	VeeamBackupConfigurationObj.GFSQuarterlyDay = 6
	VeeamBackupConfigurationObj.GFSQuarterlyQuarterWeek = 1
	//if you set the day of month, it will get priority
	VeeamBackupConfigurationObj.GFSQuarterlyDayOfMonth = 0
	VeeamBackupConfigurationObj.GFSQuarterlyMonth = 1 //1 first, 2 last
		
	//y defaults
	VeeamBackupConfigurationObj.GFSYearlyDay = 6
	VeeamBackupConfigurationObj.GFSYearlyDayWeek = 1
	//if you set the day of month, it will get priority
	VeeamBackupConfigurationObj.GFSYearlyDayOfMonth = 0
	VeeamBackupConfigurationObj.GFSYearlyMonth = 1
	


	
	return VeeamBackupConfigurationObj
}
function VeeamBackupLastActionObject(type,text)
{
	var VeeamBackupLastActionObj = new Object();
	VeeamBackupLastActionObj.type = type
	VeeamBackupLastActionObj.text = text
	
	VeeamBackupLastActionObj.toString = function() {
		return text
	}
	return VeeamBackupLastActionObj
}
function VeeamBackupResultObject()
{
	var VeeamBackupResultObj = new Object();	
	VeeamBackupResultObj.retention = []
	VeeamBackupResultObj.GFS = []
	VeeamBackupResultObj.garbage = []
	VeeamBackupResultObj.workingSpace = 0
	VeeamBackupResultObj.totalSize = 0
	
	//don't rely on this value unless you execute a recalcpointid
	VeeamBackupResultObj.newestFull = -1
	//don't rely on this value unless you execute a recalcpointid
	VeeamBackupResultObj.pointsonid = {}
	
	VeeamBackupResultObj.safeToMerge = 0
	
	VeeamBackupResultObj.worstCaseSize = 0
	VeeamBackupResultObj.worstCaseDayWorkingSpace = 0
	VeeamBackupResultObj.worstCaseSizeWithWorkingSpace = 0
	
	VeeamBackupResultObj.worstCaseDay = 0
	VeeamBackupResultObj.worstCaseDayRetention = []
	VeeamBackupResultObj.worstCaseDayGFS = []

	

	
	VeeamBackupResultObj.lastActions = []
	VeeamBackupResultObj.lastActionDate = 0
	
	VeeamBackupResultObj.findPoint = function(origuid) {
		
		var gfs = this.GFS
		for(var counter=gfs.length-1;counter >= 0;counter = counter - 1 )
		{
			if (gfs[counter].origuid == origuid) { return gfs[counter]}
		}
		var ret = this.retention
		for(var counter=ret.length-1;counter >= 0;counter = counter - 1 )
		{
			if (ret[counter].origuid == origuid) { return ret[counter]}
					
		}
		return 0;
	}


	VeeamBackupResultObj.beginAction = function(exectime)
	{
		this.lastActionDate = exectime.clone()
		this.lastActions = []
	}
	VeeamBackupResultObj.addLastAction = function(lastAction)
	{
		this.lastActions.push(lastAction)
	}
	VeeamBackupResultObj.toStringWorstCase = function()
	{
		var toStr = "<didn't run yet>"
		if(this.worstCaseDay != 0)
		{
			toStr = "First Worst Case Day was "+this.worstCaseDay.format()+" with size "+filesize(this.worstCaseSize, {base: 2,round: 0})
		}
		return toStr
	}
	VeeamBackupResultObj.retentionPush = function(point)
	{
		this.retention.push(point)
	}
	VeeamBackupResultObj.retentionPop = function()
	{
		return this.retention.pop()
	}
	VeeamBackupResultObj.retentionLatest = function()
	{
		var latest = VeeamBackupFileNullObject()
		if(this.retention.length > 0)
		{
			latest = this.retention[this.retention.length-1]
		}
		return latest
	}
	VeeamBackupResultObj.getFiles = function()
	{
		return this.GFS.concat(this.retention)
	}
	VeeamBackupResultObj.getWorstCaseFiles = function()
	{
		return this.worstCaseDayGFS.concat(this.worstCaseDayRetention)
	}	
	VeeamBackupResultObj.getTotalSize = function()
	{
		return this.totalSize
	}
	VeeamBackupResultObj.getWorkSpace = function()
	{
		return this.workingSpace
	}
	return VeeamBackupResultObj
}


/*
	Controller part


*/

function VeeamPureEngine()
{
	
	var PureEngineObj = new Object()
	
	PureEngineObj.loglevel = 0
	PureEngineObj.log = []
	
	PureEngineObj.flags = {
		incStars: true,
	}
		
	PureEngineObj.debugtime = function()
	{
		return moment().format("h:mm:ss:SSS")
	}
	PureEngineObj.debugln = function (line,loglevel)
	{
		if(this.loglevel >= loglevel)
		{
			this.log.push(this.debugtime()+" - "+line)
		}
	}	
	PureEngineObj.clearlog = function()
	{
		this.log = []
	}
	PureEngineObj.reset = function()
	{
		this.clearlog()
	}
	
	PureEngineObj.sunday6 = function(day)
	{
		return (day+6)%7
	}
	PureEngineObj.sunday0 = function(day)
	{
		return (day+1)%7
	}
	
	PureEngineObj.humanReadableFilesize = function(valueIn)
	{
		return filesize(valueIn, {base: 2,round: 0})
	}
	//Calculate all occurrence of a specific day in the month. For example, give me all sundays (searchday=6). 
	//Result is an array of 5 positions where [4] (5) is holding the last occurrence this month which might be the same as [3] in a short month
	PureEngineObj.firstLastDaysInMonth = function (exectime,searchday)
	{
		var daysinmonth = [0,0,0,0,0]
		var dayloop = exectime.clone().startOf('month')
		var thismonth = dayloop.month()
		var weekcounter = 0
		//run until the first matching day
		while ( ((dayloop.day()+6)%7) != searchday ) { dayloop = dayloop.add({days:1}) }
		//run weeks until you are at the end of the month
		while ( dayloop.month() == thismonth ) {  daysinmonth[weekcounter++] = dayloop.date();dayloop = dayloop.add({weeks:1})}
		//if there is no 5th occurance, copy the 4th occurance to be the last day
		if(daysinmonth[4] == 0) { daysinmonth[4] = daysinmonth[3] }

		return daysinmonth
	}
	
	
	PureEngineObj.highLowMark = function(gfsmoment,marker,prepoint,postpoint)
	{
		
		if(prepoint.pointDate < gfsmoment && gfsmoment <= postpoint.pointDate)
		{
			
		
			gfspu = gfsmoment.unix()
			lowdiff = gfspu - prepoint.pointDate.unix()
			highdiff = postpoint.pointDate.unix() - gfspu
			
			var markpnt = postpoint
			//who has the smallest difference is closest to gfs point
			if ( lowdiff < highdiff)
			{
				markpnt = prepoint
			}
			if ($.inArray(marker,markpnt.GFSType) == -1)
			{
				
				markpnt.pushGFSType(marker)
			}
		}
	}
	
	/*
		new algorithm for v9 active full backup on backup copy job
		gfs does not need to mark inc but full creation must be  decided on the moment of executing
	*/
	PureEngineObj.getGFSMarkers = function(backupConfiguration,xdate,ydate) {
		var pureEngine = this
		var xdate = xdate.clone()
		var ydate = ydate.clone()
		
		var markers = new Object();
		markers.W = 0
		markers.M = 0
		markers.Q = 0
		markers.Y = 0
		markers.all = []
		markers.touched = 0
		markers.testmark = function(gfsmoment,marker,predate,postdate) {
				if (predate > postdate) {
						var t = postdate 
						postdate = predate
						predate = t
				}
				
				if (predate < gfsmoment && gfsmoment <= postdate) {
						this[marker] = 1
						this["touched"] = 1
						this[marker+"gfs"] = gfsmoment.clone()
						this.all.push(marker)
				}
		}
		
		 
		
		if(backupConfiguration.GFS["W"] > 0) {
			//weekly defaults
			//VeeamBackupConfigurationObj.GFSWeeklyDay = 6
			//VeeamBackupConfigurationObj.GFSWeeklyHour = 22
			
			var gfsp = xdate.clone()
			gfsp.subtract(1,'days')
			gfsp.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0)
			
			//rollback to previous GFS point
			while(gfsp.day() != this.sunday0(backupConfiguration.GFSWeeklyDay))
			{
				gfsp.subtract(1,'days')
			}
			//skipping forward until we get to today GFS point
			while(gfsp <= ydate)
			{
				markers.testmark(gfsp,"W",xdate.clone(),ydate.clone())
				gfsp.add(1,'weeks')
			}
			
			
		} 
		if(backupConfiguration.GFS["M"] > 0) {
			//monthly defaults
			//VeeamBackupConfigurationObj.GFSMonthlyDay = 6
			//VeeamBackupConfigurationObj.GFSMonthlyMonthWeek = 1
			//if you set the day of month, it will get priority, set to 32 for last day
			//VeeamBackupConfigurationObj.GFSMonthlyDayOfMonth = 0
			
			if (backupConfiguration.GFSMonthlyDayOfMonth > 0) {
				//skip forward and clam to the end of the month
				if(backupConfiguration.GFSMonthlyDayOfMonth > 27)
				{
					var gfsp = ydate.clone()
					gfsp.add(1,'months').endOf('month')
					
					while(gfsp >= xdate)
					{
						if(gfsp.date() > backupConfiguration.GFSMonthlyDayOfMonth) { gfsp.date(backupConfiguration.GFSMonthlyDayOfMonth) }
						gfsp.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
						
						markers.testmark(gfsp,"M",xdate.clone(),ydate.clone())
						
						gfsp.subtract(1,'months').endOf('month')
					}
				}
				else 
				{
					var gfsp = xdate.clone().subtract(1,'months').startOf('month')
					while(gfsp <= ydate)
					{
						gfsp.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
						gfsp.date(backupConfiguration.GFSMonthlyDayOfMonth) 
						
						markers.testmark(gfsp,"M",xdate.clone(),ydate.clone())

						gfsp.add(1,'months').startOf('month')
					}
				}
			} else {
				if (backupConfiguration.GFSMonthlyMonthWeek == 5) {
					var gfsp = ydate.clone()
					gfsp.add(1,'months').endOf('month');
					while (gfsp >= xdate) {
						while(gfsp.day() != this.sunday0(backupConfiguration.GFSMonthlyDay)) {
							gfsp.subtract(1,'day')	
						}
						gfsp.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
						markers.testmark(gfsp,"M",xdate.clone(),ydate.clone())

						gfsp.subtract(1,'months').endOf('month');
					}
				} else {
					var gfsp = xdate.clone()
					gfsp.subtract(1,'months').startOf('month');
					while (gfsp <= ydate) {
						//1st matching day
						while(gfsp.day() != this.sunday0(backupConfiguration.GFSMonthlyDay)) {
							gfsp.add(1,'day')	
						}
						
						gfsp.add((backupConfiguration.GFSMonthlyMonthWeek-1),'weeks')
						gfsp.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
						
						markers.testmark(gfsp,"M",xdate.clone(),ydate.clone())
						gfsp.add(1,'months').startOf('month');
					}
				}
			}
		}
		if(backupConfiguration.GFS["Q"] > 0) {
			//Q defaults
			//VeeamBackupConfigurationObj.GFSQuarterlyDay = 6
			//VeeamBackupConfigurationObj.GFSQuarterlyQuarterWeek = 1
			
			//if you set the day of month, it will get priority
			//VeeamBackupConfigurationObj.GFSQuarterlyDayOfMonth = 0
			//VeeamBackupConfigurationObj.GFSQuarterlyMonth = 1 //1 first, 2 last
			
			if(backupConfiguration.GFSQuarterlyDayOfMonth > 0) {
				if (backupConfiguration.GFSQuarterlyDayOfMonth > 27) {
					var gfsp = ydate.clone()
					gfsp.add(1,'quarters').endOf('quarters')
					
					while(gfsp >= xdate)
					{
						if(backupConfiguration.GFSQuarterlyMonth == 1) { gfsp.subtract(7,'days').subtract(2,'months').endOf('month') }
						
						if(gfsp.date() > backupConfiguration.GFSQuarterlyDayOfMonth) { gfsp.date(backupConfiguration.GFSQuarterlyDayOfMonth) }
						gfsp.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
						
						markers.testmark(gfsp,"Q",xdate.clone(),ydate.clone())
						
						gfsp.subtract(1,'quarters').endOf('quarter')
					}				
				} else {
					var gfsp = xdate.clone().subtract(1,'quarters').startOf('quarter')
					
					while(gfsp <= ydate)
					{
						if(backupConfiguration.GFSQuarterlyMonth == 2) { gfsp.add(7,'days').add(2,'months').startOf('month') }
						gfsp.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
						gfsp.date(backupConfiguration.GFSQuarterlyDayOfMonth) 
						
						markers.testmark(gfsp,"Q",xdate.clone(),ydate.clone())
				
						gfsp.add(1,'quarters').startOf('quarter')
						
					}
				}
			} else {
				if (backupConfiguration.GFSQuarterlyQuarterWeek == 5) {
					var gfsp = ydate.clone()
					gfsp.add(1,'quarters').endOf('quarter');
					while (gfsp >= xdate) {
						while(gfsp.day() != this.sunday0(backupConfiguration.GFSQuarterlyDay)) {
							gfsp.subtract(1,'day')	
						}
						gfsp.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
						markers.testmark(gfsp,"Q",xdate.clone(),ydate.clone())

						gfsp.subtract(1,'quarters').endOf('quarter');
					}
				} else {
					var gfsp = xdate.clone()
					gfsp.subtract(1,'quarter').startOf('quarter');
					while (gfsp <= ydate) {
						//1st matching day
						while(gfsp.day() != this.sunday0(backupConfiguration.GFSQuarterlyDay)) {
							gfsp.add(1,'day')	
						}
						
						gfsp.add((backupConfiguration.GFSQuarterlyQuarterWeek-1),'weeks')
						
						gfsp.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
						
						markers.testmark(gfsp,"Q",xdate.clone(),ydate.clone())
						
						gfsp.add(1,'quarters').startOf('quarter');
					}
				}
			}
			
		}
		if(backupConfiguration.GFS["Y"] > 0) {
			//y defaults
			//VeeamBackupConfigurationObj.GFSYearlyDay = 6
			//VeeamBackupConfigurationObj.GFSYearlyDayWeek = 1
			//if you set the day of month, it will get priority
			//VeeamBackupConfigurationObj.GFSYearlyDayOfMonth = 0
			//VeeamBackupConfigurationObj.GFSYearlyMonth = 1
			
			if(backupConfiguration.GFSYearlyDayOfMonth > 0) {
				if (backupConfiguration.GFSYearlyDayOfMonth > 27) {
					var gfsp = ydate.clone()
					gfsp.add(1,'years').endOf('year')
					
					while(gfsp >= xdate)
					{
						gfsp.month(backupConfiguration.GFSYearlyMonth-1).endOf('month')
						if(gfsp.date() > backupConfiguration.GFSYearlyDayOfMonth) { gfsp.date(backupConfiguration.GFSYearlyDayOfMonth) }
						gfsp.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
						
						markers.testmark(gfsp,"Y",xdate.clone(),ydate.clone())
						
						gfsp.subtract(1,'years').endOf('year')
					}				
				} else {
					var gfsp = xdate.clone().subtract(1,'year').startOf('year')
					
					while(gfsp <= ydate)
					{
						gfsp.month(backupConfiguration.GFSYearlyMonth-1).startOf('month')
						gfsp.date(backupConfiguration.GFSYearlyDayOfMonth) 
						gfsp.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
						
						markers.testmark(gfsp,"Y",xdate.clone(),ydate.clone())
				
						gfsp.add(1,'years').startOf('year')
						
					}
				}				
			} else {
				if (backupConfiguration.GFSYearlyDayWeek == 5) {
					var gfsp = ydate.clone()
					gfsp.add(1,'year').endOf('year');
					while (gfsp >= xdate) {
						while(gfsp.day() != this.sunday0(backupConfiguration.GFSYearlyDay)) {
							gfsp.subtract(1,'day')	
						}
						gfsp.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
						markers.testmark(gfsp,"Y",xdate.clone(),ydate.clone())

						gfsp.subtract(1,'years').endOf('year');
					}
				} else {
					var gfsp = xdate.clone()
					gfsp.subtract(1,'years').startOf('year');
					while (gfsp <= ydate) {
						//1st matching day
						while(gfsp.day() != this.sunday0(backupConfiguration.GFSYearlyDay)) {
							gfsp.add(1,'day')	
						}
						
						gfsp.add((backupConfiguration.GFSYearlyDayWeek-1),'weeks')
						
						gfsp.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
						
						markers.testmark(gfsp,"Y",xdate.clone(),ydate.clone())
						
						gfsp.add(1,'years').startOf('year');
					}
				}	
			}
			
		}
		
		return markers
	}
	
	
	/*
	MarkforGFS

	Let point x = point - 1; y = point
	---x----y---------->

	Find a point between x and y that might be GFS
	--x--g-y----------->

	Calculate the highLow Difference. If G is closer to y, then mark y, otherwise mark x (clam the point to the close father)

	finding g can be challenging. If you skip back (s), it is best to start with x, skip back, then to add (but never subtract), as long as you are below y
	should be used if you are looking a the beginning of month/quarter/year
	b--x--?--y--------->

	if you skip forward, it is best to start with y, skip forward, then to reduce (but never to add), as long as you are above x
	should be used if you are seeking at the end of month/quarter/year
	---x---?---y----a-->


	*/


	PureEngineObj.markforGFS = function(backupConfiguration,exectime,xpoint,ypoint)
	{
		var pureEngine = this
		var xdate = xpoint.pointDate.clone()
		var ydate = ypoint.pointDate.clone()


		if(backupConfiguration.GFS["W"] > 0)
		{
			var weeklyPoint = xdate.clone().subtract(1,'days')
			weeklyPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0)
			
			//rollback to previous GFS
			while(weeklyPoint.day() != this.sunday0(backupConfiguration.GFSWeeklyDay))
			{
				weeklyPoint.subtract(1,'days')
			}
			//rolling forward
			while(weeklyPoint <= ydate)
			{
				this.highLowMark(weeklyPoint,"W",xpoint,ypoint)
				weeklyPoint.add(1,'weeks')
			}
			
			
		}
		
		if(backupConfiguration.GFS["M"] > 0)
		{
			if (backupConfiguration.GFSMonthlyDayOfMonth > 0)
			{
				//could have overflow on the month (especially in 32 days scenario ;))
				if(backupConfiguration.GFSMonthlyDayOfMonth > 27)
				{
					var mPoint = ydate.clone().add(1,'months').endOf('month')
					while(mPoint > xdate)
					{
						if(mPoint.date() > backupConfiguration.GFSMonthlyDayOfMonth) { mPoint.date(backupConfiguration.GFSMonthlyDayOfMonth) }
						mPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
						
						this.highLowMark(mPoint,"M",xpoint,ypoint)
					
						mPoint.subtract(1,'months').endOf('month')
					}
				}
				else
				{
					var mPoint = xdate.clone().subtract(1,'months').startOf('month')
					while(mPoint <= ydate)
					{
						mPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
						mPoint.date(backupConfiguration.GFSMonthlyDayOfMonth) 
						this.highLowMark(mPoint,"M",xpoint,ypoint)

						mPoint.add(1,'months').startOf('month')
					}
				}
			}
			else if (backupConfiguration.GFSMonthlyMonthWeek == 5)
			{
				var mPoint = ydate.clone().add(1,'months').endOf('month')
				while(mPoint > xdate)
				{
					mPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
					while(mPoint.day() != this.sunday0(backupConfiguration.GFSMonthlyDay))
					{
						mPoint.subtract(1,'days')
					}
					this.highLowMark(mPoint,"M",xpoint,ypoint)
					
					mPoint.subtract(1,'months').endOf('month')
				}
			}
			else
			{
				var mPoint = xdate.clone().subtract(1,'months').startOf('month')
				while(mPoint <= ydate)
				{
					mPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
					while(mPoint.day() != this.sunday0(backupConfiguration.GFSMonthlyDay))
					{
						mPoint.add(1,'days')
					}
					mPoint.add((backupConfiguration.GFSMonthlyMonthWeek-1), 'weeks')
					this.highLowMark(mPoint,"M",xpoint,ypoint)
					
					//need to go to start of month because otherwise you might jump over y ( y = is 4 jan, 1 month later is 6 jan because 6dec was first day of the week)
					mPoint.add(1,'months').startOf('month')
				}
			}
		}
		if(backupConfiguration.GFS["Q"] > 0)
		{
			/*
				//Q defaults
				specObj.GFSQuarterlyDay = 6
				specObj.GFSQuarterlyQuarterWeek = 1
				//if you set the day of month, it will get priority
				specObj.GFSQuarterlyDayOfMonth = 0
				specObj.GFSQuarterlyMonth = 1 //1 first, 2 last
			*/
			if (backupConfiguration.GFSQuarterlyDayOfMonth > 0)
			{
				//could have overflow on the month (especially in 32 days scenario ;))
				if(backupConfiguration.GFSQuarterlyDayOfMonth > 27)
				{
					var qPoint = ydate.clone().add(1,'quarters').endOf('quarter')
					while(qPoint > xdate)
					{
						if(backupConfiguration.GFSQuarterlyMonth == 1) { qPoint.subtract(2,'months').endOf('month') }
						if(qPoint.date() > backupConfiguration.GFSQuarterlyDayOfMonth) { qPoint.date(backupConfiguration.GFSQuarterlyDayOfMonth) }
						qPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
						
						this.highLowMark(qPoint,"Q",xpoint,ypoint)
					
						qPoint.subtract(1,'quarters').endOf('quarter')
					}
				}
				else
				{
					var qPoint = xdate.clone().subtract(1,'quarters').startOf('quarter')
					while(qPoint <= ydate)
					{
						if(backupConfiguration.GFSQuarterlyMonth == 2) { qPoint.add(2,'months').startOf('month') }
						
						qPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
						qPoint.date(backupConfiguration.GFSQuarterlyDayOfMonth) 
						this.highLowMark(qPoint,"Q",xpoint,ypoint)

						qPoint.add(1,'quarters').startOf('quarter')
					}
				}		
			}
			else if (backupConfiguration.GFSQuarterlyQuarterWeek == 5)
			{
				var qPoint = ydate.clone().add(1,'quarters').endOf('quarter')
				while(qPoint > xdate)
				{
					qPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
					while(qPoint.day() != this.sunday0(backupConfiguration.GFSQuarterlyDay))
					{
						qPoint.subtract(1,'days')
					}
					this.highLowMark(qPoint,"Q",xpoint,ypoint)
					
					qPoint.subtract(1,'quarters').endOf('quarter')
				}
			}
			else
			{
				var qPoint = xdate.clone().subtract(1,'quarters').startOf('quarter')
				while(qPoint <= ydate)
				{
					qPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
					while(qPoint.day() != this.sunday0(backupConfiguration.GFSQuarterlyDay))
					{
						qPoint.add(1,'days')
					}
					qPoint.add((backupConfiguration.GFSQuarterlyQuarterWeek-1), 'weeks')
					this.highLowMark(qPoint,"Q",xpoint,ypoint)
					
					//need to go to start of month because otherwise you might jump over y ( y = is 4 jan, 1 month later is 6 jan because 6dec was first day of the week)
					qPoint.add(1,'quarters').startOf('quarter')
				}
			}
		}
		if(backupConfiguration.GFS["Y"] > 0)
		{
			/*
			//y defaults
			specObj.GFSYearlyDay = 6
			specObj.GFSYearlyDayWeek = 1
			//if you set the day of month, it will get priority
			specObj.GFSYearlyDayOfMonth = 0
			specObj.GFSYearlyMonth = 1
			*/
			
			if (backupConfiguration.GFSYearlyDayOfMonth > 0)
			{
				if(backupConfiguration.GFSYearlyDayOfMonth > 27)
				{
					var yPoint = ydate.clone().add(1,'years').endOf('year')
					while(yPoint > xdate)
					{
						yPoint.month(backupConfiguration.GFSYearlyMonth-1).endOf('month')
						if(yPoint.date() > backupConfiguration.GFSYearlyDayOfMonth) { yPoint.date(backupConfiguration.GFSYearlyDayOfMonth) }
						yPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
						
						this.highLowMark(yPoint,"Y",xpoint,ypoint)
					
						yPoint.subtract(1,'years').endOf('year')
						
					}
				}
				else
				{
					var yPoint = xdate.clone().subtract(1,'years').startOf('year')
					while(yPoint <= ydate)
					{
						yPoint.month(backupConfiguration.GFSYearlyMonth-1).startOf('month')
						yPoint.date(backupConfiguration.GFSYearlyDayOfMonth) 
						yPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
						
						this.highLowMark(yPoint,"Y",xpoint,ypoint)

						yPoint.add(1,'years').startOf('year')
					}
				}
			}
			else if (backupConfiguration.GFSYearlyDayWeek == 5)
			{
				var yPoint = ydate.clone().add(1,'years').endOf('year')
				while(yPoint > xdate)
				{
					yPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
					while(yPoint.day() != this.sunday0(backupConfiguration.GFSYearlyDay))
					{
						yPoint.subtract(1,'days')
					}
					this.highLowMark(yPoint,"Y",xpoint,ypoint)
					
					yPoint.subtract(1,'years').endOf('year')
				}
			}
			else
			{
				var yPoint= xdate.clone().subtract(1,'years').startOf('year')
				while(yPoint<= ydate)
				{
					yPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0).millisecond(0);
					while(yPoint.day() != this.sunday0(backupConfiguration.GFSYearlyDay))
					{
						yPoint.add(1,'days')
					}
					yPoint.add((backupConfiguration.GFSYearlyDayWeek-1), 'weeks')
					this.highLowMark(yPoint,"Y",xpoint,ypoint)
					
					//need to go to start of month because otherwise you might jump over y ( y = is 4 jan, 1 month later is 6 jan because 6dec was first day of the week)
					yPoint.add(1,'years').startOf('year')
				}
			}
		}
	}	
	

	PureEngineObj.recalcPointIDs = function (backupConfiguration,backupResult)
	{
		var pureEngineLocal = this
		var simplepoint = 1
		var gfscounters = {W:1,M:1,Q:1,Y:1}
		var ret = backupResult.retention
		
		
		
		if(backupConfiguration.style == 4)
		{
			//instant cleanup!
			backupResult.safeToMerge = 1
			
			disk = ret[0]
			if (disk.type == "D")
			{
					for(var counter=ret.length-1;counter >= 0;counter = counter - 1 )
					{
						point = ret[counter]
						if(point.type == "D" && point == disk) {
							point.pointid = simplepoint
						} else if (point.type == "P" && point.parent == disk) {
							point.pointid = simplepoint
							simplepoint = simplepoint + 1
						} else {
							//garbage in the chain
							//remove it and hopefully get a useful result next run
							backupResult.safeToMerge = 0
							point.flaggedForDeletion = 1
							pureEngineLocal.debugln("Garbage, should not happen "+point.toString(),1)
						}
					}	
			} else {
				pureEngineLocal.debugln("First file is not disk "+disk.toString(),1)
				backupResult.safeToMerge = 0
				for(var counter=ret.length-1;counter >= 0;counter = counter - 1 )
				{
					var point = ret[counter]
					point.flaggedForDeletion = 1	
				}
			}
			
			
		}
		else
		{
			var firstfullfound = 0
			backupResult.newestFull = -1
			backupResult.safeToMerge = 1
			
			
			var pointsonidrec = {}
			
			//this is the object we want to keep
			//objects that are not siblings or parents should be deleted
			var keep = ret[ret.length-1]
			
			var gfsrecount = function(point,gfscounters) {
				var shouldBeKept = 0
				
				$.each(point.GFSType,function( key, gfstype ) {
								if (gfscounters[gfstype] <= backupConfiguration.GFS[gfstype])
								{
									shouldBeKept=1
									point.GFSPointids[gfstype] = gfscounters[gfstype]
									gfscounters[gfstype] = gfscounters[gfstype] + 1	
								}
								else
								{
									point.GFSPointids[gfstype] = -1
								}
				})
				
				
				
				return shouldBeKept
			}
			
		
			for(var counter=ret.length-1;counter >= 0;counter = counter - 1 )
			{
				var point = ret[counter]
				point.pointid = simplepoint
				
				if(!firstfullfound)
				{
					if(point.isFull())
					{
						firstfullfound = 1
						backupResult.newestFull = point.pointid
						
						var peek = counter - 1
						if(peek >= 0)
						{
							if(ret[peek].type == "R")
							{
								backupResult.safeToMerge = 0
							}
						}
					}
					else if ($.inArray(point.type,["I"]) == -1) {
						backupResult.safeToMerge = 0
					}
				}
				//we have GFS in our main chain, so they need to be substracted from the GFS count
				//garbagecollector should move them to GFS chain if they are no longer part of simplePoint chain 
				var gfsactiveshouldkeep = 0
				if (backupConfiguration.GFSActiveFull && point.isVBK() && point.isMarkedForGFS()) {				
						gfsactiveshouldkeep = gfsrecount(point,gfscounters)
				}	
				
				//marks for garbage collection
				if(point.pointid <= backupConfiguration.simplePoints)
				{
					keep = point
					point.flagForKeepId = 0		
				}
				else if ((keep.parent != point.parent && keep.parent != point) || (point.parent.isnn() && point.parent.pointDate > point.pointDate  ))
				{
					//if it is a gfs point and we are working active full, we should reconsider keeping it
					if (!gfsactiveshouldkeep) {
						point.flaggedForDeletion = 1	
					} else {
						point.flagForKeepId = -1
					}
				}
				else
				{				
					point.flagForKeepId = keep.pointid
				}
				
				if(point.isMarkedForGFS() && !point.isVBK())
				{
					//incStars
					if(pureEngineLocal.flags.incStars)
					{				
						$.each($.unique(point.GFSType),function( key, gfstype ) {
									point.GFSPointids[gfstype] = "*"						
						})
					}
				}
				
				
				pointsonidrec[point.origuid] = point
				
				simplepoint = simplepoint + 1
			}
			
			var gfs = backupResult.GFS
			for(var counter=gfs.length-1;counter >= 0;counter = counter - 1 )
			{
				var point = gfs[counter]
				point.pointid = -1
				
				var shouldBeKept = 0
				
				$.each(point.GFSType,function( key, gfstype ) {
						if (gfscounters[gfstype] <= backupConfiguration.GFS[gfstype])
						{
							shouldBeKept=1
							point.GFSPointids[gfstype] = gfscounters[gfstype]
							gfscounters[gfstype] = gfscounters[gfstype] + 1
						}
						else
						{
							point.GFSPointids[gfstype] = -1
						}
				})
				if(!shouldBeKept)
				{
					point.flaggedForDeletion = 1
				}
				pointsonidrec[point.origuid] = point
			}
			backupResult.pointsonid = pointsonidrec
		}
	}

	PureEngineObj.LinkReFS = function(backupConfiguration,newpoint,oldpoint) {
		var pctdiff = backupConfiguration.refsdiffperct(newpoint.pointDate.clone(),oldpoint.pointDate.clone())	
		
		var disct = parseInt(((oldpoint.getDataStats().s()*(100-pctdiff))/100)*(newpoint.getDataStats().c()/100))
		/*var days = newpoint.pointDate.clone().diff(oldpoint.pointDate.clone(),'days')
		if (days > 300) {
			console.log("diffy "+pctdiff)
		}*/
		
		
		newpoint.getDataStats().refsLinked = ReFSLinked(oldpoint.uid,disct) 
	}

	PureEngineObj.findUndeletedParent = function(linkedparent,pointsonid) {
		
		
		if(linkedparent.recycled != 1) {
			return linkedparent
		}
		
		//if this point is refslinked (if not it should be root so it occuping all initial space), continue search for parent that is not recycled
		var reld = linkedparent.getDataStats().refsLinked 
		
		
		
		if(reld != 0) {
			var lp = pointsonid[reld.linkedpoint]
			
			if(lp !== 'undefined' && lp != 0) {
				if (linkedparent.recycled == 1) {
					return this.findUndeletedParent(lp,pointsonid)
				} else {
					return linkedparent
				}
			} else {
				//could not find parent, safe purging
				//console.log("could not find partent, purged, should not happen")
				return 0
			}
		} 
		//if it is not linked just go for full usage
		//console.log("it is not refsLinked "+linkedparent.origuid.substr(-6))
		
		return 0
		
	}
	
	PureEngineObj.refsLinking = function(backupConfiguration,checkpoint,pointsonid) {
		if (backupConfiguration.refs == 1) {
			var reld = checkpoint.getDataStats().refsLinked 
			
			//if it is not linked, no action required
			if (reld != 0) {
				var lp = pointsonid[reld.linkedpoint]
				
				if(lp !== 'undefined' && lp != 0) {
					//if linked parent is not recycled, don't do anything
					//if it is, find previous parent
					if (lp.recycled == 1) {
						//if previous point is recycled we need to take action
						var findparent = this.findUndeletedParent(lp,pointsonid)
						if (findparent == 0) {
							checkpoint.getDataStats().refsLinked = 0
							//console.log("could not find for point "+checkpoint.origuid.substr(-6)+" parent "+reld.linkedpoint.substr(-6))
							if (checkpoint.isGFS()) {
								checkpoint.type = "G"
								
							} else {
								checkpoint.type = "S"
							}
							
						} else {
							this.LinkReFS(backupConfiguration,checkpoint,findparent) 

							//console.log("Relinked")
						}
					}
				} else {
					//could not find parent, safe purging
					//console.log("could not find parent, purged, should not happen")
					checkpoint.getDataStats().refsLinked = 0
					checkpoint.type = "S"
				}
			} 
		}
	}
	
	PureEngineObj.doRecycle = function  (backupResult,backupConfiguration,garbagetime)
	{
		var pureEngineLocal = this
		//just to be sure
		this.recalcPointIDs(backupConfiguration,backupResult)
		
		
		var recyclebin = [] 
		var ret = backupResult.retention
		var gfs = backupResult.GFS
		var newRet = []
		var newGfs = []
		var point = 0
		
		
		
		for(var counter=0;counter < gfs.length;counter = counter + 1 )
		{
			point = gfs[counter]

			
			if(!point.flaggedForDeletion)
			{
				//make sure that if we add a linked point that it has an undeleted parent
				this.refsLinking(backupConfiguration,point,backupResult.pointsonid)
				newGfs.push(point)
				
			}
			else
			{
				backupResult.addLastAction(VeeamBackupLastActionObject(0,"Deleting point "+point))
				point.recycled = 1
				recyclebin.push(point)
			}
		}
		
		
		for(var counter=0;counter < ret.length;counter = counter +1 )
		{
			point = ret[counter]

			if(!point.flaggedForDeletion)
			{
				//make sure that if we add a linked point that it has an undeleted parent
				this.refsLinking(backupConfiguration,point,backupResult.pointsonid)
				
				if (backupConfiguration.GFSActiveFull && point.isVBK() && point.isMarkedForGFS() && point.flagForKeepId == -1 ) {
					if (point.getRefsLinked() != 0) { point.type = "H"} 
					else {point.type = "G"}
					
					point.flagForKeepId = 0
					newGfs.push(point)
				} else {
					newRet.push(point)
				}
			}
			else
			{
				backupResult.addLastAction(VeeamBackupLastActionObject(0,"Deleting point "+point))
				point.recycled = 1
				recyclebin.push(point)
			}
		}

		backupResult.garbage.concat(recyclebin)
		backupResult.retention = newRet
		backupResult.GFS = newGfs
	}

	//very unsafe :)
	PureEngineObj.mergeSnap = function(backupResult,backupConfiguration,mergetime) {
		this.recalcPointIDs(backupConfiguration,backupResult)
		var ret = backupResult.retention
		
		if(backupResult.safeToMerge) {
			
			if(ret[0].pointid > backupConfiguration.simplePoints)
			{
				this.debugln("Merging snap",2)
				
				var recyclebin = []
				var newRet = []
				
				
				parent = ret.shift()
				newRet.push(parent)
				
				var counter = 0
				var mergeuntil = (backupConfiguration.simplePoints-1)
				for(;counter < ret.length && ret[counter].pointid > mergeuntil  ;counter = counter +1 )
				{
					recyclebin.push(ret[counter])
					parent.setDataStats(ret[counter].getDataStats().fullclone())
					parent.pointid = ret[counter].pointid
					parent.modifyDate = mergetime.clone()
					parent.pointDate = ret[counter].pointDate.clone()
					backupResult.addLastAction(VeeamBackupLastActionObject(0,"Commit oldest snapshot to apply retention  RAND 2x I/O Read Snap, Commit VMDK / 2x"+ this.humanReadableFilesize(ret[counter].getDataStats().f())))
				}
				for(;counter < ret.length ;counter = counter +1 )
				{
					newRet.push(ret[counter])
				}
				
				backupResult.garbage.concat(recyclebin)
				backupResult.retention = newRet
				
			}
			
		} else {
			this.debugln("Forced recycle, should not happen",2)
			this.doRecycle(backupResult,backupConfiguration,mergetime.clone())
		}
	}
	//new merging engine optimized after finding out GFS miscalculation
	//it is following more the logic described in the manual
	PureEngineObj.mergeVBK = function(backupResult,backupConfiguration,mergetime)
	{
		this.recalcPointIDs(backupConfiguration,backupResult)
		if(backupResult.newestFull != -1)
		{
			if(backupResult.safeToMerge)
			{
				if(backupResult.newestFull > backupConfiguration.simplePoints)
				{
					this.debugln("Safe to merge and found full",4)
					
					var recyclebin = [] 
					var ret = backupResult.retention
					var gfs = backupResult.GFS
					var newRet = []
					
					//pushing previous points
					var counter = 0
					for(;counter < ret.length && ret[counter].pointid != backupResult.newestFull ;counter = counter +1 )
					{
						newRet.push(ret[counter])
					}
					
					if(ret[counter].pointid == backupResult.newestFull)
					{
						var parent = ret[counter]
						newRet.push(parent)
						
						for(counter++;counter < ret.length ;counter = counter +1 )
						{
							var point = ret[counter]
							if(point.pointid >= backupConfiguration.simplePoints && parent == point.parent)
							{
								//consider GFS
								this.debugln("Are we BCJ?",4)
								if(backupConfiguration.style == 3)
								{
									this.debugln("We are BCJ",4)
									//this.markforGFS(backupConfiguration,mergetime.clone(),parent,point)
									if (point.isMarkedForGFS()) {
										backupResult.addLastAction(VeeamBackupLastActionObject(0,"Next point is closer to some GFS configurations and will be used for GFS Retention next run, merging it now"))
									}
									
								}
								if(parent.isMarkedForGFS())
								{
									this.debugln("GFS Retention executing",4)
									//stages based on http://helpcenter.veeam.com/backup/80/vsphere/backup_copy_gfs_weekly_cycle.html
									//stage 1 of GFS marked parent
									var removedparent = newRet.pop()
									var remupdatetype = "G"
									
									
							
									if(backupConfiguration.refs == 1) {
										var stats = removedparent.getDataStats().clone()
										stats.refslinked = 0
										
										parent = VeeamBackupFileObject("full.vbk",VeeamBackupFileNullObject(),"L",stats,mergetime.clone(),removedparent.pointDate.clone())	
										this.LinkReFS(backupConfiguration,parent,removedparent) 										
										
										//if parent is already a linked parent, we should update the type not to G but to H (H is a linked G)
										if (removedparent.getRefsLinked() != 0) {
												remupdatetype = "H"
										} 
									} else {
										parent = VeeamBackupFileObject("full.vbk",VeeamBackupFileNullObject(),"S",removedparent.getDataStats(),mergetime.clone(),removedparent.pointDate.clone())
									}
									
									
									
									parent.GFSType = point.GFSType
									parent.GFSPointids = point.GFSPointids
									//connect incs to new compacted father
									for(var updatecounter=counter+1;updatecounter < ret.length && ret[updatecounter].parent == removedparent;updatecounter = updatecounter +1 )
									{
										ret[updatecounter].parent = parent
									}
									
									newRet.push(parent)
									backupResult.addLastAction(VeeamBackupLastActionObject(0,"Copied data from Full and Inc SEQ 2x I/O Read, Write / 2x "+ this.humanReadableFilesize(parent.getDataStats().f())))
									
									//stage 2 recycling VIB
									point.modifyDate = mergetime.clone()
									recyclebin.push(point)
									backupResult.addLastAction(VeeamBackupLastActionObject(0,"Deleting  VIB File"))
									
									//stage 3 pushing parent to GFS 
									removedparent.type = remupdatetype
									removedparent.flagForKeepId = 0
									gfs.push(removedparent)
									
								}
								else
								{
									parent.modifyDate = mergetime.clone()
									parent.pointDate = point.pointDate.clone()
									parent.pointid = point.pointid
									parent.GFSType = point.GFSType
									parent.GFSPointids = point.GFSPointids
									
									var rfsl = parent.getRefsLinked()
									var rfslsuc = 0
									
									//if we merging, check if the parent is a refslinked full
									//if yes, we will recalculate the diff between the linked parent and the actual time
									if(backupConfiguration.refs == 1 && rfsl != 0) {
										rfparent = backupResult.findPoint(rfsl.linkedpoint)
										if (rfparent != 0) {
											rfslsuc = 1
											
											var stats = backupConfiguration.getFullDataStats(point.pointDate.clone())
											parent.setDataStats(stats)
											this.LinkReFS(backupConfiguration,parent,rfparent) 
											
											backupResult.addLastAction(VeeamBackupLastActionObject(0,"Fast clone merge"))
										} 
									} 
									
									if (rfslsuc == 0) {
										this.debugln("Just merging cause parent is not marked with GFS",4)
										parent.type = "S"
										parent.setDataStats(backupConfiguration.getFullDataStats(point.pointDate.clone()))
										backupResult.addLastAction(VeeamBackupLastActionObject(0,"Merging VBK/VIB / RAND 2x I/O Read, Write / 2x "+ this.humanReadableFilesize(point.getDataStats().f())))
									}
									
									point.modifyDate = mergetime.clone()
									recyclebin.push(point)
										
									backupResult.addLastAction(VeeamBackupLastActionObject(0,"Deleting merged VIB File"))
									
								}
								
								
							}
							else
							{
								newRet.push(point)	
							}
						}
						backupResult.garbage.concat(recyclebin)
						backupResult.retention = newRet
					}
					else
					{
						this.debugln("No way this should happen but life is not always fun and games, changing nothing",1)
					}
				}
			}
			else {
				this.debugln("Can not merge full without a clean chall (all incs in front & no vbk after)",1)
			}
		}
		else
		{
			this.debugln("Can not merge on "+mergetime+"cause no fulls where found, that not good at all!",1)
		}
		
	}
	
	PureEngineObj.prevFullBackup = function(backupResult) {
		var prevFull = 0
		
		var ret = backupResult.retention
		for(var counter=ret.length-1;prevFull == 0 && counter >= 0;counter = counter -1 )
		{
			var point = ret[counter]
			if(point.isVBK())
			{
					prevFull = point
			}
		}
		
		if (prevFull == 0) {
			var gfs = backupResult.GFS
			for(var counter=gfs.length-1;prevFull == 0 && counter >= 0;counter = counter -1 )
			{
				var point = gfs[counter]
				if(point.isVBK())
				{
						prevFull = point
				}
			}
		}
		return prevFull
	}
	
	
	//give me fulls today
	//try to find active full today
	//if we can only find synthetic we will return synthetic
	//what is important is that an active can no longer be identified by F or S if it was already been touched by reverse
	//so in this case, we will look if the create time is still in this time. If proper management was done, if the create time was today, it was active full at one point today
	PureEngineObj.huntFullToday = function(backupResult,exectime)
	{
		var fulls = { active: VeeamBackupFileNullObject(), synthetic:VeeamBackupFileNullObject()}
		var beginoftheday = exectime.clone().startOf('day');
		var ret = backupResult.retention
		
		for(var counter=ret.length-1;counter >= 0 && ret[counter].modifyDate >= beginoftheday;counter = counter -1 )
		{
			var point = ret[counter]
			if(point.isVBK())
			{
				if(point.origType == "F" && point.createDate >= beginoftheday)
				{
					fulls.active = point
				}
				if (point.type == "S" || point.type == "L")
				{
					fulls.synthetic = point
				}
			}
			point = point.prev
		}
		return fulls
		
	}
	
	//is the current execttime (day) an active full day
	PureEngineObj.testActiveFull = function (exectime,backupConfiguration) {
		var execactive = 0
		theday = (exectime.day()+6)%7
			
		//or monthly is activated or weekly but not both
		if($.inArray(1,backupConfiguration.activeMonths) != -1)
		{
			if(backupConfiguration.activeMonths[exectime.month()])
			{
				if(theday == backupConfiguration.activeMonthDay )
				{
					//[1,8,15,22,22] kind of result
					flmarray = this.firstLastDaysInMonth(exectime,backupConfiguration.activeMonthDay)
					if(flmarray[((backupConfiguration.activeMonthWeek+4)%5)] == exectime.date())
					{
						execactive = 1
					}
				}
			}
		}
		else
		{
			execactive = (backupConfiguration.activeWeek[theday] == 1)
		}
		return execactive
	}
	
	//is the current day a synthetic day
	PureEngineObj.testSyntheticFull = function (exectime,backupConfiguration) {
		theday = (exectime.day()+6)%7
		return (backupConfiguration.synthetic[theday] == 1)
	}
	
	PureEngineObj.workingSpaceBucketCalculation = function(backupConfiguration,backupResult,exectime)
	{
		var workSpace = 0
		
		var buckets = backupConfiguration.buckets
		var sourceData = backupConfiguration.getSourceSize(exectime.clone())
		var alreadyinbuckets = 0
		var lcompression = backupConfiguration.compression
		
		if (backupConfiguration.style == 4) {
			cr = backupConfiguration.changeRate
			multi = backupConfiguration.replicaWorkSpaceMultiPerc
			
			realmulti = cr*multi 
			if (realmulti > 100) {
				realmulti = 100
			}
			
			lcompression = 100
			sourceData = sourceData*(realmulti/100)
		} 
		
		
		for (var b =0;b < buckets.length;b++) {
			var bucket = buckets[b]
			
			
			var inthisbucket = sourceData - alreadyinbuckets 
			if(bucket.MAX != -1 && sourceData > bucket.MAX)
			{
				inthisbucket = bucket.MAX - alreadyinbuckets 
			}
			//should not happen
			if(inthisbucket < 0) { inthisbucket = 0 }
			this.debugln("In this bucket "+inthisbucket+" going easy on it with : "+bucket.EASER,5)
			workSpace = workSpace+ (inthisbucket*(lcompression/100)*bucket.EASER)
			
			
			alreadyinbuckets = alreadyinbuckets + inthisbucket
		}
		this.debugln("---",5)
		
		return workSpace
	}
	PureEngineObj.worstCase = function(backupConfiguration,backupResult,exectime)
	{
		var ret = backupResult.retention
		var gfs = backupResult.GFS
		var pureEngineLocal = this
		var totalSize = 0
		var workingSpace = this.workingSpaceBucketCalculation(backupConfiguration,backupResult,exectime)
		var totalSizeWW = 0 
		
		for(var counter=0;counter < ret.length;counter = counter +1 )
		{
			var point = ret[counter]
			totalSize += point.getDataStats().f()
		}
		for(var counter=0;counter < gfs.length;counter = counter +1 )
		{
			var point = gfs[counter]
			totalSize += point.getDataStats().f()
		}
		totalSizeWW = totalSize + workingSpace
		backupResult.totalSize = totalSize
		backupResult.workingSpace = workingSpace
		
		
		if(backupResult.worstCaseSizeWithWorkingSpace < totalSizeWW)
		{
			backupResult.worstCaseSize = totalSize
			backupResult.worstCaseSizeWithWorkingSpace = totalSizeWW
			backupResult.worstCaseDay = exectime.clone()
			backupResult.worstCaseDayWorkingSpace = workingSpace
			
			var retCopy = []
			var gfsCopy = []
			
			
			parents = {}
			for(var counter=0;counter < ret.length;counter = counter +1)
			{
				var preclone = ret[counter]
				if(preclone.isFull())
				{
					parents[preclone.uid] = preclone.clone()
				}
			}
			
			for(var counter=0;counter < ret.length;counter = counter +1 )
			{
				var point = ret[counter]

				
				if(point.isFull() && parents[point.uid])
				{
					retCopy.push(parents[point.uid])

				}
				else
				{
					var copy = point.clone()
					//link to the parent that was pre cloned
					if(point.parent.uid in parents)
					{
							copy.parent = parents[point.parent.uid] 
					}
					retCopy.push(copy)
				}
			}
			
			for(var counter=0;counter < gfs.length;counter = counter +1 )
			{
				var point = gfs[counter]
				gfsCopy.push(point.clone())
			}
			
			
			backupResult.worstCaseDayRetention = retCopy 
			backupResult.worstCaseDayGFS = gfsCopy
			
		}	
		


	}

	
	PureEngineObj.predictEndDate = function (backupConfiguration,exectime,steptime)
	{
		var predict = exectime.clone()
	
		
	
		var steptimeinhours = moment.duration(steptime).asHours();
		
		
		//if active month = 1
		//if active week = 2
		//if synthetic = 3
		var fullStatus = backupConfiguration.doFull() 
		
		this.debugln("Full Status "+fullStatus,3)
		this.debugln("Style Predictive "+backupConfiguration.style,3)
		if (backupConfiguration.style == 1)
		{
			var addHours = steptimeinhours*(backupConfiguration.simplePoints+2)+48
		
			if (fullStatus == 1)
			{
				//add 12 months so that if some months are unchecked, we are safe
				//addExtraHours = moment.duration({months:12}).asHours();
				//this.debugln("Extra Predictive "+addExtraHours,3)
				//addHours = addHours + addExtraHours
				
				//distance tells use the max amounts between different full backups
				//prediction date need to be longer in function of the distance (max 2 years if 1 year of distance, begin point somewhere in the future (pot 1 year) + 1 year retention + simple retentions)
				//(will show up as 11 so +1)
				//12 months for extra so that we can have at least one scheduled backup running + 1 safety
				//It should actually shorten predictive date in most common scenario's
				var superPred = (backupConfiguration.distanceMonths()+12+1+1)
				addExtraHours = moment.duration({months:superPred}).asHours();
				addHours = addHours + addExtraHours
				this.debugln("Paranoid Predictive Months "+superPred,3)
			}
			else if (fullStatus == 2 || fullStatus == 3)
			{
				addExtraHours = moment.duration({weeks:2}).asHours();
				this.debugln("Extra Predictive "+addExtraHours,3)
				addHours = addHours + addExtraHours
			}
			
			predict.add({hours:addHours})
			
		}
		else if(backupConfiguration.style == 2)
		{
			var addHours = steptimeinhours*(backupConfiguration.simplePoints+2)+48
			if (fullStatus == 1)
			{
				//add 3 months so that we at least meet a month with 31 days
				addExtraHours = moment.duration({months:3}).asHours();
				this.debugln("Extra Predictive "+addExtraHours,3)
				addHours = addHours + addExtraHours
			}
			else if (fullStatus == 2)
			{
				addExtraHours = moment.duration({weeks:2}).asHours();
				this.debugln("Extra Predictive "+addExtraHours,3)
				addHours = addHours + addExtraHours
			}
			predict.add({hours:addHours})
		}
		else if(backupConfiguration.style == 3)
		{
			var addHours = (steptimeinhours*(backupConfiguration.simplePoints+2)+48)+moment.duration({months:6}).asHours()
			
			var maxAdd = moment.duration({months:6}).asHours();
		
			if(backupConfiguration.GFS["W"] > 0)
			{
				var query = backupConfiguration.GFS["W"]
				var gfsAdd = moment.duration({weeks:(query+2)}).asHours();
				if(gfsAdd > maxAdd)
				{
					maxAdd = gfsAdd
					this.debugln("w "+maxAdd+" "+query,2)	
				}

		
			}
			if(backupConfiguration.GFS["M"] > 0)
			{
				var query = backupConfiguration.GFS["M"]
				var gfsAdd = moment.duration({months:(query+2)}).asHours();
				if(gfsAdd > maxAdd)
				{
					maxAdd = gfsAdd
					this.debugln("m "+maxAdd+" "+query,2)

				}
			}
			if(backupConfiguration.GFS["Q"] > 0)
			{
				var query = backupConfiguration.GFS["Q"]
				var gfsAdd = moment.duration({quarters:(query+2)}).asHours();
				if(gfsAdd > maxAdd)
				{
					maxAdd = gfsAdd
					this.debugln("q "+maxAdd+" "+query,2)
					
				}
			}
			if(backupConfiguration.GFS["Y"] > 0)
			{
				var query = backupConfiguration.GFS["Y"]
				var gfsAdd = moment.duration({years:(backupConfiguration.GFS["Y"]+2)}).asHours();
				if(gfsAdd > maxAdd)
				{
					maxAdd = gfsAdd
					this.debugln("y "+maxAdd+" "+query,2)
				}
			}
			
			predict.add({hours:addHours})
			predict.add({hours:maxAdd})
		}
		else if (backupConfiguration.style == 4)
		{
			var addHours = steptimeinhours*(backupConfiguration.simplePoints+2)+48
			predict.add({hours:addHours})
			
		}
		this.debugln("Predictive result set to "+predict.format(),3)
		return predict
	}

	
	PureEngineObj.run = function(backupConfiguration,backupResult,exectime,steptime,halttime)
	{
		this.debugln(exectime.format("YYYY MM DDD"),1)
		this.debugln(halttime.format("YYYY MM DDD"),1)
		
		//set start date if it 0
		if(backupConfiguration.startDate == 0)
		{
			backupConfiguration.startDate = exectime.clone()
		}
		
		
		if($.inArray(backupConfiguration.style,[1,2,3]) != -1)
		{
			
			//for every style, if there is no newest point, we create full vbk
			if(backupResult.retention.length == 0)
			{
				backupResult.beginAction(exectime.clone())
				var firsttype = "F"
				if(backupConfiguration.style == 3) { firsttype = "S"}
				
				
				var fullbackup = VeeamBackupFileObject("full.vbk",VeeamBackupFileNullObject(),firsttype,backupConfiguration.getFullDataStats(exectime.clone()),exectime.clone(),exectime.clone())
				fullbackup.pointid = 1
				backupResult.retentionPush(fullbackup)
				backupResult.addLastAction(VeeamBackupLastActionObject(0,"Created VBK / SEQ 1x I/O Write / 1x "+ this.humanReadableFilesize(fullbackup.getDataStats().f())))
				
				exectime = exectime.add(steptime)
				this.worstCase(backupConfiguration,backupResult,exectime.clone())
				
			}
			
			if (backupConfiguration.style == 1)
			{
				
				var dotransform = backupConfiguration.doTransform()
				if (dotransform)
				{
					this.debugln("Forever Incremental Mode",1)
				}
				else
				{
					this.debugln("v7 Forward Mode",1)
				}
				//forward incremental
				for(;exectime.isBefore(halttime);exectime = exectime.add(steptime))
				{
					backupResult.beginAction(exectime.clone())
					var activeAlreadyDone = this.huntFullToday(backupResult,exectime.clone())
					var latest = backupResult.retentionLatest()
					
					
					
					var newpoint = 0
					
					//active day, then lets do an active backup
					if(activeAlreadyDone.active.isnull() && this.testActiveFull(exectime.clone(),backupConfiguration)) 
					{
						newpoint = VeeamBackupFileObject("full.vbk",VeeamBackupFileNullObject(),"F",backupConfiguration.getFullDataStats(exectime.clone()),exectime.clone(),exectime.clone())
						activeAlreadyDone.active = newpoint
						backupResult.addLastAction(VeeamBackupLastActionObject(0,"Created VBK / SEQ 1x I/O Write / 1x "+ this.humanReadableFilesize(newpoint.getDataStats().f())))
					}
					else if ($.inArray(latest.type,["F","S","I","L"]) == -1)
					{
						newpoint = VeeamBackupFileObject("full.vbk",VeeamBackupFileNullObject(),"F",backupConfiguration.getFullDataStats(exectime.clone()),exectime.clone(),exectime.clone())
						activeAlreadyDone.active = newpoint
						backupResult.addLastAction(VeeamBackupLastActionObject(0,"Force Created VBK (could not find for vib) /  SEQ 1x I/O Write / 1x "+ this.humanReadableFilesize(newpoint.getDataStats().f())))
						
					}
					else
					{
						//if the previous point was a vbk, this point his parent will be the previous point
						//if it was an increment, we should connect it to the parent of the increment
						if(latest.isVBK())
						{
							newpoint = VeeamBackupFileObject("incremental.vib",latest,"I",backupConfiguration.getIncrementalDataStats(exectime.clone()),exectime.clone(),exectime.clone())
							//this.debugln("parent link "+newpoint.parent,1)
						}
						else
						{
							newpoint = VeeamBackupFileObject("incremental.vib",latest.parent,"I",backupConfiguration.getIncrementalDataStats(exectime.clone()),exectime.clone(),exectime.clone())
							//this.debugln("peer link "+newpoint.parent,1)
						}
						backupResult.addLastAction(VeeamBackupLastActionObject(0,"Created VIB /  SEQ 1x I/O Write / 1x  "+ this.humanReadableFilesize(newpoint.getDataStats().f())))
					}
					backupResult.retentionPush(newpoint)
	
					//if we don't have any active or synthetics, execute transform
					if(dotransform)
					{
						this.mergeVBK(backupResult,backupConfiguration,exectime.clone())
					}
					else
					{
						//check if we need to do synthetic
						if(activeAlreadyDone.active.isnull() && activeAlreadyDone.synthetic.isnull() &&  this.testSyntheticFull(exectime.clone(),backupConfiguration))
						{
							
							var popInc = backupResult.retentionPop()
							
							var refssuccess = 0
							
							if(backupConfiguration.refs == 1) {
								//prevfull = this.prevFullBackup(backupResult)
								//if (prevfull != 0) {
									var stats = backupConfiguration.getFullDataStats(exectime.clone())
									
									var refssynth = VeeamBackupFileObject("full.vbk",VeeamBackupFileNullObject(),"L",stats,exectime.clone(),exectime.clone())
									this.LinkReFS(backupConfiguration,refssynth,latest) 
									
									backupResult.retentionPush(refssynth)
									backupResult.addLastAction(VeeamBackupLastActionObject(0,"Synthetic ReFS VBK / Pointers Update "))
									
									refssuccess = 1
								//} 
							} 
							
							if (refssuccess != 1) {
								var synth = VeeamBackupFileObject("full.vbk",VeeamBackupFileNullObject(),"S",backupConfiguration.getFullDataStats(exectime.clone()),exectime.clone(),popInc.pointDate.clone())
								backupResult.retentionPush(synth)
								
								backupResult.addLastAction(VeeamBackupLastActionObject(0,"Synthetic VBK /  RAND 2x I/O Write / 2x "+ this.humanReadableFilesize(synth.getDataStats().f())))
							}
							popInc.modify = exectime.clone()
							backupResult.garbage.push(popInc)
						}
						//this.debugln(activeAlreadyDone.active.isnull() +" "+ activeAlreadyDone.synthetic.isnull() +" "+  this.testSyntheticFull(exectime.clone(),backupConfiguration),1)
					}
					this.doRecycle(backupResult,backupConfiguration,exectime.clone())
					
					//worst case verification
					this.worstCase(backupConfiguration,backupResult,exectime.clone())
					
				}

				
			}
			else if(backupConfiguration.style == 2)
			{
				this.debugln("Reverse Mode",1)
				//reverse incremental
				for(;exectime.isBefore(halttime);exectime = exectime.add(steptime))
				{
					backupResult.beginAction(exectime.clone())
					var activeAlreadyDone = this.huntFullToday(backupResult,exectime.clone())
					var newpoint = 0
					
					if(activeAlreadyDone.active.isnull() && this.testActiveFull(exectime.clone(),backupConfiguration)) 
					{
						newpoint = VeeamBackupFileObject("full.vbk",VeeamBackupFileNullObject(),"F",backupConfiguration.getFullDataStats(exectime.clone()),exectime.clone(),exectime.clone())
						activeAlreadyDone.active = newpoint
						
						backupResult.addLastAction(VeeamBackupLastActionObject(0,"Created VBK /  SEQ 1x I/O Write / 1x  "+ this.humanReadableFilesize(newpoint.getDataStats().f())))
						
					}
					else 
					{
						//remove the working VBK
						
					
						if (backupResult.retentionLatest().isVBK())
						{
							newpoint = backupResult.retentionPop()
							//stack a reverse point with the pointDate of the VBK, then update the VBK to be the latest
							var reversefile = VeeamBackupFileObject("reverse.vrb",newpoint,"R",backupConfiguration.getIncrementalDataStats(newpoint.pointDate.clone()),exectime.clone(),newpoint.pointDate.clone())
							backupResult.retentionPush(reversefile)
							newpoint.modifyDate = exectime.clone()
							newpoint.pointDate = exectime.clone()
							newpoint.type = "S"
							newpoint.setDataStats(backupConfiguration.getFullDataStats(exectime.clone()))
							
							backupResult.addLastAction(VeeamBackupLastActionObject(0,"Created VRB /  RAND 3x I/O Read VBK, Write VRB, Update VBK / 3x "+ this.humanReadableFilesize(reversefile.getDataStats().f())))
						}
						else
						{
							//should not happen
							newpoint = VeeamBackupFileObject("full.vbk",VeeamBackupFileNullObject(),"F",backupConfiguration.getFullDataStats(exectime.clone()),exectime.clone(),exectime.clone())
						}
					}
					backupResult.retentionPush(newpoint)
					
					this.doRecycle(backupResult,backupConfiguration,exectime.clone())
					
					//worst case verification
					this.worstCase(backupConfiguration,backupResult,exectime.clone())
				}
			}
			else
			{
				this.debugln("Backup Copy Job Mode",1)
				//backup copy job
				for(;exectime.isBefore(halttime);exectime = exectime.add(steptime))
				{
						backupResult.beginAction(exectime.clone())
						var latest = backupResult.retentionLatest()
						
						var markers = { touched:0 }
						if(backupConfiguration.GFSActiveFull) {
							markers = this.getGFSMarkers(backupConfiguration,latest.pointDate.clone(),exectime.clone())
						}
						

						var newpoint = VeeamBackupFileObject("incremental.vib",VeeamBackupFileNullObject(),"I",backupConfiguration.getIncrementalDataStats(exectime.clone()),exectime.clone(),exectime.clone())
						if ($.inArray(latest.type,["F","S","I","L"]) == -1)
						{
							newpoint = VeeamBackupFileObject("full.vbk",VeeamBackupFileNullObject(),"S",backupConfiguration.getFullDataStats(exectime.clone()),exectime.clone(),exectime.clone())
							backupResult.addLastAction(VeeamBackupLastActionObject(0,"Force Created VBK (could not find for vib) /  SEQ 1x I/O Write / 1x "+ this.humanReadableFilesize(newpoint.getDataStats().f())))
						} else if (markers.touched == 1) {
							//"active full" cause got GFS marker and GFSActiveFull was checked
							
							newpoint = VeeamBackupFileObject("full.vbk",VeeamBackupFileNullObject(),"S",backupConfiguration.getFullDataStats(exectime.clone()),exectime.clone(),exectime.clone())
							newpoint.GFSType = markers.all
							backupResult.addLastAction(VeeamBackupLastActionObject(0,"GFS POINT /  SEQ 1x I/O Write / 1x "+ this.humanReadableFilesize(newpoint.getDataStats().f())))
							
							
						} else {
							//Creating vib
							
							backupResult.addLastAction(VeeamBackupLastActionObject(0,"Created VIB /  SEQ 1x I/O Write / 1x  "+ this.humanReadableFilesize(newpoint.getDataStats().f())))
							//if the previous point was a vbk, this point his parent will be the previous point
							//if it was an increment, we should connect it to the parent of the increment
							if(latest.isVBK())
							{
								newpoint.parent = latest
							}
							else
							{
								newpoint.parent = latest.parent
							}
							if(!backupConfiguration.GFSActiveFull) {
								this.markforGFS(backupConfiguration,exectime.clone(),latest,newpoint)
							}
						}
					
						backupResult.retentionPush(newpoint)
						
						if(!backupConfiguration.GFSActiveFull) {
							this.mergeVBK(backupResult,backupConfiguration,exectime.clone())
						}
						
						
						this.doRecycle(backupResult,backupConfiguration,exectime.clone())
						
						//worst case verification
						this.worstCase(backupConfiguration,backupResult,exectime.clone())
						
						
				}
			}
		}
		else if (backupConfiguration.style == 4) {			
			
			for(;exectime.isBefore(halttime);exectime = exectime.add(steptime))
			{
				var parent
				if(backupResult.retention.length == 0)
				{
					backupResult.beginAction(exectime.clone())
					var point= VeeamBackupFileObject("vmdisk.vmdk",VeeamBackupFileNullObject(),"D",backupConfiguration.getFullDataStats(exectime.clone()),exectime.clone(),exectime.clone())
					point.pointid = "1"
					backupResult.retentionPush(point)
					backupResult.addLastAction(VeeamBackupLastActionObject(0,"Created VMDK / SEQ 1x I/O Write / 1x "+ this.humanReadableFilesize(point.getDataStats().f())))
					parent = point
				} else {
					backupResult.beginAction(exectime.clone())
					var latest = backupResult.retentionPop()
					
					if (latest.pointid == "*") {
							backupResult.addLastAction(VeeamBackupLastActionObject(0,"Create Temporary Snapshot"))
							var point = VeeamBackupFileObject("delta-0000.vmdk",VeeamBackupFileNullObject(),"P",backupConfiguration.getIncrementalDataStats(exectime.clone()),exectime.clone(),exectime.clone())
							point.parent = latest.parent
							parent = point.parent
							backupResult.retentionPush(point)
							backupResult.addLastAction(VeeamBackupLastActionObject(0,"Uploaded new delta disk  / SEQ 1x I/O Write / 1x "+ this.humanReadableFilesize(point.getDataStats().f())))
							backupResult.addLastAction(VeeamBackupLastActionObject(0,"Remove Temporary Snapshot"))
							this.mergeSnap(backupResult,backupConfiguration,exectime.clone())		
					}
				}
				
				//protective snapshot (with empty delta)
				var snapshot = VeeamBackupFileObject("delta-0000.vmdk",VeeamBackupFileNullObject(),"P",VeeamBackupDataStats(0,0,100,100,100),exectime.clone(),exectime.clone())
				snapshot.pointid = "*"
				snapshot.parent = parent
				backupResult.retentionPush(snapshot)
				backupResult.addLastAction(VeeamBackupLastActionObject(0,"Snapshot created (delta for protection) "+ this.humanReadableFilesize(snapshot.getDataStats().f())))
				
				
				this.worstCase(backupConfiguration,backupResult,exectime.clone())
			}	
		} else {
			this.debugln("unsupported main style "+backupConfiguration.style,1)
		}
		return backupResult
	}
	
	return PureEngineObj
}


