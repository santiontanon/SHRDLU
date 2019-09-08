var CUTSCENE_CORPSE:number = 1;
var CUTSCENE_DIARY:number = 2;
var CUTSCENE_POSTER:number = 3;
var CUTSCENE_FUNGI:number = 4;
var CUTSCENE_MSX:number = 5;
var CUTSCENE_CRASHED_SHUTTLE:number = 6;
var CUTSCENE_DATAPAD:number = 7;


class ShrdluCutScenes {
	constructor(game:A4Game, app:A4EngineApp)
	{
		this.app = app;
		this.game = game;
	}


	// returns true when the cutscene is done
	update(cutScene:number) : boolean
	{
		if (cutScene == CUTSCENE_CORPSE) return this.updateCutSceneCorpse();
		if (cutScene == CUTSCENE_DIARY) return this.updateCutSceneDiary();
		if (cutScene == CUTSCENE_POSTER) return this.updateCutScenePoster();
		if (cutScene == CUTSCENE_FUNGI) return this.updateCutSceneFungi();
		if (cutScene == CUTSCENE_MSX) return this.updateCutSceneMSX();
		if (cutScene == CUTSCENE_CRASHED_SHUTTLE) return this.updateCutSceneCrashedShuttle();
		if (cutScene == CUTSCENE_DATAPAD) return this.updateCutSceneDatapad();
		this.ESCpressedRecord = false;
		return true;
	}

	draw(cutScene:number, screen_width:number, screen_height:number) 
	{
		if (cutScene == CUTSCENE_CORPSE) this.drawCutSceneCorpse(screen_width, screen_height);
		if (cutScene == CUTSCENE_DIARY) this.drawCutSceneDiary(screen_width, screen_height);
		if (cutScene == CUTSCENE_POSTER) this.drawCutScenePoster(screen_width, screen_height);
		if (cutScene == CUTSCENE_FUNGI) this.drawCutSceneFungi(screen_width, screen_height);
		if (cutScene == CUTSCENE_MSX) this.drawCutSceneMSX(screen_width, screen_height);
		if (cutScene == CUTSCENE_CRASHED_SHUTTLE) this.drawCutSceneCrashedShuttle(screen_width, screen_height);
		if (cutScene == CUTSCENE_DATAPAD) this.drawCutSceneDatapad(screen_width, screen_height);
	}


	ESCPressed(cutScene:number)
	{
		this.ESCpressedRecord = true;
	}


	updateCutSceneCorpse() : boolean
	{
		switch(this.cutSceneState) {
			case 0:
				// showing the image and waiting...
				this.cutSceneStateTimer++;
				if (this.cutSceneStateTimer >= 180 || this.ESCpressedRecord) {
					this.cutSceneStateTimer = 0;
					this.cutSceneState = 1;
				}
				break;
		
			case 1:
				// "What?! There is a dead person here! And it looks like he has been here for a long time!"
				this.cutSceneStateTimer++;
				if (this.cutSceneStateTimer >= 600 || this.ESCpressedRecord) {
					this.cutSceneStateTimer = 0;
					this.cutSceneState = 2;
				}
				break;
		
			case 2:
				// "The screen says this pod stopped functioning January 2nd 2412."
				this.cutSceneStateTimer++;
				if (this.cutSceneStateTimer >= 600 || this.ESCpressedRecord) {
					this.cutSceneStateTimer = 0;
					this.cutSceneState = 3;
				}
				break;
		
			case 3:
				// "I can't remember what year it is, but that sounds like the distant future to me..."
				this.cutSceneStateTimer++;
				if (this.cutSceneStateTimer >= 600 || this.ESCpressedRecord) {
					this.cutSceneStateTimer = 0;
					this.cutSceneState = 4;
				}
				break;
		
			case 4:
				// "This is all very strange... I need to investigate some more..."		}
				this.cutSceneStateTimer++;
				if (this.cutSceneStateTimer >= 600 || this.ESCpressedRecord) {
					this.cutSceneStateTimer = 0;
					this.cutSceneState = 5;
				}
				break;

			case 5:
				// "This is all very strange... I need to investigate some more..."		}
				this.cutSceneStateTimer++;
				if (this.cutSceneStateTimer >= 180 || this.ESCpressedRecord) {
					// add the messages to the console:
					this.game.addMessageWithColor("(What?! There is a dead person here! And it looks like he has been here for a long time!)", MSX_COLOR_GREEN);
					this.game.addMessageWithColor("(The screen says this pod stopped functioning January 2nd 2412!)", MSX_COLOR_GREEN);
					this.game.addMessageWithColor("(I can't remember what year it is, but that sounds like the distant future to me...)", MSX_COLOR_GREEN);
					this.game.addMessageWithColor("(This is all very strange... I need to investigate some more...)", MSX_COLOR_GREEN);
					this.cutSceneState = 0;
					this.cutSceneStateTimer = 0;
					this.ESCpressedRecord = false;
					return true;
				}
				break;
		}

		this.ESCpressedRecord = false;

		return false;
	}


