# 0.3.3:
- Active Full on GFS support (v9) feature
- Experimental Canvas rendering. Generates and image that can be used in word documents so that you do not need to take screenshots. In Firefox and Chrome you can uses the download link (unsupported HTML download attribute). For other browsers, you should be able to right click the images and select save as
- Export URL: Generate an URL that you can use to reinput your current result. URL gets updated every time you click "simulate"
- Moved simulate button so it makes more "sense"
- Advanced feature to simulate with custom dates, append ?reversesim to URL to open up console and modify. Watch out, MomentJS (framework used for time calculations) is very strict about leading zero's!
- Advanced feature to show the latest result of the simulation instead of worst case scenario. Should be useful with ?reversesim and automatically set to 1 in this case
- Advanced feature to show "real file names", append ?dev and set real name to 1
- Minor GFS fixes

# 0.3.2b:
- Input validation RPs: You can now input 7d (7days), 2w (2weeks), 2q (2quarters) or 1y (1year). Will also take into account the selected interval.

# 0.3.2:
- Bandwidth help : click on the files size to get the number in bit vs bytes and over certain bandwidth periods
- Summary table : click on the total size to get a summary of the "sizing"
- Input validation GB: validate if numbers are being used for GB. Also allows you to specify <x>TB or <x>pb. For example, if you give 10tb as input, it will be transformed to 102400GB

# 0.3.1 :
- Added space growth
- Updated GUI for easier input
- Added possibility to see compressed throughput speed on repository by clicking the data size

# 0.3.0 :
- Renewed merging engine, should mimic more how the production engine works (based on documentation)

# 0.2.9 :
- Easing function for working space also works for manual mode

# 0.2.8 :
- Easing function for working space

# 0.2.7 : 
- Added open source reference
- Added css style to all items for more unified view
- Added explanation for events in engine, needs gui
- Changed the default change rate to 10%