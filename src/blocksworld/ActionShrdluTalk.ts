class ShrdluTalk_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.talk"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:BlocksWorldRuleBasedAI = <BlocksWorldRuleBasedAI>ai_raw;
		let intention:Term = ir.action;
		let needToSpecifyListener:boolean = false; 
		let performative:Term = null;

		if (intention.attributes[1] instanceof TermTermAttribute) {
			performative = (<TermTermAttribute>(intention.attributes[1])).term;
			if ((performative.attributes[0] instanceof ConstantTermAttribute) &&
				ai.canHear((<ConstantTermAttribute>performative.attributes[0]).value)) {
				// if we are already talking, just wait:
				let targetID:string = (<ConstantTermAttribute>performative.attributes[0]).value;
				let context:NLContext = ai.updateContext(targetID);
				let txt:string = null;

				if (!context.inConversation &&
					performative.functor.name != "perf.callattention" &&
					performative.functor.name != "perf.greet") {
					// we need to greet first:
					performative = Term.fromString("perf.callattention('"+targetID+"'[#id])",ai.o);
					ai.queueIntentionRecord(ir);
				} else {
					for(let c of ai.contexts) {
						if (c!=context && c.inConversation) {
							needToSpecifyListener = true;
							c.inConversation = false;	// terminate the other conversations
						}
					}
				}

				console.log(ai.selfID + " trying to say: " + performative);
				if (needToSpecifyListener) {
					txt = ai.naturalLanguageGenerator.termToEnglish(performative, ai.selfID, <ConstantTermAttribute>performative.attributes[0], context);
				} else {
					txt = ai.naturalLanguageGenerator.termToEnglish(performative, ai.selfID, null, context);
				}
				txt = ai.naturalLanguageGenerator.capitalize(txt);

				if (txt != null) {
					ai.app.addMessageWithColorTime(ai.selfID + ": " + txt, MSX_COLOR_WHITE, ai.time_in_seconds);

					// update natural language context:
					if (performative != null) context.newPerformative(ai.selfID, txt, performative, ir.cause, ai.o, ai.time_in_seconds);
					for(let c2 of ai.contexts) {
						if (c2 != context) c2.inConversation = false;
					}
				}
			}
		} else if (intention.attributes[1] instanceof ConstantTermAttribute) {
			// this is just a shortcut for the 3 laws of robotics easter egg:
			let txt:string = (<ConstantTermAttribute>intention.attributes[1]).value;					
			ai.app.addMessageWithColorTime("SHRDLU: " + txt, MSX_COLOR_WHITE, ai.time_in_seconds);
		} else {
			console.error("ShrdluTalk_IntentionAction: malformed intention: " + intention.toString());
		}

		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"ShrdluTalk_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new ShrdluTalk_IntentionAction();
	}
}