	drawCutSceneCorpse(screen_width:number, screen_height:number)
	{
		ctx.save();
		ctx.scale(PIXEL_SIZE, PIXEL_SIZE);

		let img:GLTile = this.game.GLTM.get("data/cutscene-corpse1.png");
		if (img != null) img.draw(0,0);

		switch(this.cutSceneState) {	
			case 1:
				{
					let text:A4TextBubble = new A4TextBubble("What?! There is a dead person here! And it looks like he has been here for a long time!", 
															 30, fontFamily8px, 6, 8, this.game, null);
					text.draw((256-text.width)/2, 8, 128, 0, true, 1);
					break;
				}
		
			case 2:
				{
					let text:A4TextBubble = new A4TextBubble("The screen says this pod stopped functioning February 2nd 2412", 
															 30, fontFamily8px, 6, 8, this.game, null);
					text.draw((256-text.width)/2, 8, 128, 0, true, 1);
					break;
				}
		
			case 3:
				{
					let text:A4TextBubble = new A4TextBubble("I can't remember what year it is, but that sounds like the distant future to me...", 
															 30, fontFamily8px, 6, 8, this.game, null);
					text.draw((256-text.width)/2, 8, 128, 0, true, 1);
					break;
				}
		
			case 4:
				{
					let text:A4TextBubble = new A4TextBubble("This is all very strange... I need to investigate some more...", 
															 30, fontFamily8px, 6, 8, this.game, null);
					text.draw((256-text.width)/2, 8, 128, 0, true, 1);
					break;
				}
		}

		ctx.restore();
	}


