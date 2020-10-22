var CUTSCENE_CORPSE:number = 1;
var CUTSCENE_DIARY:number = 2;
var CUTSCENE_POSTER:number = 3;
var CUTSCENE_FUNGI:number = 4;
var CUTSCENE_MSX:number = 5;
var CUTSCENE_CRASHED_SHUTTLE:number = 6;
var CUTSCENE_DATAPAD:number = 7;
var CUTSCENE_SHUTTLE_TAKEOFF:number = 8;
var CUTSCENE_SHUTTLE_LAND:number = 9;
var CUTSCENE_CRATER:number = 10;
var CUTSCENE_TRON_POSTER:number = 11;
var CUTSCENE_EURICLEA_DIARY:number = 12;
var CUTSCENE_SAX_DIARY:number = 13;

var CUTSCENE_ENDING_DESTROY_PAD:number = 14;
var CUTSCENE_ENDING_READ_PAD:number = 15;


class ShrdluCutScenes {
	constructor(game:A4Game, app:A4EngineApp)
	{
		this.app = app;
		this.game = game;
	}


	// returns true when the cutscene is done
	update(cutScene:number, k:KeyboardState) : boolean
	{
		if (cutScene == CUTSCENE_CORPSE) return this.updateCutSceneCorpse();
		if (cutScene == CUTSCENE_DIARY) return this.updateCutSceneDiary();
		if (cutScene == CUTSCENE_POSTER) return this.updateCutScenePoster();
		if (cutScene == CUTSCENE_FUNGI) return this.updateCutSceneFungi();
		if (cutScene == CUTSCENE_MSX) return this.updateCutSceneMSX();
		if (cutScene == CUTSCENE_CRASHED_SHUTTLE) return this.updateCutSceneCrashedShuttle();
		if (cutScene == CUTSCENE_DATAPAD) return this.updateCutSceneDatapad();
		if (cutScene == CUTSCENE_SHUTTLE_TAKEOFF) return this.updateCutSceneShuttleTakeOff();
		if (cutScene == CUTSCENE_SHUTTLE_LAND) return this.updateCutSceneShuttleLand();
		if (cutScene == CUTSCENE_CRATER) return this.updateCutSceneCrater();
		if (cutScene == CUTSCENE_TRON_POSTER) return this.updateCutSceneTronPoster();
		if (cutScene == CUTSCENE_EURICLEA_DIARY) return this.updateCutSceneEuricleaDiary();
		if (cutScene == CUTSCENE_SAX_DIARY) return this.updateCutSceneSaxDiary();

		if (cutScene == CUTSCENE_ENDING_DESTROY_PAD) return this.updateCutSceneEndingDestroyPad(k);
		if (cutScene == CUTSCENE_ENDING_READ_PAD) return this.updateCutSceneEndingReadPad(k);
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
		if (cutScene == CUTSCENE_SHUTTLE_TAKEOFF) this.drawCutSceneShuttleTakeOff(screen_width, screen_height);
		if (cutScene == CUTSCENE_SHUTTLE_LAND) this.drawCutSceneShuttleLand(screen_width, screen_height);
		if (cutScene == CUTSCENE_CRATER) this.drawCutSceneCrater(screen_width, screen_height);
		if (cutScene == CUTSCENE_TRON_POSTER) this.drawCutSceneTronPoster(screen_width, screen_height);
		if (cutScene == CUTSCENE_EURICLEA_DIARY) this.drawCutSceneEuricleaDiary(screen_width, screen_height);
		if (cutScene == CUTSCENE_SAX_DIARY) this.drawCutSceneSaxDiary(screen_width, screen_height);

		if (cutScene == CUTSCENE_ENDING_DESTROY_PAD) this.drawCutSceneEndingDestroyPad(screen_width, screen_height);
		if (cutScene == CUTSCENE_ENDING_READ_PAD) this.drawCutSceneEndingReadPad(screen_width, screen_height);
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
				if (/*this.cutSceneStateTimer >= 180 || */this.ESCpressedRecord) {
					// add the messages to the console:
					this.game.addMessageWithColor("(This is a personal diary of someone called Bruce Alper)", MSX_COLOR_GREEN);
					if (this.game.playerGender == "male") {
						this.game.addMessageWithColor("(Still can't remember who is that. It could even be me for all I know!)", MSX_COLOR_GREEN);
					} else {
						this.game.addMessageWithColor("(Still can't remember who is that, did I know him?)", MSX_COLOR_GREEN);
					}
					this.game.addMessageWithColor("(That is the only entry... it seems Bruce dropped the diary in the storage room and forgot about it...)", MSX_COLOR_GREEN);
					this.game.addMessageWithColor("(But this is even more confusing. So, there was at least 12 people in this station. Where is everyone?!)", MSX_COLOR_GREEN);
					this.cutSceneState = 0;
					this.cutSceneStateTimer = 0;
					this.ESCpressedRecord = false;

					this.app.achievement_secret_diaries[0] = true;
					this.app.trigger_achievement_complete_alert();

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
					if (this.game.playerGender == "male") {
						let text:A4TextBubble = new A4TextBubble("Still can't remember who is that. It could even be me for all I know!", 
																 30, fontFamily8px, 6, 8, this.game, null);
						text.draw((256-text.width)/2, 144, 128, 192, true, 1);
					} else {
						let text:A4TextBubble = new A4TextBubble("Still can't remember who is that, did I know him?", 
																 30, fontFamily8px, 6, 8, this.game, null);
						text.draw((256-text.width)/2, 144, 128, 192, true, 1);
					}

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
				if (/*this.cutSceneStateTimer >= 600 || */this.ESCpressedRecord) {
					// add the messages to the console:
					this.game.addMessageWithColor("(Look at these posters! Someone was a classic science fiction fan here!)", MSX_COLOR_GREEN);
					this.cutSceneState = 0;
					this.cutSceneStateTimer = 0;
					this.ESCpressedRecord = false;

					this.app.achievement_secret_posters[0] = true;
					this.app.trigger_achievement_complete_alert();
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
		let stateTimes:number[] = [180, 600, 180, 600, 600, 600, 600, 0, -1];

		if (stateTimes[this.cutSceneState] == -1) {
			// add the messages to the console:
			this.game.addMessageWithColor("(I placed the strange luminiscent dust in the microscope tray, I think it works automatically...)", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("(Look at that! This is no ordinary dust! It looks like some sort of cell... or machine!!!)", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("(I don't think I was a biologist here, since I don't understand any of the readings though...)", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("(But this is crazy! This is clearly not from earth origin!! Is this why we are in this planet?)", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("(I should ask Etaoin or Shrdlu to see if they have found life in Aurora...)", MSX_COLOR_GREEN);
			this.cutSceneState = 0;
			this.cutSceneStateTimer = 0;
			this.ESCpressedRecord = false;

			// add the knowledge of this event to Etaoin (and Qwerty and Shrdlu if they are in the station):
			let terms:Term[] = [];
			for(let item of this.game.currentPlayer.inventory) {
				if (item.is_a_string("luminiscent-dust")) {
					terms.push(Term.fromString("verb.find('player'[#id], '"+item.ID+"'[#id], 'location-west-cave'[#id])", this.game.ontology));
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

			this.app.achievement_secret_life_in_aurora = true;
			this.app.trigger_achievement_complete_alert();

			return true;
		}

		this.cutSceneStateTimer++;
		if (stateTimes[this.cutSceneState]>0 && (this.cutSceneStateTimer >= stateTimes[this.cutSceneState]) || this.ESCpressedRecord) {
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
		let stateTimes:number[] = [180, 600, 600, 600, 0, -1];

		if (stateTimes[this.cutSceneState] == -1) {
			// add the messages to the console:
			this.game.addMessageWithColor("(Look at that! Someone in this station was a retrocomputer fan!! Look at that CRT screen!)", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("(According to the case, this is a 1983 Philips VG-8020 MSX computer!)", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("(And it still on! How many years has this machine been on and still working?!)", MSX_COLOR_GREEN);
			this.cutSceneState = 0;
			this.cutSceneStateTimer = 0;
			this.ESCpressedRecord = false;

			this.app.achievement_secret_msx = true;
			this.app.trigger_achievement_complete_alert();

			return true;
		}

		this.cutSceneStateTimer++;
		if (stateTimes[this.cutSceneState]>0 && (this.cutSceneStateTimer >= stateTimes[this.cutSceneState]) || this.ESCpressedRecord) {
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
		let stateTimes:number[] = [180, 600, 600, 600, 0, -1];

		if (stateTimes[this.cutSceneState] == -1) {
			// add the messages to the console:
			this.game.addMessageWithColor("(These bodies have totally decomposed. Whatever happened here was a long time ago!)", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("(And why are they not wearing spacesuits?)", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("(Oh! There is a personal diary next to this body, maybe it can give me some clues...)", MSX_COLOR_GREEN);
			this.cutSceneState = 0;
			this.cutSceneStateTimer = 0;
			this.ESCpressedRecord = false;
			return true;
		}

		this.cutSceneStateTimer++;
		if (stateTimes[this.cutSceneState]>0 && (this.cutSceneStateTimer >= stateTimes[this.cutSceneState]) || this.ESCpressedRecord) {
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
		let stateTimes:number[] = [0, 0, 0, 0, 0, 600, 600, 0, -1];

		if (stateTimes[this.cutSceneState] == -1) {
			// add the messages to the console:
			this.game.addMessageWithColor("(Ok, so, it seems the dead people I found were part of the 12 colonists that were constructing Aurora Station...)", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("(So, am I also one of those 12? And what happened to the Tardis 8?)", MSX_COLOR_GREEN);
			this.cutSceneState = 0;
			this.cutSceneStateTimer = 0;
			this.ESCpressedRecord = false;

			this.app.achievement_secret_diaries[1] = true;
			this.app.trigger_achievement_complete_alert();

			return true;
		}

		this.cutSceneStateTimer++;
		if (stateTimes[this.cutSceneState]>0 && (this.cutSceneStateTimer >= stateTimes[this.cutSceneState]) || this.ESCpressedRecord) {
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

		let stateImgs:string[] = ["data/cutscene-datapad1.png", 
								  "data/cutscene-datapad2.png",
								  "data/cutscene-datapad3.png",
								  "data/cutscene-datapad4-"+this.game.playerGender+".png",
								  "data/cutscene-datapad5.png",
								  "data/cutscene-datapad5.png",
								  "data/cutscene-datapad5.png",
								  "data/cutscene-datapad5.png",
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


	updateCutSceneShuttleTakeOff() : boolean
	{
		let stateTimes:number[] = [100, 128, 256, -1];

		this.game.cycles_without_redrawing = 1;	// give the game a cycle after the cutscene before redrawing to avoid some flicker

		if (stateTimes[this.cutSceneState] == -1) {
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


	drawCutSceneShuttleTakeOff(screen_width:number, screen_height:number)
	{
		ctx.save();
		ctx.scale(PIXEL_SIZE, PIXEL_SIZE);

		let stateImgs:string[] = ["data/cutscene-travel1.png", 
								  "data/cutscene-travel1.png", 
								  "data/cutscene-travel1.png", 
								  null];

		if (stateImgs[this.cutSceneState] != null) {
			let img:GLTile = this.game.GLTM.get(stateImgs[this.cutSceneState]);
			if (img != null) img.draw(0,0);

			if (this.cutSceneState == 1) {
				// shuttle taking off:
				let t:GLTile = this.game.GLTM.getPiece("data/vehicles.png", 80, 144, 40, 26);
				t.draw(108, 192 - this.cutSceneStateTimer*2)
	
				let img2:GLTile = this.game.GLTM.getPiece(stateImgs[this.cutSceneState], 0, 184, 256, 8);
				if (img2 != null) img2.draw(0,184);
			}

			if (this.cutSceneState == 2) {
				// shuttle flying in the distance:
				let t:GLTile = this.game.GLTM.getPiece("data/vehicles.png", 64, 176, 24, 16);
				t.draw(256 - this.cutSceneStateTimer*2, 32)
			}
		}

		ctx.restore();
	}


	updateCutSceneShuttleLand() : boolean
	{
		let stateTimes:number[] = [100, 128, 256, -1];

		this.game.cycles_without_redrawing = 1;	// give the game a cycle after the cutscene before redrawing to avoid some flicker

		if (stateTimes[this.cutSceneState] == -1) {
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


	drawCutSceneShuttleLand(screen_width:number, screen_height:number)
	{
		ctx.save();
		ctx.scale(PIXEL_SIZE, PIXEL_SIZE);

		let stateImgs:string[] = ["data/cutscene-travel1.png", 
								  "data/cutscene-travel1.png", 
								  "data/cutscene-travel1.png", 
								  null];

		if (stateImgs[this.cutSceneState] != null) {
			let img:GLTile = this.game.GLTM.get(stateImgs[this.cutSceneState]);
			if (img != null) img.draw(0,0);

			if (this.cutSceneState == 1) {
				// shuttle flying in the distance:
				let t:GLTile = this.game.GLTM.getPiece("data/vehicles.png", 40, 176, 24, 16);
				t.draw(-24 + this.cutSceneStateTimer*2, 32)
			}

			if (this.cutSceneState == 2) {
				// shuttle landing:
				let t:GLTile = this.game.GLTM.getPiece("data/vehicles.png", 120, 176, 40, 28);
				t.draw(108, -32 + this.cutSceneStateTimer*2)
	
				let img2:GLTile = this.game.GLTM.getPiece(stateImgs[this.cutSceneState], 0, 184, 256, 8);
				if (img2 != null) img2.draw(0,184);
			}
		}

		ctx.restore();
	}


	updateCutSceneCrater() : boolean
	{
		let stateTimes:number[] = [300, 600, 600, 0, -1];

		this.game.cycles_without_redrawing = 1;	// give the game a cycle after the cutscene before redrawing to avoid some flicker

		if (stateTimes[this.cutSceneState] == -1) {
			// add the messages to the console:
			this.game.addMessageWithColor("(Look at that! The distress signal comes from that crashed spaceship, and it is enormous! Is that the Tardis 8?)", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("(I must go down and investigate!)", MSX_COLOR_GREEN);
			this.cutSceneState = 0;
			this.cutSceneStateTimer = 0;
			this.ESCpressedRecord = false;
			return true;
		}

		this.cutSceneStateTimer++;
		if (stateTimes[this.cutSceneState]>0 && (this.cutSceneStateTimer >= stateTimes[this.cutSceneState]) || this.ESCpressedRecord) {
			this.cutSceneStateTimer = 0;
			this.cutSceneState++;
		}

		this.ESCpressedRecord = false;

		return false;
	}


	drawCutSceneCrater(screen_width:number, screen_height:number)
	{
		ctx.save();
		ctx.scale(PIXEL_SIZE, PIXEL_SIZE);

		let stateImgs:string[] = ["data/cutscene-crater1.png", 
								  "data/cutscene-crater1.png",
								  "data/cutscene-crater1.png",
								  "data/cutscene-crater1.png",
								  null];
		let stateText:string[] = [null,
								  "Look at that! The distress signal comes from that crashed spaceship, and it is enormous! Is that the Tardis 8?",
								  "I must go down and investigate!",
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


	updateCutSceneTronPoster() : boolean
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
				if (this.ESCpressedRecord) {
					// add the messages to the console:
					this.game.addMessageWithColor("(Nice classic science fiction poster!)", MSX_COLOR_GREEN);
					this.cutSceneState = 0;
					this.cutSceneStateTimer = 0;
					this.ESCpressedRecord = false;

					this.app.achievement_secret_posters[1] = true;
					this.app.trigger_achievement_complete_alert();
					return true;
				}
				break;
		}

		this.ESCpressedRecord = false;

		return false;
	}


	drawCutSceneTronPoster(screen_width:number, screen_height:number)
	{
		ctx.save();
		ctx.scale(PIXEL_SIZE, PIXEL_SIZE);

		let img:GLTile = this.game.GLTM.get("data/cutscene-poster2.png");
		if (img != null) img.draw(0,0);

		switch(this.cutSceneState) {	
			case 1:
				let text:A4TextBubble = new A4TextBubble("Nice classic science fiction poster!", 
														 30, fontFamily8px, 6, 8, this.game, null);
				text.draw((256-text.width)/2, 144, 128, 192, true, 1);
				break;		
		}

		ctx.restore();
	}


	updateCutSceneEuricleaDiary() : boolean
	{
		let stateTimes:number[] = [0, 0, 600, 600, 0, -1];

		if (stateTimes[this.cutSceneState] == -1) {
			// add the messages to the console:
			this.game.addMessageWithColor("(Hmm, so, this Euriclea was responsible for the shuttle crash I found...)", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("(It seems their plan to take the Tardis did not work though...)", MSX_COLOR_GREEN);
			this.cutSceneState = 0;
			this.cutSceneStateTimer = 0;
			this.ESCpressedRecord = false;

			this.app.achievement_secret_diaries[2] = true;
			this.app.trigger_achievement_complete_alert();

			return true;
		}

		this.cutSceneStateTimer++;
		if (stateTimes[this.cutSceneState]>0 && (this.cutSceneStateTimer >= stateTimes[this.cutSceneState]) || this.ESCpressedRecord) {
			this.cutSceneStateTimer = 0;
			this.cutSceneState++;
		}

		this.ESCpressedRecord = false;

		return false;
	}


	drawCutSceneEuricleaDiary(screen_width:number, screen_height:number)
	{
		ctx.save();
		ctx.scale(PIXEL_SIZE, PIXEL_SIZE);

		let stateImgs:string[] = ["data/cutscene-euriclea-diary1-"+this.game.playerGender+".png", 
								  "data/cutscene-euriclea-diary2.png",
								  "data/cutscene-euriclea-diary2.png",
								  "data/cutscene-euriclea-diary2.png",
								  "data/cutscene-euriclea-diary2.png",
								  null];
		let stateText:string[] = [null,
								  null,
								  "Hmm, so, this Euriclea was responsible for the shuttle crash I found...",
								  "It seems their plan to take the Tardis did not work though...",
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


	updateCutSceneSaxDiary() : boolean
	{
		let stateTimes:number[] = [0, 0, 0, 600, 600, 600, 600, 0, -1];

		if (stateTimes[this.cutSceneState] == -1) {
			// add the messages to the console:
			this.game.addMessageWithColor("(Sax Harker... From what I gather, this is the man responsible for all the tragedies I have seen here then...)", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("(So, these three people are Sax, Euriclea and Nestor then... They killed everyone else except for me apparently!)", MSX_COLOR_GREEN);
			this.game.addMessageWithColor("(I am not too sorry to see that their plan failed, and the Tardis did not resist a second launch...)", MSX_COLOR_GREEN)
			this.game.addMessageWithColor("(I really need to access the content of the Tardis memory now, I am so close to figuring it all out!)", MSX_COLOR_GREEN);
			this.cutSceneState = 0;
			this.cutSceneStateTimer = 0;
			this.ESCpressedRecord = false;

			this.app.achievement_secret_diaries[3] = true;
			this.app.trigger_achievement_complete_alert();

			return true;
		}

		this.cutSceneStateTimer++;
		if (stateTimes[this.cutSceneState]>0 && (this.cutSceneStateTimer >= stateTimes[this.cutSceneState]) || this.ESCpressedRecord) {
			this.cutSceneStateTimer = 0;
			this.cutSceneState++;
		}

		this.ESCpressedRecord = false;

		return false;
	}


	drawCutSceneSaxDiary(screen_width:number, screen_height:number)
	{
		ctx.save();
		ctx.scale(PIXEL_SIZE, PIXEL_SIZE);

		let stateImgs:string[] = ["data/cutscene-sax-diary1.png", 
								  "data/cutscene-sax-diary2-"+this.game.playerGender+".png",
								  "data/cutscene-sax-diary3.png",
								  "data/cutscene-sax-diary3.png",
								  "data/cutscene-sax-diary3.png",
								  "data/cutscene-sax-diary3.png",
								  "data/cutscene-sax-diary3.png",
								  "data/cutscene-sax-diary3.png",
								  null];
		let stateText:string[] = [null,
								  null,
								  null,
								  "Sax Harker... From what I gather, this is the man responsible for all the tragedies I have seen here then...",
								  "So, these three people are Sax, Euriclea and Nestor then... They killed everyone else except for me apparently!",
								  "I am not too sorry to see that their plan failed, and the Tardis did not resist a second launch...",
								  "I really need to access the content of the Tardis memory now, I am so close to figuring it all out!",
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


	updateCutSceneEndingDestroyPad(k:KeyboardState)
	{
		this.cutSceneStateTimer++;
		if (k.keyboard[KEY_CODE_SPACE] ||
            k.keyboard[KEY_CODE_RETURN] ||
            k.keyboard[KEY_CODE_ESCAPE]) {
			this.cutSceneStateTimer+=7;	// make the text scroll faster
		}

		if (this.endingDestroyLines == null) {
			let name:string = (this.game.playerGender == "male" ? "David Bowman" : "Susan Calvin")
			let texts:string[] = [
				"At the end, before the temptation overpowered you and made you read the datapad, you decided to detroy it. "+
				"Etaoin erased all the newly gained information about "+name+" from its memory banks...",
				"Maybe this body belonged to someone called "+name+". \"But is that me?\" you thought. \"I do not have his memories. "+
				"I do not remember being him. What if he was a different person than the person I am right now? "+
				"What is the difference between me taking over his life, "+
				"and taking over the life of a complete other stranger that happened to look like me? By erasing his memories from my brain, "+
				"basically the stasis incident killed "+name+". I am not him. I am a new person, and my new life starts here!\"",

				"So, you decided to slow down and adjust to life in Aurora, with Shrdlu, Qwerty and Etaoin. "+
				"They will be your new companions from now on. Maybe one day, when you are ready, you would go back to the Tardis and "+
				"Harvest enough raw materials for manufacturing a single passenger spaceship to get you out or Aurora... "+
				"In the present, you needed time to organize your thoughts and plan for a future. "+
				"Either alone here, or in space, searching for the rest of humankind.",
				];

			if (this.game.getStoryStateVariable("luminiscent-fungi") == "analyzed") {
				texts.push("For now, there were too many questions that needed answering still in Aurora! You had found a new life form in a Cave! "+
					"Was there more life in Aurora? There seemed to be much more than meets the eye in this planet! "+
					"What if there were other life forms? Was there a civilization here in the past? \"I cannot leave just yet!\" you thought. "+
					"There is too much work to do here before that! And time is the one thing I have!");
			}

			texts.push("");
			texts.push("");
			texts.push("          Thanks for playing!");
			texts.push("");
			texts.push("");
			texts.push("        Please send feedback to"+
					   "        santi.ontanon@gmail.com");

			this.endingDestroyLines = [];
			for(let text of texts) {
				let lines:string[] = splitStringBySpaces(text, 40);
				for(let line of lines) {
					this.endingDestroyLines.push(line);
				}
				this.endingDestroyLines.push(" ");
				this.endingDestroyLines.push(" ");
			}

			this.app.achievement_complete_act3 = true;
			this.app.achievement_complete_see_all_endings[0] = true;
			this.app.trigger_achievement_complete_alert();
		}

		let scroll:number = Math.floor(this.cutSceneStateTimer/12);
		let lastLineY:number = (200 + this.endingDestroyLines.length*10) - scroll;
		if (lastLineY < 0) {
			this.game.setGameComplete(true, null);
			return true;
		}
		return false;
	}


	drawCutSceneEndingDestroyPad(screen_width:number, screen_height:number)
	{
		ctx.save();
		ctx.scale(PIXEL_SIZE, PIXEL_SIZE);

		// draw background image:
		let img:GLTile = this.game.GLTM.get("data/cutscene-travel1.png");
		if (img != null) img.draw(0,0);

		// scroll text:
		let scroll:number = Math.floor(this.cutSceneStateTimer/12);
		let y:number = 200 - scroll;

		if (this.endingDestroyLines != null) {
			for(let line of this.endingDestroyLines) {
				fillTextTopLeftWithOutline(line, 8, y, fontFamily8px, MSX_COLOR_WHITE, MSX_COLOR_BLACK);
				y+=10;
				if (y > 192) break;
			}
		}

		if (this.cutSceneStateTimer < 50) drawFadeInOverlay(1-(this.cutSceneStateTimer/50.0));

		ctx.restore();
	}


	updateCutSceneEndingReadPad(k:KeyboardState)
	{
		this.cutSceneStateTimer++;
		if (k.keyboard[KEY_CODE_SPACE] ||
            k.keyboard[KEY_CODE_RETURN] ||
            k.keyboard[KEY_CODE_ESCAPE]) {
			this.cutSceneStateTimer+=7;	// make the text scroll faster
		}

		if (this.endingReadLines == null) {
			let name:string = (this.game.playerGender == "male" ? "David Bowman" : "Susan Calvin")
			let pronoun:string = (this.game.playerGender == "male" ? "him" : "her")
			let texts:string[] = [
				"As expected, the Tardis 8 contained detailed logs of all events happened since it departed Earth, including "+
				"detailed biographies of all the crew members... like you, "+name+". As you read on about yourself you "+
				"could not avoid having a strange sensation, as if you were reading about a stranger. \"Was that really me?\" "+
				"you thought. ",

				"You decided to first read about the events that led to your memory loss experience.",

				"Many images and clips in the datapad showed how 12 people awoke from stasis shortly after landing in Aurora. "+
				"It seems the goal of those 12 people was to setup the infrastructure for later awaking the thousands of people "+
				"still in staiss in the Tardis 8. However, things were not working. A small group of people, led by Sax Harker "+
				"thought Aurora was not an inhabitable planet and had to be abandoned. Aparently YOU were the main obstacle to "+
				"that plan, being the main defender of staying in Aurora.",

				"The Tardis 8 still kept some security camera recordings of some of the events during the last days before the "+
				"incidents. Sax, Euriclea and Nestor had faked some accident and tricked everyone into going to the rescue. "+
				"However, the shuttle was sabotagged, and they all died. All except two people: "+name+" (you!) and Bruce Alper. "+
				"Apparently you two stayed to take care of some problem in the station and saved your lifes.",

				"Camera footage shows Sax attacking you and putting you on Stasis pods, before running away from the station. It does "+
				"not seem that Nestor and Euriclea were aware of this... So that's what happened. Sax wanted to leave and killed all of us, "+
				"except that you got \"lucky\".",

				"This was all very distressing. The memory loss event had caused a discontinuity in your life. "+
				"From a subjective point of view, was there any "+
				"difference at all between dying and getting your memories erased? That person who was you before the incident "+
				"was no more... You could pretend to be "+pronoun+", but there was really no continuity in your conscious experience "+
				"to support it...",

				"You were not at ease with that question in your head. You had to get out of Aurora. There was still a chance to "+
				"get reunited with the rest of humankind. Maybe human contact would help you. It had to be done! For sure SHRDLU "+
				"was capable of manufacturing a transport ship to fly away! All hope was not lost! The Tardis 8 had a record of "+
				"all the other planets humanity had tried to colonize. A new adventure lays ahead!"
				];

			texts.push("");
			texts.push("");
			texts.push("          Thanks for playing!");
			texts.push("");
			texts.push("");
			texts.push("        Please send feedback to");
			texts.push("        santi.ontanon@gmail.com");

			this.endingReadLines = [];
			for(let text of texts) {
				let lines:string[] = splitStringBySpaces(text, 40);
				for(let line of lines) {
					this.endingReadLines.push(line);
				}
				this.endingReadLines.push(" ");
				this.endingReadLines.push(" ");
			}

			this.app.achievement_secret_diaries[4] = true;
			this.app.trigger_achievement_complete_alert();

			this.app.achievement_complete_act3 = true;
			this.app.achievement_complete_see_all_endings[1] = true;
			this.app.trigger_achievement_complete_alert();
		}

		let scroll:number = Math.floor(this.cutSceneStateTimer/12);
		let lastLineY:number = (200 + this.endingReadLines.length*10) - scroll;
		if (lastLineY < 0) {
			this.game.setGameComplete(true, null);
			return true;
		}
		return false;
	}


	drawCutSceneEndingReadPad(screen_width:number, screen_height:number)
	{
		ctx.save();
		ctx.scale(PIXEL_SIZE, PIXEL_SIZE);

		let images:[string,number,number][] = [
			["data/cutscene-ending-A-1-"+this.game.playerGender+".png", 500, 2000],
			["data/cutscene-ending-A-2.png", 2200, 3800],
			["data/cutscene-ending-A-3.png", 4000, 5600],
			["data/cutscene-ending-A-4-"+this.game.playerGender+".png", 5800, 7300],
			["data/cutscene-ending-A-1-"+this.game.playerGender+".png", 7500, 8600],
			["data/cutscene-ending-A-5.png", 8800, 14000],
			];

		// draw background images:
		let img:GLTile = null;
		let f:number = 0;
		for(let [img_name,start,end] of images) {
			if (this.cutSceneStateTimer > start &&
				this.cutSceneStateTimer < end) {
				img = this.game.GLTM.get(img_name);
				if (this.cutSceneStateTimer < start+50) f = 1-((this.cutSceneStateTimer-start)/50.0);
				if (this.cutSceneStateTimer > end-50) f = (this.cutSceneStateTimer-(end-50))/50.0;
			}
		}

		if (img != null) img.draw(0,0);
		if (f > 0) drawFadeInOverlay(f);
		
		// scroll text:
		let scroll:number = Math.floor(this.cutSceneStateTimer/12);
		let y:number = 200 - scroll;

		if (this.endingReadLines != null) {
			for(let line of this.endingReadLines) {
				fillTextTopLeftWithOutline(line, 8, y, fontFamily8px, MSX_COLOR_WHITE, MSX_COLOR_BLACK);
				y+=10;
				if (y > 192) break;
			}
		}

		ctx.restore();
	}


	cutSceneState:number = 0;
	cutSceneStateTimer:number = 0;

	endingDestroyLines:string[] = null;
	endingReadLines:string[] = null;

	ESCpressedRecord:boolean = false;

	app:A4EngineApp = null;
	game:A4Game = null;	
}
