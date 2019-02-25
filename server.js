const fastify = require('fastify')({logger:true});
const fs = require('fs')

var PORT = process.env.PORT || 8080
var navEnum = {
	FIRST:0,
	PREV:1,
	NEXT:2,
	LAST:3
}

function pickABool(decider, bool1, bool2){
	return (decider) ? bool1 : bool2;
}

function fileListFilter(path, pattern){
	if(!fs.existsSync(path)){
		console.log("File path does not exist");
		return null;
	}
	var out = fs.readdirSync(path);
	//console.log("out ", out);
	return out.filter((e) => {
		//console.log("out2", e);
		return null != e.match(pattern);
	})
	return out;
}

function getData(rootDir, chDirName, pgDirName, payload){
	//set temp array
	var temp = [null, null, null, null];

	//get data from page folders
	var path = rootDir+'/'+chDirName+'/'+pgDirName
	if(!fs.existsSync(path)){
		console.log("File path does not exist.");
		return false
	}
	var pageData = fs.readdirSync(path);


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
		payload.alt = fs.readFileSync(path+'/alt.txt','utf8');
	}
	else{
		//generate default alternate text
		payload.alt = "Chapter "+parseInt(chDirName.slice(0, chDirName.indexOf("-")))+" Page "+parseInt(pgDirName);
	}

	//is there an authors note/news
	if(temp[2]){
		payload.note = fs.readFileSync(path+'/note.txt','utf8');
	}

	//is there a user defined date
	if(temp[3]){
		payload.date = fs.readFileSync(path+'/date.txt','utf8');
	}
	else{
		//Generate default Date based on file creation date
		var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
		//retreieves file creation time
		var d = new Date(fs.statSync(path+'/'+temp[0]).ctimeMs);
		
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
}

function checkData(nav ,rootDir, chDirName, pgDirName, payload){

	var path = rootDir+'/'+chDirName+'/'+pgDirName;
	if(!fs.existsSync(path)){
		console.log("path "+ path + " does not exist.");
		return false;
	}
	var flag = false;
	var link = '/'+parseInt(chDirName.slice(0, chDirName.indexOf("-")))+"/"+pgDirName;
	var pageData = fs.readdirSync(path);
	
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

function findContent(rootDir, directFlag, payload, haveCurrent=false){
	if(!fs.existsSync(rootDir)){
		console.log("File path does not exist");
		return null;
	}

	var chDir = fileListFilter(rootDir, /0*\d+(-\w+)+/g); //list of chapters
	var iod = (directFlag ? 1 : -1); //increment or decrement
	var nav1;
	var nav2;
	var gotAdj = false;
	var start;
	var start2;
	var out = []

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
	var pgDir = fileListFilter(rootDir+'/'+chDir[start], /0*\d+/ );

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
		var list = (i == start && haveCurrent && !directFlag) ? [{page:payload.currentPg.toString(), link:"/"+payload.currentCh+"/"+payload.currentPg}]:[];
		//get list of pages to loop through
		pgDir = fileListFilter(rootDir+'/'+chDir[i], /0*\d+/ );
		for(let j = (i == start) ? start2 : (directFlag ? 0 : pgDir.length-1); pickABool(directFlag, (j < pgDir.length), (j >= 0 )); j+=iod){
			//if we don't have data on current page lets det that data
			if(!haveCurrent){
				haveCurrent = getData('./comics', chDir[i], pgDir[j], payload);
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
				
				list.push({page:pgDir[j], link:"/"+chDir[i].slice(0, chDir[i].indexOf("-"))+"/"+pgDir[j]})
			}
			else{
				
				list.unshift({page:pgDir[j], link:"/"+chDir[i].slice(0, chDir[i].indexOf("-"))+"/"+pgDir[j]});
			}
		}//loop through pages

		//load Chapter and page list into object
		if(directFlag){
			
			out.push({title: chDir[i], pages: list});
		}
		else{
			
			out.unshift({title: chDir[i], pages: list});
		}
	}// loop through chapters

	return out;
}

fastify.register(require('point-of-view'), {
	engine:{
		handlebars: require('handlebars')
	}
})