	updateCutSceneDiary() : boolean
	{
		switch(this.cutSceneState) {
			case 0:
				// showing the image and waiting...
				this.cutSceneStateTimer++;
				if (this.cutSceneStateTimer >= 180 || this.ESCpressedRecord) {
					this.cutSceneStateTimer = 0;
					this.cutSceneState = 1;
				}
				break;
		
			case 1:
				// "What?! There is a dead person here! And it looks like he has been here for a long time!"
				this.cutSceneStateTimer++;
				if (this.cutSceneStateTimer >= 600 || this.ESCpressedRecord) {
					this.cutSceneStateTimer = 0;
					this.cutSceneState = 2;
				}
				break;
		
			case 2:
				// "The screen says this pod stopped functioning January 2nd 2412."
				this.cutSceneStateTimer++;
				if (this.cutSceneStateTimer >= 600 || this.ESCpressedRecord) {
					this.cutSceneStateTimer = 0;
					this.cutSceneState = 3;
				}
				break;
		
			case 3:
				// "I can't remember what year it is, but that sounds like the distant future to me..."
				this.cutSceneStateTimer++;
				if (this.cutSceneStateTimer >= 600 || this.ESCpressedRecord) {
					this.cutSceneStateTimer = 0;
					this.cutSceneState = 4;
				}
				break;
		
			case 4:
				// "This is all very strange... I need to investigate some more..."		}
				this.cutSceneStateTimer++;
				if (this.cutSceneStateTimer >= 600 || this.ESCpressedRecord) {
					this.cutSceneStateTimer = 0;
					this.cutSceneState = 5;
				}
				break;

			case 5:
				// "This is all very strange... I need to investigate some more..."		}
				this.cutSceneStateTimer++;
				if (this.cutSceneStateTimer >= 180 || this.ESCpressedRecord) {
					// add the messages to the console:
					this.game.addMessageWithColor("(This is a personal diary of someone called Bruce Alper)", MSX_COLOR_GREEN);
					this.game.addMessageWithColor("(Still can't remember who is that. It could even be me for all I know!)", MSX_COLOR_GREEN);
					this.game.addMessageWithColor("(That is the only entry... it seems Bruce dropped the diary in the storage room and forgot about it...)", MSX_COLOR_GREEN);
					this.game.addMessageWithColor("(But this is even more confusing. So, there was at least 12 people in this station. Where is everyone?!)", MSX_COLOR_GREEN);
					this.cutSceneState = 0;
					this.cutSceneStateTimer = 0;
					this.ESCpressedRecord = false;
					return true;
				}
				break;
		}

		this.ESCpressedRecord = false;

		return false;
	}


	drawCutSceneDiary(screen_width:number, screen_height:number)
	{
		ctx.save();
		ctx.scale(PIXEL_SIZE, PIXEL_SIZE);

		let img:GLTile = this.game.GLTM.get("data/cutscene-diary1.png");
		if (img != null) img.draw(0,0);

		switch(this.cutSceneState) {	
			case 1:
				{
					let text:A4TextBubble = new A4TextBubble("This is a personal diary of someone called Bruce Alper", 
															 30, fontFamily8px, 6, 8, this.game, null);
					text.draw((256-text.width)/2, 144, 128, 192, true, 1);
					break;
				}
		
			case 2:
				{
					let text:A4TextBubble = new A4TextBubble("Still can't remember who is that. It could even be me for all I know!", 
															 30, fontFamily8px, 6, 8, this.game, null);
					text.draw((256-text.width)/2, 144, 128, 192, true, 1);
					break;
				}
		
			case 3:
				{
					let text:A4TextBubble = new A4TextBubble("That is the only entry... it seems Bruce dropped the diary in the storage room and forgot about it...", 
															 30, fontFamily8px, 6, 8, this.game, null);
					text.draw((256-text.width)/2, 144, 128, 192, true, 1);
					break;
				}
		
			case 4:
				{
					let text:A4TextBubble = new A4TextBubble("But this is even more confusing. So, there was at least 12 people in this station. Where is everyone?!", 
															 30, fontFamily8px, 6, 8, this.game, null);
					text.draw((256-text.width)/2, 144, 128, 192, true, 1);
					break;
				}
		}

		ctx.restore();
	}


	updateCutScenePoster() : boolean
	{
		switch(this.cutSceneState) {
			case 0:
				// showing the image and waiting...
				this.cutSceneStateTimer++;
				if (this.cutSceneStateTimer >= 180 || this.ESCpressedRecord) {
					this.cutSceneStateTimer = 0;
					this.cutSceneState = 1;
				}
				break;
		
			case 1:
				// "Wow, someone was a big classic science fiction fan here!"
				this.cutSceneStateTimer++;
				if (this.cutSceneStateTimer >= 600 || this.ESCpressedRecord) {
					this.cutSceneStateTimer = 0;
					this.cutSceneState = 2;
				}
				break;
		
			case 2:
				this.cutSceneStateTimer++;
				if (this.cutSceneStateTimer >= 600 || this.ESCpressedRecord) {
					// add the messages to the console:
					this.game.addMessageWithColor("(Look at these posters! Someone was a classic science fiction fan here!)", MSX_COLOR_GREEN);
					this.cutSceneState = 0;
					this.cutSceneStateTimer = 0;
					this.ESCpressedRecord = false;
					return true;
				}
				break;
		}

		this.ESCpressedRecord = false;

		return false;
	}


