const fs = require('fs');
const path = require('path');
var navEnum = {
	FIRST:0,
	PREV:1,
	NEXT:2,
	LAST:3
}
//Helper Functions
function pickABool(decider, bool1, bool2){
		return (decider) ? bool1 : bool2;
	}
function checkData(nav ,rootDir, chDirName, pgDirName, payload){

		var myPath = path.resolve(rootDir, chDirName, pgDirName);
		if(!fs.existsSync(myPath)){
			console.log("path "+ myPath + " does not exist.");
			return false;
		}
		var flag = false;
		var link = '/'+parseInt(chDirName.slice(0, chDirName.indexOf("-")))+"/"+pgDirName;
		var pageData = fs.readdirSync(myPath);
		
		//chacks if page has an image
		pageData.forEach((data) => {
			if(data.match(/.+\.(png|bmp|jpg)/)){

				switch(nav){
					case navEnum.PREV:
						payload.prev  = link;
						flag = true;
						break;
					case navEnum.FIRST:
						payload.first = link;
						flag = true;
						break;
					case navEnum.NEXT:
						payload.next  = link;
						flag = true;
						break;
					case navEnum.LAST:
						payload.last  = link;
						flag = true;
						break;
				}
			}
		})
		return flag;
	}

function sortChapter(a,b){
	var aLoc = a.indexOf('-');
	var bLoc = b.indexOf('-');
	var aNum = parseInt(a.slice(0, aLoc));
	var bNum = parseInt(b.slice(0, bLoc));
	return aNum - bNum;
}

function sortPage(a,b){
	return parseInt(a) - parseInt(b);
}

