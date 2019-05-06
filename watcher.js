const fs = require('fs');
const watch = require('watch');
const prependZeroes = require('./prependZeroes.js')

//file watcher

//checks if new file directory and page directory is in order
//watches for change in directory
watch.createMonitor('./comics', {ignoreDotFiles: true}, (monitor) => {

	monitor.on('created', (file, stat) => {
		console.log(file + " was created");
		
		var fileDir = file.split('/');
		console.log(fileDir);

		while(fileDir.length > 3) fileDir.pop();

		//PAGES DIRECTORY
		if(fileDir.length == 3){
			var searchDir = fs.readdirSync('./'+fileDir[0]+'/'+fileDir[1]);
			var pageLoc;
			
			searchDir.filter((page, i)=>{
				if(page == fileDir[2])
					pageLoc = i;
				return null != page.match(/0*\d+/)
			})
			
			console.log('searchDir', searchDir);
			console.log('searchDir len',searchDir.length);
			console.log('len half', Math.floor(searchDir.length/2));
			var temp = null;
			var newPage = null;
			var x = fileDir[2].length;
			var y = searchDir[Math.floor(searchDir.length/2)].length;

			//if the list has more digits only the file name will be edited
			if(y > x){
				//append incoming file
				newPage = fileDir[2].toString();
				var d = y - x;
				
				for(let i = 0; i < d; i++){

					newPage = '0'.concat(newPage);
					
				}

				console.log('updated', newPage)
				try{

					//check if the page file alrady exists
					fs.accessSync('./'+fileDir[0]+'/'+fileDir[1]+'/'+newPage);
					console.log('file exists');
					var listOfData = fs.readdirSync('./'+fileDir[0]+'/'+fileDir[1]+'/'+fileDir[2]);
					listOfData.forEach((data)=>{
						//move and overwrite newpath to old path
						console.log('check', data)
						fs.renameSync('./'+fileDir[0]+'/'+fileDir[1]+'/'+fileDir[2]+'/'+data, './'+fileDir[0]+'/'+fileDir[1]+'/'+newPage+'/'+data)
					})
					console.log('about to clean up');
					console.log(fileDir);
					fs.rmdirSync('./'+fileDir[0]+'/'+fileDir[1]+'/'+fileDir[2]);
					console.log('done');
				}
				catch{
					console.log('new file');
					//console.log(err);
					fs.renameSync('./'+fileDir[0]+'/'+fileDir[1]+'/'+fileDir[2], './'+fileDir[0]+'/'+fileDir[1]+'/'+newPage);
				}
					

			}
			//if incoming file has more digits update entire list
			else if (y < x){
				//append entire list
				temp = prependZeroes(searchDir);
				//check if file is in temp
				var chk = 0;
				//check for duplicates
				temp.forEach((dir)=>{
					if(dir == fileDir[2]){
						chk++;
					}
				})
				//if duplicate found move items from new file into old
				if(chk > 1){
					var listOfData = fs.readdirSync('./'+fileDir[0]+'/'+fileDir[1]+fileDir[2]);
					listOfData.forEach((data)=>{
						fs.renameSync('./'+fileDir[0]+'/'+fileDir[1]+'/'+fileDir[2]+'/'+data, './'+fileDir[0]+'/'+fileDir[1]+'/'+searchDir[pageLoc]+'/'+data)
					})
				}
				else{
					temp.forEach((dir, i)=>{
						fs.renameSync('./'+fileDir[0]+'/'+fileDir[1]+'/'+searchDir[i], './'+fileDir[0]+'/'+fileDir[1]+'/'+dir);
					})
				}
			}


		}//END OF PAGES DIRECTORY

		//CHAPTER DIRECTORY
		//get list of chapters
		var searchCh = fs.readdirSync('./'+fileDir[0]);
		var chLoc = 0;
		searchCh.filter((chapter, i)=>{
			if(chapter == fileDir[1])
				chLoc = i;
			return null != chapter.match(/0*\d+-.+/);
		})

		var temp = null;
		var newChapter = null;
		var x = fileDir[1].indexOf('-');
		var y = searchCh[1].indexOf('-');

		console.log(x);
		console.log(fileDir);
		console.log(y);
		console.log(searchCh);
		//if incoming chapter has more digits than what already exist.
		if(x > y){
		 	temp = prependZeroes(searchCh);
		 	var chk = 0;

		 	temp.forEach((chapter)=>{
		 		if(chapter == fileDir[1]){
		 			chk++;
		 		}
		 	})
		 	//if duplicate found
		 	if(chk > 1){
		 		var listOfPages = fs.readdirSync('./'+fileDir[0]+'/'+fileDir[1]);
		 		listOfPages.forEach((page)=>{
		 			fs.renameSync('./'+fileDir[0]+'/'+fileDir[1]+'/'+page, './'+fileDir[0]+'/'+searchCh[chLoc]+'/'+page);
		 		})
		 	}
		 	else{
		 		temp.forEach((newCh, i)=>{
		 			fs.renameSync('./'+fileDir[0]+'/'+searchCh[i], './'+fileDir[0]+'/'+newCh);
		 		})
		 	}
		}
		 //if list of chapters have more digits than the new file
		else if(x < y){
			newChapter = fileDir[1];
			var d = y - x;
			for(let i = 0; i < d; i++){
				newChapter = '0'.concat(newChapter);
			}

			try{
				fs.accessSync('./'+fileDir[0]+'/'+newChapter);
				var listOfPages = fs.readdirSync('./'+fileDir[0]+'/'+fileDir[1]);
				listOfPages.forEach((page)=>{
					fs.renameSync('./'+fileDir[0]+'/'+fileDir[1]+'/'+page, './'+fileDir[0]+'/'+newChapter+'/'+page);
				})
				fs.rmdirSync('./'+fileDir[0]+'/'+fileDir[1]);

			}
			catch{
				fs.renameSync('./'+fileDir[0]+'/'+fileDir[1], './'+fileDir[0]+'/'+newChapter);
			}
		}
	})
	monitor.on('changed', (file, curr, prev) => {
		console.log(file + " has changed");
	})
	monitor.on('removed', (file, stat) => {
		console.log(file + ' was removed');
	})
})