	drawCutScenePoster(screen_width:number, screen_height:number)
	{
		ctx.save();
		ctx.scale(PIXEL_SIZE, PIXEL_SIZE);

		let img:GLTile = this.game.GLTM.get("data/cutscene-poster1.png");
		if (img != null) img.draw(0,0);

		switch(this.cutSceneState) {	
			case 1:
				let text:A4TextBubble = new A4TextBubble("Look at these posters! Someone was a classic science fiction fan here!", 
														 30, fontFamily8px, 6, 8, this.game, null);
				text.draw((256-text.width)/2, 144, 128, 192, true, 1);
				break;		
		}

		ctx.restore();
	}


	updateCutSceneFungi() : boolean
	{
		let stateTimes:number[] = [180, 600, 180, 600, 600, 600, 600, 180, -1];

		if (stateTimes[this.cutSceneState] == -1) {
			// add the messages to the console:
			this.game.addMessageWithColor("I placed the strange luminiscent dust in the microscope tray, I think it works automatically...", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("Look at that! This is no ordinary dust! It looks like some sort of cell... or machine!!!", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("I don't think I was a biologist here, since I don't understand any of the readings though...", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("But this is crazy! This is clearly not from earth origin!! Is this why we are in this planet?", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("I should ask Etaoin or Shrdlu to see if they have found life in Aurora...", MSX_COLOR_GREEN);
			this.cutSceneState = 0;
			this.cutSceneStateTimer = 0;
			this.ESCpressedRecord = false;

			// add the knowledge of this event to Etaoin (and Qwerty and Shrdlu if they are in the station):
			let terms:Term[] = [];
			for(let item of this.game.currentPlayer.inventory) {
				if (item.is_a_string("luminiscent-dust")) {
					terms.push(Term.fromString("verb.find('david'[#id], '"+item.ID+"'[#id], 'location-west-cave'[#id])", this.game.ontology));
					terms.push(Term.fromString("fungi('"+item.ID+"'[#id])", this.game.ontology));
				}
			}
			for(let t of terms) {
				this.game.etaoinAI.addLongTermTerm(t, PERCEPTION_PROVENANCE);
				this.game.qwertyAI.addLongTermTerm(t, PERCEPTION_PROVENANCE);
				if (this.game.shrdluAI.robot.map.name == "Aurora Station" ||
					this.game.shrdluAI.robot.map.name == "Aurora Station Outdoors") {
					this.game.shrdluAI.addLongTermTerm(t, PERCEPTION_PROVENANCE);
				}
			}

			return true;
		}

		this.cutSceneStateTimer++;
		if (this.cutSceneStateTimer >= stateTimes[this.cutSceneState] || this.ESCpressedRecord) {
			this.cutSceneStateTimer = 0;
			this.cutSceneState++;
		}

		this.ESCpressedRecord = false;

		return false;
	}


	drawCutSceneFungi(screen_width:number, screen_height:number)
	{
		ctx.save();
		ctx.scale(PIXEL_SIZE, PIXEL_SIZE);

		let stateImgs:string[] = ["data/cutscene-fungi1.png", 
								  "data/cutscene-fungi1.png",
								  "data/cutscene-fungi2.png",
								  "data/cutscene-fungi2.png",
								  "data/cutscene-fungi2.png",
								  "data/cutscene-fungi2.png",
								  "data/cutscene-fungi2.png",
								  "data/cutscene-fungi2.png",
								  null];
		let stateText:string[] = [null,
								  "I placed the strange luminiscent dust in the microscope tray, I think it works automatically...",
								  null,
								  "Look at that! This is no ordinary dust! It looks like some sort of cell... or machine!!!",
								  "I don't think I was a biologist here, since I don't understand any of the readings though...",
								  "But this is crazy! This is clearly not from earth origin!! Is this why we are in this planet?",
								  "I should ask Etaoin or Shrdlu to see if they have found life in Aurora...",
								  null,
								  null];

		if (stateImgs[this.cutSceneState] != null) {
			let img:GLTile = this.game.GLTM.get(stateImgs[this.cutSceneState]);
			if (img != null) img.draw(0,0);
		}

		if (stateText[this.cutSceneState] != null) {
			let text:A4TextBubble = new A4TextBubble(stateText[this.cutSceneState], 
													 30, fontFamily8px, 6, 8, this.game, null);
			text.draw((256-text.width)/2, 144, 128, 192, true, 1);
		}

		ctx.restore();
	}


	updateCutSceneMSX() : boolean
	{
		let stateTimes:number[] = [180, 600, 600, 600, 180, -1];

		if (stateTimes[this.cutSceneState] == -1) {
			// add the messages to the console:
			this.game.addMessageWithColor("Look at that! Someone in this station was a retrocomputer fan!! Look at that CRT screen!", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("According to the case, this is a 1983 Philips VG-8020 MSX computer!", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("And it still on! How many years has this machine been on and still working?!", MSX_COLOR_GREEN);
			this.cutSceneState = 0;
			this.cutSceneStateTimer = 0;
			this.ESCpressedRecord = false;
			return true;
		}

		this.cutSceneStateTimer++;
		if (this.cutSceneStateTimer >= stateTimes[this.cutSceneState] || this.ESCpressedRecord) {
			this.cutSceneStateTimer = 0;
			this.cutSceneState++;
		}

		this.ESCpressedRecord = false;

		return false;
	}


	drawCutSceneMSX(screen_width:number, screen_height:number)
	{
		ctx.save();
		ctx.scale(PIXEL_SIZE, PIXEL_SIZE);

		let stateImgs:string[] = ["data/cutscene-msx1.png", 
								  "data/cutscene-msx1.png",
								  "data/cutscene-msx1.png",
								  "data/cutscene-msx1.png",
								  "data/cutscene-msx1.png",
								  null];
		let stateText:string[] = [null,
								  "Look at that! Someone in this station was a retrocomputer fan!! Look at that CRT screen!",
								  "According to the case, this is a 1983 Philips VG-8020 MSX computer!",
								  "And it still on! How many years has this machine been on and still working?!",
								  null,
								  null];

		if (stateImgs[this.cutSceneState] != null) {
			let img:GLTile = this.game.GLTM.get(stateImgs[this.cutSceneState]);
			if (img != null) img.draw(0,0);
		}

		if (stateText[this.cutSceneState] != null) {
			let text:A4TextBubble = new A4TextBubble(stateText[this.cutSceneState], 
													 30, fontFamily8px, 6, 8, this.game, null);
			text.draw((256-text.width)/2, 144, 128, 192, true, 1);
		}

		ctx.restore();
	}


	updateCutSceneCrashedShuttle() : boolean
	{
		let stateTimes:number[] = [180, 600, 600, 600, 180, -1];

		if (stateTimes[this.cutSceneState] == -1) {
			// add the messages to the console:
			this.game.addMessageWithColor("These bodies have totally decomposed. Whatever happened here was a long time ago!", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("And why are they not wearing spacesuits?", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("Oh! There is a personal diary next to this body, maybe it can give me some clues...", MSX_COLOR_GREEN);
			this.cutSceneState = 0;
			this.cutSceneStateTimer = 0;
			this.ESCpressedRecord = false;
			return true;
		}

		this.cutSceneStateTimer++;
		if (this.cutSceneStateTimer >= stateTimes[this.cutSceneState] || this.ESCpressedRecord) {
			this.cutSceneStateTimer = 0;
			this.cutSceneState++;
		}

		this.ESCpressedRecord = false;

		return false;
	}


	drawCutSceneCrashedShuttle(screen_width:number, screen_height:number)
	{
		ctx.save();
		ctx.scale(PIXEL_SIZE, PIXEL_SIZE);

		let stateImgs:string[] = ["data/cutscene-crashed-shuttle.png", 
								  "data/cutscene-crashed-shuttle.png",
								  "data/cutscene-crashed-shuttle.png",
								  "data/cutscene-crashed-shuttle.png",
								  "data/cutscene-crashed-shuttle.png",
								  null];
		let stateText:string[] = [null,
								  "These bodies have totally decomposed. Whatever happened here was a long time ago!",
								  "And why are they not wearing spacesuits?",
								  "Oh! There is a personal diary next to this body, maybe it can give me some clues...",
								  null,
								  null];						  

		if (stateImgs[this.cutSceneState] != null) {
			let img:GLTile = this.game.GLTM.get(stateImgs[this.cutSceneState]);
			if (img != null) img.draw(0,0);
		}

		if (stateText[this.cutSceneState] != null) {
			let text:A4TextBubble = new A4TextBubble(stateText[this.cutSceneState], 
													 30, fontFamily8px, 6, 8, this.game, null);
			text.draw((256-text.width)/2, 144, 128, 192, true, 1);
		}

		ctx.restore();
	}


	updateCutSceneDatapad() : boolean
	{
		let stateTimes:number[] = [600, 600, 600, 600, 600, 600, 600, 100, -1];

		if (stateTimes[this.cutSceneState] == -1) {
			// add the messages to the console:
			this.game.addMessageWithColor("Ok, so, it seems the dead people I found were part of the 12 colonists that were constructing Aurora Station...", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("So, am I also one of those 12? And what happened to the Tardis 8?", MSX_COLOR_GREEN);
			this.cutSceneState = 0;
			this.cutSceneStateTimer = 0;
			this.ESCpressedRecord = false;
			return true;
		}

		this.cutSceneStateTimer++;
		if (this.cutSceneStateTimer >= stateTimes[this.cutSceneState] || this.ESCpressedRecord) {
			this.cutSceneStateTimer = 0;
			this.cutSceneState++;
		}

		this.ESCpressedRecord = false;

		return false;
	}


	drawCutSceneDatapad(screen_width:number, screen_height:number)
	{
		ctx.save();
		ctx.scale(PIXEL_SIZE, PIXEL_SIZE);

		let stateImgs:string[] = ["data/cutscene-cutscene-datapad1.png", 
								  "data/cutscene-cutscene-datapad2.png",
								  "data/cutscene-cutscene-datapad3.png",
								  "data/cutscene-cutscene-datapad4.png",
								  "data/cutscene-cutscene-datapad5.png",
								  "data/cutscene-cutscene-datapad5.png",
								  "data/cutscene-cutscene-datapad5.png",
								  null];
		let stateText:string[] = [null,
								  null,
								  null,
								  null,
								  null,
								  "Ok, so, it seems the dead people I found were part of the 12 colonists that were constructing Aurora Station...",
								  "So, am I also one of those 12? And what happened to the Tardis 8?",
								  null];						  

		if (stateImgs[this.cutSceneState] != null) {
			let img:GLTile = this.game.GLTM.get(stateImgs[this.cutSceneState]);
			if (img != null) img.draw(0,0);
		}

		if (stateText[this.cutSceneState] != null) {
			let text:A4TextBubble = new A4TextBubble(stateText[this.cutSceneState], 
													 30, fontFamily8px, 6, 8, this.game, null);
			text.draw((256-text.width)/2, 144, 128, 192, true, 1);
		}

		ctx.restore();
	}



	cutSceneState:number = 0;
	cutSceneStateTimer:number = 0;

	ESCpressedRecord:boolean = false;

	app:A4EngineApp = null;
	game:A4Game = null;	
}