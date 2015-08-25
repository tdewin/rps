$ = { 	
	inArray: function( elem, arr, i ) {
		return arr == null ? -1 : arr.indexOf(elem, i );
	},
	
	each: function( obj, callback, args ) {
		var value,
			i = 0,
			length = obj.length;

		for ( ; i < length; i++ ) {
			value = callback.call( obj[ i ], i, obj[ i ] );

			if ( value === false ) {
				break;
			}
		}
			

		return obj;
	},
	unique: function(array) {
		var newArray = []
		var value;

		for (var i=0 ; i < array.length; i++ ) {
			value = array[i]
			var duplicate = false
			for(var o=0; o < newArray.length && !duplicate;o++)
			{
					if(newArray[o] == value) { duplicate = true }
			}
			if(!duplicate)
			{
					newArray.push(value)
			}
		}
		return newArray
	}
}
