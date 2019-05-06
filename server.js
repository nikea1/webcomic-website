const fastify = require('fastify')({logger:true});
const fs = require('fs');
const path = require('path');
const helper = require('./public/js/helperFunctions.js');

var PORT = process.env.PORT || 3000 || 8080;

fastify.register(require('point-of-view'), {
	engine:{
		handlebars: require('handlebars')
	}
});

fastify.register(require('fastify-static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/public/', // optional: default '/'
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
	note: null,
	last: null,
	next: null,
	prev: null,
	first: null,
	menu: [],
	
	}
	//root does not exist send error
	if(!fs.existsSync('./comics')){
		//error 500
		//payload.errmsg = "500 error: Whoops looks like we messed up back here. Either the author didn't upload anything yet or something went horribly wrong. Either way lets us know and we'll try to fix it. Untill then check back later."
		return res.code(500).send({message: "Misplaced Content on the server. Contact Author and try again later"});
	}
	//get list of chapters
	// var chDir	= fileListFilter('./comics', /0*\d(-\w+)+/);
	var chDir = helper.fileListFilter('./comics', /0*\d(-\w+)+/)
	
	//if list is 0 send error
	if(!chDir.length){
		//payload.errmsg = "500 error: Whoops looks like we messed up back here. Either the author didn't upload anything yet or something went horribly wrong. Either way lets us know and we'll try to fix it. Untill then check back later."	
		return res.code(500).send({message: "No chapters available on the server. Contact Author and try again later."});
	}
	
	//collect data
	// payload.menu = findContent('./comics', false, payload);
	payload.menu = helper.findContent('./comics', false, payload);;

	//if we could not find an image return error
	if(!payload.img){
		//payload.errmsg = "500 error: Whoops looks like we messed up back here. Either the author didn't upload anything yet or something went horribly wrong. Either way lets us know and we'll try to fix it. Untill then check back later."	
		return res.code(500).send({message: "Content is missing on the server. Contact Author and try again later."});
		//return res.send(payload);
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
	note: null,
	last: null,
	next: null,
	prev: null,
	first: null,
	menu: [],
	
	}
	
	var chExp = new RegExp('0*'+(req.params.ch)+'(-\\w+)+');
	var pgExp = new RegExp('0*'+req.params.pg);
	var pgDir;
	var chDir;
	var gotCurrent = false;

	//make sure root exists otherwise send error
	if(!fs.existsSync('./comics')){
		//error 500
		//payload.errmsg = "500 error: Whoops looks like we messed up back here. Either the author didn't upload anything yet or something went horribly wrong. Either way lets us know and we'll try to fix it. Untill then check back later."
		//return res.send(payload);
		return res.code(500).send({message: "Misplaced Content on the server. Contact Author and try again later"});
	}
	//get list of chapters
	// chDir = fileListFilter('./comics',  chExp); //1 chapter
	chDir = helper.fileListFilter('./comics',  chExp); //1 chapter
	//if chapter file not found return error 400
	if(!chDir.length){
		//payload.errmsg = "400 error: Bad request."
		//return res.send(payload);
		return res.code(400).send({message: "Bad Request. Check URL for any misspellings."});
	}
	//get list of pages
	// pgDir = fileListFilter('./comics/'+chDir[0], pgExp);
	pgDir = helper.fileListFilter('./comics/'+chDir[0], pgExp);

	//if page file not found return error 400
	if(!pgDir.length){
		//payload.errmsg = "400 error: Bad request."
		//return res.send(payload);
		return res.code(400).send({message: "Bad Request. Check URL for any misspellings."});
	}
	//get data
	// gotCurrent = getData('./comics', chDir[0], pgDir[0], payload);
	gotCurrent = helper.getData('./comics', chDir[0], pgDir[0], payload);

	//if no image found return error
	if(!gotCurrent){
		//error 500
		//payload.errmsg = "500 error: Whoops looks like we messed up back here. Either the author didn't upload anything yet or something went horribly wrong. Either way lets us know and we'll try to fix it. Untill then check back later."
		//return res.send(payload);
		return res.code(500).send({message: "Content is missing on the server. Contact Author and try again later."});
	}
	//navigation and menu

	var upperPromise = new Promise((resolve, reject) => {
		
		// var out = findContent('./comics', true, payload, gotCurrent);
		var out = helper.findContent('./comics', true, payload, gotCurrent);
		if(!out){
			reject("./comics Directory Does not exist.");
		}
		resolve(out);
	})
	
	var lowerPromise = new Promise((resolve, reject) => {
		// var out =  findContent('./comics', false, payload, gotCurrent);
		var out =  helper.findContent('./comics', false, payload, gotCurrent);
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
		
		// return res.send(payload);
		return res.view('./public/index.html', payload);
	}).catch((values)=>{
		//report error when some goes wrong
		console.log("error?", values);
		//payload.errmsg = "Promises were not kept. Contact Author and try again later."
		return res.code(500).send({message: values});	
	})	
})

// Declare a route
fastify.get('/about', (request, reply) => {
  reply.sendFile('about.html')
})

fastify.listen(PORT, (err, address) => {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
	fastify.log.info(`server listening on ${address}`)
})