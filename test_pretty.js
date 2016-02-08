if (typeof exports === 'object')
{
	module.exports = logc
}

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

