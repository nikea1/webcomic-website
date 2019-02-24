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
	var pageData = fs.readdirSync(rootDir+'/'+chDirName+'/'+pgDirName);
	
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

	var dir = fileListFilter(rootDir, /0*\d+(-\w+)+/g); //list of chapters
	var iod = (directFlag ? 1 : -1); //increment or decrement
	var nav1;
	var nav2;
	var gotAdj = false;
	var start;
	var start2;
	var out = {
		chapters:[],
		pages:[],
		links:[],
	}

	if(directFlag){
		nav1 = navEnum.NEXT;
		nav2 = navEnum.LAST;
	}
	else{
		nav1 = navEnum.PREV;
		nav2 = navEnum.FIRST;
	}

	if(haveCurrent){
		var r = new RegExp("0*"+payload.currentCh+"(-\\w+)+")
		var found = r.exec(dir.toString());
		start = dir.indexOf(found[0]);
	}
	else{
		start = directFlag ? 0 : dir.length-1;
	}

	var files = fileListFilter(rootDir+'/'+dir[start], /0*\d+/ );

	if(haveCurrent){
		var r = new RegExp("0*"+payload.currentPg)
		var found = r.exec(files.toString());
		//console.log("Found:",found);
		start2 = files.indexOf(found[0])+iod;
	}
	else{
		start2 = directFlag ? 0 : files.length-1;
	}

	//console.log("Starting get function 2");
	//console.log("start: "+start+ " start2: "+start2+" directFlag "+ directFlag)

	for(let i = start; pickABool(directFlag, (i < dir.length), (i >= 0)); i+=iod){
		if(directFlag)
			out.chapters.push(dir[i]);
		else
			out.chapters.unshift(dir[i]);
		pages = (haveCurrent && !directFlag && i == start) ? [payload.currentPg.toString()] : [];
		links = (haveCurrent && !directFlag && i == start) ? ["/"+payload.currentCh+"/"+payload.currentPg] : [];
		files = fileListFilter(rootDir+'/'+dir[i], /0*\d+/ );
		for(let j = (i == start) ? start2 : (directFlag ? 0 : files.length-1); pickABool(directFlag, (j < files.length), (j >= 0 )); j+=iod){
			if(!haveCurrent){
				haveCurrent = getData('./comics', dir[i], files[j], payload);
			}
			else if(!gotAdj){
				gotAdj = checkData(nav1,'./comics', dir[i], files[j], payload);
			}
			checkData(nav2, './comics', dir[i], files[j], payload);
			
			if(directFlag){
				pages.push(files[j]);
				links.push("/"+dir[i].slice(0, dir[i].indexOf("-"))+"/"+files[j]);
			}
			else{
				pages.unshift(files[j]);
				links.unshift("/"+dir[i].slice(0, dir[i].indexOf("-"))+"/"+files[j]);
			}
		}//loop through pages
		if(directFlag){
			out.pages.push(pages);
			out.links.push(links);
		}
		else{
			out.pages.unshift(pages);
			out.links.unshift(links);
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
	menu: {
		chapters:[],
		pages:[],
		links:[]
	},
	errmsg: null
	}

	if(!fs.existsSync('./comics')){
		//error 500
		payload.errmsg = "500 error: Whoops looks like we messed up back here. Either the author didn't upload anything yet or something went horribly wrong. Either way lets us know and we'll try to fix it. Untill then check back later."
		return res.send(payload);
	}
	var chDir	= fileListFilter('./comics', /0*\d(-\w+)+/);
	if(!chDir.length){
		payload.errmsg = "500 error: Whoops looks like we messed up back here. Either the author didn't upload anything yet or something went horribly wrong. Either way lets us know and we'll try to fix it. Untill then check back later."	
		return res.send(payload);
	}
	
	var out = findContent('./comics', false, payload);

	//console.log(out);
	payload.menu = out;

	if(!payload.img){
		payload.errmsg = "500 error: Whoops looks like we messed up back here. Either the author didn't upload anything yet or something went horribly wrong. Either way lets us know and we'll try to fix it. Untill then check back later."	
		return res.send(payload);
	}
	
	//send payload
	//return res.view('./public/index.html', payload);
	return res.send(payload);
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
	menu: {
		chapters:[],
		pages:[],
		links:[]
	},
	errmsg: null
	}
	
	var chExp = new RegExp('0*'+(req.params.ch)+'(-\\w+)+');
	var pgExp = new RegExp('0*'+req.params.pg);
	var files;
	var dir;
	var gotCurrent = false;

	
	if(!fs.existsSync('./comics')){
		//error 500
		payload.errmsg = "500 error: Whoops looks like we messed up back here. Either the author didn't upload anything yet or something went horribly wrong. Either way lets us know and we'll try to fix it. Untill then check back later."
		return res.send(payload);
	}

	dir = fileListFilter('./comics',  chExp); //1 chapter
	
	//if chapter file not found return error 400
	if(!dir.length){
		payload.errmsg = "400 error: Bad request."
		return res.send(payload);
	}

	files = fileListFilter('./comics/'+dir[0], pgExp);

	//if page file not found return error 400
	if(!files.length){
		payload.errmsg = "400 error: Bad request."
		return res.send(payload);
	}

	gotCurrent = getData('./comics', dir[0], files[0], payload);

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

	Promise.all([upperPromise, lowerPromise]).then((values) => {
		//console.log(values);

		//console.log("values[0]", values[0]);
		//console.log("values[1]", values[1]);
		var list, list2;

		values[1].chapters.pop();
		
		list = values[1].pages.pop();
		list2 = values[0].pages.shift();
		list = list.concat(list2);
		values[1].pages.push(list);
		
		//console.log(list)
		
		list = values[1].links.pop();
		list2 = values[0].links.shift();
		list = list.concat(list2);
		values[1].links.push(list);

		//console.log(list)
		payload.menu.chapters = values[1].chapters.concat(values[0].chapters);
		payload.menu.pages = values[1].pages.concat(values[0].pages);
		payload.menu.links = values[1].links.concat(values[0].links);	
	}).catch((values)=>{
		console.log("error?", values);
		payload.errmsg = "500 error: Whoops looks like we messed up back here. Either the author didn't upload anything yet or something went horribly wrong. Either way lets us know and we'll try to fix it. Untill then check back later."	
	}).finally(() =>{
		return res.send(payload);
	})	
})

fastify.listen(PORT, (err, address) => {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
	fastify.log.info(`server listening on ${address}`)
})