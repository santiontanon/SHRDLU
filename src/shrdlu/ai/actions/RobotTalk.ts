class RobotTalk_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.talk"))) return true;
		return false;
	}

	
	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:RobotAI = <RobotAI>ai_raw;
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;
		let needToSpecifyListener:boolean = false; 
		let txt:string = null;
		let performative:Term = (<TermTermAttribute>(intention.attributes[1])).term;
		let context:NLContext = null;

		if (intention.attributes[1] instanceof TermTermAttribute) {
			let canTalk:boolean = ai.canHear((<ConstantTermAttribute>performative.attributes[0]).value);
			if (ai.game.communicatorConnectedTo == ai.selfID) {
				// if (canTalk) {
					// we can see the player, cut the connection:
					// ai.game.communicatorConnectedTo = null;
				// }
				canTalk = true;
			}
			if (ai.robot.isTalking()) return null;
			if ((performative.attributes[0] instanceof ConstantTermAttribute) && canTalk) {
				let targetID:string = (<ConstantTermAttribute>performative.attributes[0]).value;
				// context = ai.contextForSpeaker(targetID);
				context = ai.updateContext(targetID);

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
					ai.replaceSpatialAdverbsInReferenceToAnotherSpeaker(performative, (<ConstantTermAttribute>requester).value);
				}

				console.log(ai.selfID + " trying to say: " + performative);
				if (needToSpecifyListener) {
					txt = ai.game.naturalLanguageGenerator.termToEnglish(performative, ai.selfID, <ConstantTermAttribute>performative.attributes[0], context);
				} else {
					txt = ai.game.naturalLanguageGenerator.termToEnglish(performative, ai.selfID, null, context);
				}
				txt = ai.game.naturalLanguageGenerator.capitalize(txt);
			}
		} else if (intention.attributes[1] instanceof ConstantTermAttribute) {
			// this is just a shortcut for the 3 laws of robotics easter egg:
			txt = (<ConstantTermAttribute>intention.attributes[1]).value;					
		} else {
			console.error("RobotAI.executeIntention: malformed performative: " + performative.toString());
		}

		if (txt != null) {
			if (!ai.robot.issueCommandWithString(A4CHARACTER_COMMAND_TALK, txt, 0, ai.game)) {
				return null;	// not yet!
			}

			// see if we also need to create a speech bubble, since david can hear this character through the communicator:
			if (ai.game.communicatorConnectedTo == ai.selfID) {
				ai.game.currentPlayer.map.textBubbles.push(
					[new A4TextBubble(ai.selfID + ": " + txt, 32, fontFamily8px, 6, 8, ai.game, null),
					 TEXT_INITIAL_DELAY+txt.length*TEXT_SPEED]
					);
			}

			// update natural language context:
			if (performative != null) context.newPerformative(ai.selfID, txt, performative, null, null, ir.cause, ai.o, ai.timeStamp);
			for(let c2 of ai.contexts) {
				if (c2 != context) c2.inConversation = false;
			}
		} else {
			return false;	// empty txt!
		}

		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"RobotTalk_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new RobotTalk_IntentionAction();
	}
}
