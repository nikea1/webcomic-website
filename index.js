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

var contentRoot = path.join('public','comics');


fastify.get('/', (req, res) => {

	var payload = helper.newPayload();
	//root does not exist send error

	if(!fs.existsSync(contentRoot)){
		//error 500
		return res.code(500).send({message: "Misplaced Content on the server. Contact Author and try again later"});
	}
	//get list of chapters
	var chDir = helper.fileListFilter(contentRoot, /0*\d(-\w+)+/)
	
	//if list is 0 send error
	if(!chDir.length){
		return res.code(500).send({message: "No chapters available on the server. Contact Author and try again later."});
	}
	
	//collect data return a menu list
	payload.menu = helper.findContent(contentRoot, false, payload);;

	//if we could not find an image return error
	if(!payload.img){
		return res.code(500).send({message: "Content is missing on the server. Contact Author and try again later."});
	}
	
	return res.view(path.join('public', 'index.html'), payload);
})

fastify.get('/:ch/:pg', (req, res) => {
	
	var payload = helper.newPayload();
	var chExp = new RegExp('0*'+(req.params.ch)+'(-\\w+)+');
	var pgExp = new RegExp('0*'+req.params.pg);
	var pgDir;
	var chDir;
	var gotCurrent = false;

	//make sure root exists otherwise send error
	if(!fs.existsSync(contentRoot)){
		//error 500
		return res.code(500).send({message: "Misplaced Content on the server. Contact Author and try again later"});
	}
	//get list of chapters
	chDir = helper.fileListFilter(contentRoot,  chExp); //1 chapter
	//if chapter file not found return error 400
	if(!chDir.length){
		return res.code(400).send({message: "Bad Request. Check URL for any misspellings."});
	}
	//get list of pages
	pgDir = helper.fileListFilter(path.resolve(contentRoot, chDir[0]), pgExp);

	//if page file not found return error 400
	if(!pgDir.length){
		return res.code(400).send({message: "Bad Request. Check URL for any misspellings."});
	}
	//get data
	gotCurrent = helper.getData(contentRoot, chDir[0], pgDir[0], payload);

	//if no image found return error
	if(!gotCurrent){
		//error 500
		return res.code(500).send({message: "Content is missing on the server. Contact Author and try again later."});
	}
	//navigation and menu

	var upperPromise = new Promise((resolve, reject) => {
		
		var out = helper.findContent(contentRoot, true, payload, gotCurrent);
		if(!out){
			reject("./comics Directory Does not exist.");
		}
		resolve(out);
	})
	
	var lowerPromise = new Promise((resolve, reject) => {
		var out =  helper.findContent(contentRoot, false, payload, gotCurrent);
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
		return res.view(path.join('public', 'index.html'), payload);
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