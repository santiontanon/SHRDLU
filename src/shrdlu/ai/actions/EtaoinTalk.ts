class EtaoinTalk_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.talk"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:EtaoinAI = <EtaoinAI>ai_raw;
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;
		let needToSpecifyListener:boolean = false; 
		let performative:Term = null;

		if (intention.attributes[1] instanceof TermTermAttribute) {
			performative = (<TermTermAttribute>(intention.attributes[1])).term;
			if ((performative.attributes[0] instanceof ConstantTermAttribute) &&
				ai.canHear((<ConstantTermAttribute>performative.attributes[0]).value)) {
				// if we are already talking, just wait:
				if (ai.player_object.map.textBubbles.length > 0) return null;
				let targetID:string = (<ConstantTermAttribute>performative.attributes[0]).value;
				let context:NLContext = ai.updateContext(targetID);
				let txt:string = null;

				if (!context.inConversation &&
					performative.functor.name != "perf.callattention" &&
					performative.functor.name != "perf.greet") {
					needToSpecifyListener = true;
				}

				for(let c of ai.contexts) {
					if (c!=context && c.inConversation) {
						needToSpecifyListener = true;
						c.inConversation = false;	// terminate the other conversations
					}
				}

				if (requester instanceof ConstantTermAttribute &&
					(<ConstantTermAttribute>requester).value != targetID) {
					// someone asked us to tell someone else something, change the spatial adverbs accordingly (here/there):
					// this also replaces "verb.come" to "ver.go-to" with the appropriate location
					ai.replaceSpatialAdverbsInReferenceToAnotherSpeaker(performative, (<ConstantTermAttribute>requester).value);
				}

				console.log(ai.selfID + " trying to say: " + performative);
				if (needToSpecifyListener) {
					txt = ai.game.naturalLanguageGenerator.termToEnglish(performative, ai.selfID, <ConstantTermAttribute>performative.attributes[0], context);
				} else {
					txt = ai.game.naturalLanguageGenerator.termToEnglish(performative, ai.selfID, null, context);
				}
				txt = ai.game.naturalLanguageGenerator.capitalize(txt);

				if (txt != null) {
					ai.game.addMessage(ai.selfID + ": " + txt);
					let bubble:A4TextBubble = new A4TextBubble(txt, 32, fontFamily8px, 6, 8, ai.game, null);
					ai.player_object.map.textBubbles.push([bubble, TEXT_INITIAL_DELAY+txt.length*TEXT_SPEED]);
                    if (ai.game.debugTextBubbleLog != null) {
                        ai.game.debugTextBubbleLog.push([ai.game.cycle, ai.selfID, bubble]);
                    }

					// create a perception buffer entry:
					let targetObject:A4Object = ai.game.findObjectByIDJustObject(targetID);
					if (targetObject != null) {
			            targetObject.map.addPerceptionBufferRecord(
			                new PerceptionBufferRecord("talk", ai.selfID, ai.o.getSort("disembodied-ai"),
			                                           null, null, txt,
			                                           null, null,
			                                           targetObject.x, targetObject.y, targetObject.x+targetObject.getPixelWidth(), targetObject.y+targetObject.getPixelHeight()));
			        }

					// update natural language context:
					if (performative != null) context.newPerformative(ai.selfID, txt, performative, null, ir.cause, ai.o, ai.timeStamp);
					for(let c2 of ai.contexts) {
						if (c2 != context) c2.inConversation = false;
					}
				}
			}
		} else if (intention.attributes[1] instanceof ConstantTermAttribute) {
			// this is just a shortcut for the 3 laws of robotics easter egg:
			let txt:string = (<ConstantTermAttribute>intention.attributes[1]).value;					
			ai.game.addMessage(ai.selfID + ": " + txt);
			let bubble:A4TextBubble = new A4TextBubble(txt, 32, fontFamily8px, 6, 8, ai.game, null);
			ai.player_object.map.textBubbles.push([bubble, TEXT_INITIAL_DELAY+txt.length*TEXT_SPEED]);
            if (ai.game.debugTextBubbleLog != null) {
                ai.game.debugTextBubbleLog.push([ai.game.cycle, ai.selfID, bubble]);
            }

		} else {
			console.error("EtaoinAI.executeIntention: malformed intention: " + intention.toString());
		}

		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"EtaoinTalk_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new EtaoinTalk_IntentionAction();
	}
}
