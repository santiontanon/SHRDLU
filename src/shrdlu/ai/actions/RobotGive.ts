class RobotGive_IntentionAction extends IntentionAction {

	constructor()
	{
		super();
		this.needsContinuousExecution = true;
	}


	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.give")) &&
			intention.attributes.length>=2) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		this.ir = ir;		
		let ai:RobotAI = <RobotAI>ai_raw;
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;
		let alternative_actions:Term[] = ir.alternative_actions;
		if (alternative_actions == null) alternative_actions = [ir.action];
		let denyrequestCause:Term = null;
		let numberConstraint:number = ir.resolveNumberConstraint(ir.numberConstraint, alternative_actions.length);
		let itemID_l:string[] = [];
		let targetID_l:string[] = [];

		if (ai.robot.isInVehicle()) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}
			this.ir.succeeded = false;
			return true;
		}			

		for(let intention of alternative_actions) {		
			let id:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
			if (id != null && itemID_l.indexOf(id) == -1) itemID_l.push(id);
			if (intention.attributes.length>=3) {
				id = (<ConstantTermAttribute>(intention.attributes[2])).value;
				if (id != null && targetID_l.indexOf(id) == -1) targetID_l.push(id);
			}
		}

		if (targetID_l.length == 0) {
			if (requester != null && (requester instanceof ConstantTermAttribute)) {
				targetID_l.push((<ConstantTermAttribute>requester).value);
			}
		}
		if (targetID_l.length != 1) {
			if (requester != null) {
				// state that it cannot give this item:
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest('"+requester+"'[#id]))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));			
			}
			this.ir.succeeded = false;
			return true;
		}

		let item_l:A4Object[] = [];
		for(let o of ai.robot.inventory) {
			if (itemID_l.indexOf(o.ID) != -1) {
				if (ai.objectsNotAllowedToGive.indexOf(o.ID) == -1) {
					item_l.push(o);
				} else {
					denyrequestCause = Term.fromString("#not(verb.can('"+ai.selfID+"'[#id], action.give('"+ai.selfID+"'[#id], '"+o.ID+"'[#id], "+requester+")))", ai.o);
				}
			}
		}

		if (item_l.length == 0 && denyrequestCause == null) {
			for(let targetID of itemID_l) {
				let targetObjectL:A4Object[] = ai.game.findObjectByID(targetID);
				//if (targetObject == null) {
				if (targetObjectL != null && targetObjectL.length == 1 &&
					targetObjectL[0].takeable) {
					item_l.push(targetObjectL[0]);
				}
			}
		}

		if (item_l.length == 0) {
			if (requester != null) {
				if (denyrequestCause != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(denyrequestCause, null, ai.timeStamp), ai.timeStamp));
				} else {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					let cause:Term = Term.fromString("#not(verb.have('"+ai.selfID+"'[#id], '"+itemID_l[0]+"'[#id]))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.timeStamp), ai.timeStamp));
				}
			}
			this.ir.succeeded = false;
			return true;
		}

		let targetCharacter:A4Character = <A4Character>ai.game.findObjectByIDJustObject(targetID_l[0]);
		if (targetCharacter == null) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				let cause:Term = Term.fromString("#not(verb.see('"+ai.selfID+"'[#id], '"+targetID_l[0]+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.timeStamp), ai.timeStamp));
			}				
			return false;
		} else {
			let destinationMap:A4Map = targetCharacter.map;

			// Check if the robot can go:
			let destinationLocation:AILocation = ai.game.getAILocation(targetCharacter);
			let destinationLocationID:string = null;
			if (destinationLocation != null) destinationLocationID = destinationLocation.id;
			let cannotGoCause:Term = ai.canGoTo(destinationMap, destinationLocationID, requester);
			if (cannotGoCause != null) {
				if (requester != null) {
					// deny request:
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					let causeRecord:CauseRecord = new CauseRecord(cannotGoCause, null, ai.timeStamp)
					ai.intentions.push(new IntentionRecord(term, null, null, causeRecord, ai.timeStamp));

					// explain cause:
					term = new Term(ai.o.getSort("action.talk"), 
									[new ConstantTermAttribute(ai.selfID, ai.o.getSort("#id")),
									 new TermTermAttribute(new Term(ai.o.getSort("perf.inform"),
									 		  			   [requester, new TermTermAttribute(cannotGoCause)]))]);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
				}
				this.ir.succeeded = false;
				return true;
			}
			
			if (destinationMap == null) {
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					let cause:Term = Term.fromString("#not(verb.know('"+ai.selfID+"'[#id], #and(the(P:'path'[path], N:[singular]), noun(P, N))))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.timeStamp), ai.timeStamp));
				}				
				return false;							
			} else {
				if (requester != null) {
					let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))";
					let term:Term = Term.fromString(tmp, ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
				}

				app.achievement_nlp_all_robot_actions[6] = true;
				app.trigger_achievement_complete_alert();

				ai.setNewAction(intention, requester, null, this);
				ai.addCurrentActionLongTermTerm(intention);
				ai.intentionsCausedByRequest.push(ir);

		        for(let item of item_l) {
					this.itemsToGive.push(item);
		        	numberConstraint--;
        			if (numberConstraint <= 0) break;
		        }

				this.targetCharacter = targetCharacter;

		        for(let item of item_l) {
					// If the object was not mentioned explicitly in the performative, add it to the natural language context:
					if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(item.ID, ai.o);
					if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(targetCharacter.ID, ai.o);
				}
			}
		}
		this.ir.succeeded = true;
		return true;
	}


	executeContinuous(ai_raw:RuleBasedAI) : boolean
	{
		let ai:RobotAI = <RobotAI>ai_raw;

		if (this.itemsToGive.length == 0 || this.targetCharacter == null) {
			// we are done!
			return true;
		} else {
			let itemToGive:A4Object = this.itemsToGive[0];
			if (this.targetCharacter.inventory.indexOf(itemToGive) != -1) {
				// the target already has it, we are done with this item
				this.itemsToGive.splice(0, 1);
				return false;
			}
			if (ai.robot.inventory.indexOf(itemToGive) != -1) {
				// we have it, so, we just need to give it to the target:
		        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, this.targetCharacter);
		        if (ai.robot.map != this.targetCharacter.map ||
		        	ai.robot.pixelDistance(this.targetCharacter) != 0) {
		        	q.scripts.push(new A4Script(A4_SCRIPT_GOTO_CHARACTER, this.targetCharacter.ID, null, 0, false, false));
		        } else {
	        		q.scripts.push(new A4Script(A4_SCRIPT_GIVE, itemToGive.ID, null, 0, false, false));
	        	}
	        	ai.currentAction_scriptQueue = q;
			} else {
				// we don't have the object, we need to go pick it up:
				let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
				let s:A4Script = new A4Script(A4_SCRIPT_TAKE, itemToGive.map.name, null, 0, false, false);
				s.x = itemToGive.x;
				s.y = itemToGive.y;
				q.scripts.push(s);
				ai.currentAction_scriptQueue = q;
			}
		}
		return false;
	}	


	saveToXML(ai:RuleBasedAI) : string
	{
		let str = "<IntentionAction type=\"RobotGive_IntentionAction\"";
		if (this.targetCharacter == null) {
		 	str += ">";
		} else {
			str += " targetCharacter=\""+this.targetCharacter.ID+"\">"
		}
		for(let item of this.itemsToGive) {
			str += "<itemToGive id=\""+item.ID+"\"/>"
		}
		return str += "</IntentionAction>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		let a:RobotGive_IntentionAction = new RobotGive_IntentionAction();
		let game:A4Game = (<A4RuleBasedAI>ai).game;
		if (xml.getAttribute("targetCharacter") != null) {
			let o:A4Object = game.findObjectByIDJustObject(xml.getAttribute("targetCharacter"));
			if (o instanceof A4Character) {
				a.targetCharacter = <A4Character>o;
			}
		}
		for(let item_xml of getElementChildrenByTag(xml, "itemToGive")) {
			if (item_xml.getAttribute("id") != null) {
				let o:A4Object = game.findObjectByIDJustObject(item_xml.getAttribute("id"));
				if (o != null) a.itemsToGive.push(o);
			}
		}
		return a;		
	}


	targetCharacter:A4Character = null;
	itemsToGive:A4Object[] = [];
}
