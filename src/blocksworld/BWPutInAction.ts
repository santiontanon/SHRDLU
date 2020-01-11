var ARM_MOVE_SPEED:number = 0.5;

class BWPutIn_IntentionAction extends IntentionAction {

	constructor()
	{
		super();
		this.needsContinuousExecution = true;
	}

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.put-in"))) return true;
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

		for(let intention of alternative_actions) {
			let objectID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
			let destinationID:string = (<ConstantTermAttribute>(intention.attributes[2])).value;

			// Check if we are holding the target object:
			if (world.objectInArm == null || world.objectInArm.ID != objectID) {
				denyrequestCause = Term.fromString("#not(verb.have('"+ai.selfID+"'[#id], '"+world.objectInArm.ID+"'[#id]))", ai.o);
				continue;
			}

			// Check if the target is an object that things can be put on:
			let destinationObject:ShrdluBlock = world.getObject(destinationID);
			if (destinationObject == null || 
				(destinationObject.type != SHRDLU_BLOCKTYPE_TABLE &&
				 destinationObject.type != SHRDLU_BLOCKTYPE_BLOCK &&
				 destinationObject.type != SHRDLU_BLOCKTYPE_BOX)) {
				continue;
			}

			// Check if there is space to put the new object:
			let positions:[number,number,number][] = world.positionsToPutObjectOn(world.objectInArm, destinationObject);
			console.log(positions);
			if (positions.length == 0) {
				continue;
			}

			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));


			// If the object was not mentioned explicitly in the performative, add it to the natural language context:
			if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(objectID, ai.o);
			if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(destinationID, ai.o);

			// put it down:
			this.targetx = positions[0][0];
			this.targety = positions[0][1];
			this.targetz = positions[0][2];
			ai.intentionsCausedByRequest.push(ir);
			ai.addLongTermTerm(new Term(ai.o.getSort("verb.do"),
										  [new ConstantTermAttribute(ai.selfID,ai.cache_sort_id),
										   new TermTermAttribute(intention)]), PERCEPTION_PROVENANCE);
			ai.currentActionHandler = this;
			this.executeContinuous(ai);		
			return true;
		}

		let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
		if (denyrequestCause == null) {
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
		} else {
			ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(denyrequestCause, null, ai.time_in_seconds), ai.time_in_seconds));
		}
		return true;		
	}



	executeContinuous(ai_raw:RuleBasedAI) : boolean
	{
		let ai:BlocksWorldRuleBasedAI = <BlocksWorldRuleBasedAI>ai_raw;
		let world:ShrdluBlocksWorld = ai.world;

		if (world.objectInArm == null) {
			// we have dropped the object, just go up again:
			if (world.shrdluArm.y < SHRDLU_ARM_Y_REST_POSITION) {
				world.shrdluArm.y += ARM_MOVE_SPEED;
			} else {
				// we are done!
				world.shrdluArm.y = SHRDLU_ARM_Y_REST_POSITION;
				return true;
			}
		} else {
			// move the arm to the target position:
			let targetx:number = this.targetx + world.objectInArm.dx/2;
			let targety:number = this.targety + world.objectInArm.dy;
			let targetz:number = this.targetz + world.objectInArm.dz/2;
			targetx -= world.shrdluArm.dx/2;
			targetz -= world.shrdluArm.dz/2;

			if (Math.abs(world.shrdluArm.x - targetx) < ARM_MOVE_SPEED &&
				Math.abs(world.shrdluArm.z - targetz) < ARM_MOVE_SPEED) {
				world.shrdluArm.x = targetx;
				world.shrdluArm.z = targetz;
				if (world.shrdluArm.y > targety) {
					// we made it to the x/z position, but still need to lower the arm:
					world.shrdluArm.y -= ARM_MOVE_SPEED;
					world.objectInArm.y -= ARM_MOVE_SPEED;
				} else {
					// we have lowered the arm
					world.shrdluArm.y = targety;
					// pick up the object, and go back up
					world.objectInArm.x = this.targetx;
					world.objectInArm.y = this.targety;
					world.objectInArm.z = this.targetz;
					world.objectInArm = null;
				}
			} else {
				// move in x/z:
				if (world.shrdluArm.x < targetx) {
					world.shrdluArm.x += ARM_MOVE_SPEED;
					world.objectInArm.x += ARM_MOVE_SPEED;
				} else if (world.shrdluArm.x > targetx) {
					world.shrdluArm.x -= ARM_MOVE_SPEED;
					world.objectInArm.x -= ARM_MOVE_SPEED;
				}
				if (world.shrdluArm.z < targetz) {
					world.shrdluArm.z += ARM_MOVE_SPEED;
					world.objectInArm.z += ARM_MOVE_SPEED;
				} else if (world.shrdluArm.z > targetz) {
					world.shrdluArm.z -= ARM_MOVE_SPEED;
					world.objectInArm.z -= ARM_MOVE_SPEED;
				}
			}			
		}

		return false;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		let str = "<IntentionAction type=\"BWPutIn_IntentionAction\"";
		if (this.targetx == undefined) {
			return str + "/>";
		} else {
			return str + " targetx=\""+this.targetx+"\" targety=\""+this.targety+"\" targetz=\""+this.targetz+"\"/>";
		}
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		let a:BWPutIn_IntentionAction = new BWPutIn_IntentionAction();
		if (xml.getAttribute("targetx") != null) a.targetx = Number(xml.getAttribute("targetx"));
		if (xml.getAttribute("targety") != null) a.targety = Number(xml.getAttribute("targety"));
		if (xml.getAttribute("targetz") != null) a.targetz = Number(xml.getAttribute("targetz"));
		return a;
	}

	targetx:number;
	targety:number;
	targetz:number;
}
