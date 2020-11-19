var ARM_MOVE_SPEED:number = 0.5;

class BWTake_IntentionAction extends IntentionAction {

	constructor()
	{
		super();
		this.needsContinuousExecution = true;
	}

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.take"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:BlocksWorldRuleBasedAI = <BlocksWorldRuleBasedAI>ai_raw;
		let world:ShrdluBlocksWorld = ai.world;
		let requester:TermAttribute = ir.requester;
		let alternative_actions:Term[] = ir.alternative_actions;
		if (alternative_actions == null) alternative_actions = [ir.action];
		let denyrequestCause:Term = null;

		// Check if we are already holding something:
		if (world.objectInArm != null) {
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
			let cause:Term = Term.fromString("verb.have('"+ai.selfID+"'[#id], '"+world.objectInArm.ID+"'[#id])", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.timeStamp), ai.timeStamp));
			return true;
		}

		for(let intention of alternative_actions) {
			let targetID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;

			// Check if it's an object that can be picked up:
			this.targetObject = world.getObject(targetID);
			if (this.targetObject == null || 
				(this.targetObject.type != SHRDLU_BLOCKTYPE_BLOCK &&
				 this.targetObject.type != SHRDLU_BLOCKTYPE_BOX &&
				 this.targetObject.type != SHRDLU_BLOCKTYPE_CUBE &&
				 this.targetObject.type != SHRDLU_BLOCKTYPE_PYRAMID)) {
				continue;
			}

			// Check if there is anything on top of it:
			let objectsOnTop:ShrdluBlock[] = world.objectsOnTopObject(this.targetObject);
			if (objectsOnTop.length > 0) {
				denyrequestCause = Term.fromString("space.directly.on.top.of('"+objectsOnTop[0].ID+"'[#id], '"+targetID+"'[#id])", ai.o);
				continue;
			}
			let objectsInside:ShrdluBlock[] = world.objectsInsideObject(this.targetObject);
			if (objectsInside.length > 0) {
				denyrequestCause = Term.fromString("space.inside.of('"+objectsInside[0].ID+"'[#id], '"+targetID+"'[#id])", ai.o);
				continue;
			}

			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));

			// If the object was not mentioned explicitly in the performative, add it to the natural language context:
			if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(targetID, ai.o);

			// Take it:
			ai.intentionsCausedByRequest.push(ir);
			ai.addCurrentActionLongTermTerm(intention);
			ai.currentActionHandler = this;
			this.executeContinuous(ai);		
			return true;
		}

		let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
		if (denyrequestCause == null) {
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
		} else {
			ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(denyrequestCause, null, ai.timeStamp), ai.timeStamp));
		}
		return true;		
	}



	executeContinuous(ai_raw:RuleBasedAI) : boolean
	{
		let ai:BlocksWorldRuleBasedAI = <BlocksWorldRuleBasedAI>ai_raw;
		let world:ShrdluBlocksWorld = ai.world;

		if (world.objectInArm == null) {
			// move the arm on top of the object:
			let targetx:number = this.targetObject.x + this.targetObject.dx/2;
			let targety:number = this.targetObject.y + this.targetObject.dy;
			let targetz:number = this.targetObject.z + this.targetObject.dz/2;
			targetx -= world.shrdluArm.dx/2;
			targetz -= world.shrdluArm.dz/2;

			if (Math.abs(world.shrdluArm.x - targetx) < ARM_MOVE_SPEED &&
				Math.abs(world.shrdluArm.z - targetz) < ARM_MOVE_SPEED) {
				world.shrdluArm.x = targetx;
				world.shrdluArm.z = targetz;
				if (world.shrdluArm.y > targety) {
					// we made it to the x/z position, but still need to lower the arm:
					world.shrdluArm.y -= ARM_MOVE_SPEED;
				} else {
					// we have lowered the arm
					world.shrdluArm.y = targety;
					// pick up the object, and go back up
					world.objectInArm = this.targetObject;
				}
			} else {
				// move in x/z:
				if (world.shrdluArm.x < targetx) {
					world.shrdluArm.x += ARM_MOVE_SPEED;
				} else if (world.shrdluArm.x > targetx) {
					world.shrdluArm.x -= ARM_MOVE_SPEED;
				}
				if (world.shrdluArm.z < targetz) {
					world.shrdluArm.z += ARM_MOVE_SPEED;
				} else if (world.shrdluArm.z > targetz) {
					world.shrdluArm.z -= ARM_MOVE_SPEED;
				}
			}
		} else {
			if (world.shrdluArm.y < SHRDLU_ARM_Y_REST_POSITION) {
				world.shrdluArm.y += ARM_MOVE_SPEED;
				world.objectInArm.y += ARM_MOVE_SPEED; 
			} else {
				// we are done!
				world.shrdluArm.y = SHRDLU_ARM_Y_REST_POSITION;
				world.objectInArm.y = world.shrdluArm.y - world.objectInArm.dy; 
				return true;
			}
		}

		return false;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		let str = "<IntentionAction type=\"BWTake_IntentionAction\"";
		if (this.targetObject == null) {
			return str + "/>";
		} else {
			return str + " targetObject=\""+this.targetObject.ID+"\"/>";
		}
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		let a:BWTake_IntentionAction = new BWTake_IntentionAction();
		if (xml.getAttribute("targetObject") != null) {
			let world:ShrdluBlocksWorld = (<BlocksWorldRuleBasedAI>ai).world;
			a.targetObject = world.getObject(xml.getAttribute("targetObject"));
		}
		return a;
	}

	targetObject:ShrdluBlock = null;

}
