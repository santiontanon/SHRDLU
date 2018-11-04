var CUTSCENE_CORPSE:number = 1;
var CUTSCENE_DIARY:number = 2;
var CUTSCENE_POSTER:number = 3;


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
		this.ESCpressedRecord = false;
		return true;
	}

	draw(cutScene:number, screen_width:number, screen_height:number) 
	{
		if (cutScene == CUTSCENE_CORPSE) this.drawCutSceneCorpse(screen_width, screen_height);
		if (cutScene == CUTSCENE_DIARY) this.drawCutSceneDiary(screen_width, screen_height);
		if (cutScene == CUTSCENE_POSTER) this.drawCutScenePoster(screen_width, screen_height);
	}


	ESCPressed(cutScene:number)
	{
		this.ESCpressedRecord = true;
	}


	updateCutSceneCorpse() : boolean
	{
		switch(this.cutSceneCorpseState) {
			case 0:
				// showing the image and waiting...
				this.cutSceneCorpseStateTimer++;
				if (this.cutSceneCorpseStateTimer >= 180 || this.ESCpressedRecord) {
					this.cutSceneCorpseStateTimer = 0;
					this.cutSceneCorpseState = 1;
				}
				break;
		
			case 1:
				// "What?! There is a dead person here! And it looks like he has been here for a long time!"
				this.cutSceneCorpseStateTimer++;
				if (this.cutSceneCorpseStateTimer >= 600 || this.ESCpressedRecord) {
					this.cutSceneCorpseStateTimer = 0;
					this.cutSceneCorpseState = 2;
				}
				break;
		
			case 2:
				// "The screen says this pod stopped functioning January 2nd 2412."
				this.cutSceneCorpseStateTimer++;
				if (this.cutSceneCorpseStateTimer >= 600 || this.ESCpressedRecord) {
					this.cutSceneCorpseStateTimer = 0;
					this.cutSceneCorpseState = 3;
				}
				break;
		
			case 3:
				// "I can't remember what year it is, but that sounds like the distant future to me..."
				this.cutSceneCorpseStateTimer++;
				if (this.cutSceneCorpseStateTimer >= 600 || this.ESCpressedRecord) {
					this.cutSceneCorpseStateTimer = 0;
					this.cutSceneCorpseState = 4;
				}
				break;
		
			case 4:
				// "This is all very strange... I need to investigate some more..."		}
				this.cutSceneCorpseStateTimer++;
				if (this.cutSceneCorpseStateTimer >= 600 || this.ESCpressedRecord) {
					this.cutSceneCorpseStateTimer = 0;
					this.cutSceneCorpseState = 5;
				}
				break;

			case 5:
				// "This is all very strange... I need to investigate some more..."		}
				this.cutSceneCorpseStateTimer++;
				if (this.cutSceneCorpseStateTimer >= 180 || this.ESCpressedRecord) {
					// add the messages to the console:
					this.game.addMessageWithColor("(What?! There is a dead person here! And it looks like he has been here for a long time!)", MSX_COLOR_GREEN);
					this.game.addMessageWithColor("(The screen says this pod stopped functioning January 2nd 2412!)", MSX_COLOR_GREEN);
					this.game.addMessageWithColor("(I can't remember what year it is, but that sounds like the distant future to me...)", MSX_COLOR_GREEN);
					this.game.addMessageWithColor("(This is all very strange... I need to investigate some more...)", MSX_COLOR_GREEN);
					this.cutSceneCorpseState = 0;
					this.cutSceneCorpseStateTimer = 0;
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

		var img:GLTile = this.game.GLTM.get("data/cutscene-corpse1.png");
		if (img != null) img.draw(0,0);

		switch(this.cutSceneCorpseState) {	
			case 1:
				var text:A4TextBubble = new A4TextBubble("What?! There is a dead person here! And it looks like he has been here for a long time!", 
														 30, fontFamily8px, 6, 8, this.game, null);
				text.draw((256-text.width)/2, 8, 128, 0, true, 1);
				break;
		
			case 2:
				var text:A4TextBubble = new A4TextBubble("The screen says this pod stopped functioning February 2nd 2412", 
														 30, fontFamily8px, 6, 8, this.game, null);
				text.draw((256-text.width)/2, 8, 128, 0, true, 1);
				break;
		
			case 3:
				var text:A4TextBubble = new A4TextBubble("I can't remember what year it is, but that sounds like the distant future to me...", 
														 30, fontFamily8px, 6, 8, this.game, null);
				text.draw((256-text.width)/2, 8, 128, 0, true, 1);
				break;
		
			case 4:
				var text:A4TextBubble = new A4TextBubble("This is all very strange... I need to investigate some more...", 
														 30, fontFamily8px, 6, 8, this.game, null);
				text.draw((256-text.width)/2, 8, 128, 0, true, 1);
				break;
		}

		ctx.restore();
	}


	updateCutSceneDiary() : boolean
	{
		switch(this.cutSceneDiaryState) {
			case 0:
				// showing the image and waiting...
				this.cutSceneDiaryStateTimer++;
				if (this.cutSceneDiaryStateTimer >= 180 || this.ESCpressedRecord) {
					this.cutSceneDiaryStateTimer = 0;
					this.cutSceneDiaryState = 1;
				}
				break;
		
			case 1:
				// "What?! There is a dead person here! And it looks like he has been here for a long time!"
				this.cutSceneDiaryStateTimer++;
				if (this.cutSceneDiaryStateTimer >= 600 || this.ESCpressedRecord) {
					this.cutSceneDiaryStateTimer = 0;
					this.cutSceneDiaryState = 2;
				}
				break;
		
			case 2:
				// "The screen says this pod stopped functioning January 2nd 2412."
				this.cutSceneDiaryStateTimer++;
				if (this.cutSceneDiaryStateTimer >= 600 || this.ESCpressedRecord) {
					this.cutSceneDiaryStateTimer = 0;
					this.cutSceneDiaryState = 3;
				}
				break;
		
			case 3:
				// "I can't remember what year it is, but that sounds like the distant future to me..."
				this.cutSceneDiaryStateTimer++;
				if (this.cutSceneDiaryStateTimer >= 600 || this.ESCpressedRecord) {
					this.cutSceneDiaryStateTimer = 0;
					this.cutSceneDiaryState = 4;
				}
				break;
		
			case 4:
				// "This is all very strange... I need to investigate some more..."		}
				this.cutSceneDiaryStateTimer++;
				if (this.cutSceneDiaryStateTimer >= 600 || this.ESCpressedRecord) {
					this.cutSceneDiaryStateTimer = 0;
					this.cutSceneDiaryState = 5;
				}
				break;

			case 5:
				// "This is all very strange... I need to investigate some more..."		}
				this.cutSceneDiaryStateTimer++;
				if (this.cutSceneDiaryStateTimer >= 180 || this.ESCpressedRecord) {
					// add the messages to the console:
					this.game.addMessageWithColor("(This is a personal diary of someone called Bruce Alper)", MSX_COLOR_GREEN);
					this.game.addMessageWithColor("(Still can't remember who is that. It could even be me for all I know!)", MSX_COLOR_GREEN);
					this.game.addMessageWithColor("(That is the only entry... it seems Bruce dropped the diary in the storage room and forgot about it...)", MSX_COLOR_GREEN);
					this.game.addMessageWithColor("(But this is even more confusing. So, there was at least 12 people in this station. Where is everyone?!)", MSX_COLOR_GREEN);
					this.cutSceneDiaryState = 0;
					this.cutSceneDiaryStateTimer = 0;
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

		var img:GLTile = this.game.GLTM.get("data/cutscene-diary1.png");
		if (img != null) img.draw(0,0);

		switch(this.cutSceneDiaryState) {	
			case 1:
				var text:A4TextBubble = new A4TextBubble("This is a personal diary of someone called Bruce Alper", 
														 30, fontFamily8px, 6, 8, this.game, null);
				text.draw((256-text.width)/2, 144, 128, 192, true, 1);
				break;
		
			case 2:
				var text:A4TextBubble = new A4TextBubble("Still can't remember who is that. It could even be me for all I know!", 
														 30, fontFamily8px, 6, 8, this.game, null);
				text.draw((256-text.width)/2, 144, 128, 192, true, 1);
				break;
		
			case 3:
				var text:A4TextBubble = new A4TextBubble("That is the only entry... it seems Bruce dropped the diary in the storage room and forgot about it...", 
														 30, fontFamily8px, 6, 8, this.game, null);
				text.draw((256-text.width)/2, 144, 128, 192, true, 1);
				break;
		
			case 4:
				var text:A4TextBubble = new A4TextBubble("But this is even more confusing. So, there was at least 12 people in this station. Where is everyone?!", 
														 30, fontFamily8px, 6, 8, this.game, null);
				text.draw((256-text.width)/2, 144, 128, 192, true, 1);
				break;
		}

		ctx.restore();
	}


	updateCutScenePoster() : boolean
	{
		switch(this.cutScenePosterState) {
			case 0:
				// showing the image and waiting...
				this.cutScenePosterStateTimer++;
				if (this.cutScenePosterStateTimer >= 180 || this.ESCpressedRecord) {
					this.cutScenePosterStateTimer = 0;
					this.cutScenePosterState = 1;
				}
				break;
		
			case 1:
				// "Wow, someone was a big classic science fiction fan here!"
				this.cutScenePosterStateTimer++;
				if (this.cutScenePosterStateTimer >= 600 || this.ESCpressedRecord) {
					this.cutScenePosterStateTimer = 0;
					this.cutScenePosterState = 2;
				}
				break;
		
			case 2:
				this.cutScenePosterStateTimer++;
				if (this.cutScenePosterStateTimer >= 600 || this.ESCpressedRecord) {
					// add the messages to the console:
					this.game.addMessageWithColor("(Look at these posters! Someone was a classic science fiction fan here!)", MSX_COLOR_GREEN);
					this.cutScenePosterState = 0;
					this.cutScenePosterStateTimer = 0;
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

		var img:GLTile = this.game.GLTM.get("data/cutscene-poster1.png");
		if (img != null) img.draw(0,0);

		switch(this.cutScenePosterState) {	
			case 1:
				var text:A4TextBubble = new A4TextBubble("Look at these posters! Someone was a classic science fiction fan here!", 
														 30, fontFamily8px, 6, 8, this.game, null);
				text.draw((256-text.width)/2, 144, 128, 192, true, 1);
				break;		
		}

		ctx.restore();
	}




	cutSceneCorpseState:number = 0;
	cutSceneCorpseStateTimer:number = 0;

	cutSceneDiaryState:number = 0;
	cutSceneDiaryStateTimer:number = 0;

	cutScenePosterState:number = 0;
	cutScenePosterStateTimer:number = 0;

	ESCpressedRecord:boolean = false;

	app:A4EngineApp = null;
	game:A4Game = null;	
}