fastify.get('/', (req, res) => {
	var payload = {
	currentCh: null,
	currentPg: null,
	is4koma: false,
	title: null,
	img: null,
	alt: null,
	date: null,
	notes: null,
	last: null,
	next: null,
	prev: null,
	first: null,
	menu: [],
	errmsg: null
	}
	//root does not exist send error
	if(!fs.existsSync('./comics')){
		//error 500
		payload.errmsg = "500 error: Whoops looks like we messed up back here. Either the author didn't upload anything yet or something went horribly wrong. Either way lets us know and we'll try to fix it. Untill then check back later."
		return res.send(payload);
	}
	//get list of chapters
	var chDir	= fileListFilter('./comics', /0*\d(-\w+)+/);
	//if list is 0 send error
	if(!chDir.length){
		payload.errmsg = "500 error: Whoops looks like we messed up back here. Either the author didn't upload anything yet or something went horribly wrong. Either way lets us know and we'll try to fix it. Untill then check back later."	
		return res.send(payload);
	}
	
	//collect data
	payload.menu = findContent('./comics', false, payload);;

	//if we could not find an image return error
	if(!payload.img){
		payload.errmsg = "500 error: Whoops looks like we messed up back here. Either the author didn't upload anything yet or something went horribly wrong. Either way lets us know and we'll try to fix it. Untill then check back later."	
		return res.send(payload);
	}
	
	return res.view('./public/index.html', payload);
	//return res.send(payload);
})

fastify.get('/:ch/:pg', (req, res) => {
	var payload = {
	currentCh: null,
	currentPg: null,
	is4koma: false,
	title: null,
	img: null,
	alt: null,
	date: null,
	notes: null,
	last: null,
	next: null,
	prev: null,
	first: null,
	menu: [],
	errmsg: null
	}
	
	var chExp = new RegExp('0*'+(req.params.ch)+'(-\\w+)+');
	var pgExp = new RegExp('0*'+req.params.pg);
	var pgDir;
	var chDir;
	var gotCurrent = false;

	//make sure root exists otherwise send error
	if(!fs.existsSync('./comics')){
		//error 500
		payload.errmsg = "500 error: Whoops looks like we messed up back here. Either the author didn't upload anything yet or something went horribly wrong. Either way lets us know and we'll try to fix it. Untill then check back later."
		return res.send(payload);
	}
	//get list of chapters
	chDir = fileListFilter('./comics',  chExp); //1 chapter
	
	//if chapter file not found return error 400
	if(!chDir.length){
		payload.errmsg = "400 error: Bad request."
		return res.send(payload);
	}
	//get list of pages
	pgDir = fileListFilter('./comics/'+chDir[0], pgExp);

	//if page file not found return error 400
	if(!pgDir.length){
		payload.errmsg = "400 error: Bad request."
		return res.send(payload);
	}
	//get data
	gotCurrent = getData('./comics', chDir[0], pgDir[0], payload);

	//if no image found return error
	if(!gotCurrent){
		//error 500
		payload.errmsg = "500 error: Whoops looks like we messed up back here. Either the author didn't upload anything yet or something went horribly wrong. Either way lets us know and we'll try to fix it. Untill then check back later."
		return res.send(payload);
	}
	//navigation and menu
	var upperPromise = new Promise((resolve, reject) => {
		
		var out = findContent('./comics', true, payload, gotCurrent);
		if(!out){
			reject("./comics Directory Does not exist.");
		}
		resolve(out);
	})
	
	var lowerPromise = new Promise((resolve, reject) => {
		var out =  findContent('./comics', false, payload, gotCurrent);
		if(!out){
			reject("./comics Directory Does not exist.");
		}
		resolve(out);
	})
	//divide and conquor
	Promise.all([lowerPromise, upperPromise ]).then((values) => {
		var upper = values[1];
		var lower = values[0];
		
		//get lower half of pages
		var list = lower[lower.length-1].pages;
		
		//shifts incomplete upper menu item out to get the upper half of pages list
		var list2 = upper.shift().pages;
		
		//combine pages list
		lower[lower.length-1].pages = list.concat(list2);
		
		//combine menu lists
		payload.menu = lower.concat(upper);
		
	}).catch((values)=>{
		//report error when some goes wrong
		console.log("error?", values);
		payload.errmsg = "500 error: Whoops looks like we messed up back here. Either the author didn't upload anything yet or something went horribly wrong. Either way lets us know and we'll try to fix it. Untill then check back later."	
	}).finally(() =>{
		
		return res.view('./public/index.html', payload);
	})	
})

fastify.listen(PORT, (err, address) => {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
	fastify.log.info(`server listening on ${address}`)
})