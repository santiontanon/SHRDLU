class RuleBasedAIDebugger {
	setAI(AI:RuleBasedAI)
	{
		this.AI = AI;
	}


	
    mouseClick(mouse_x: number, mouse_y: number, button: number) 
	{
		if (mouse_y < 4+16) {
			if (mouse_x < WINDOW_WIDTH/2) {
				this.leftTab++;
				this.leftTab = this.leftTab%6;
				this.leftScroll = 0;
			} else {
				this.righttab++;
				this.righttab = this.righttab%6;
				this.rightScroll = 0;
			}
		} else if (mouse_y < WINDOW_HEIGHT/2) {
			if (mouse_x < WINDOW_WIDTH/2) {
				this.leftScroll -= 20;
				if (this.leftScroll<=0) this.leftScroll = 0;
			} else {
				this.rightScroll -= 20;
				if (this.rightScroll<=0) this.rightScroll = 0;
			}
		} else {
			if (mouse_x < WINDOW_WIDTH/2) {
				this.leftScroll += 20;
			} else {
				this.rightScroll += 20;
			}

		}
	}	


	draw()
	{
		ctx.globalAlpha = 0.6;
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);
        ctx.globalAlpha = 1;
        
        this.drawTab(this.leftTab, 0, 0, WINDOW_WIDTH/2, WINDOW_HEIGHT, this.leftScroll);
        this.drawTab(this.righttab, WINDOW_WIDTH/2, 0, WINDOW_WIDTH, WINDOW_HEIGHT, this.rightScroll);
	}


	drawTab(type:number, x0:number, y0:number, x1:number, y1:number, scroll:number)
	{
		if (type == 0) this.drawPerceptionTab(x0, y0, x1, y1);
		else if (type == 1) this.drawShortTermMemoryTab(x0, y0, x1, y1);
		else if (type == 2) this.drawLongTermMemoryTab(x0, y0, x1, y1, scroll);
		else if (type == 3) this.drawIntentionsTab(x0, y0, x1, y1);
		else if (type == 4) this.drawOntologyTab(x0, y0, x1, y1);
		else if (type == 5) this.drawContextTab(x0, y0, x1, y1);
	}


	drawPerceptionTab(x0:number, y0:number, x1:number, y1:number)
	{
		this.drawTermListTab("Perception", this.AI.perceptionBuffer, x0, y0, x1, y1);
	}


	drawShortTermMemoryTab(x0:number, y0:number, x1:number, y1:number)
	{		
		var fontWidth:number = 6;
		var maxTextLength:number = Math.floor(((x1-x0)-8)/fontWidth);
		fillTextTopLeft("Short-term Memory", x0+4, y0+4, fontFamily16px, "white");
		
		var y:number = y0+4+16+4;
		for(let te of this.AI.shortTermMemory.plainTermList) {
			var str:string = te.activation + " - " + te.term.toString();
			while(str.length > maxTextLength) {
				var tmp:string = str.substring(0,maxTextLength);
				fillTextTopLeft(tmp, x0+4, y, fontFamily8px, "white");
				str = "  " + str.substring(maxTextLength);
				y+=8;
			} 
			fillTextTopLeft(str, x0+4, y, fontFamily8px, "white");
			y+=8;
		}
	}


	drawTermListTab(name:string, l:Term[], x0:number, y0:number, x1:number, y1:number)
	{
		var fontWidth:number = 6;
		var maxTextLength:number = Math.floor(((x1-x0)-8)/fontWidth);
		fillTextTopLeft(name, x0+4, y0+4, fontFamily16px, "white");
		
		var y:number = y0+4+16+4;
		for(let t of l) {
			var str:string = "- " + t.toString();
			while(str.length > maxTextLength) {
				var tmp:string = str.substring(0,maxTextLength);
				fillTextTopLeft(tmp, x0+4, y, fontFamily8px, "white");
				str = "  " + str.substring(maxTextLength);
				y+=8;
			} 
			fillTextTopLeft(str, x0+4, y, fontFamily8px, "white");
			y+=8;
		}
	}


	drawLongTermMemoryTab(x0:number, y0:number, x1:number, y1:number, scroll:number)
	{
		var fontWidth:number = 6;
		var maxTextLength:number = Math.floor(((x1-x0)-8)/fontWidth);
		fillTextTopLeft("Long-term Memory:", x0+4, y0+4, fontFamily16px, "white");
		
		let y:number = y0+4+16+4;
		let scroll_skip:number = 0; 
		for(let se of this.AI.longTermMemory.plainSentenceList) {
			if (scroll_skip < scroll) {
				scroll_skip++;
				continue;
			}
			var r:Sentence = se.sentence;
			var str:string = "- ["+se.provenance+"] " + r.toString();
			while(str.length > maxTextLength) {
				var tmp:string = str.substring(0,maxTextLength);
				fillTextTopLeft(tmp, x0+4, y, fontFamily8px, "white");
				str = "  " + str.substring(maxTextLength);
				y+=8;
			} 
			fillTextTopLeft(str, x0+4, y, fontFamily8px, "white");
			y+=8;
		}
	}


	drawIntentionsTab(x0:number, y0:number, x1:number, y1:number)
	{
		var intentions_l:Term[] = [];
		for(let tmp of this.AI.intentions) {
			intentions_l.push(tmp[0]);
		}
		this.drawTermListTab("Intentions:", intentions_l, x0, y0, x1, y1);
	}


	drawOntologyTab(x0:number, y0:number, x1:number, y1:number)
	{
		var fontWidth:number = 6;
		var maxTextLength:number = Math.floor(((x1-x0)-8)/fontWidth);
		fillTextTopLeft("Ontology:", x0+4, y0+4, fontFamily16px, "white");
		
		var y:number = y0+4+16+4;
		var x:number = x0+4;
		for(let s of this.AI.o.getAllSorts()) {
            var str:string = "- " + s.name + ": [ ";
            for(let s2 of s.parents) str += s2.name + " ";
            str += "]";

			while(str.length > maxTextLength) {
				var tmp:string = str.substring(0,maxTextLength);
				fillTextTopLeft(tmp, x, y, fontFamily8px, "white");
				str = "  " + str.substring(maxTextLength);
				y+=8;
			} 
			fillTextTopLeft(str, x, y, fontFamily8px, "white");
			y+=8;
			if (y>=WINDOW_HEIGHT) {
				y = y0+4+16+4;
				x += 200;
			}
		}
	}


	drawContextTab(x0:number, y0:number, x1:number, y1:number)
	{
		var y:number = y0+4;

		for(let context of this.AI.contexts) {
			var fontWidth:number = 6;
			var maxTextLength:number = Math.floor(((x1-x0)-8)/fontWidth);
			fillTextTopLeft("Natural Language Context ("+context.ai.selfID + " -> " + context.speaker+"):", x0+4, y, fontFamily16px, "white");
			y+= 20;

			fillTextTopLeft("Short Term Memory Entities:", x0+4, y, fontFamily8px, "white");
			y+=8;
			for(let pe of context.shortTermMemory) {
				var str:string = "- " + pe.objectID + ": [ ";
				for(let t of pe.terms) str += t + " ";
				str += "]";
				fillTextTopLeft(str, x0+4, y, fontFamily8px, "white");
				y+=8;
			}
			y+=8;

			fillTextTopLeft("Mentioned Entities:", x0+4, y, fontFamily8px, "white");
			y+=8;
			for(let pe of context.mentions) {
				var str:string = "- " + pe.objectID + " : [ ";
				for(let t of pe.terms) str += t + " ";
				str += "]";
				fillTextTopLeft(str, x0+4, y, fontFamily8px, "white");
				y+=8;
			}
			y+=8;

			fillTextTopLeft("Performatives:", x0+4, y, fontFamily8px, "white");
			y+=8;
			for(let pe of context.performatives) {
				var str:string = "- '" + pe.text + "'";
				fillTextTopLeft(str, x0+4, y, fontFamily8px, "white");
				y+=8;
				var str:string = "  " + pe.performative;
				fillTextTopLeft(str, x0+4, y, fontFamily8px, "white");
				y+=8;
			}

/*
	expectingAnswerToQuestion_stack:NLContextPerformative[] = [];
	expectingAnswerToQuestionTimeStamp_stack:number[] = [];

*/

			fillTextTopLeft("inConversation:" + context.inConversation, x0+4, y, fontFamily8px, "white");
			y+= 8;
			fillTextTopLeft("lastPerformativeInvolvingThisCharacterWasToUs:" + context.lastPerformativeInvolvingThisCharacterWasToUs, x0+4, y, fontFamily8px, "white");
			y+= 8;
			fillTextTopLeft("expectingThankYou:" + context.expectingThankYou, x0+4, y, fontFamily8px, "white");
			y+= 8;
			fillTextTopLeft("expectingYouAreWelcome:" + context.expectingYouAreWelcome, x0+4, y, fontFamily8px, "white");
			y+= 8;
			fillTextTopLeft("expectingGreet:" + context.expectingGreet, x0+4, y, fontFamily8px, "white");
			y+= 8;
			fillTextTopLeft("expectingFarewell:" + context.expectingFarewell, x0+4, y, fontFamily8px, "white");
			y+= 8;
			fillTextTopLeft("expectingAnswerToQuestionTimeStamp_stack:" + context.expectingAnswerToQuestionTimeStamp_stack, x0+4, y, fontFamily8px, "white");
			y+= 8;

			y+= 8;
		}
	}


	AI:RuleBasedAI = null;
	leftTab:number = 0;
	righttab:number = 1;

	leftScroll:number = 0;
	rightScroll:number = 0;
}