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
	fileSize = size of the file in bytes
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
	
	simplePoints = retention points
	sourceSize = size of the used vmdk
	
	//you can override the following default after creating the object
	vbc.compression = 40
	vbc.changeRate = 5
	
*/

/*
	We need to make an inherit object. If we do not 
	> VeeamBackupFileNullObject() will call -> VeeamBackupFileObject(0,0,0,0,0,0)
	> In VeeamBackupFileObject(0,0,0,0,0,0) ->  VeeamBackupFileObj.next = VeeamBackupFileNullObject() will call - > VeeamBackupFileNullObject()
	Thus creating a loop
*/
function VeeamBackupFileObject(file,parent,type,fileSize,createDate,pointDate)
{
	var VeeamBackupFileObj = VeeamBackupFileObjectInheritable(file,parent,type,fileSize,createDate,pointDate)
	return VeeamBackupFileObj
}
function VeeamBackupFileObjectInheritable(file,parent,type,fileSize,createDate,pointDate)
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
	
	if(type != 0 && createDate != 0 && pointDate !=0)
	{
		VeeamBackupFileObj.createDate = createDate.clone()
		VeeamBackupFileObj.modifyDate = createDate.clone()
		VeeamBackupFileObj.pointDate = pointDate.clone()
		
		VeeamBackupFileObj.uid = createDate.format("YYMMDDHH")+"-"+Math.floor(Math.random()*1000000000)+"-"+VeeamBackupFileObj.suid
		VeeamBackupFileObj.origuid = VeeamBackupFileObj.uid
	}
	

	VeeamBackupFileObj.fileSize = fileSize
	VeeamBackupFileObj.pointid = -1
	VeeamBackupFileObj.flagForKeepId = 0
	
	VeeamBackupFileObj.GFSType = []
	VeeamBackupFileObj.GFSPointids = {W:0,M:0,Q:0,Y:0}
	
	
	
	//G acts like an archive flag.
	VeeamBackupFileObj.isGFS = function() {
		return (this.type == "G")
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
	
	VeeamBackupFileObj.isVBK = function() {
		return ($.inArray(this.type,["G","S","F"]) != -1)
	}
	VeeamBackupFileObj.isMarkedForGFS = function() {
		return (this.GFSType.length > 0)
	}

	VeeamBackupFileObj.clone = function() {
		var cloneObj = VeeamBackupFileNullObject()
		if(type != 0 && createDate != 0 && pointDate !=0)
		{
			cloneObj = VeeamBackupFileObject(this.file,VeeamBackupFileNullObject(),this.type,this.fileSize,this.createDate.clone(),this.pointDate.clone())
		}
		cloneObj.pointid = this.pointid
		cloneObj.flagForKeepId = this.flagForKeepId
		cloneObj.origuid = this.origuid
		var origObj = this
		
		if(this.modifyDate)
		{
			cloneObj.modifyDate = this.modifyDate.clone()
		}

		cloneObj.fileSize = fileSize
		
		$.each(this.GFSType,function( key, gfstype ) {
			cloneObj.pushGFSType(gfstype)
			cloneObj.GFSPointids[gfstype] = origObj.GFSPointids[gfstype]
		})

		return cloneObj
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
	
		var retString = " "+this.type+" >> "+this.fullfile()+"\t<< "+filesize(this.fileSize, {base: 2,round: 0})+"\t"+this.pointid+keptFor+" MOD "+this.modifyStr()
		if(this.isMarkedForGFS())
		{
			if(this.type == "G")
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
			if(this.type == "G")
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
	var VeeamBackupFileObjNull = VeeamBackupFileObjectInheritable(0,0,0,0,0,0);

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
	
	var tb = (1024*1024*1024*1024)
	
	VeeamBackupConfigurationObj.buckets = []
	VeeamBackupConfigurationObj.buckets[0] = {"MAX":(10*tb),"EASER":1.05}
	VeeamBackupConfigurationObj.buckets[1] = {"MAX":(20*tb),"EASER":0.66}
	VeeamBackupConfigurationObj.buckets[2] = {"MAX":(100*tb),"EASER":0.4}
	VeeamBackupConfigurationObj.buckets[3] = {"MAX":(500*tb),"EASER":0.25}
	VeeamBackupConfigurationObj.buckets[4] = {"MAX":(-1),"EASER":0.10}
	
	//use these function allowing for data grow module to be implemented later
	VeeamBackupConfigurationObj.getSourceSize = function() {
		return this.sourceSize
	}
	VeeamBackupConfigurationObj.getFullSize = function () {
		return this.getSourceSize()*(this.compression/100)
	}
	VeeamBackupConfigurationObj.getIncrementalSize = function () {
		var toReturn = this.getSourceSize()*(this.changeRate/100)*(this.compression/100)
		if(this.compressionDelta)
		{
			toReturn = this.getSourceSize()*(this.changeRate/100)*(this.compressionDelta/100)
		}
		return toReturn
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
	
	
	VeeamBackupResultObj.worstCaseSize = 0
	VeeamBackupResultObj.worstCaseDayWorkingSpace = 0
	VeeamBackupResultObj.worstCaseSizeWithWorkingSpace = 0
	
	VeeamBackupResultObj.worstCaseDay = 0
	VeeamBackupResultObj.worstCaseDayRetention = []
	VeeamBackupResultObj.worstCaseDayGFS = []

	
	
	VeeamBackupResultObj.lastActions = []
	VeeamBackupResultObj.lastActionDate = 0
	
	


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
		var ret = this.retention
		var gfs = this.GFS
		
		var totalSize = 0
		for(var counter=0;counter < ret.length;counter = counter +1 )
		{
			var point = ret[counter]
			totalSize += point.fileSize
		}
		for(var counter=0;counter < gfs.length;counter = counter +1 )
		{
			var point = gfs[counter]
			totalSize += point.fileSize
		}
		
		return totalSize
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
		lateFlagging: true,
		incStars: false,
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
						mPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0);
						
						this.highLowMark(mPoint,"M",xpoint,ypoint)
					
						mPoint.subtract(1,'months').endOf('month')
					}
				}
				else
				{
					var mPoint = xdate.clone().subtract(1,'months').startOf('month')
					while(mPoint <= ydate)
					{
						mPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0);
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
					mPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0);
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
					mPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0);
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
						qPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0);
						
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
						
						qPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0);
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
					qPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0);
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
					qPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0);
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
						yPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0);
						
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
						yPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0);
						
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
					yPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0);
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
					yPoint.hour(backupConfiguration.GFSWeeklyHour).minute(0).second(0);
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
		//this is the object we want to keep
		//objects that are not siblings or parents should be deleted
		var keep = ret[ret.length-1]
		
		for(var counter=ret.length-1;counter >= 0;counter = counter - 1 )
		{
			var point = ret[counter]
			point.pointid = simplepoint
			
			
			//marks for garbage collection
			if(point.pointid <= backupConfiguration.simplePoints)
			{
				keep = point
				point.flagForKeepId = 0
			}
			else if ((keep.parent != point.parent && keep.parent != point) || (point.parent.isnn() && point.parent.pointDate > point.pointDate  ))
			{
				point.flaggedForDeletion = 1
			}
			else
			{
				point.flagForKeepId = keep.pointid
			}
			
			
			if(point.isMarkedForGFS())
			{
				//incStars
				$.each($.unique(point.GFSType),function( key, gfstype ) {
						if(pureEngineLocal.flags.incStars)
						{
							point.GFSPointids[gfstype] = "*"						
						}
						else
						{
							point.GFSPointids[gfstype] = gfscounters[gfstype]
							gfscounters[gfstype] = gfscounters[gfstype] + 1
						}

				})
			}
			
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
				newGfs.push(point)
			}
			else
			{
				backupResult.addLastAction(VeeamBackupLastActionObject(0,"Deleting point "+point))
				recyclebin.push(point)
			}
		}
		
		
		for(var counter=0;counter < ret.length;counter = counter +1 )
		{
			point = ret[counter]
			if(!point.flaggedForDeletion)
			{
				newRet.push(point)
			}
			else
			{
				backupResult.addLastAction(VeeamBackupLastActionObject(0,"Deleting point "+point))
				recyclebin.push(point)
			}
		}

		backupResult.garbage.concat(recyclebin)
		backupResult.retention = newRet
		backupResult.GFS = newGfs
	}

	
	//merging does not delete points that it did not merge (or should not ;))
	PureEngineObj.mergeNewestVBK = function(backupResult,backupConfiguration,mergetime)
	{
		this.recalcPointIDs(backupConfiguration,backupResult)
		
		var recyclebin = [] 
		var ret = backupResult.retention
		var gfs = backupResult.GFS
		var newRet = []
		
		if(ret.length > 0 && ret[0].isVBK())
		{
			var parent = ret[0]
			newRet.push(parent)
			
			var doneMerging = 0
			
			for(var counter=1;counter < ret.length;counter = counter +1 )
			{
				var point = ret[counter]
				if(!doneMerging)
				{
					if(point.parent == parent  && point.pointid >= backupConfiguration.simplePoints)
					{
							parent.modifyDate = mergetime.clone()
							parent.pointDate = point.pointDate.clone()
							parent.pointid = point.pointid
							parent.type = "S"
							
							point.modifyDate = mergetime.clone()
							
							recyclebin.push(point)
							backupResult.addLastAction(VeeamBackupLastActionObject(0,"Merging VBK/VIB / RAND 2x I/O Read, Write / 2x "+ this.humanReadableFilesize(backupConfiguration.getIncrementalSize())))
							backupResult.addLastAction(VeeamBackupLastActionObject(0,"Deleting merged VIB File"))
							
							if(point.isMarkedForGFS())
							{
								parent.GFSType = point.GFSType
								parent.GFSPointids = point.GFSPointids
								
								parent.type = "G"
								parent.flagForKeepId = 0

								//lets execute compacting as well
								gfs.push(newRet.pop())
								
								
								var compactedPoint = VeeamBackupFileObject("full.vbk",VeeamBackupFileNullObject(),"S",backupConfiguration.getFullSize(),mergetime.clone(),parent.pointDate.clone())
								for(var updatecounter=counter;updatecounter < ret.length && ret[updatecounter].parent == parent;updatecounter = updatecounter +1 )
								{
									ret[updatecounter].parent = compactedPoint
								}
								parent = compactedPoint
								newRet.push(parent)
								backupResult.addLastAction(VeeamBackupLastActionObject(0,"Copied & locked VBK for GFS / SEQ 2x I/O Read, Write / 2x "+ this.humanReadableFilesize(backupConfiguration.getFullSize())))
								
							}


					}
					else
					{
						newRet.push(point)
						doneMerging = 1
					}
				}
				else
				{
					newRet.push(point)
				}
			}
			
		}
		backupResult.garbage.concat(recyclebin)
		backupResult.retention = newRet
		
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
				if (point.type == "S")
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
		var buckets = backupConfiguration.buckets
		var sourceData = backupConfiguration.getSourceSize()
		var alreadyinbuckets = 0
		var workSpace = 0
		
		for (var b =0;b < buckets.length;b++) {
			var bucket = buckets[b]
			
			
			var inthisbucket = sourceData - alreadyinbuckets 
			if(bucket.MAX != -1 && sourceData > bucket.MAX)
			{
				inthisbucket = bucket.MAX - alreadyinbuckets 
			}
			//should not happen
			if(inthisbucket < 0) { inthisbucket = 0 }
			this.debugln("In this bucket "+inthisbucket+" going easy on it with : "+bucket.EASER,4)
			workSpace = workSpace+ (inthisbucket*(backupConfiguration.compression/100)*bucket.EASER)
			
			
			alreadyinbuckets = alreadyinbuckets + inthisbucket
		}
		this.debugln("---",4)
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
			totalSize += point.fileSize
		}
		for(var counter=0;counter < gfs.length;counter = counter +1 )
		{
			var point = gfs[counter]
			totalSize += point.fileSize
		}
		totalSizeWW = totalSize + workingSpace
		
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
				if(preclone.isVBK())
				{
					parents[preclone.uid] = preclone.clone()
				}
			}
			
			for(var counter=0;counter < ret.length;counter = counter +1 )
			{
				var point = ret[counter]

				
				if(point.isVBK() && parents[point.uid])
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
				var superPred = (backupConfiguration.distanceMonths()+12+1+1
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
			var addHours = steptimeinhours*(backupConfiguration.simplePoints+2)+48
			
			var maxAdd = moment.duration({months:1}).asHours();
		
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
		this.debugln("Predictive result set to "+predict.format(),3)
		return predict
	}

	
	PureEngineObj.run = function(backupConfiguration,backupResult,exectime,steptime,halttime)
	{
		this.debugln(exectime.format("YY DDD"),1)
		this.debugln(halttime.format("YY DDD"),1)
		
		if($.inArray(backupConfiguration.style,[1,2,3]) != -1)
		{
			backupResult.workingSpace = this.workingSpaceBucketCalculation(backupConfiguration,backupResult,exectime)
			
			//for every style, if there is no newest point, we create full vbk
			if(backupResult.retention.length == 0)
			{
				backupResult.beginAction(exectime.clone())
				var firsttype = "F"
				if(backupConfiguration.style == 3) { firsttype = "S"}
				
				backupResult.addLastAction(VeeamBackupLastActionObject(0,"Created VBK / SEQ 1x I/O Write / 1x "+ this.humanReadableFilesize(backupConfiguration.getFullSize())))
				var fullbackup = VeeamBackupFileObject("full.vbk",VeeamBackupFileNullObject(),firsttype,backupConfiguration.getFullSize(),exectime.clone(),exectime.clone())
				fullbackup.pointid = 1
				backupResult.retentionPush(fullbackup)
				 
				exectime = exectime.add(steptime)
				
				
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
						newpoint = VeeamBackupFileObject("full.vbk",VeeamBackupFileNullObject(),"F",backupConfiguration.getFullSize(),exectime.clone(),exectime.clone())
						activeAlreadyDone.active = newpoint
						backupResult.addLastAction(VeeamBackupLastActionObject(0,"Created VBK / SEQ 1x I/O Write / 1x "+ this.humanReadableFilesize(backupConfiguration.getFullSize())))
					}
					else if ($.inArray(latest.type,["F","S","I"]) == -1)
					{
						newpoint = VeeamBackupFileObject("full.vbk",VeeamBackupFileNullObject(),"F",backupConfiguration.getFullSize(),exectime.clone(),exectime.clone())
						activeAlreadyDone.active = newpoint
						backupResult.addLastAction(VeeamBackupLastActionObject(0,"Force Created VBK (could not find for vib) /  SEQ 1x I/O Write / 1x "+ this.humanReadableFilesize(backupConfiguration.getFullSize())))
						
					}
					else
					{
						//if the previous point was a vbk, this point his parent will be the previous point
						//if it was an increment, we should connect it to the parent of the increment
						if(latest.isVBK())
						{
							newpoint = VeeamBackupFileObject("incremental.vib",latest,"I",backupConfiguration.getIncrementalSize(),exectime.clone(),exectime.clone())
							//this.debugln("parent link "+newpoint.parent,1)
						}
						else
						{
							newpoint = VeeamBackupFileObject("incremental.vib",latest.parent,"I",backupConfiguration.getIncrementalSize(),exectime.clone(),exectime.clone())
							//this.debugln("peer link "+newpoint.parent,1)
						}
						backupResult.addLastAction(VeeamBackupLastActionObject(0,"Created VIB /  SEQ 1x I/O Write / 1x  "+ this.humanReadableFilesize(backupConfiguration.getIncrementalSize())))
					}
					backupResult.retentionPush(newpoint)
	
					//if we don't have any active or synthetics, execute transform
					if(dotransform)
					{
						this.mergeNewestVBK(backupResult,backupConfiguration,exectime.clone())
					}
					else
					{
						//check if we need to do synthetic
						if(activeAlreadyDone.active.isnull() && activeAlreadyDone.synthetic.isnull() &&  this.testSyntheticFull(exectime.clone(),backupConfiguration))
						{
							backupResult.addLastAction(VeeamBackupLastActionObject(0,"Synthetic VBK /  RAND 2x I/O Write / 2x "+ this.humanReadableFilesize(backupConfiguration.getFullSize())))
							
							var popInc = backupResult.retentionPop()
							var synth = VeeamBackupFileObject("full.vbk",VeeamBackupFileNullObject(),"S",backupConfiguration.getFullSize(),exectime.clone(),popInc.pointDate.clone())
							backupResult.retentionPush(synth)
							
							popInc.modify = exectime.clone()
							backupResult.garbage.push(popInc)
						}
						//this.debugln(activeAlreadyDone.active.isnull() +" "+ activeAlreadyDone.synthetic.isnull() +" "+  this.testSyntheticFull(exectime.clone(),backupConfiguration),1)
					}
					this.doRecycle(backupResult,backupConfiguration,exectime.clone())
					
					//worst case verification
					this.worstCase(backupConfiguration,backupResult,exectime.clone())
					
					//work space update
					backupResult.workingSpace = this.workingSpaceBucketCalculation(backupConfiguration,backupResult,exectime)
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
						newpoint = VeeamBackupFileObject("full.vbk",VeeamBackupFileNullObject(),"F",backupConfiguration.getFullSize(),exectime.clone(),exectime.clone())
						activeAlreadyDone.active = newpoint
						
						backupResult.addLastAction(VeeamBackupLastActionObject(0,"Created VBK /  SEQ 1x I/O Write / 1x  "+ this.humanReadableFilesize(backupConfiguration.getFullSize())))
						
					}
					else 
					{
						//remove the working VBK
						
					
						if (backupResult.retentionLatest().isVBK())
						{
							newpoint = backupResult.retentionPop()
							//stack a reverse point with the pointDate of the VBK, then update the VBK to be the latest
							backupResult.retentionPush(VeeamBackupFileObject("reverse.vrb",newpoint,"R",backupConfiguration.getIncrementalSize(),exectime.clone(),newpoint.pointDate.clone()))
							newpoint.modifyDate = exectime.clone()
							newpoint.pointDate = exectime.clone()
							newpoint.type = "S"
							
							backupResult.addLastAction(VeeamBackupLastActionObject(0,"Created VRB /  RAND 3x I/O Read VBK, Write VRB, Update VBK / 3x "+ this.humanReadableFilesize(backupConfiguration.getIncrementalSize())))
						}
						else
						{
							//should not happen
							newpoint = VeeamBackupFileObject("full.vbk",VeeamBackupFileNullObject(),"F",backupConfiguration.getFullSize(),exectime.clone(),exectime.clone())
						}
					}
					backupResult.retentionPush(newpoint)
					
					this.doRecycle(backupResult,backupConfiguration,exectime.clone())
					
					//worst case verification
					this.worstCase(backupConfiguration,backupResult,exectime.clone())
					
					//work space update
					backupResult.workingSpace = this.workingSpaceBucketCalculation(backupConfiguration,backupResult,exectime)
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
						
						newpoint = VeeamBackupFileObject("incremental.vib",VeeamBackupFileNullObject(),"I",backupConfiguration.getIncrementalSize(),exectime.clone(),exectime.clone())
						if ($.inArray(latest.type,["F","S","I"]) == -1)
						{
							backupResult.addLastAction(VeeamBackupLastActionObject(0,"Force Created VBK (could not find for vib) /  SEQ 1x I/O Write / 1x "+ this.humanReadableFilesize(backupConfiguration.getFullSize())))
							newpoint = VeeamBackupFileObject("full.vbk",VeeamBackupFileNullObject(),"F",backupConfiguration.getFullSize(),exectime.clone(),exectime.clone())
						}
						else
						{
							backupResult.addLastAction(VeeamBackupLastActionObject(0,"Created VIB /  SEQ 1x I/O Write / 1x  "+ this.humanReadableFilesize(backupConfiguration.getIncrementalSize())))
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
						}
						
						
						backupResult.retentionPush(newpoint)
						
						
						if(this.flags.lateFlagging)
						{
							var ret = backupResult.retention
							if(ret.length > 2 && ret.length > backupConfiguration.simplePoints )
							{
								this.markforGFS(backupConfiguration,exectime.clone(),ret[0],ret[1])
							}
						}
						else
						{
							this.markforGFS(backupConfiguration,exectime.clone(),latest,newpoint)
						}
						this.mergeNewestVBK(backupResult,backupConfiguration,exectime.clone())
						this.doRecycle(backupResult,backupConfiguration,exectime.clone())
						
						//worst case verification
						this.worstCase(backupConfiguration,backupResult,exectime.clone())
						
						//work space update
						backupResult.workingSpace = this.workingSpaceBucketCalculation(backupConfiguration,backupResult,exectime)
						
				}
			}
		}
		else
		{
			this.debugln("unsupported main style "+backupConfiguration.style,1)
		}
		return backupResult
	}
	
	return PureEngineObj
}


