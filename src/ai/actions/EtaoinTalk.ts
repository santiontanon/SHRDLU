class EtaoinTalk_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.talk"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		var ai:EtaoinAI = <EtaoinAI>ai_raw;
		var intention:Term = ir.action;
		var requester:TermAttribute = ir.requester;

		if (intention.attributes[1] instanceof TermTermAttribute) {
			var performative:Term = (<TermTermAttribute>(intention.attributes[1])).term;
			var txt:string = null;
			if ((performative.attributes[0] instanceof ConstantTermAttribute) &&
				ai.canSee((<ConstantTermAttribute>performative.attributes[0]).value)) {
				// if we are already talking, just wait:
				if (ai.player_object.map.textBubbles.length > 0) return null;
				var targetID:string = (<ConstantTermAttribute>performative.attributes[0]).value;
				var context:NLContext = ai.contextForSpeaker(targetID);

				if (!context.inConversation &&
					performative.functor.name != "perf.callattention" &&
					performative.functor.name != "perf.greet") {
					// we need to greet first:
					performative = Term.fromString("perf.callattention('"+targetID+"'[#id])",ai.o);
					ai.queuedIntentions.push(ir);
				}

				if (requester instanceof ConstantTermAttribute &&
					(<ConstantTermAttribute>requester).value != targetID) {
					// someone asked us to tell someone else something, change the spatial adverbs accordingly (here/there):
					ai.replaceSpatialAdverbsInReferenceToAnotherSpeaker(performative, (<ConstantTermAttribute>requester).value);
				}

				console.log(ai.selfID + " trying to say: " + performative);
				txt = ai.game.naturalLanguageGenerator.termToEnglish(performative, ai.selfID, context);
				txt = ai.game.naturalLanguageGenerator.capitalize(txt);
			}
		} else if (intention.attributes[1] instanceof ConstantTermAttribute) {
			txt = (<ConstantTermAttribute>intention.attributes[1]).value;					
		} else {
			console.error("EtaoinAI.executeIntention: malformed performative: " + performative.toString());
		}

		if (txt != null) {
			ai.game.addMessage(ai.selfID + ": " + txt);
			ai.player_object.map.textBubbles.push(
				[new A4TextBubble(txt, 32, fontFamily8px, 6, 8, ai.game, null),
				 TEXT_INITIAL_DELAY+txt.length*TEXT_SPEED]
				);

			// create a perception buffer entry:
			var targetObject:A4Object = ai.game.findObjectByIDJustObject(targetID);
			if (targetObject != null) {
	            targetObject.map.addPerceptionBufferRecord(
	                new PerceptionBufferRecord("talk", ai.selfID, ai.o.getSort("disembodied-ai"),
	                                           null, null, txt,
	                                           null, null,
	                                           targetObject.x, targetObject.y+targetObject.tallness, targetObject.x+targetObject.getPixelWidth(), targetObject.y+targetObject.getPixelHeight()));
	        }

			// update natural language context:
			if (performative != null) context.newPerformative(ai.selfID, txt, performative, ir.cause, ai.o, ai.time_in_seconds);
			for(let c2 of ai.contexts) {
				if (c2 != context) c2.inConversation = false;
			}
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