module.exports = {
	newPayload:function(){
		return {
		currentCh: null,
		currentPg: null,
		is4koma: false,
		title: null,
		img: null,
		alt: null,
		date: null,
		note: null,
		last: null,
		next: null,
		prev: null,
		first: null,
		menu: [],
		
		}
	},

	fileListFilter:function (filepath, pattern){
		if(!fs.existsSync(filepath)){
			console.log("File path does not exist");
			return null;
		}
		var out = fs.readdirSync(filepath);
		//console.log("out ", out);
		return out.filter((e) => {
			//console.log("out2", e);
			return null != e.match(pattern);
		})
	},

	getData:function(rootDir, chDirName, pgDirName, payload){
		//set temp array
		var temp = [null, null, null, null];

		//get data from page folders
		var myPath = path.resolve(rootDir, chDirName, pgDirName);
		if(!fs.existsSync(myPath)){
			console.log("File path does not exist.");
			return false;
		}
		var pageData = fs.readdirSync(myPath);

		pageData.forEach((data) => {
			//find png, jpg, or bmp image
			if(data.match(/.+\.(png|jpg|bmp)/)){
				temp[0] = data;
			}
			else if(data.match(/alt\.txt/)){
				temp[1] = data;
			}
			else if(data.match(/note\.txt/)){
				temp[2] = data;
			}
			else if(data.match(/date\.txt/)){
				temp[3] = data;
			}
		})
		
		//check image exist
		if(!temp[0]){
			return false;
		}
		
		//load image into payload				
		payload.img = temp[0];
		
		//check if image is 4koma
		if(temp[0].match(/4koma(-\w+)+/)){

			//mark flag get title from image name
			payload.is4koma = true;
			payload.title = temp[0].slice(temp[0].indexOf("-")+1, temp[0].length-4).replace(/-/g, " ");
		}else{
			//get titlt from chapter folder
			payload.title = chDirName.slice(chDirName.indexOf("-")+1).replace(/-/g, " ");
		}
		
		// there is user defined alternate text
		if(temp[1]){
			//load data from text file to payload
			payload.alt = fs.readFileSync(path.resolve(myPath, 'alt.txt'),'utf8');
		}
		else{
			//generate default alternate text
			payload.alt = "Chapter "+parseInt(chDirName.slice(0, chDirName.indexOf("-")))+" Page "+parseInt(pgDirName);
		}

		//is there an authors note/news
		if(temp[2]){
			payload.note = fs.readFileSync(path.resolve(myPath,'note.txt'),'utf8');
		}

		//is there a user defined date
		if(temp[3]){
			payload.date = fs.readFileSync(path.resolve(myPath,'date.txt'),'utf8');
		}
		else{
			//Generate default Date based on file creation date
			var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
			//retreieves file creation time
			var d = new Date(fs.statSync(path.resolve(myPath,temp[0])).ctimeMs);
			
			//ordinal number enders
			var end;
			switch(d.getDate()){
				case 1:
				case 21:
				case 31:
					end = "st";
					break;
				case 2:
				case 22:
					end = "nd";
					break;
				case 3:
				case 23:
					end = "rd";
					break;
				default:
					end = "th";
					break;
			}
			payload.date = months[d.getMonth()]+" "+d.getDate()+end+", "+d.getFullYear()
		}
		//get current chapter and page number
		payload.currentCh = parseInt(chDirName.slice(0, chDirName.indexOf("-")));
		payload.currentPg = parseInt(pgDirName);
		return true
	},

	findContent:function(rootDir, directFlag, payload, haveCurrent=false){
		if(!fs.existsSync(rootDir)){
			console.log("File path does not exist");
			return null;
		}

		var chDir = this.fileListFilter(rootDir, /0*\d+(-\w+)+/g); //list of chapters
		var iod = (directFlag ? 1 : -1); //increment or decrement
		var nav1;
		var nav2;
		var gotAdj = false;
		var start;
		var start2;
		var out = []

		//sort Chapter
		chDir.sort(sortChapter);
		//set enum values based on direction of loop
		if(directFlag){
			nav1 = navEnum.NEXT;
			nav2 = navEnum.LAST;
		}
		else{
			nav1 = navEnum.PREV;
			nav2 = navEnum.FIRST;
		}

		//determine start value of outter loop
		if(haveCurrent){
			var r = new RegExp("0*"+payload.currentCh+"(-\\w+)+")
			var found = r.exec(chDir.toString());
			start = chDir.indexOf(found[0]);
		}
		else{
			start = directFlag ? 0 : chDir.length-1;
		}
		//get list of pages
		var pgDir = this.fileListFilter(path.resolve(rootDir,chDir[start]), /0*\d+/ );
		pgDir.sort(sortPage);
		//determine star value of inner loop
		if(haveCurrent){
			var r = new RegExp("0*"+payload.currentPg)
			var found = r.exec(pgDir.toString());
			//console.log("Found:",found);
			start2 = pgDir.indexOf(found[0])+iod;
		}
		else{
			start2 = directFlag ? 0 : pgDir.length-1;
		}

		for(let i = start ; pickABool(directFlag, (i < chDir.length), (i >= 0)); i+=iod){
			//initalizes list for inner loop set list to current page and link if loop is decrimenting and we have a current page
			var list = (i == start && haveCurrent && !directFlag) ? [{page:parseInt(payload.currentPg), link:"/"+parseInt(payload.currentCh)+"/"+parseInt(payload.currentPg)}]:[];
			//get list of pages to loop through
			pgDir = this.fileListFilter(path.resolve(rootDir,chDir[i]), /0*\d+/ );
			pgDir.sort(sortPage);
			for(let j = (i == start) ? start2 : (directFlag ? 0 : pgDir.length-1); pickABool(directFlag, (j < pgDir.length), (j >= 0 )); j+=iod){
				//if we don't have data on current page lets det that data
				if(!haveCurrent){
					haveCurrent = this.getData('./comics', chDir[i], pgDir[j], payload);
				}
				//if we already have data on current page and we don't have data on adjacent links lets check if data is available
				//and mark link if it is available
				else if(!gotAdj){
					gotAdj = checkData(nav1,'./comics', chDir[i], pgDir[j], payload);
				}
				//seaches for ending links
				checkData(nav2, './comics', chDir[i], pgDir[j], payload);
				
				//load page data into list  
				if(directFlag){
					
					list.push({page:parseInt(pgDir[j]), link:"/"+parseInt(chDir[i].slice(0, chDir[i].indexOf("-")))+"/"+parseInt(pgDir[j])})
				}
				else{
					
					list.unshift({page:parseInt(pgDir[j]), link:"/"+parseInt(chDir[i].slice(0, chDir[i].indexOf("-")))+"/"+parseInt(pgDir[j])});
				}
			}//loop through pages
			var array = chDir[i].split('-');
			array[0] = parseInt(array[0]);
			var strTemp = array.join(' ');
			//load Chapter and page list into object
			if(directFlag){
				
				//out.push({title: chDir[i].replace(/-/g, " "), pages: list});
				out.push({title: strTemp, pages: list});
			}
			else{
				
				//out.unshift({title: chDir[i].replace(/-/g, " "), pages: list});
				out.unshift({title: strTemp, pages: list});
			}
		}// loop through chapters

		return out;
	},
}
//End of Helper functions