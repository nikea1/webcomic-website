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
		payload.title = temp[0].slice(temp[0].indexOf("-")+1, temp[0].length-4);
	}else{
		//get titlt from chapter folder
		payload.title = chDirName.slice(chDirName.indexOf("-")+1);
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

function findContent(rootDir, directFlag, payload, nav){
	if(!fs.existsSync(rootDir)){
		console.log("File path does not exist");
		return false
	}
	var cnt;
	var fcnt;
	var flag = false;
	var dir = fileListFilter(rootDir, /0*\d+(-\w+)+/g); //list of chapters
	var iod = (directFlag ? 1 : -1); //increment or decrement
	
	//If were are looking for content before or after current content
	if((nav==navEnum.NEXT) || (nav==navEnum.PREV)){
		//find name of current content folder
		var r = new RegExp("0*"+payload.currentCh+"(-\\w+)+")
		var found = r.exec(dir.toString());
		//get location
		console.log(dir.toString());
		console.log(payload);
		console.log(found)
		cnt = dir.indexOf(found[0]);
		
	}
	else{
		//set cnt based on looping direction
		cnt = ((directFlag) ?  0 : (dir.length-1) );
	}
	
	//retrieve list of pages
	if(!fs.existsSync(rootDir+'/'+dir[cnt])){
		return false;
	}
	var files = fileListFilter(rootDir+'/'+dir[cnt], /0*\d+/);
	
	//If were are looking for content before or after current content
	if((nav==navEnum.NEXT) || (nav==navEnum.PREV)){
		//find the next adjacent available content
		fcnt = files.indexOf((payload.currentPg).toString())+iod;	
	}
	else{
		//set fcnt based on looping direction
		fcnt = ((directFlag) ? 0 : (files.length-1));
	}

	//look through files for content
	while(pickABool(directFlag,(cnt < dir.length), (cnt >= 0))){
		while(pickABool(directFlag,(fcnt < files.length), (fcnt >= 0))){
			if(nav === undefined){
				//get content
				flag = getData(rootDir, dir[cnt], files[fcnt], payload);
			}else{
				flag = checkData(nav, rootDir, dir[cnt], files[fcnt], payload);
			}

			if(flag)
				return true

			fcnt+=iod;
		}
		cnt+=iod;

		
		if(fs.existsSync(rootDir+'/'+dir[cnt])){
			files = fileListFilter(rootDir+'/'+dir[cnt]);
			fcnt = ((directFlag) ? 0 : (files.length-1));
		}
	}

	return flag;
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
	errmsg: null
	}
	
	var gotCurrent = false;
	var gotPrev = false;
	var gotFirst = false;
	
	console.log("Content")
	//gets the most resent Content from the comics folder
	gotCurrent = findContent('./comics', false, payload);
	
	//check if content was found
	if(!gotCurrent){
		//if no content error 500 No images to display
		payload.errmsg = "500 error: Whoops looks like we messed up back here. Either the author didn't upload anything yet or something went horribly wrong. Either way lets us know and we'll try to fix it. Untill then check back later."	
		return res.send(payload);
	}
	
	//if most resent content found check for content for previous link
	gotPrev = findContent('./comics',false, payload, navEnum.PREV);

	//if previous found find first page
	if(gotPrev){
		console.log("First")
		//find content for first link
		gotFirst = findContent('./comics', true, payload, navEnum.FIRST);
	}
	
	//send payload
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
	errmsg: null
	}
	
	var chExp = new RegExp('0*'+(req.params.ch)+'(-\\w+)+');
	var pgExp = new RegExp('0*'+req.params.pg);
	var files;
	var dir;
	var gotCurrent = false;
	var gotPrev = false;
	var gotNext = false;
	var gotLast = false;
	var gotFirst = false;
	

	dir = fileListFilter('./comics',  chExp); //list of chapters
	
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

	//find next link if exist
	gotNext = findContent('./comics', true, payload, navEnum.NEXT);
			
	//find previous link if exists
	gotPrev = findContent('./comics', false, payload, navEnum.PREV);

	//get last link if exist
	if(gotNext){
		
		gotLast = findContent('./comics', false, payload, navEnum.LAST);
	}
	
	//get first link if exist
	if(gotPrev){
		
		gotFirst = findContent('./comics', true, payload, navEnum.FIRST);
	}
	
	return res.send(payload);	
})

fastify.get('/menu', (req, res) => {
	payload = {
		chapters: null,
		pages:[],
		links:[]
	}

	var dir = fileListFilter('./comics', /0*\d+(-\w+)+/g);

	if(!dir.length){
		return null;
	}

	//list of chapter number and titles
	payload.chapters = dir;
	
	dir.forEach((chapter) => {
		var p = fileListFilter('./comics/'+chapter, /0*\d+/g)
		var ch = parseInt(chapter.slice(0, chapter.indexOf("-")));
		var links = [];
		//list of pages
		payload.pages.push(p);
		
		p.forEach((page)=>{
			links.push('/'+ch+'/'+page);
		})
		//list of links
		payload.links.push(links);
	})
	
	return res.send(payload);
})

fastify.listen(PORT, (err, address) => {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
	fastify.log.info(`server listening on ${address}`)
})