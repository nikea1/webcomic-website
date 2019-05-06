//take in list of chapters or pages
//test data
var list1 = [];
var list2 = [];

for(var i = 0; i < 9; i++){
	
	list1[i] = '0'.concat((i+1).toString());
	
}
list1.push('10');
list1.push('100');
// list1.push('11');
// list1.push('101');
list1.sort();
//console.log(list1);

//--------------------------------
function prependZeroes(list){
	if(!list || list.length < 1)
		return;
	var zeroes=[];
	var max = -1;
	var out = list.slice();
	//if Chapter
	
	//generate list of digits
	for(let i = 0; i < out.length; i++){
		//if count until first '-' or if isanumber number of digits
		//store values in array and record max
		zeroes[i] = (isNaN(out[0])) ? out[i].indexOf('-') : out[i].length
		if(zeroes[i] > max)
			max = zeroes[i];
	}
		
	for(let i = 0; i < out.length; i++){
	//for each index subtract max from value in each index. That is the number of zeroes for each file
		for(let j = 0; j < (max - zeroes[i]); j++){
			//prepend zeroes based on count array
			out[i] = '0'.concat(out[i]);
		}
		
	}

	return out;

}
//console.log("done", prependZeroes(list1).sort());
module.exports = prependZeroes;

	
	
	
