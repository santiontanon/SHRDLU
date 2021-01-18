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
		if ((intention.functor.is_a(ai.o.getSort("action.drop")) ||
		     intention.functor.is_a(ai.o.getSort("verb.leave")) ||
		     intention.functor.is_a(ai.o.getSort("verb.move"))) &&
			intention.attributes.length >= 2) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		this.ir = ir;		
		let ai:BlocksWorldRuleBasedAI = <BlocksWorldRuleBasedAI>ai_raw;
		let world:ShrdluBlocksWorld = ai.world;
		let requester:TermAttribute = ir.requester;
		let alternative_actions:Term[] = ir.alternative_actions;
		if (alternative_actions == null) alternative_actions = [ir.action];
		let denyrequestCause:Term = null;

		for(let intention of alternative_actions) {
			if (intention.attributes.length < 3) continue;
			let objectID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
			let destinationID:string = (<ConstantTermAttribute>(intention.attributes[2])).value;
			let objectToPut:ShrdluBlock = null;
			let specificX:number = null;
			let specificZ:number = null;

			if (intention.attributes.length>=5 &&
				(intention.attributes[3] instanceof ConstantTermAttribute) &&
				(intention.attributes[4] instanceof ConstantTermAttribute)) {
				specificX = Number((<ConstantTermAttribute>intention.attributes[3]).value);
				specificZ = Number((<ConstantTermAttribute>intention.attributes[4]).value);
			}

			// Check if we are holding the target object:
			this.pickupObject = undefined;
			if (world.objectInArm == null) {
				// Check if it's an object that can be picked up:
				this.pickupObject = world.getObject(objectID);
				objectToPut = this.pickupObject;
				if (this.pickupObject == null || 
					(this.pickupObject.type != SHRDLU_BLOCKTYPE_BLOCK &&
					 this.pickupObject.type != SHRDLU_BLOCKTYPE_CUBE &&
					 this.pickupObject.type != SHRDLU_BLOCKTYPE_BOX &&
					 this.pickupObject.type != SHRDLU_BLOCKTYPE_PYRAMID)) {
					continue;
				}

				// Check if there is anything on top of it:
				let objectsOnTop:ShrdluBlock[] = world.objectsOnTopObject(this.pickupObject);
				if (objectsOnTop.length > 0) {
					denyrequestCause = Term.fromString("space.directly.on.top.of('"+objectsOnTop[0].ID+"'[#id], '"+objectID+"'[#id])", ai.o);
					continue;
				}
				let objectsInside:ShrdluBlock[] = world.objectsInsideObject(this.pickupObject);
				if (objectsInside.length > 0) {
					denyrequestCause = Term.fromString("space.inside.of('"+objectsInside[0].ID+"'[#id], '"+objectID+"'[#id])", ai.o);
					continue;
				}

			} else {
				objectToPut = world.objectInArm;
				if (world.objectInArm.ID != objectID) {
					denyrequestCause = Term.fromString("#not(verb.have('"+ai.selfID+"'[#id], '"+objectID+"'[#id]))", ai.o);
					continue;
				}
			}

			// Check if the target is an object that things can be put on:
			let destinationObject:ShrdluBlock = world.getObject(destinationID);
			if (destinationObject == null || 
				(destinationObject.type != SHRDLU_BLOCKTYPE_TABLE &&
				 destinationObject.type != SHRDLU_BLOCKTYPE_BLOCK &&
				 destinationObject.type != SHRDLU_BLOCKTYPE_CUBE &&
				 destinationObject.type != SHRDLU_BLOCKTYPE_BOX)) {
				continue;
			}

			// Check if there is space to put the new object:
			let positions:[number,number,number][] = world.positionsToPutObjectOn(objectToPut, destinationObject);
			console.log(positions);
			if (positions.length == 0) {
				continue;
			}

			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));


			// If the object was not mentioned explicitly in the performative, add it to the natural language context:
			if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(objectID, ai.o);
			if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(destinationID, ai.o);

			// find the position closest to the arm:
			let distance:number = null;
			for(let position of positions) {
				if (specificX != null) {
					if (position[0] != specificX) continue;
				}
				if (specificZ != null) {
					if (position[2] != specificZ) continue;
				}
				let d:number = (position[0] - world.shrdluArm.x)*(position[0] - world.shrdluArm.x) + 
							   (position[1] - world.shrdluArm.y)*(position[1] - world.shrdluArm.y) + 
							   (position[2] - world.shrdluArm.z)*(position[2] - world.shrdluArm.z);
				if (distance == null || d<distance) {
					this.targetx = position[0];
					this.targety = position[1];
					this.targetz = position[2];
					distance = d;
				}
			}

			// put it down:
			ai.intentionsCausedByRequest.push(ir);
			ai.addCurrentActionLongTermTerm(intention);
			ai.currentActionHandler = this;
			this.executeContinuous(ai);
			this.ir.succeeded = true;
			return true;
		}

		let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
		if (denyrequestCause == null) {
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
		} else {
			ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(denyrequestCause, null, ai.timeStamp), ai.timeStamp));
		}
		this.ir.succeeded = false;
		return true;		
	}



	executeContinuous(ai_raw:RuleBasedAI) : boolean
	{
		let ai:BlocksWorldRuleBasedAI = <BlocksWorldRuleBasedAI>ai_raw;
		let world:ShrdluBlocksWorld = ai.world;



		if (this.pickupObject != null) {
			if (world.objectInArm == null) {
				// move the arm on top of the object:
				let targetx:number = this.pickupObject.x + this.pickupObject.dx/2;
				let targety:number = this.pickupObject.y + this.pickupObject.dy;
				let targetz:number = this.pickupObject.z + this.pickupObject.dz/2;
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
						world.objectInArm = this.pickupObject;
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
					this.pickupObject = null;
				}
			}
		} else {

			// we have the object in the arm:
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
		}

		return false;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		let str = "<IntentionAction type=\"BWPutIn_IntentionAction\"";
		if (this.pickupObject != undefined) {
			return str += " pickupObject=\""+this.pickupObject.ID+"\"";
		}
		if (this.targetx != undefined) {
			return str += " targetx=\""+this.targetx+"\" targety=\""+this.targety+"\" targetz=\""+this.targetz+"\"";
		}
		return str + "/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		let a:BWPutIn_IntentionAction = new BWPutIn_IntentionAction();
		if (xml.getAttribute("pickupObject") != null) {
			let world:ShrdluBlocksWorld = (<BlocksWorldRuleBasedAI>ai).world;
			a.pickupObject = world.getObject(xml.getAttribute("pickupObject"));
		}
		if (xml.getAttribute("targetx") != null) a.targetx = Number(xml.getAttribute("targetx"));
		if (xml.getAttribute("targety") != null) a.targety = Number(xml.getAttribute("targety"));
		if (xml.getAttribute("targetz") != null) a.targetz = Number(xml.getAttribute("targetz"));
		return a;
	}

	pickupObject:ShrdluBlock = null;	// if we need to pick up an object, it's stored here
	targetx:number;
	targety:number;
	targetz:number;
}
