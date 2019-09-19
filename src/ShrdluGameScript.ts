/*

Note (santi):
- This class implements the game story script. All the events that constitute the main storyline are controlled from this class.
- Notice that all the sentences said by the NPCs are actually generated using natural language generation, rather than being
  hardcoded here. That is so that they can have an internal representation of them, and they can reason about them.
- Only the text said by the player character in thought bubbles is hardcoded directly as text.
- I should probably turn this class into some sort of XML or JSON file with the events properly defined, since it very quickly
  grew into a mess. But the flexibility of having it all here in code is hard to match :)

*/


var QWERTY_AGENDA_DELAY:number = 30*60;	// 30 seconds
// var QWERTY_AGENDA_DELAY:number = 5*60;	// 5 seconds

class ShrdluGameScript {
	constructor(game:A4Game, app:A4EngineApp)
	{
		this.app = app;
		this.game = game;
		this.qwertyID = game.qwertyAI.selfID;
		this.etaoinID = game.etaoinAI.selfID;
		this.playerID = game.currentPlayer.ID;
	}


	update() 
	{
		//if (this.act == "intro") {
			//this.skip_to_act_end_of_intro();
			//this.skip_to_act_1();
			//this.skip_to_end_of_act_1();
			//this.skip_to_act_2();
			//this.skip_to_act_2_shrdluback();
			//this.skip_to_act_2_shrdluback_repair_outside();
			//this.skip_to_act_2_crash_site();
			//this.skip_to_act_2_after_crash_site();
		//}

		if (this.act == "intro") this.update_act_intro();
		if (this.act == "1") this.update_act_1();
		if (this.act == "2") this.update_act_2();
		if (this.act == "3") this.update_act_3();
		
		this.update_sideplots();

		this.processQueuedThoughtBubbles();
	}


	// This is a debug function, remove once the game is complete!
	skip_to_act_end_of_intro()
	{
		if (this.act_intro_state>=101) return;
		this.game.currentPlayer.getOutOfBed(this.game);
		// bedroom:
		this.game.currentPlayer.x = 560;
		this.game.currentPlayer.y = 200;
		this.game.currentPlayer.direction = A4_DIRECTION_DOWN;

		this.game.eyesClosedState = 2;
		this.game.textInputAllowed = true;
		this.game.qwertyAI.respondToPerformatives = true;	// start responding to random questions from the player

		// start in the infirmary:
		this.game.currentPlayer.x = 12*8;
		this.game.currentPlayer.y = 28*8;
		this.act_intro_state = 101;
	}


	// This is a debug function, remove once the game is complete!
	skip_to_act_1()
	{
		this.game.currentPlayer.getOutOfBed(this.game);
		// bedroom:
		this.game.currentPlayer.x = 560;
		this.game.currentPlayer.y = 200;
		this.game.currentPlayer.direction = A4_DIRECTION_DOWN;
		this.game.currentPlayer.inventory.push(this.game.qwertyAI.robot.inventory[6]);	// bedroom key
		this.game.qwertyAI.robot.inventory.splice(6,1);
		this.game.currentPlayer.inventory.push(this.game.qwertyAI.robot.inventory[5]);	// garage key
		this.game.qwertyAI.robot.inventory.splice(5,1);
		let idx:number = this.game.qwertyAI.objectsNotAllowedToGive.indexOf("garage-key");
		this.game.qwertyAI.objectsNotAllowedToGive.splice(idx,1);

		this.game.shrdluAI.allowPlayerInto("location-garage", "GARAGE");
		this.game.qwertyAI.allowPlayerInto("location-garage", "GARAGE");
		this.game.etaoinAI.allowPlayerInto("location-garage", "GARAGE");
		this.game.shrdluAI.allowPlayerInto("location-maintenance","MAINTENANCE");
		this.game.qwertyAI.allowPlayerInto("location-maintenance","MAINTENANCE");
		this.game.etaoinAI.allowPlayerInto("location-maintenance","MAINTENANCE");

		this.game.currentPlayer.inventory.push(this.game.qwertyAI.robot.inventory[0]);
		this.game.qwertyAI.robot.inventory.splice(0,1);
		this.game.eyesClosedState = 2;
		this.game.textInputAllowed = true;
		this.game.qwertyAI.respondToPerformatives = true;	// start responding to random questions from the player
		this.game.etaoinAI.respondToPerformatives = true;	// start responding to random questions from the player
		this.game.shrdluAI.respondToPerformatives = true;	// start responding to random questions from the player
		this.act = "1";

		// start in the infirmary:
		//this.game.currentPlayer.x = 12*8;
		//this.game.currentPlayer.y = 28*8;

		// start in the garage:
		this.game.currentPlayer.x = 864;
		this.game.currentPlayer.y = 40;
//		this.act_1_state = 11;	// waiting for player to ask about other humans
//		this.act_1_state = 15;	// etaoin will ask to go find Shrdlu
		this.act_1_state = 19;

		let term:Term = Term.fromString("goal(D:'david'[#id], verb.find(X, 'shrdlu'[#id]))",this.game.ontology);
		this.game.etaoinAI.addLongTermTerm(term, MEMORIZE_PROVENANCE);

		this.game.currentPlayer.inventory.push(this.game.qwertyAI.robot.inventory[1]);	// maintenance key
		this.game.qwertyAI.robot.inventory.splice(1,1);
		this.game.currentPlayer.inventory.push(this.game.objectFactory.createObject("workingspacesuit", this.game, false, false));
		this.game.currentPlayer.inventory.push(this.game.objectFactory.createObject("full-battery", this.game, false, false));
		this.game.setStoryStateVariable("act1-corpse", "discovered");

		let term1:Term = Term.fromString("verb.happen('etaoin'[#id], erased('etaoin-memory'[#id]))", this.game.ontology);
		this.game.etaoinAI.addLongTermTerm(term1, PERCEPTION_PROVENANCE);
		this.game.qwertyAI.addLongTermTerm(term1, PERCEPTION_PROVENANCE);
		let term2:Term = Term.fromString("property.problem('etaoin'[#id], erased('etaoin-memory'[#id]))", this.game.ontology);
		this.game.etaoinAI.addLongTermTerm(term2, PERCEPTION_PROVENANCE);
		this.game.qwertyAI.addLongTermTerm(term2, PERCEPTION_PROVENANCE);
		let term3:Term = Term.fromString("property.strange(erased('etaoin-memory'[#id]))", this.game.ontology);
		this.game.etaoinAI.addLongTermTerm(term3, PERCEPTION_PROVENANCE);
		this.game.qwertyAI.addLongTermTerm(term3, PERCEPTION_PROVENANCE);

		// start in spacer valley
		//this.game.requestWarp(this.game.currentPlayer, this.game.maps[2], 40*8, 51*8);
		let suit_l:A4Object[] = this.game.findObjectByID("spacesuit");
		(<A4Container>(suit_l[0])).content.splice((<A4Container>(suit_l[0])).content.indexOf(suit_l[1]), 1);
		this.game.currentPlayer.inventory.push(this.game.objectFactory.createObject("helmet", this.game, false, false));
	}


	skip_to_end_of_act_1()
	{
		this.skip_to_act_1();
		// garage
		this.game.currentPlayer.x = 864;
		this.game.currentPlayer.y = 40;
		//this.game.qwertyAI.robot.x = 832;
		//this.game.qwertyAI.robot.y = 40;
		// infirmary
		//this.game.currentPlayer.x = 12*8;
		//this.game.currentPlayer.y = 28*8;
		this.game.setStoryStateVariable("rover", "working");
		//this.game.currentPlayer.inventory.push(this.game.objectFactory.createObject("luminiscent-dust", this.game, false, false));
		//this.game.setStoryStateVariable("luminiscent-fungi", "taken");
	}


	skip_to_act_2()
	{
		this.skip_to_end_of_act_1();
		this.act = "2";
		// West cave:
		// this.game.currentPlayer.warp(4*8, 16*8, this.game.maps[5]);
		// Science lab:
		// this.game.currentPlayer.warp(13*8, 42*8, this.game.maps[0]);
		// room 6:
		// this.game.currentPlayer.warp(608, 216, this.game.maps[0]);
		// Infirmary:
		// this.game.currentPlayer.warp(12*8, 28*8, this.game.maps[0]);
		// East cave:
		this.game.currentPlayer.warp(8*8, 12*8, this.game.maps[4]);

		this.contextShrdlu = this.game.shrdluAI.contextForSpeaker(this.playerID);
		this.game.setStoryStateVariable("act", "act2");
	}


	skip_to_act_2_shrdluback()
	{
		this.skip_to_act_2();
		this.game.currentPlayer.warp(864, 40, this.game.maps[0]);
		this.game.shrdluAI.robot.warp(864, 48, this.game.maps[0]);
		this.act_2_state = 106;
	}


	skip_to_act_2_shrdluback_repair_outside()
	{
		this.skip_to_act_2_shrdluback();

		let term:Term = Term.fromString("goal(D:'david'[#id], verb.wait-for(X, 'shrdlu'[#id]))",this.game.ontology);
		this.game.etaoinAI.addLongTermTerm(term, MEMORIZE_PROVENANCE);

		this.act_2_state = 111;
		this.act_2_shrdlu_agenda_state = 30;
		this.game.shrdluAI.visionActive = true;		
		this.game.shrdluAI.robot.strength = 8;
	}

	skip_to_act_2_crash_site()
	{
		this.skip_to_act_2_shrdluback_repair_outside();

		this.game.shrdluAI.allowPlayerInto("location-as29","COMMAND");
		this.game.qwertyAI.allowPlayerInto("location-as29","COMMAND");
		this.game.etaoinAI.allowPlayerInto("location-as29","COMMAND");
		this.act_2_state = 222;
		this.act_2_shrdlu_agenda_state = 40;
		this.game.currentPlayer.warp(40*8, 12*8, this.game.maps[6]);	// crash site
		this.game.shrdluAI.robot.warp(32*8, 12*8, this.game.maps[6]);	// crash site
	}

	skip_to_act_2_after_crash_site()
	{
		this.skip_to_act_2_crash_site();
		this.game.currentPlayer.x = 864;
		this.game.currentPlayer.warp(864, 40, this.game.maps[0]);	// garage
		this.game.shrdluAI.robot.warp(864-16, 40, this.game.maps[0]);	// garage
		this.act_2_state = 223;
		let item:A4Object = this.game.objectFactory.createObject("shuttle-datapad", this.game, false, false);
		item.ID = "shuttle-datapad";
		this.game.currentPlayer.inventory.push(item);
		let engine:A4Object = this.game.objectFactory.createObject("shuttle-engine", this.game, false, false);
		engine.ID = "shuttle-engine";
		this.game.shrdluAI.robot.inventory.push(engine);
	}


	update_act_intro() 
	{
		let previous_state:number = this.act_intro_state;

		if (this.act_intro_state >= 1 && this.contextQwerty == null) this.contextQwerty = this.game.qwertyAI.contextForSpeaker(this.playerID);

		switch(this.act_intro_state) {
		/* --------------------------------------------------------
			Tutorial part 1: talking to qwerty.
		   -------------------------------------------------------- */
		case 0:
			if (this.act_intro_state_timer>60) {
				this.qwertyIntention("action.talk($QWERTY, perf.greet($PLAYER))");
				this.act_intro_state = 1;
				this.game.textInputAllowed = true;
			}
			break;

		case 1:	// qwerty is waiting to see if the player says something:
			if (this.contextQwerty.lastPerformativeBy(this.playerID)!=null) this.act_intro_state = 3;			
			if (this.act_intro_state_timer>240 && this.game.currentPlayer.talkingBubbleDuration == 0) this.act_intro_state = 2;
			break;

		case 2: // give tutorial hint on how to talk
			if (this.act_intro_state_timer == 0) {
				this.qwertyIntention("action.talk($QWERTY, perf.q.predicate($PLAYER, #and(X:verb.hear($PLAYER,$QWERTY), time.present(X))))");
			} else if (!this.game.qwertyAI.robot.isTalking()) {
				this.app.tutorialMessages.push([" Everything is pitch black, and you  ",
												" don't remember who or where you are!",
												" But you want to try to respond...   ",
												"",
												" To say something, type what you want",
												" to say, and then press ENTER.       ",
												" For example, try to say 'yes'.      ",
											    "",
											    "  [press ESC to close this message]  "]);
				this.act_intro_state = 3;
			}
			break;

		case 3:
			if (this.contextQwerty.lastPerformativeBy(this.playerID)!=null) {
				this.act_intro_state = 4;
				this.contextQwerty.popLastQuestion();	// get rid of the question in case this was not a valid answer
			} else if (this.act_intro_state_timer >= 1200) this.act_intro_state = 3;
			break;

		case 4:
			if (this.act_intro_state_timer == 0) {
				this.qwertyIntention("action.talk($QWERTY, perf.sentiment.good($PLAYER))");
				this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER, awake($PLAYER)))");
			} else if (this.act_intro_state_timer == 120) {
				this.game.eyesClosedState = 1;
				this.game.eyesClosedTimer = 0;
			} else if (this.act_intro_state_timer == 120+EYESOPEN_SPEED) {
				this.act_intro_state = 5;
			}
			break;

		case 5: // QWERTY goes to do an analysis in the computer, reports player is healthy, and goes back to the infirmary bed:
			if (this.act_intro_state_timer == 0) {
				this.qwertyIntention("action.talk($QWERTY, perf.request.action($PLAYER, #not(verb.move($PLAYER))))");
				this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER, verb.need($QWERTY, verb.do($QWERTY,[analysis]))))");
				this.game.qwertyAI.respondToPerformatives = true;	// start responding to random questions from the player
				this.game.shrdluAI.respondToPerformatives = true;	// start responding to random questions from the player
				// move to a computer:
				this.game.qwertyAI.clearCurrentAction();
				this.qwertyMoves(9*8, 25*8, this.game.qwertyAI.robot.map);
			} else if (this.act_intro_state_timer == 320) {
				// main character though:
				this.game.currentPlayer.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, 
															   "What is this place? and what am I doing here?", A4_DIRECTION_NONE, this.game);
			} else if (this.act_intro_state_timer == 560) {
				this.game.qwertyAI.clearCurrentAction();
				this.qwertyMoves(9*8, 27*8, this.game.qwertyAI.robot.map);
			} else if (this.act_intro_state_timer == 640) {
				this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER, healthy($PLAYER)))");
				let term:Term = Term.fromString("healthy('david'[#id])", this.game.ontology);
				this.game.qwertyAI.addLongTermTerm(term, PERCEPTION_PROVENANCE);
				// go back to player:
				this.game.qwertyAI.clearCurrentAction();
				this.qwertyMoves(6*8, 27*8, this.game.qwertyAI.robot.map);
			} else if (this.act_intro_state_timer == 800) this.act_intro_state = 6;
			break;

		case 6:	// QWERTY asks the player if he remembers his name
			if (this.act_intro_state_timer == 0) {
//				this.qwertyIntention("action.talk($QWERTY, perf.q.predicate($PLAYER,#and(X:verb.remember($PLAYER,#and(#query(Y), name($PLAYER,Y))), time.present(X))))");
				this.qwertyIntention("action.talk($QWERTY, perf.q.predicate($PLAYER, X:verb.remember($PLAYER,#and(#query(Y), name($PLAYER,Y)))))");
			} else {
				if (this.game.qwertyAI.intentions.length == 0 && 
					this.game.qwertyAI.queuedIntentions.length == 0 &&
					this.contextQwerty.expectingAnswerToQuestion_stack.length == 0) {
					// the question has been answered:
					let lastPerformative:NLContextPerformative = this.contextQwerty.lastPerformativeBy(this.playerID);
					if (lastPerformative.performative.functor.is_a(this.game.ontology.getSort("perf.inform.answer"))) {
						let answer:TermAttribute = lastPerformative.performative.attributes[1];
						if (answer instanceof ConstantTermAttribute) {
							if ((<ConstantTermAttribute>answer).value == "no" ||
								(<ConstantTermAttribute>answer).value == "unknown") {
								this.act_intro_state = 7;
							} else if ((<ConstantTermAttribute>answer).value == "yes") {
								this.act_intro_state = 8;
							} else {
								console.error("update_act_intro, state 5: unexpected answer " + lastPerformative.performative);
							}	
						} else {
							// this can only mean the player answered with his name
							this.act_intro_state = 9;
						}
					} else {
						// this can only mean the player answered with a statement, from which QWERTY could infer his name
						this.act_intro_state = 9;
					}
//				} else {
//					// still waiting for an answer, check for a timeout:
//					if (this.contextQwerty.expectingAnswerToQuestion_stack.length > 0) {
//						let idx:number = this.contextQwerty.expectingAnswerToQuestion_stack.length-1;
//						if (this.game.in_game_seconds - this.contextQwerty.expectingAnswerToQuestionTimeStamp_stack[idx] >= 1200) this.act_intro_state = 6;
//					}
				}
			}
			break;

		case 7:	// player says she does not remember her name, QWERTY dismisses it and moves on
			this.qwertyIntention("action.talk($QWERTY, perf.ack.ok($PLAYER))");
			this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER, #and(X:verb.remember($PLAYER), time.later(X))))");
			this.act_intro_state = 10;
			break;

		case 8:	// player says she remembers her name, QWERTY asks about it
			if (this.act_intro_state_timer == 0) {
				this.qwertyIntention("action.talk($QWERTY, perf.q.query($PLAYER, Y, name($PLAYER,Y)))");
			} else {
				if (this.game.qwertyAI.intentions.length == 0 && 
					this.game.qwertyAI.queuedIntentions.length == 0 &&
					this.contextQwerty.expectingAnswerToQuestion_stack.length == 0) {
					// the question has been answered:
					let lastPerformative:NLContextPerformative = this.contextQwerty.lastPerformativeBy(this.playerID);
					if (lastPerformative.performative.functor.is_a(this.game.ontology.getSort("perf.inform.answer"))) {
						let answer:TermAttribute = lastPerformative.performative.attributes[1];
						if (answer instanceof VariableTermAttribute) {
							if (answer.sort.name == "unknown") {
								this.act_intro_state = 7;
							} else {
								console.error("update_act_intro, state 7: unexpected answer " + lastPerformative.performative);
								this.act_intro_state = 7;
							}	
						} else {
							// this can only mean the player answered with his name
							this.act_intro_state = 9;
						}
					} else {
						// this can only mean the player answered with a statement, from which QWERTY could infer his name
						this.act_intro_state = 9;
					}
//				} else {
//					// still waiting for an answer, check for a timeout:
//					if (this.contextQwerty.expectingAnswerToQuestion_stack.length > 0) {
//						let idx:number = this.contextQwerty.expectingAnswerToQuestion_stack.length-1;
//						if (this.game.in_game_seconds - this.contextQwerty.expectingAnswerToQuestionTimeStamp_stack[idx] >= 1200) this.act_intro_state = 6;
//					}
				}
			}
			break;

		case 9:	// player says her name, QWERTY and ETAOIN memorize it, and QWERTY acknowledges and greets again
			if (this.act_intro_state_timer == 0) {
				this.qwertyIntention("action.talk($QWERTY, perf.sentiment.good($PLAYER))");
				this.qwertyIntention("action.talk($QWERTY, perf.greet($PLAYER))");		

				// tell ETAOIN the player's name:
				// ...

			} else {
				if (this.game.qwertyAI.intentions.length == 0 &&
					this.game.qwertyAI.queuedIntentions.length == 0) this.act_intro_state = 10;
			}
			break;

		case 10:	// QWERTY finally introduces himself
			if (this.act_intro_state_timer == 0) {
				this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER, name($QWERTY,'qwerty'[symbol])))");
				this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER, role($QWERTY, 'location-aurora-station'[#id], 'medic'[medic])))")
				this.qwertyIntention("action.talk($QWERTY, perf.q.predicate($PLAYER,verb.remember($PLAYER,'location-aurora-station'[#id])))");
			} else {
				if (this.game.qwertyAI.intentions.length == 0 && 
					this.game.qwertyAI.queuedIntentions.length == 0 &&
					this.contextQwerty.expectingAnswerToQuestionTimeStamp_stack.length == 0) {
					// the question has been answered:
					let lastPerformative:NLContextPerformative = this.contextQwerty.lastPerformativeBy(this.playerID);
					if (lastPerformative.performative.functor.is_a(this.game.ontology.getSort("perf.inform.answer"))) {
						let answer:TermAttribute = lastPerformative.performative.attributes[1];
						if (answer instanceof ConstantTermAttribute) {
							if ((<ConstantTermAttribute>answer).value == "no" ||
								(<ConstantTermAttribute>answer).value == "unknown") {
								this.act_intro_state = 12;
							} else if ((<ConstantTermAttribute>answer).value == "yes") {
								this.act_intro_state = 11;
							} else {
								console.error("update_act_intro, state 9: unexpected answer " + lastPerformative.performative);
								this.act_intro_state = 12;
							}	
						} else {
							console.error("update_act_intro, state 9: unexpected answer " + lastPerformative.performative);
							this.act_intro_state = 12;
						}
					} else {
						console.error("update_act_intro, state 9: unexpected answer " + lastPerformative.performative);
						this.act_intro_state = 12;
					}
//				} else {
//					// still waiting for an answer, check for a timeout:
//					if (this.contextQwerty.expectingAnswerToQuestion_stack.length > 0) {
//						let idx:number = this.contextQwerty.expectingAnswerToQuestion_stack.length-1;
//						if (this.game.in_game_seconds - this.contextQwerty.expectingAnswerToQuestionTimeStamp_stack[idx] >= 1200) this.act_intro_state = 11;
//					}
				}
			}
			break;

		case 11: // player remembers the station, so QWERTY just says good, and moves on
			if (this.act_intro_state_timer == 0) {
				this.qwertyIntention("action.talk($QWERTY, perf.sentiment.good($PLAYER))");
			} else {
				if (this.game.qwertyAI.intentions.length == 0 &&
					this.game.qwertyAI.queuedIntentions.length == 0) this.act_intro_state = 13;
			}
			break;

		case 12: // player does not remember the station, so QWERTY talks a bit, and moves on
			if (this.act_intro_state_timer == 0) {
				this.qwertyIntention("action.talk($QWERTY, perf.sentiment.bad($PLAYER))");
				this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER,#and(X:settlement('location-aurora-station'[#id])," +
																			  "#and(time.permanent(X)," +
																			  "#and(relation.purpose(X, #and(Y:[human], plural(Y))), " +
																			  "space.at(X,'aurora'[#id]))))))");
				this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER, #and(X:verb.tell('etaoin'[#id], $PLAYER), time.later(X))))");
				
			} else {
				if (this.game.qwertyAI.intentions.length == 0 &&
					this.game.qwertyAI.queuedIntentions.length == 0) this.act_intro_state = 13;
			}
			break;

		case 13: // QWERTY asks the playter to stand up
			if (this.act_intro_state_timer == 0) {
				this.qwertyIntention("action.talk($QWERTY, perf.ack.ok($PLAYER))");
				this.qwertyIntention("action.talk($QWERTY, perf.request.action($PLAYER, verb.try($PLAYER,verb.stand($PLAYER))))");
			} else if (!this.game.qwertyAI.robot.isTalking()) {
				this.act_intro_state = 14;
			}
			break;

		case 14: // player stands up
			if (this.act_intro_state_timer == 0) {
				this.game.currentPlayer.getOutOfBed(this.game);
				this.game.currentPlayer.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, 
															   "Wow! I feel very light, why?! where am I?", A4_DIRECTION_NONE, this.game);

			} else if (this.act_intro_state_timer > 60 && !this.game.currentPlayer.isTalking()) {
				this.qwertyIntention("action.talk($QWERTY, perf.sentiment.good($PLAYER))");
				this.qwertyIntention("action.talk($QWERTY, perf.request.action($PLAYER, verb.try($PLAYER,verb.walk($PLAYER))))");
				this.act_intro_state = 15;
			}
			break;

		case 15:
			if (!this.game.qwertyAI.robot.isTalking()) this.act_intro_state = 16;
			break;

		case 16:
			if (this.act_intro_state_timer == 0) {
				this.app.tutorialMessages.push([" To move around, use the arrow keys. ",
											    " For now, just walk around the room  ",
											    " and follow Qwerty's instructions.   ",
											    "",
											    "  [press ESC to close this message]  "]);
			} else {
				if (this.game.currentPlayer.state == A4CHARACTER_STATE_WALKING) this.act_intro_state = 98;
			}
			break;


		/* --------------------------------------------------------
			Tutorial part 2: walking around and interacting.
		   -------------------------------------------------------- */
		case  98:
			if (this.act_intro_state_timer == 0) {
				this.game.qwertyAI.clearCurrentAction();
				this.qwertyMoves(11*8, 30*8, this.game.qwertyAI.robot.map);	// move qwerty near the chair
				this.qwertyIntention("action.talk($QWERTY, perf.sentiment.good($PLAYER))");
			} else if (this.game.qwertyAI.robot.x == 11*8 &&
					   this.game.qwertyAI.robot.y == 30*8) {
				this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER, verb.want($QWERTY, verb.test($QWERTY, #and(C:[strength], relation.belongs(C, $PLAYER))))))");
				// 512 is the ID of the chair in the infirmary
				this.qwertyIntention("action.talk($QWERTY, perf.request.action($PLAYER, action.push($PLAYER, '512'[#id])))");

				let term:Term = Term.fromString("goal(D:'david'[#id],action.push(X, '512'[#id]))",this.game.ontology);
				this.game.qwertyAI.addLongTermTerm(term, MEMORIZE_PROVENANCE);

				let chair:A4Object = this.game.findObjectByIDJustObject("512");
				this.act_intro_chair_x = chair.x;
				this.act_intro_chair_y = chair.y;
				this.act_intro_state = 99;
			}
			break;

		case 99:
			if (!this.game.qwertyAI.robot.isTalking()) {
				this.app.tutorialMessages.push([" To push or pull objects, walk up to ",
											    " them, hold SPACE, and then press the",
											    " direction in which you want to push ",
											    " them.                               ",
											    "",
											    " Walk to the chair in the south-east ",
											    " of the room and push it now.        ",
											    "",
											    "  [press ESC to close this message]  "]);
				this.act_intro_state = 100;		
			}
			break;

		case 100:
			let chair:A4Object = this.game.findObjectByIDJustObject("512");
			if (chair.x != this.act_intro_chair_x ||
				chair.y != this.act_intro_chair_y) {
				this.act_intro_state = 101;
			}
			// give the player 15 seconds to figure it out, and otherwise, just show the tutorial message again
			if (this.act_intro_state_timer >= 1200) this.act_intro_state = 99
			break;

		case 101:
			if (this.act_intro_state_timer == 0) {
				this.qwertyIntention("action.talk($QWERTY, perf.sentiment.good($PLAYER))");
				this.qwertyIntention("action.talk($QWERTY, perf.request.action($PLAYER, verb.follow($PLAYER, $QWERTY)))");

				let term:Term = Term.fromString("goal(D:'david'[#id],verb.follow(X, 'qwerty'[#id]))",this.game.ontology);
				this.game.qwertyAI.addLongTermTerm(term, MEMORIZE_PROVENANCE);
			} else if (this.act_intro_state_timer == 180) {
				if (this.game.currentPlayer.isIdle()) {
					this.game.currentPlayer.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, 
																   "I don't know what this is all about, but let's just play along for now...", A4_DIRECTION_NONE, this.game);
					this.game.qwertyAI.clearCurrentAction();
        	        this.qwertyMoves(104, 216, this.game.qwertyAI.robot.map);
        	    } else {
        	    	this.act_intro_state_timer--;
        	    }
			} else if (this.act_intro_state_timer > 180) {
				if (!this.game.qwertyAI.robot.isTalking() &&
					!this.game.currentPlayer.isTalking()) {
                	this.act_intro_state = 102;
            	}
            }
			break;

		case 102:
            if (this.game.qwertyAI.robot.x == 104 &&
            	this.game.qwertyAI.robot.y == 216) {
            	let dx:number = this.game.qwertyAI.robot.x - this.game.currentPlayer.x;
            	let dy:number = this.game.qwertyAI.robot.y - this.game.currentPlayer.y;
            	let d2:number = (dx*dx)+(dy*dy);
            	if (d2 < 32*32) {
            		this.act_intro_state = 103;
					this.game.qwertyAI.clearCurrentAction();
            		this.qwertyMoves(136, 216, this.game.qwertyAI.robot.map);
            	}
			}
			break;

		case 103:
            if (this.game.qwertyAI.robot.x == 136 &&
            	this.game.qwertyAI.robot.y == 216) {
            	let dx:number = this.game.qwertyAI.robot.x - this.game.currentPlayer.x;
            	let dy:number = this.game.qwertyAI.robot.y - this.game.currentPlayer.y;
            	let d2:number = (dx*dx)+(dy*dy);
            	if (d2 < 32*32) {
            		this.act_intro_state = 104;
					this.game.qwertyAI.clearCurrentAction();
            		this.qwertyMoves(136, 272, this.game.qwertyAI.robot.map);
            	}
			}
			break;

		case 104:
            if (this.game.qwertyAI.robot.x == 136 &&
            	this.game.qwertyAI.robot.y == 272) {
            	let dx:number = this.game.qwertyAI.robot.x - this.game.currentPlayer.x;
            	let dy:number = this.game.qwertyAI.robot.y - this.game.currentPlayer.y;
            	let d2:number = (dx*dx)+(dy*dy);
            	if (d2 < 32*32) {
            		this.act_intro_state = 105;
					this.game.qwertyAI.clearCurrentAction();
            		this.qwertyMoves(256, 272, this.game.qwertyAI.robot.map);
            	}
			}
			break;

		case 105:
            if (this.game.qwertyAI.robot.x == 256 &&
            	this.game.qwertyAI.robot.y == 272) {
            	let dx:number = this.game.qwertyAI.robot.x - this.game.currentPlayer.x;
            	let dy:number = this.game.qwertyAI.robot.y - this.game.currentPlayer.y;
            	let d2:number = (dx*dx)+(dy*dy);
            	if (d2 < 32*32) {
            		this.act_intro_state = 106;
					this.game.qwertyAI.clearCurrentAction();
            		this.qwertyMoves(544, 272, this.game.qwertyAI.robot.map);
            	}
			}
			break;

		case 106:
            if (this.game.qwertyAI.robot.x == 544 &&
            	this.game.qwertyAI.robot.y == 272) {
            	let dx:number = this.game.qwertyAI.robot.x - this.game.currentPlayer.x;
            	let dy:number = this.game.qwertyAI.robot.y - this.game.currentPlayer.y;
            	let d2:number = (dx*dx)+(dy*dy);
            	if (d2 < 32*32) {
            		this.act_intro_state = 107;
            	}
			}
			break;

		case 107:
			if (this.act_intro_state_timer == 0) {
				this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER, relation.belongs('location-as8'[#id], $PLAYER)))");
			} else if (this.game.qwertyAI.robot.state == A4CHARACTER_STATE_IDLE) {
				this.qwertyDropsObject("communicator");
        		this.qwertyMoves(552, 272, this.game.qwertyAI.robot.map);
				this.act_intro_state = 108;
			}
			break;

		case 108:
			if (this.act_intro_state_timer == 0) {
				this.qwertyIntention("action.talk($QWERTY, perf.request.action($PLAYER, action.take($PLAYER, 'communicator'[#id])))");
				let term:Term = Term.fromString("goal(D:'david'[#id],action.take(X, 'communicator'[#id]))",this.game.ontology);
				this.game.qwertyAI.addLongTermTerm(term, MEMORIZE_PROVENANCE);
			} else if (!this.game.qwertyAI.robot.isTalking()) {
//			} else if (this.act_intro_state_timer == 180) {
				this.app.tutorialMessages.push([" To take objects, walk onto them and ",
												" press SPACE. Access your inventory  ",
												" by pressing the TAB key. Take the   ",
												" communicator now.",
											    "",
											    "  [press ESC to close this message]  "]);
				this.act_intro_state = 109;
			}
			break;

		case 109:
			for(let item of this.game.currentPlayer.inventory) {
				if (item.ID == "communicator") this.act_intro_state = 110;
			}
			break;

		case 110:
			if (this.act_intro_state_timer == 0) {
//				this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER, verb.want($ETAOIN, action.talk($ETAOIN, $PLAYER))))");
				this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER, #and(X:verb.can($PLAYER, #and(Y:action.talk($PLAYER), relation.target(Y, $ETAOIN))), relation.tool(X, 'communicator'[#id]))))");
				this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER, #and(X:verb.need($PLAYER, verb.sleep($PLAYER)), #and(time.first(X), conjunction-contrast(X)))))");
				this.qwertyIntention("action.talk($QWERTY, perf.request.action($PLAYER, #and(X:verb.go($PLAYER, verb.sleep($PLAYER)), time.now(X))))");
				this.qwertyDropsObject("bedroom5-key");
        		this.qwertyMoves(560, 272, this.game.qwertyAI.robot.map);

				let term:Term = Term.fromString("goal(D:'david'[#id],verb.go-to(X, 'verb.sleep'[verb.sleep]))",this.game.ontology);
				this.game.qwertyAI.addLongTermTerm(term, MEMORIZE_PROVENANCE);

			} else if (!this.game.qwertyAI.robot.isTalking()) {
				this.act_intro_state = 111;
			}
			break;

		case 111:
			if (this.act_intro_state_timer == 0) {
				this.app.tutorialMessages.push([" Some doors need to be operated by   ",
												" hand. Take the key card qwerty just ",
												" dropped, walk to your bedroom door  ",
												" and open it. Press SPACE when facing",
												" an object to interact with it.      ",
											    "",
											    "  [press ESC to close this message]  "]);
			} else {
				if (this.game.currentPlayer.x >= 528 && this.game.currentPlayer.x<576 &&
					this.game.currentPlayer.y >= 192 && this.game.currentPlayer.y<240) {
					// player entered bedroom 5
					this.act_intro_state = 112;
				}
			}
			break;

		case 112:
		/*
			if (this.act_intro_state_timer == 0) {
				this.app.tutorialMessages.push([" To interact with objects, just walk ",
												" on to them and press SPACE. Walk up ",
												" to your bed now and press SPACE to  ", 
												" sleep.                              ", 
											    "",
											    "  [press ESC to close this message]  "]);
			} else {
				*/
				if (this.game.currentPlayer.x >= 528 && this.game.currentPlayer.x<576 &&
					this.game.currentPlayer.y >= 192 && this.game.currentPlayer.y<240 &&
					this.game.currentPlayer.state == A4CHARACTER_STATE_IN_BED) {
					// player went to bed in bedroom 5
					this.game.currentPlayer.state = A4CHARACTER_STATE_IN_BED_CANNOT_GETUP;
					this.act_intro_state = 113;
				}
//			}
			break;

		case 113:
			if (this.act_intro_state_timer == 0) {
				this.game.eyesClosedState = 3;
				this.game.eyesClosedTimer = 0;
				this.game.textInputAllowed = false;
			} else if (this.act_intro_state_timer >= EYESOPEN_SPEED + 60) {
				// bring qwerty back to the infirmary
				this.game.requestWarp(this.game.qwertyAI.robot, this.game.qwertyAI.robot.map, 64, 216);
				// clear the user goal:
				this.game.qwertyAI.removeLongTermTermMatchingWith(Term.fromString("goal('david'[#id],X)", this.game.ontology));
				this.act_intro_state = 114;
			}
			break;

		case 114:
			if (this.act_intro_state_timer == 0) {
				this.game.in_game_seconds += 3600*7;	// sleeping for 7 hours
				this.game.narrationMessages.push("Several hours later...");
				this.game.currentPlayer.x = 560;
				this.game.currentPlayer.y = 200;
				this.game.currentPlayer.direction = A4_DIRECTION_DOWN;

			} else if (this.act_intro_state_timer == 120) {
				this.game.narrationMessages = [];
			} else if (this.act_intro_state_timer == 180) {
				this.game.eyesClosedState = 1;
				this.game.eyesClosedTimer = 0;
				this.game.textInputAllowed = false;
			} else if (this.act_intro_state_timer == 180 + EYESOPEN_SPEED) {
				this.game.currentPlayer.state = A4CHARACTER_STATE_IN_BED;
				this.game.textInputAllowed = true;
				this.act = "1";
				this.act_1_state = 0;
			}
			break;
		}

		if (this.act_intro_state >= 110 &&
			this.act_intro_state_timer > 0 &&
			this.act_intro_state_timer%(60*30) == 0) {
			if (this.game.currentPlayer.isIdle()) {
				this.game.currentPlayer.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, 
															   "I actually do feel sleepy, Qwerty was right, I should go to sleep now...", A4_DIRECTION_NONE, this.game);
			}			
		}

		if (previous_state == this.act_intro_state) {
			this.act_intro_state_timer++;
		} else {
			this.act_intro_state_timer = 0;
			this.act_intro_state_start_time = this.game.in_game_seconds;
		}
	}


	/* --------------------------------------------------------
		ACT 1: Alone?
	   -------------------------------------------------------- */
	update_act_1() 
	{
		let previous_state:number = this.act_1_state;

		if (this.contextQwerty == null) this.contextQwerty = this.game.qwertyAI.contextForSpeaker(this.playerID);
		if (this.act_1_state >= 6 && this.contextEtaoin == null) this.contextEtaoin = this.game.etaoinAI.contextForSpeaker(this.playerID);

		// check to see if the knowledge state needs to advance based on what the AI or the player say:
		if (this.act_1_state >= 6) {
			if (!this.act_1_know_etaoin_is_an_AI) {
				let p1:NLContextPerformative = this.contextEtaoin.lastPerformativeBy(this.game.etaoinAI.selfID);
				let p2:NLContextPerformative = this.contextQwerty.lastPerformativeBy(this.game.qwertyAI.selfID);
				if (p1!=null && 
					p1.timeStamp == this.game.in_game_seconds - 1) {
					let pattern:Term = Term.fromString("perf.inform.answer('david'[#id], ai('etaoin'[#id]))", this.game.ontology);
					if (p1.performative.equals(pattern)) {
						this.act_1_know_etaoin_is_an_AI = true;
						console.log("this.act_1_know_etaoin_is_an_AI = true");
					}
				}
				if (p2!=null &&
					p2.timeStamp == this.game.in_game_seconds - 1) {
					let pattern:Term = Term.fromString("perf.inform.answer('david'[#id], ai('etaoin'[#id]))", this.game.ontology);
					if (p2.performative.equals(pattern)) {
						this.act_1_know_etaoin_is_an_AI = true;
						console.log("this.act_1_know_etaoin_is_an_AI = true");
					}
				}
			}
		}

		if (!this.act_1_asked_about_being_alone_to_etaoin && this.contextEtaoin != null) {
			let p1:NLContextPerformative = this.contextEtaoin.lastPerformativeBy(this.playerID);
			if (p1 != null &&
				p1.timeStamp == this.game.in_game_seconds - 1) {	
				let perf:Term = p1.performative;
				if (this.questionAboutBeingAlone(perf)) {
					this.act_1_asked_about_being_alone_to_etaoin = true;
					console.log("this.act_1_asked_about_being_alone_to_etaoin = true");
				}
			}
		}

		if (!this.act_1_asked_about_being_alone_to_qwerty && this.contextQwerty != null) {
			let p1:NLContextPerformative = this.contextQwerty.lastPerformativeBy(this.playerID);
			if (p1 != null &&
				p1.timeStamp == this.game.in_game_seconds - 1) {	
				let perf:Term = p1.performative;
				if (this.questionAboutBeingAlone(perf)) {
					this.act_1_asked_about_being_alone_to_qwerty = true;
					console.log("this.act_1_asked_about_being_alone_to_qwerty = true");
				}
			}
		}		

		if (!this.act_1_asked_about_being_alone_to_etaoin && this.contextEtaoin != null) {
			let p1:NLContextPerformative = this.contextEtaoin.lastPerformativeBy(this.playerID);
			if (p1 != null &&
				p1.timeStamp == this.game.in_game_seconds - 1) {	
				let perf:Term = p1.performative;
				let v:TermAttribute = null;
				let queryTerms:TermAttribute[] = null;
				if (perf.functor.is_a(this.game.ontology.getSort("perf.question")) &&
					perf.attributes.length>=2 && 
					perf.attributes[1] instanceof TermTermAttribute) {
					let patterna:Term = Term.fromString("alone('david'[#id])", this.game.ontology);
					if (patterna.subsumes((<TermTermAttribute>perf.attributes[1]).term, true, new Bindings())) {
						this.act_1_asked_about_being_alone_to_etaoin = true;
						console.log("this.act_1_asked_about_being_alone_to_etaoin = true");
					}
				}
			}
		}
		if (!this.act_1_asked_about_being_alone_to_qwerty && this.contextEtaoin != null) {
			let p1:NLContextPerformative = this.contextQwerty.lastPerformativeBy(this.playerID);
			if (p1 != null &&
				p1.timeStamp == this.game.in_game_seconds - 1) {	
				let perf:Term = p1.performative;
				let v:TermAttribute = null;
				let queryTerms:TermAttribute[] = null;
				if (perf.functor.is_a(this.game.ontology.getSort("perf.question")) &&
					perf.attributes.length>=2 && 
					perf.attributes[1] instanceof TermTermAttribute) {
					let patterna:Term = Term.fromString("alone('david'[#id])", this.game.ontology);
					if (patterna.subsumes((<TermTermAttribute>perf.attributes[1]).term, true, new Bindings())) {
						this.act_1_asked_about_being_alone_to_qwerty = true;
						console.log("this.act_1_asked_about_being_alone_to_qwerty = true");
					}
				}
			}
		}

		let act_1_asked_about_bruce_alper_to_anyone:boolean = false;
		let act_1_asked_about_corpse_to_anyone:boolean = false;
		for(let i:number = 0;i<3;i++) {
			if (this.act_1_asked_about_bruce_alper[i]) act_1_asked_about_bruce_alper_to_anyone = true;
			if (this.act_1_asked_about_corpse[i]) act_1_asked_about_corpse_to_anyone = true;
		}
		for(let i:number = 0;i<3;i++) {
			let name:string = "Etaoin";
			let ctx:NLContext = this.contextEtaoin;
			if (i == 1) {
				ctx = this.contextQwerty;
				name = "Qwerty";
			}
			if (i == 2) {
				ctx = this.contextShrdlu;
				name = "Shrdlu";
			}
			if (ctx != null) {
				let p1:NLContextPerformative = ctx.lastPerformativeBy(this.playerID);
				let p2:NLContextPerformative = ctx.lastPerformativeBy(ctx.ai.selfID);
				if (p2 != null && 
					p2.timeStamp == this.game.in_game_seconds - 1 &&
					p1 != null) {
					if (!this.act_1_asked_about_bruce_alper[i]) {
						let patternq:Term = Term.fromString("perf.q.whois.name(X:[any], Y:[any], name(Y, 'bruce alper'[symbol]))", this.game.ontology);
						let patterna:Term = Term.fromString("perf.inform.answer('david'[#id], 'unknown'[symbol])", this.game.ontology);
						let perfq:Term = p1.performative;
						let perfa:Term = p2.performative;
						if (patternq.subsumes(perfq, true, new Bindings()) &&
							patterna.subsumes(perfa, true, new Bindings())) {
							// asked about bruce!
							this.act_1_asked_about_bruce_alper[i] = true;
							if (act_1_asked_about_bruce_alper_to_anyone) {
								this.queueThoughtBubble(name + " doesn't know about Bruce Alper either...");
							} else {
								this.queueThoughtBubble(name + " doesn't know about Bruce Alper, how come?!")
							}
						}
					}
					if (!this.act_1_asked_about_corpse[i]) {
						let patternq:Term = Term.fromString("perf.q.whois.noname(X:[any], 'corpse'[#id])", this.game.ontology);
						let patterna:Term = Term.fromString("perf.inform.answer('david'[#id], 'unknown'[symbol])", this.game.ontology);
						let perfq:Term = p1.performative;
						let perfa:Term = p2.performative;
						if (patternq.subsumes(perfq, true, new Bindings()) &&
							patterna.subsumes(perfa, true, new Bindings())) {
							// asked about bruce!
							this.act_1_asked_about_corpse[i] = true;
							if (act_1_asked_about_corpse_to_anyone) {
								this.queueThoughtBubble(name + " doesn't know about the corpse either...");
							} else {
								this.queueThoughtBubble("Hmm... " + name + " doesn't know about the corpse. How strange! Maybe finding Shrdlu will clarify things!")
							}
						}
					}
				}
			}

				// perf.q.whois.name(LISTENER_0:[any], V_0:[any], V2:name(V_0, V3:'bruce alper'[symbol]))
				// perf.inform.answer(V0:'david'[#id], V1:'unknown'[symbol])

			
		}

		switch(this.act_1_state) {
		case 0:
			if (this.act_1_state_timer == 0) {
				this.game.etaoinAI.respondToPerformatives = true;	// start responding to random questions from the player
			} else {
				if (this.game.currentPlayer.state == A4CHARACTER_STATE_IDLE) this.act_1_state = 1;
			}
			break;

		case 1:
			if (this.act_1_state_timer == 30) {
				if (this.game.currentPlayer.isIdle()) {
					this.game.currentPlayer.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, 
																   "I feel better now and gotten used to feeling lighter, but still don't know what is this place...", A4_DIRECTION_NONE, this.game);
				} else {
					this.act_1_state_timer--;	// wait until player is idle!
				}
			} else if (this.act_1_state_timer > 30 && this.game.currentPlayer.isIdle()) {
				this.act_1_state = 2;
			}
			break;

		case 2:
			if (this.act_1_state_timer == 0) {
				if (this.game.currentPlayer.isIdle()) {
					this.game.currentPlayer.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, 
																   "The last thing I remember is getting into stasis...", A4_DIRECTION_NONE, this.game);
				} else {
					this.act_1_state_timer--;	// wait until player is idle!
				}
			} else if (this.act_1_state_timer > 0 && this.game.currentPlayer.isIdle()) {
				this.act_1_state = 3;
			}
			break;

		case 3:
			if (this.act_1_state_timer == 0) {
				if (this.game.currentPlayer.isIdle()) {
					this.game.currentPlayer.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, 
																   "Maybe this Etaoin person can answer my questions...", A4_DIRECTION_NONE, this.game);
				} else {
					this.act_1_state_timer--;	// wait until player is idle!
				}
			} else if (this.act_1_state_timer > 0 && this.game.currentPlayer.isIdle()) {
				this.act_1_state = 4;
			}
			break;

		case 4:
			this.app.tutorialMessages.push([" If you have the communicator or are ",
											" anywhere within Aurora Station, you ",
											" can talk to Etaoin by first calling ",
											" his attention. For example, you can ",
											" say \"Hi Etaoin!\", and from then on, ",
											" you can ask Etaoin questions.       ",
										    "",
										    "  [press ESC to close this message]  "]);
			this.act_1_state = 5;
			break;

		case 5:
			// waiting for player to start talking to ETAOIN:
			if (this.game.etaoinAI.contextForSpeakerWithoutCreatingANewOne(this.playerID) != null) this.act_1_state = 6;
			if (this.act_1_state_timer >= 600) this.act_1_state = 4;
			break;

		case 6:
			// counting useless answers by etaoin or player getting tired:
			let p1:NLContextPerformative = this.contextEtaoin.lastPerformativeBy(this.game.etaoinAI.selfID);
			let p2:NLContextPerformative = this.contextEtaoin.lastPerformativeBy(this.playerID);
			if (p1!=null) {
				if (p1.timeStamp == this.game.in_game_seconds - 1) {
					// it just happened:
//					console.log("6: p1.performative.functor.name = " + p1.performative.functor.name);
					if (p1.performative.functor.name == "perf.inform.parseerror") this.act_1_number_of_useless_etaoin_answers++;
					if (p1.performative.functor.name == "perf.inform.answer" &&
						p1.performative.attributes[1] instanceof ConstantTermAttribute &&
						(<ConstantTermAttribute>p1.performative.attributes[1]).value == 'unknown') this.act_1_number_of_useless_etaoin_answers++;
					if (this.act_1_number_of_useless_etaoin_answers >= 4) this.act_1_state = 7;
				} else if (this.game.in_game_seconds - p1.timeStamp > 1200) {
					this.act_1_state = 7;
				}
			}
			if (p2!=null) {
				if (p2.performative.functor.name == "perf.farewell") {
					this.act_1_state = 7;
				}
			}

			if (this.act_1_asked_about_being_alone_to_etaoin &&
				this.game.etaoinAI.inferenceProcesses.length == 0) this.act_1_state = 12;
			if (this.act_1_asked_about_being_alone_to_qwerty &&
				this.game.etaoinAI.inferenceProcesses.length == 0 &&
				this.game.qwertyAI.inferenceProcesses.length == 0) this.act_1_state = 13;
			break;

		case 7:
			if (this.game.currentPlayer.isIdle()) {
				this.game.currentPlayer.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, 
															   "Etaoin doesn't seem very useful...", A4_DIRECTION_NONE, this.game);
				this.act_1_state = 8;
			}
			break;

		case 8:
			if (this.game.currentPlayer.isIdle()) {
				this.game.currentPlayer.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, 
															   "Maybe I should try to see if there is someone else in the station...", A4_DIRECTION_NONE, this.game);
				this.act_1_state = 9;
				this.act_1_explored_rooms = [];
			}
			break;

		case 9:
			if (this.game.currentPlayer.isIdle()) {
				let currentRoom:AILocation = this.game.getAILocation(this.game.currentPlayer);
				if (currentRoom != null) {
					let name:string = currentRoom.name;
					if (name == null) name = currentRoom.sort.name;
					if (name.indexOf("corridor") == -1 &&
						name != "infirmary" &&
						name != "bedroom 5" &&
						name != "aurora station") {
						if (this.act_1_explored_rooms.indexOf(name) == -1) {
							let messages:string[] = ["There is no one here...",
													 "No one here either...",
													 "no one here, let's keep looking...",
													 "Empty as well?! Ok, let's check one more room..."];
							if (this.act_1_explored_rooms.length < 4) {
								this.game.currentPlayer.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, 
																			   messages[this.act_1_explored_rooms.length], A4_DIRECTION_NONE, this.game);
								this.act_1_explored_rooms.push(name);
							} else {
								this.game.currentPlayer.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, 
																			   "Wait, is there actually any other human in this station? I should ask Etaoin!", A4_DIRECTION_NONE, this.game);
								this.act_1_state = 10;
							}
						}
					}
				}

				if (this.act_1_asked_about_being_alone_to_etaoin &&
					this.game.etaoinAI.inferenceProcesses.length == 0) this.act_1_state = 12;
				if (this.act_1_asked_about_being_alone_to_qwerty &&
					this.game.etaoinAI.inferenceProcesses.length == 0 &&
					this.game.qwertyAI.inferenceProcesses.length == 0) this.act_1_state = 13;
			}
			break;

		case 10:
			if (this.game.currentPlayer.isIdle()) {
				if (!this.act_1_know_etaoin_is_an_AI) {
					this.game.currentPlayer.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, 
																   "And who is this Etaoin anyway?", A4_DIRECTION_NONE, this.game);
					this.act_1_state = 11;
				} else {
					this.act_1_state = 11;
				}
			}
			break;

		case 11:
			// waiting for player to ask about other humans (and for etaoin not to be answering anything):
			if (this.act_1_asked_about_being_alone_to_etaoin &&
				this.game.etaoinAI.inferenceProcesses.length == 0) this.act_1_state = 12;
			if (this.act_1_asked_about_being_alone_to_qwerty &&
				this.game.etaoinAI.inferenceProcesses.length == 0 &&
				this.game.qwertyAI.inferenceProcesses.length == 0) this.act_1_state = 13;
			break;

		case 12:
			// question was asked to Etaoin
			// wait a bit
			if (this.act_1_state_timer == 300) {
				if (!this.contextEtaoin.inConversation) {
					this.etaoinSays("perf.callattention('david'[#id])");
				}
				this.etaoinSays("perf.inform(D:'david'[#id],#and(V:verb.run('etaoin'[#id], [analysis]), #and(relation.effect(V, #and(Q:[perf.question], #and(relation.owns(D, Q), plural(Q)))), time.past(V))))");
				this.etaoinSays("perf.inform('david'[#id],#and(V:verb.find(E:'etaoin'[#id], X:[anomaly]), #and(time.past(V), space.at(V, M:'etaoin-memory'[#id]))))");
			} else if (this.act_1_state_timer > 300) {
				if (this.game.etaoinAI.intentions.length == 0 &&
					this.game.etaoinAI.queuedIntentions.length == 0) this.act_1_state = 14;
			}
			break;

		case 13:
			// question was asked to qwerty
			// wait a bit
			if (this.act_1_state_timer == 300) {
				if (!this.contextEtaoin.inConversation) {
					this.etaoinSays("perf.callattention('david'[#id])");
				}
				this.etaoinSays("perf.inform(D:'david'[#id],#and(V:verb.run('etaoin'[#id], [analysis]), #and(relation.effect(V, #and(Q:[perf.question], #and(relation.owns(D, Q), #and(relation.target(Q, 'qwerty'[#id]), plural(Q))))), time.past(V))))");
				this.etaoinSays("perf.inform('david'[#id],#and(V:verb.find(E:'etaoin'[#id], X:[anomaly]), #and(time.past(V), space.at(V, M:'etaoin-memory'[#id]))))");
			} else if (this.act_1_state_timer > 300) {
				if (this.game.etaoinAI.intentions.length == 0 &&
					this.game.etaoinAI.queuedIntentions.length == 0) this.act_1_state = 14;
			}
			break;
		
		case 14:
			if (this.act_1_state_timer == 0) {
				let term:Term = Term.fromString("erased('etaoin-memory'[#id])", this.game.ontology);
				this.game.etaoinAI.addLongTermTerm(term, PERCEPTION_PROVENANCE);
				this.etaoinSays("perf.inform('david'[#id], #and(V:verb.find(E:'etaoin'[#id], #and(P1:erased(M:'etaoin-memory'[#id]), time.past(P1))), time.past(V)))");
				this.etaoinSays("perf.inform('david'[#id], verb.need('etaoin'[#id], verb.look-at('shrdlu'[#id],'etaoin-memory'[#id])))");

				let term1:Term = Term.fromString("verb.happen('etaoin'[#id], erased('etaoin-memory'[#id]))", this.game.ontology);
				this.game.etaoinAI.addLongTermTerm(term1, PERCEPTION_PROVENANCE);
				this.game.qwertyAI.addLongTermTerm(term1, PERCEPTION_PROVENANCE);
				let term2:Term = Term.fromString("property.problem('etaoin'[#id], erased('etaoin-memory'[#id]))", this.game.ontology);
				this.game.etaoinAI.addLongTermTerm(term2, PERCEPTION_PROVENANCE);
				this.game.qwertyAI.addLongTermTerm(term2, PERCEPTION_PROVENANCE);
				let term3:Term = Term.fromString("property.strange(erased('etaoin-memory'[#id]))", this.game.ontology);
				this.game.etaoinAI.addLongTermTerm(term3, PERCEPTION_PROVENANCE);
				this.game.qwertyAI.addLongTermTerm(term3, PERCEPTION_PROVENANCE);
			} else {
				if (this.game.etaoinAI.intentions.length == 0 &&
					this.game.etaoinAI.queuedIntentions.length == 0) this.act_1_state = 15;
			}
			break;

		case 15:
			if (this.act_1_state_timer == 0) {
				if (!this.contextEtaoin.inConversation) {
					this.etaoinSays("perf.callattention('david'[#id])");
				}
				this.etaoinSays("perf.q.action('david'[#id], verb.find('david'[#id], 'shrdlu'[#id]))");
			} else {
				// waiting for an answer from the player to "would you please find shrdlu?"
				let p:NLContextPerformative = this.contextEtaoin.lastPerformativeBy(this.playerID);
				if (p!=null) {
					if (p.timeStamp == this.game.in_game_seconds - 1) {
						if (p.performative.functor.is_a(this.game.ontology.getSort("perf.inform.answer")) &&
							this.game.etaoinAI.intentions.length == 0 &&
							this.game.etaoinAI.queuedIntentions.length == 0 &&
							this.contextEtaoin.expectingAnswerToQuestion_stack.length == 0) {
							let answer:TermAttribute = p.performative.attributes[1];
							if (answer instanceof ConstantTermAttribute) {
								if ((<ConstantTermAttribute>answer).value == "no" ||
									(<ConstantTermAttribute>answer).value == "unknown") {
									this.act_1_state = 16;
								} else if ((<ConstantTermAttribute>answer).value == "yes") {
									this.act_1_state = 18;
								} else {
									console.error("update_act_1, state 14: unexpected answer " + p.performative);
								}	
							} else {
								// this can only mean the player answered with his name
								this.act_1_state = 8;
							}
						} else if (p.performative.functor.is_a(this.game.ontology.getSort("perf.ack.ok"))) {
							this.act_1_state = 18;
						}						
					}
				}
			}
			break;

		case 16:
			// player said she will not want to go search for SHRDLU:
			if (this.act_1_state_timer == 0) {
				this.etaoinSays("perf.ack.ok('david'[#id])");
			} else if (this.act_1_state_timer == 60*60) {	// after one minute, try again
				this.act_1_state = 15;
			}
			break;

		// state 17 used to be necessary, but was removed, since the AI now handles it automatically

		case 18:
			// player agreed to go search for SHRDLU:
			if (this.act_1_state_timer == 0) {
				this.etaoinSays("perf.thankyou('david'[#id])");
				this.etaoinSays("perf.inform('david'[#id], #and(V:verb.go-to(E:'shrdlu'[#id], 'location-east-cave'[#id]), #and(relation.purpose(V, verb.gather(E, #and(M:[mineral], plural(M)))), time.past(V))))");
				this.etaoinSays("perf.inform('david'[#id], #and(#not(V:verb.come-back(E:'shrdlu'[#id])), time.past(V)))");
				this.etaoinSays("perf.request.action('david'[#id], #and(V1:action.take('david'[#id], 'garage-rover'[#id]), relation.purpose(V1, verb.find('david'[#id],'shrdlu'[#id]))))");
				this.etaoinSays("perf.inform('david'[#id], space.at('garage-rover'[#id], 'location-garage'[#id]))");
				this.etaoinSays("perf.inform('david'[#id], verb.have('qwerty'[#id], 'garage-key'[#id]))");

				// the player now has the goal to find shrdlue:
				let term:Term = Term.fromString("goal(D:'david'[#id],verb.find(X, 'shrdlu'[#id]))",this.game.ontology);
				this.game.etaoinAI.addLongTermTerm(term, MEMORIZE_PROVENANCE);

				// tell qwerty it can give the key to the player:
				let idx:number = this.game.qwertyAI.objectsNotAllowedToGive.indexOf("garage-key");
				this.game.qwertyAI.objectsNotAllowedToGive.splice(idx,1);
				this.game.shrdluAI.allowPlayerInto("location-garage", "GARAGE");
				this.game.qwertyAI.allowPlayerInto("location-garage", "GARAGE");
				this.game.etaoinAI.allowPlayerInto("location-garage", "GARAGE");
				this.act_1_state = 19;
			}
			break;

		case 19:
			// detect when player asks about where are the tools:
			if (!this.act_1_asked_about_tools && this.contextEtaoin != null) {
				let p1:NLContextPerformative = this.contextEtaoin.lastPerformativeBy(this.playerID);
				if (p1 != null &&
					p1.timeStamp == this.game.in_game_seconds - 1) {	
					let perf:Term = p1.performative;
					let v:TermAttribute = null;
					let queryTerms:TermAttribute[] = null;
					if (perf.functor.is_a(this.game.ontology.getSort("perf.q.whereis"))) {
						v = perf.attributes[1];
						if (v instanceof ConstantTermAttribute) {
							queryTerms = [v];
						} else if (v instanceof TermTermAttribute) {
							let query:Term = (<TermTermAttribute>v).term;
							queryTerms = NLParser.elementsInList(query, "#and");							
						}
					}
					if (queryTerms != null) {
						let toolsFound:boolean = false;
						for(let ta of queryTerms) {
							if ((ta instanceof ConstantTermAttribute) &&
								(<ConstantTermAttribute>ta).value == "wrench") toolsFound = true;
							if ((ta instanceof ConstantTermAttribute) &&
								(<ConstantTermAttribute>ta).value == "screwdriver") toolsFound = true;
							if ((ta instanceof TermTermAttribute) &&
								(<TermTermAttribute>ta).term.functor.name == "tool") toolsFound = true;
						}
						if (toolsFound) {
							this.act_1_asked_about_tools = true;
//							console.log("this.act_1_asked_about_tools = true");
							this.etaoinSays("perf.inform('david'[#id], verb.have('qwerty'[#id], 'maintenance-key'[#id]))");
							let idx:number = this.game.qwertyAI.objectsNotAllowedToGive.indexOf("maintenance-key");
							this.game.qwertyAI.objectsNotAllowedToGive.splice(idx,1);
							this.game.shrdluAI.allowPlayerInto("location-maintenance","MAINTENANCE");
							this.game.qwertyAI.allowPlayerInto("location-maintenance","MAINTENANCE");
							this.game.etaoinAI.allowPlayerInto("location-maintenance","MAINTENANCE");
						}
					}
				}
			}

			if (!this.act_1_asked_about_battery && this.contextEtaoin != null) {
				let p1:NLContextPerformative = this.contextEtaoin.lastPerformativeBy(this.playerID);
				if (p1 != null &&
					p1.timeStamp == this.game.in_game_seconds - 1) {	
					let perf:Term = p1.performative;
					if (perf.functor.is_a(this.game.ontology.getSort("perf.inform")) &&
						perf.attributes.length>1 &&
						perf.attributes[1] instanceof TermTermAttribute) {
						let argument:Term = (<TermTermAttribute>(perf.attributes[1])).term;
						let pattern1:Term = Term.fromString("empty('empty-battery'[#id])", this.game.ontology);
						let b:Bindings = new Bindings();
						if (pattern1.subsumes(argument, true, b)) {
							this.act_1_asked_about_battery = true;
							console.log("update_act_1, state 19: detected battery is empty 1");
							this.etaoinSays("perf.inform('david'[#id], verb.can('david'[#id], #and(F:verb.fill('david'[#id], 'empty-battery'[#id]), space.at(F,'location-powerplant'[#id]) )))");
						}						
					} else if (perf.functor.is_a(this.game.ontology.getSort("perf.q.predicate")) &&
							   perf.attributes.length>1 &&
							   perf.attributes[1] instanceof TermTermAttribute) {
						let argument:Term = (<TermTermAttribute>(perf.attributes[1])).term;
						let pattern1:Term = Term.fromString("battery(V)", this.game.ontology);
						let pattern2:Term = Term.fromString("#and(full(V:[any]), V4:battery(V))", this.game.ontology);
						let b:Bindings = new Bindings();
						if (pattern1.subsumes(argument, true, b) ||
							pattern2.subsumes(argument, true, b)) {
							this.act_1_asked_about_battery = true;
							console.log("update_act_1, state 19: detected battery is empty 2");
							this.etaoinSays("perf.inform('david'[#id], verb.can('david'[#id], #and(F:verb.fill('david'[#id], #and(BATTERY:[battery], plural(BATTERY))), space.at(F,'location-powerplant'[#id]) )))");
						}						
					} else if (perf.functor.is_a(this.game.ontology.getSort("perf.q.whereis")) &&
							   perf.attributes.length == 3 &&
							   (perf.attributes[1] instanceof VariableTermAttribute) &&
							   perf.attributes[2] instanceof TermTermAttribute) {
						let argument:Term = (<TermTermAttribute>(perf.attributes[2])).term;
						let pattern1:Term = Term.fromString("battery(V)", this.game.ontology);
						let pattern2:Term = Term.fromString("#and(full(V:[any]), V4:battery(V))", this.game.ontology);
						let b:Bindings = new Bindings();
						if (pattern1.subsumes(argument, true, b) ||
							pattern2.subsumes(argument, true, b)) {
							this.act_1_asked_about_battery = true;
							console.log("update_act_1, state 19: detected battery is empty 3");
							this.etaoinSays("perf.inform('david'[#id], verb.can('david'[#id], #and(F:verb.fill('david'[#id], #and(BATTERY:[battery], plural(BATTERY))), space.at(F,'location-powerplant'[#id]) )))");
						}						
					}
				}				
			}

			// detect when player mentions the spacesuit is broken:
			if (!this.act_1_stated_spacesuit_is_broken && this.contextEtaoin != null) {
				let p1:NLContextPerformative = this.contextEtaoin.lastPerformativeBy(this.playerID);
				if (p1 != null &&
					p1.timeStamp == this.game.in_game_seconds - 1) {	
					let perf:Term = p1.performative;
					if (perf.functor.is_a(this.game.ontology.getSort("perf.inform")) &&
						perf.attributes.length>1 &&
						perf.attributes[1] instanceof TermTermAttribute) {
						let argument:Term = (<TermTermAttribute>(perf.attributes[1])).term;
						let pattern1:Term = Term.fromString("property.broken('spacesuit'[#id])", this.game.ontology);
						let pattern2:Term = Term.fromString("#and(verb.have(V1:'spacesuit'[#id], T:[#id]), tear(T))", this.game.ontology)
						let b:Bindings = new Bindings();
						if (pattern1.subsumes(argument, true, b) ||
							pattern2.subsumes(argument, true, b)) {
							this.act_1_stated_spacesuit_is_broken = true;
//							console.log("update_act_1, state 19: detected spacesuit is broken");
							this.etaoinSays("perf.inform('david'[#id], verb.can('qwerty'[#id], verb.repair('qwerty'[#id], 'spacesuit'[#id])))");
						}						
					} else if ((perf.functor.is_a(this.game.ontology.getSort("perf.q.action")) ||
						 	    perf.functor.is_a(this.game.ontology.getSort("perf.request.action"))) &&
							   perf.attributes.length>1 &&
		  					   perf.attributes[1] instanceof TermTermAttribute) {
						let argument:Term = (<TermTermAttribute>(perf.attributes[1])).term;
						let pattern1:Term = Term.fromString("verb.repair('etaoin'[#id],'spacesuit'[#id])", this.game.ontology);
						let b:Bindings = new Bindings();
						if (pattern1.subsumes(argument, true, b)) {
							this.act_1_stated_spacesuit_is_broken = true;
//							console.log("update_act_1, state 19: detected spacesuit is broken");
							this.etaoinSays("perf.inform('david'[#id], verb.can('qwerty'[#id], verb.repair('qwerty'[#id], 'spacesuit'[#id])))");
						}						
					} else if (perf.functor.is_a(this.game.ontology.getSort("perf.q.whereis")) &&
							   perf.attributes.length == 3 &&
							   (perf.attributes[1] instanceof ConstantTermAttribute) &&
							   perf.attributes[2] instanceof TermTermAttribute) {
						let argument:Term = (<TermTermAttribute>(perf.attributes[2])).term;
						let pattern1:Term = Term.fromString("V2:#and(V3:verb.can(V1, V4:verb.repair(V1, V5:'hypothetical-object'[#id])), V6:spacesuit(V5))", this.game.ontology);
						let pattern2:Term = Term.fromString("V2:verb.can(V1, V3:verb.repair(V1, V4:'spacesuit'[#id]))", this.game.ontology);
						let b:Bindings = new Bindings();
						if (pattern1.subsumes(argument, true, b) ||
							pattern2.subsumes(argument, true, b)) {
							this.act_1_stated_spacesuit_is_broken = true;
//							console.log("update_act_1, state 19: detected spacesuit is broken");
							this.etaoinSays("perf.inform('david'[#id], verb.can('qwerty'[#id], verb.repair('qwerty'[#id], 'spacesuit'[#id])))");
						}
					}
				}
			}

			// end of act 1!
			if (this.game.currentPlayer.isIdle() && 
				this.game.getStoryStateVariable("act") == "act2") {
				this.game.introact_request = 2;
			}
			break;
		}

		this.qwertyAgendaUpdate();

		if (previous_state == this.act_1_state) {
			this.act_1_state_timer++;
		} else {
			this.act_1_state_timer = 0;
			this.act_1_state_start_time = this.game.in_game_seconds;
		}

		previous_state = this.act_1_stasis_thread_state;
		switch(this.act_1_stasis_thread_state) {
			case 0: // no progress in this thread yet
				// detect when the player has asked qwerty to fix the broken space suit:
				if (this.playerAsksQwertyToFixSpacesuit()) {
					let target_l:A4Object[] = this.game.findObjectByID("spacesuit");
					let weCanGetIt:boolean = false;
					if (target_l != null && target_l.length == 1 &&
						this.game.qwertyAI.canSee("spacesuit")) weCanGetIt = true;
					if (target_l != null && target_l.length == 2 && 
						(target_l[0] == this.game.qwertyAI.robot ||
						 target_l[0] == this.game.currentPlayer)) weCanGetIt = true;
					if (weCanGetIt) {
						this.act_1_stasis_thread_state = 1;
					} else {
						this.act_1_stasis_thread_state = 0;
						this.game.qwertyAI.respondToPerformatives = true;
						// I do not see the spacvesuit:
						this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER, #not(verb.see($QWERTY, 'spacesuit'[#id]))))");
					}
				}
				break;

			// qwerty has been asked to repair the space suit
			case 1:
				if (this.act_1_stasis_thread_state_timer == 0) {
					this.game.qwertyAI.respondToPerformatives = false;	// to prevent the player messing up with the sequence
					this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER, #and(V:verb.repair($QWERTY, 'spacesuit'[#id]), time.future(V)) ))");
					// clear whatever qwerty is doing now:
				    this.game.qwertyAI.currentAction = null;
				    this.game.qwertyAI.currentAction_requester = null;
				    this.game.qwertyAI.currentAction_scriptQueue = null;
				    this.game.qwertyAI.currentActionHandler = null;

					let currentRoom:AILocation = this.game.getAILocation(this.game.qwertyAI.robot);
					if (currentRoom.id != "location-as25") {
						// if we are not in the infirmary, qwerty asks the player to follow it:
						this.qwertyIntention("action.talk($QWERTY, perf.request.action(V0:$PLAYER, verb.follow(V0, $QWERTY)))");
					}
				} else {
					if (this.game.qwertyAI.robot.isIdle() &&
						this.game.qwertyAI.intentions.length == 0 && 
						this.game.qwertyAI.queuedIntentions.length == 0 &&
						this.contextQwerty.expectingAnswerToQuestion_stack.length == 0) {
						this.act_1_stasis_thread_state = 2;
					}					
				}
				break;

			// go towards david to take the suit:
			case 2:
				let target_l:A4Object[] = this.game.findObjectByID("spacesuit");
				if (target_l == null) {
					this.act_1_stasis_thread_state = 0;
					this.game.qwertyAI.respondToPerformatives = true;
				} else {
					let x1:number = this.game.qwertyAI.robot.x;
					let y1:number = this.game.qwertyAI.robot.y+this.game.qwertyAI.robot.tallness;
					let x2:number = target_l[0].x;
					let y2:number = target_l[0].y+target_l[0].tallness;
					let d:number = Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));
					if (target_l.length == 1) {
						// the spacesuit is in the floor:
						if (d>0) {
							this.game.qwertyAI.robot.AI.addPFTargetObject(A4CHARACTER_COMMAND_IDLE, 10, false, target_l[0]);
						} else {
							if (this.game.qwertyAI.robot.takeAction(this.game)) {
								this.act_1_stasis_thread_state = 3;
							} else {
								this.act_1_stasis_thread_state = 0;
								this.game.qwertyAI.respondToPerformatives = true;
							}
						}
					} else {
						// someone has the spacesuit (this could be qwerty itself):
						if (d>16) {
							this.game.qwertyAI.robot.AI.addPFTargetObject(A4CHARACTER_COMMAND_IDLE, 10, false, target_l[0]);
						} else {
							if (target_l[0] instanceof A4Character) {
								// assume spacesuit is target_l[1]!!!
				                (<A4Character>(target_l[0])).removeFromInventory(target_l[1]);
				                this.game.qwertyAI.robot.addObjectToInventory(target_l[1], this.game);
								this.act_1_stasis_thread_state = 3;
								this.game.playSound("data/sfx/itemPickup.wav");
							} else {
								this.act_1_stasis_thread_state = 0;
								this.game.qwertyAI.respondToPerformatives = true;
							}
						}
					}
				}
				break;

			case 3:
				// qwerty has the spacesuit!:
				if (this.act_1_stasis_thread_state_timer == 0) {
					this.qwertyMoves(5*8, 24*8, this.game.qwertyAI.robot.map);
				} else {
					if (this.game.qwertyAI.robot.x == 5*8 &&
						this.game.qwertyAI.robot.y == 24*8) {
						// wait for the player:
						let currentRoom:AILocation = this.game.getAILocation(this.game.currentPlayer);
						if (currentRoom.id == "location-as25") {
							this.qwertyIntention("action.talk($QWERTY, perf.request.action(V0:$PLAYER, verb.wait(V0, [space.here])))");
							this.act_1_stasis_thread_state = 4;
						}
					} 
				}
				break;

			case 4:
				if (this.game.qwertyAI.robot.isIdle() &&
					this.game.qwertyAI.intentions.length == 0 && 
					this.game.qwertyAI.queuedIntentions.length == 0 &&
					this.contextQwerty.expectingAnswerToQuestion_stack.length == 0) {
					// open the door:
					this.game.qwertyAI.robot.issueCommandWithArguments(A4CHARACTER_COMMAND_INTERACT, -1, A4_DIRECTION_UP, null, this.game);
					this.act_1_stasis_thread_state = 5;
				}					
				break;

			case 5:
				// go to the shelves and wait!:
				if (this.act_1_stasis_thread_state_timer == 0) {
					this.qwertyMoves(4*8, 15*8, this.game.qwertyAI.robot.map);
				} else {
					if (this.game.qwertyAI.robot.x == 4*8 &&
						this.game.qwertyAI.robot.y == 15*8) {
						this.act_1_stasis_thread_state = 6;
					}
				}
				break;

			case 6:
				// wait a bit
				if (this.act_1_stasis_thread_state_timer == 180) this.act_1_stasis_thread_state = 7;
				break;

			case 7:
				// give the suit back to the player
				let x1:number = this.game.qwertyAI.robot.x;
				let y1:number = this.game.qwertyAI.robot.y;
				let x2:number = this.game.currentPlayer.x;
				let y2:number = this.game.currentPlayer.y;
				let d:number = Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));
				if (d>16) {
					this.game.qwertyAI.robot.AI.addPFTargetObject(A4CHARACTER_COMMAND_IDLE, 10, false, this.game.currentPlayer);
				} else {
					// give the space suit:
					let idx:number = 0;
					for(let i:number = 0;i<this.game.qwertyAI.robot.inventory.length;i++) {
						if (this.game.qwertyAI.robot.inventory[i].ID == "spacesuit") {
							idx = i;
							break;
						}
					}
					this.game.qwertyAI.robot.inventory.splice(idx,1);
					let fixedSuit:A4Object = this.game.objectFactory.createObject("workingspacesuit", this.game, false, false);
					fixedSuit.ID = "spacesuit";
					this.game.currentPlayer.addObjectToInventory(fixedSuit, this.game);
					// replace the background knowledge:
					for(let ai of [this.game.etaoinAI, this.game.qwertyAI, this.game.shrdluAI]) {
						let se:SentenceEntry = ai.longTermMemory.findSentenceEntry(Sentence.fromString("brokenspacesuit('spacesuit'[#id])", this.game.ontology));
						if (se != null) se.sentence.terms[0].functor = this.game.ontology.getSort("workingspacesuit");
					}
			        this.game.currentPlayer.map.addPerceptionBufferRecord(new PerceptionBufferRecord("give", this.game.qwertyAI.robot.ID, this.game.qwertyAI.robot.sort,
			                this.game.currentPlayer.ID, this.game.currentPlayer.sort, null,
			                fixedSuit.ID, fixedSuit.sort,
			                this.game.qwertyAI.robot.x, this.game.qwertyAI.robot.y+this.game.qwertyAI.robot.tallness, this.game.qwertyAI.robot.x+this.game.qwertyAI.robot.getPixelWidth(), this.game.qwertyAI.robot.y+this.game.qwertyAI.robot.getPixelHeight()));
			        this.game.currentPlayer.eventWithObject(A4_EVENT_RECEIVE, this.game.qwertyAI.robot, fixedSuit, this.game.currentPlayer.map, this.game);
			        this.game.qwertyAI.robot.eventWithObject(A4_EVENT_ACTION_GIVE, this.game.currentPlayer, fixedSuit, this.game.currentPlayer.map, this.game);					
					this.game.playSound("data/sfx/itemPickup.wav");
					this.game.in_game_actions_for_log.push(["give("+this.game.qwertyAI.selfID+","+fixedSuit.ID+","+this.game.currentPlayer.ID+")",""+this.game.in_game_seconds]);
					this.game.qwertyAI.respondToPerformatives = true;
					this.act_1_stasis_thread_state = 8;
				}
				break

			case 8:
				// get out of the way
				if (this.game.qwertyAI.robot.x == 8*8 &&
					this.game.qwertyAI.robot.y == 27*8) {
					this.qwertyMoves(6*8, 27*8, this.game.qwertyAI.robot.map);
				} else {
					this.qwertyMoves(8*8, 27*8, this.game.qwertyAI.robot.map);
				}
				this.act_1_stasis_thread_state = 9;
				break;

			case 9:
				if (this.game.currentPlayer.isIdle()) {
					this.game.currentPlayer.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, 
																   "I vaguely remember Qwerty taking me to the infirmary before I first woke up from that room he just went to... What is in there?", A4_DIRECTION_NONE, this.game);
					this.act_1_stasis_thread_state = 10;
				}
				break;

			case 10:
				// waiting for player to go to stasis room:
				if (this.game.currentPlayer.isIdle()) {
					let currentRoom:AILocation = this.game.getAILocation(this.game.currentPlayer);
					// "location-as26" is the stasis pod room
					if (currentRoom != null && currentRoom.id=="location-as26") {
						this.game.currentPlayer.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, 
																	   "This is a stasis chamber! I must have been in one of these pods... but who is in the closed one?!", A4_DIRECTION_NONE, this.game);
						this.act_1_stasis_thread_state = 11;
					}
				}
				if (this.playerAsksQwertyToFixSpacesuit()) {
					this.qwertyIntention("action.talk($QWERTY, perf.inform(V0:$PLAYER, #not(property.broken('spacesuit'[#id]))))");
				}
				break;

			case 11:
				// waiting for player to interact with the pod with the corpse:
				let corpsePod:A4Object = this.game.findObjectByIDJustObject("broken-stasis-pod");
				if (!(<A4ObstacleContainer>corpsePod).closed) {
					this.game.cutSceneActivated = CUTSCENE_CORPSE;
					this.act_1_stasis_thread_state = 12;
					this.game.setStoryStateVariable("act1-corpse", "discovered");
				}
				if (this.playerAsksQwertyToFixSpacesuit()) {
					this.qwertyIntention("action.talk($QWERTY, perf.inform(V0:$PLAYER, #not(property.broken('spacesuit'[#id]))))");
				}
				break;

			case 12:
				if (this.playerAsksQwertyToFixSpacesuit()) {
					this.qwertyIntention("action.talk($QWERTY, perf.inform(V0:$PLAYER, #not(property.broken('spacesuit'[#id]))))");
				}	
				break;			
		}

		if (previous_state == this.act_1_stasis_thread_state) {
			this.act_1_stasis_thread_state_timer++;
		} else {
			this.act_1_stasis_thread_state_timer = 0;
		}

		if (!this.act_1_player_gone_outside && this.game.currentPlayer.map.name == "Aurora Station Outdoors") {
			this.queueThoughtBubble("Oh wow! Look at this! So, I am indeed not on Earth!");
			this.queueThoughtBubble("Looking throught the windows cannot compare with being outside!");
			this.act_1_player_gone_outside = true;
		}
	}	


	/* --------------------------------------------------------
		ACT 2: SHRDLU
	   -------------------------------------------------------- */
	update_act_2() 
	{
		let previous_state:number = this.act_2_state;

		switch(this.act_2_state) {
		case 0:
			// wait a few cycles to ensure the character is already in the vehicle
			if (this.game.currentPlayer.isIdle() && this.act_2_state_timer>=10) {
				this.queueThoughtBubble("This rover seems bigger on the inside than it is on the outside!");
				this.act_2_state = 1;
			}
			break;

		case 1:
			if (this.playerHasItemP("communicator")) {
				if (this.thoughtBubbleQueue.length == 0 &&
					this.game.currentPlayer.isIdle()) {
					this.etaoinSays("perf.greet('david'[#id])");
					this.etaoinSays("perf.inform(V0:'david'[#id], #and(V:verb.guide('etaoin'[#id], 'david'[#id], 'location-east-cave'[#id]), time.future(V)))");
					this.etaoinSays("perf.inform(V0:'david'[#id], time.subsequently(verb.go(V0,'north'[north],'spacer-valley-north'[#id]), verb.go(V0,'east'[east],'location-east-cave'[#id])))");
					this.etaoinSays("perf.inform(V0:'david'[#id], #and(V:space.outside.of('david'[#id], 'communicator-range'[#id]), time.future(V)))");
					this.etaoinSays("perf.request.action(V0:'david'[#id], verb.find('david'[#id], 'shrdlu'[#id]))");
					this.act_2_state = 2;
				}
			} else {
				// if the player does not have the communicator, but has made it to the north, just move the state up
				if (this.game.currentPlayer.map.name == "Spacer Valley North") this.act_2_state = 2;
			}
			break;			


		case 2:
			if (this.playerHasItemP("communicator")) {
				if (this.game.currentPlayer.isIdle() && this.game.currentPlayer.map.name == "Spacer Valley North") {
					this.queueThoughtBubble("The communicator has gone dead. I guess I'm now out of communicator range with Etaoin...");
					this.queueThoughtBubble("Etaoin said to go East after reaching this part of Spacer Valley, let's see where is that cave...");
					this.act_2_state = 3;
				}
			} else {
				if (this.game.currentPlayer.map.name == "Spacer Valley North" &&
					this.game.currentPlayer.x >= 64*8) {
					this.act_2_state = 3;
				}
			}
			break;			

		case 3:
			if (this.game.currentPlayer.isIdle() && this.game.currentPlayer.map.name == "Spacer Valley North" &&
				this.game.currentPlayer.x >= 64*8) {
				this.queueThoughtBubble("I am picking up a distress signal that seems to come from that cave entrance to the east!");
				this.queueThoughtBubble("That's probably Shrdlu, I should go investigate!");
				this.act_2_state = 4;
			}
			break;			

		case 4:
			if (this.game.currentPlayer.isIdle() && this.game.currentPlayer.map.name == "East Cave") {
				this.queueThoughtBubble("It seems there was a cave-in here, maybe Shrdlu got trapped behind those rocks?");
				this.act_2_state = 5;
			}
			break;			

		case 5:
			// Player has found Shrdlu, but not started talking to it yet
			if (this.game.currentPlayer.isIdle() && this.game.currentPlayer.map.name == "Spacer Valley North") {
				this.queueThoughtBubble("I did not see Shrdlu, but the signal came from this cave. Maybe if I talk Shrdlu can hear me?");
				this.act_2_state = 6;
			}
			if (this.contextShrdlu == null) {
				this.contextShrdlu = this.game.shrdluAI.contextForSpeaker(this.playerID);
			} else if (this.contextShrdlu.lastPerformativeBy("shrdlu")!=null) {
				this.act_2_state = 100;
			}
			break;

		case 6:
			// Player has found Shrdlu, but not started talking to it yet
			if (this.game.currentPlayer.isIdle() && this.game.currentPlayer.map.name == "Aurora Station") {
				// First delete any knowledge Etaoin had on whether you have found SHRDLU or not (otherwise, you can create a contradiction):
				let term:Term = Term.fromString("verb.find('david'[#id], 'shrdlu'[#id])", this.game.ontology);
				let s:Sentence = new Sentence([term],[false]);
				this.game.etaoinAI.removeLongTermRule(s)
				this.etaoinSays("perf.greet('david'[#id])");
				this.etaoinSays("perf.q.predicate(V0:'david'[#id], verb.find('david'[#id], 'shrdlu'[#id]))");
				this.act_2_state = 7;
			}
			if (this.contextShrdlu == null) {
				this.contextShrdlu = this.game.shrdluAI.contextForSpeaker(this.playerID);
			} else if (this.contextShrdlu.lastPerformativeBy("shrdlu")!=null) {
				this.act_2_state = 100;
			}
			break;

		case 7:
			// waiting for an answer from the player to "do you find shrdlu?"
			if (this.game.currentPlayer.map.name != "Aurora Station") {
				this.act_2_state = 6;
			} else {
				let p:NLContextPerformative = this.contextEtaoin.lastPerformativeBy(this.playerID);
				if (p!=null) {
					if (p.timeStamp == this.game.in_game_seconds - 1) {
						if (p.performative.functor.is_a(this.game.ontology.getSort("perf.inform.answer")) &&
							this.game.etaoinAI.intentions.length == 0 &&
							this.game.etaoinAI.queuedIntentions.length == 0 &&
							this.contextEtaoin.expectingAnswerToQuestion_stack.length == 0) {
							let answer:TermAttribute = p.performative.attributes[1];
							if (answer instanceof ConstantTermAttribute) {
								if ((<ConstantTermAttribute>answer).value == "no" ||
									(<ConstantTermAttribute>answer).value == "unknown") {
									this.act_2_state = 8;
								} else if ((<ConstantTermAttribute>answer).value == "yes") {
									this.act_2_state = 10;
								} else {
									console.error("update_act_2, state 5: unexpected answer " + p.performative);
								}	
							} else {
								// this can only mean the player answered with a name
								console.error("update_act_2, state 5: unexpected answer " + p.performative);
							}
						} else if (p.performative.functor.is_a(this.game.ontology.getSort("perf.ack.ok"))) {
							console.error("update_act_2, state 5: unexpected answer " + p.performative);
						}						
					}
				}
			}
			break;

		case 8:
			// player said "no" to having found Shrdlu
			if (this.game.currentPlayer.isIdle()) {
				this.etaoinSays("perf.request.action(V0:'david'[#id], verb.find('david'[#id], 'shrdlu'[#id]))");
				this.act_2_state = 9;
			}
			break;

		case 9:
			if (this.game.currentPlayer.map.name != "Aurora Station") this.act_2_state = 6;	
			break;

		case 10:
			// player said "yes" to having found Shrdlu
			if (this.game.currentPlayer.isIdle()) {
				this.etaoinSays("perf.request.action(V0:'david'[#id], verb.bring('david'[#id], 'shrdlu'[#id], 'location-aurora-station'[#id]))");
				this.act_2_state = 11;
			}
			break;

		case 11:
			// player has told Etaoin that he has found Shrdlu
			if (this.contextShrdlu == null) {
				this.contextShrdlu = this.game.shrdluAI.contextForSpeaker(this.playerID);
			} else if (this.contextShrdlu.lastPerformativeBy("shrdlu")!=null) {
				this.act_2_state = 100;
			}
			break;

		case 100:
			// Conversation with Shrdlu has started!
			if (this.game.currentPlayer.map.name == "East Cave") {
				this.shrdluSays("perf.request.action(V0:'david'[#id], verb.help('david'[#id], 'shrdlu'[#id]))");			
				this.shrdluSays("perf.inform('david'[#id], #and(V:verb.damage('east-cave-cave-in'[#id], 'shrdlu-perception'[#id]), time.past(V)))");
				this.shrdluSays("perf.inform(V0:'david'[#id], property.blind('shrdlu'[#id]))");
				this.shrdluSays("perf.q.action('david'[#id], verb.help('david'[#id], 'shrdlu'[#id], verb.go-to('shrdlu'[#id], 'location-aurora-station'[#id])))");
				this.act_2_state = 101;
			}
			break;

		case 101:
			if (this.game.shrdluAI.intentions.length == 0 && 
				this.game.shrdluAI.queuedIntentions.length == 0 &&
				this.contextShrdlu.expectingAnswerToQuestion_stack.length == 0) {
				// the question has been answered:
				let lastPerformative:NLContextPerformative = this.contextShrdlu.lastPerformativeBy(this.playerID);
				if (lastPerformative.performative.functor.is_a(this.game.ontology.getSort("perf.inform.answer"))) {
					let answer:TermAttribute = lastPerformative.performative.attributes[1];
					if (answer instanceof ConstantTermAttribute) {
						if ((<ConstantTermAttribute>answer).value == "no" ||
							(<ConstantTermAttribute>answer).value == "unknown") {
							this.act_2_state = 102;
						} else if ((<ConstantTermAttribute>answer).value == "yes") {
							this.act_2_state = 103;
						} else {
							console.error("update_act_2, state 101: unexpected answer " + lastPerformative.performative);
							this.act_2_state = 102;
						}	
					} else {
						this.act_2_state = 102;
					}
				} else if (lastPerformative.performative.functor.is_a(this.game.ontology.getSort("perf.ack.ok"))) {
					this.act_2_state = 103;
				} else {
					this.act_2_state = 102;
				}
			}
			break;

		case 102:
			if (this.act_2_state_timer >= 30*60) {
				this.act_2_state = 100;
			}
			break;

		case 103:
			this.shrdluSays("perf.thankyou('david'[#id])");
			this.shrdluSays("perf.request.action(V0:'david'[#id], action.give('david'[#id], #and(V:[instruction], plural(V)), 'shrdlu'[#id]))");
			this.act_2_state = 104;
			break;

		case 104:
			// player is interacting with SHRDLU, as long as the player keeps doing things, we are fine, when she stops
			// asking shrdlu to do things, we give a clue
			if (this.game.shrdluAI.intentions.length == 0 && 
				this.game.shrdluAI.queuedIntentions.length == 0 &&
				this.contextShrdlu.expectingAnswerToQuestion_stack.length == 0) {
				// the question has been answered:
				let lastPerformative:NLContextPerformative = this.contextShrdlu.lastPerformativeBy(this.playerID);
				if (lastPerformative.performative.functor.is_a_string("perf.request.action") ||
					lastPerformative.performative.functor.is_a_string("perf.q.action")) {
					this.act_2_state_timer = 0;
				}
			}
			if (this.act_2_state_timer >= 30*60) {
				// give a hint:
				this.queueThoughtBubble("Shrdlu sounded from the northeast. If I can ask him to move in my direction, maybe he's strong enough to push these boulders...");
				this.act_2_state = 105;
			}
			if (this.game.shrdluAI.robot.x < 128) {
				// SHRDLU is free!
				this.act_2_state = 106;
			}
			break;

		case 105:
			// same as 104, but we have already given the hint
			if (this.game.shrdluAI.robot.x < 128) {
				// SHRDLU is free!
				this.act_2_state = 106;
			}
			break;

		case 106:
			// SHRDLU is free!!
			if (this.game.shrdluAI.robot.map.name == "Aurora Station") {
				this.act_2_state = 107;
			}
			break;

		case 107:
			// SHRDLU is back!!
			let term:Term = Term.fromString("goal(D:'david'[#id], verb.wait-for(X, 'shrdlu'[#id]))",this.game.ontology);
			this.game.etaoinAI.addLongTermTerm(term, MEMORIZE_PROVENANCE);

			this.contextShrdlu.inConversation = true;	// this is a hack, to prevent it having to say "hello human", etc.
			this.shrdluSays("perf.thankyou('david'[#id])");
			this.shrdluSays("perf.inform('david'[#id], #and(X:verb.help('etaoin'[#id], 'shrdlu'[#id], verb.see('shrdlu'[#id])), time.now(X)))");
			this.shrdluSays("perf.inform('david'[#id], verb.need('shrdlu'[#id], verb.repair('shrdlu'[#id], 'shrdlu'[#id])))");
			this.act_2_state = 108;
			this.game.shrdluAI.respondToPerformatives = false;
			this.act_2_shrdlu_agenda_state = 1;	// SHRDLU starts its agenda
			break;

		case 108:
			if (this.act_2_state_timer >= 50*2 &&
				this.act_2_shrdlu_agenda_state >= 4 &&
				this.game.etaoinAI.intentions.length == 0 &&
				this.game.etaoinAI.queuedIntentions.length == 0 &&
				this.game.currentPlayer.map.textBubbles.length == 0) {
				this.etaoinSays("perf.thankyou('david'[#id])")
				this.act_2_state = 109;
			}
			break;

		case 109:
			if (this.game.etaoinAI.intentions.length == 0 &&
				this.game.etaoinAI.queuedIntentions.length == 0 &&
				this.game.currentPlayer.map.textBubbles.length == 0) {
				this.etaoinSays("perf.inform('david'[#id], #and(X:verb.repair('shrdlu'[#id], 'etaoin-memory'[#id]), time.future(X)))")
				this.act_2_state = 110;
			}
			break;

		case 110:
			if (this.game.etaoinAI.intentions.length == 0 &&
				this.game.etaoinAI.queuedIntentions.length == 0 &&
				this.game.currentPlayer.map.textBubbles.length == 0) {
				this.queueThoughtBubble("Ok, it seems Shrdlu needs to fix itself first. So, repairs might take a while...");
				this.queueThoughtBubble("I could go explore outside a bit more, now that I have the rover... or maybe I could just have a nap...");
				this.act_2_state = 111;
			}
			break;

		case 111:
			// waiting for Shrdlu to repair Etaoin's memory
			if (this.act_2_shrdlu_agenda_state >= 30) this.act_2_state = 201;
			if (this.game.currentPlayer.sleepingInBed != null && this.act_2_shrdlu_agenda_state < 22) {
				this.act_2_state = 120;
			}
			break;

		case 120:
			if (this.act_2_state_timer == 0) {
				this.game.eyesClosedState = 3;
				this.game.eyesClosedTimer = 0;
				this.game.textInputAllowed = false;
			} else if (this.act_2_state_timer >= EYESOPEN_SPEED + 60) {
				// fast forward the state:
				this.game.shrdluAI.respondToPerformatives = true;
				this.game.shrdluAI.visionActive = true;	
				this.act_2_shrdlu_agenda_state = 23;
				this.act_2_shrdlu_agenda_state_timer = 20*60;
				this.game.shrdluAI.clearCurrentAction();
				this.game.shrdluAI.robot.scriptQueues = [];
				this.contextShrdlu.inConversation = false;
				this.game.requestWarp(this.game.shrdluAI.robot, this.game.qwertyAI.robot.map, 91*8, 20*8);
				this.game.shrdluAI.robot.x = 91*8;	// we force anyway, since, otehrwise, the agenda doesn't work
				this.game.shrdluAI.robot.y = 20*8;
				this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], verb.repair('shrdlu'[#id], 'etaoin'[#id]))", this.game.ontology), PERCEPTION_PROVENANCE);
				for(let ai of [this.game.etaoinAI, this.game.qwertyAI, this.game.shrdluAI]) {
					let se:SentenceEntry = ai.longTermMemory.findSentenceEntry(Sentence.fromString("property.broken('broken-stasis-pod'[#id])", this.game.ontology));
					if (se != null) se.sentence.sign[0] = false;
				}
				this.game.shrdluAI.robot.strength = 8;	// increase Shrdlu's strength
				this.act_2_state = 121;
			}
			break;

		case 121:
			if (this.act_2_state_timer == 0) {
				this.game.in_game_seconds += 3600*8;	// sleeping for 8 hours
				this.game.narrationMessages.push("Several hours later...");
				this.game.currentPlayer.x = 560;
				this.game.currentPlayer.y = 200;
				this.game.currentPlayer.direction = A4_DIRECTION_DOWN;
			} else if (this.act_2_state_timer == 120) {
				this.game.narrationMessages = [];
			} else if (this.act_2_state_timer == 180) {
				this.game.eyesClosedState = 1;
				this.game.eyesClosedTimer = 0;
				this.game.textInputAllowed = false;
			} else if (this.act_2_state_timer == 180 + EYESOPEN_SPEED) {
				this.game.currentPlayer.state = A4CHARACTER_STATE_IN_BED;
				this.game.textInputAllowed = true;
				this.act_2_state = 200;
			}
			break;
		

		case 200:
			// waiting for Shrdlu to repair Etaoin's memory, but player has already slept:
			if (this.act_2_shrdlu_agenda_state >= 30) this.act_2_state = 201;
			break;

		case 201:
			if (this.game.etaoinAI.intentions.length == 0 &&
				this.game.etaoinAI.queuedIntentions.length == 0 &&
				this.game.currentPlayer.map.textBubbles.length == 0) {
				//this.addKnowledgeToEtaoinAfterRepair()
				this.game.etaoinAI.loadLongTermRulesFromFile("data/additional-kb-memoryrepair.xml");
				this.game.qwertyAI.loadLongTermRulesFromFile("data/additional-kb-memoryrepair.xml");
				this.game.shrdluAI.loadLongTermRulesFromFile("data/additional-kb-memoryrepair.xml");
				this.etaoinSays("perf.inform('david'[#id], #and(X:verb.repair('shrdlu'[#id], 'etaoin-memory'[#id]), time.past(X)))");
				this.act_2_state = 202;
			}
			break;

		case 202:
			if (this.game.etaoinAI.intentions.length == 0 &&
				this.game.etaoinAI.queuedIntentions.length == 0 &&
				this.game.currentPlayer.map.textBubbles.length == 0) {
				this.etaoinSays("perf.inform('david'[#id], #and(X:erased('etaoin-memory'[#id]), time.past(X, time.date('42956019000'[number], [time.day]))))");
				this.etaoinSays("perf.inform('david'[#id], #and(X:verb.repair('shrdlu'[#id], 'location-aurora-station'[#id]), time.subsequently(X)))");
				this.act_2_state = 210;
			}
			break;

		case 210:
			// waiting for Shrdlu to repait the comm tower:
			if (this.act_2_shrdlu_agenda_state >= 40) this.act_2_state = 211;
			break;

		case 211:
			if (this.game.etaoinAI.intentions.length == 0 &&
				this.game.etaoinAI.queuedIntentions.length == 0 &&
				this.game.currentPlayer.map.textBubbles.length == 0) {
				this.etaoinSays("perf.inform('david'[#id], #and(X:verb.repair('shrdlu'[#id], 'comm-tower'[#id]), time.past(X)))");
				this.act_2_state = 212;
			}
			break;
		case 212:
			if (this.game.etaoinAI.intentions.length == 0 &&
				this.game.etaoinAI.queuedIntentions.length == 0 &&
				this.game.currentPlayer.map.textBubbles.length == 0) {
		
				this.game.etaoinAI.addLongTermTerm(Term.fromString("distress-signal('distress-signal1'[#id])",this.game.ontology), PERCEPTION_PROVENANCE);
				this.game.etaoinAI.addLongTermTerm(Term.fromString("distress-signal('distress-signal2'[#id])",this.game.ontology), PERCEPTION_PROVENANCE);
				this.game.etaoinAI.addLongTermTerm(Term.fromString("space.at('distress-signal1'[#id],'spacer-gorge'[#id])",this.game.ontology), PERCEPTION_PROVENANCE);
				this.game.etaoinAI.addLongTermTerm(Term.fromString("space.at('distress-signal2'[#id],'trantor-crater'[#id])",this.game.ontology), PERCEPTION_PROVENANCE);
				this.game.etaoinAI.addLongTermTerm(Term.fromString("verb.come-from('distress-signal1'[#id],'spacer-gorge'[#id])",this.game.ontology), PERCEPTION_PROVENANCE);
				this.game.etaoinAI.addLongTermTerm(Term.fromString("verb.come-from('distress-signal2'[#id],'trantor-crater'[#id])",this.game.ontology), PERCEPTION_PROVENANCE);
				this.game.etaoinAI.addLongTermTerm(Term.fromString("goal(D:'david'[#id], verb.investigate(X, 'distress-signal1'[#id]))",this.game.ontology), PERCEPTION_PROVENANCE);

				this.etaoinSays("perf.inform('david'[#id], verb.detect('etaoin'[#id], #and(V:[distress-signal], plural(V))))");
				this.etaoinSays("perf.request.action('david'[#id], #and(V1:verb.go-to('david'[#id], 'location-as29'[#id]), relation.purpose(V1, verb.investigate('david'[#id]))))");
				this.etaoinSays("perf.inform('david'[#id], verb.have('qwerty'[#id], 'command-key'[#id]))");

				let idx:number = this.game.qwertyAI.objectsNotAllowedToGive.indexOf("command-key");
				this.game.qwertyAI.objectsNotAllowedToGive.splice(idx,1);
				this.game.shrdluAI.allowPlayerInto("location-as29", "COMMAND");
				this.game.qwertyAI.allowPlayerInto("location-as29", "COMMAND");
				this.game.etaoinAI.allowPlayerInto("location-as29", "COMMAND");
				this.game.comm_tower_repaired = true;
				this.act_2_state = 220;
			}
			break;

		case 220:
				// waiting for David to enter the command center:
				if (this.game.currentPlayer.isIdle()) {
				let currentRoom:AILocation = this.game.getAILocation(this.game.currentPlayer);
				// "location-as29" is the command center
				if (currentRoom != null && currentRoom.id=="location-as29") {
					this.game.currentPlayer.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, 
																   "This is the command center of the whole station. It even has a map of the whole area!", A4_DIRECTION_NONE, this.game);
					this.act_2_state = 221;
				}
			}
			break;

		case 221:
			// waiting for David to examine the tactical map
			if (this.game.getStoryStateVariable("distress-signals")=="seen") {
				if (this.player_has_asked_to_take_shrdlu) {
					this.queueThoughtBubble("Maybe now Etaoin will let me take Shrdlu with me to investigate...");
				}
				this.act_2_state = 222;
			}
			break;

		case 222:
			// Waiting for the player to reach the crash site:
			if (this.game.currentPlayer.map.name == "Spacer Gorge" &&
				this.game.currentPlayer.x < 256) {
				// reached the crash site:
				this.queueThoughtBubble("Oh my god, this is a crash site! there are lots of bodies here!");
				this.queueThoughtBubble("Who are these people? and what happened here?");
				this.queueThoughtBubble("Let's look around to see if I find any clues...");
				this.act_2_state = 223;
			}
			break;

		case 223:
			// end of act 1!
			if (this.game.currentPlayer.isIdle() && 
				this.game.getStoryStateVariable("act") == "act3") {
				this.game.introact_request = 3;
			}
			break;
		}



		if (this.playerAskedAboutTakingShrdlu() != null) {
			if (this.player_has_asked_to_take_shrdlu) {
				this.etaoinSays("perf.inform('david'[#id], #and(X:permission-to(V3:'david'[#id], action.take('david'[#id], 'shrdlu'[#id])), time.already(X)))");
			} else {
				this.player_has_asked_to_take_shrdlu = true;
				// The player has asked to take SHRDLU
				if (this.act_2_state < 107) {
					// we have not yet found SHRDLU:
					this.etaoinSays("perf.inform('david'[#id], #not(space.at('shrdlu'[#id], 'location-aurora-station'[#id])))");
				} else if (this.act_2_state < 222) {
					// too early, Etaoin rejects:
					this.etaoinSays("perf.inform.answer('david'[#id], 'no'[symbol])");
				} else {
					// We have found the distress signals, Etaoin accepts:
					this.etaoinSays("perf.ack.ok('david'[#id])");
					this.game.etaoinAI.addLongTermTerm(Term.fromString("permission-to(V3:'david'[#id], action.take('david'[#id], 'shrdlu'[#id]))",this.game.ontology), PERCEPTION_PROVENANCE);
					this.game.setStoryStateVariable("permission-to-take-shrdlu", "true");
				}
			}
		}

		this.shrdluAct2AgendaUpdate();
		this.qwertyAgendaUpdate();
		this.repairDatapadUpdate();

		if (previous_state == this.act_2_state) {
			this.act_2_state_timer++;
		} else {
			this.act_2_state_timer = 0;
			this.act_2_state_start_time = this.game.in_game_seconds;
		}


		previous_state = this.act_2_repair_shuttle_state;
		switch(this.act_2_repair_shuttle_state) {
			case 0: if (this.playerAsksShrdluToFixShuttle()) {
						let thingToRepairObject:A4Object = this.game.findObjectByIDJustObject("garage-shuttle");
						if (this.game.shrdluAI.canSee("garage-shuttle")) {
							if (thingToRepairObject.sort.name == "brokenshuttle") {
								// if shrdlu has the engine, it's all ok, otherwise, he cannot repair it:
								let l:A4Object[] = this.game.shrdluAI.robot.findObjectByID("shuttle-engine");
								if (l!= null && l.length == 1) {
									// SHRDLU has the engine:
									this.shrdluSays("perf.ack.ok('david'[#id])");
									this.act_2_repair_shuttle_state = 1;
								} else {
									// SHRDLU does not have the engine, it cnanot repair:
									this.shrdluSays("perf.ack.denyrequest('david'[#id])");
									this.shrdluSays("perf.inform('david'[#id], #not(verb.have('shrdlu'[#id], [shuttle-engine])))");
								}
							} else {
								this.shrdluSays("perf.inform('david'[#id], #not(property.broken('garage-shuttle'[#id])))");
							}
						} else {
							this.shrdluSays("perf.inform('david'[#id], #not(verb.see('shrdlu'[#id], [shuttle])))");
						}
					}
					break;

			case 1:
					if (this.act_2_repair_shuttle_state_timer == 0) {
						this.shrdluMoves(106*8, 26*8, this.game.maps[0]);
					} else {
						if (this.game.shrdluAI.robot.x == 106*8 &&
							this.game.shrdluAI.robot.y == 26*8) {
							// lose the engine:
							let l:A4Object[] = this.game.shrdluAI.robot.findObjectByID("shuttle-engine");
							let shuttle:A4Object = this.game.findObjectByIDJustObject("garage-shuttle");

							if (l!= null && l.length == 1 && shuttle != null) {
								this.game.shrdluAI.robot.removeFromInventory(l[0]);
								// swap the shuttle:
						        shuttle.map.removeObject(shuttle);
        						this.game.requestDeletion(shuttle);
						        let newShuttle:A4Vehicle = <A4Vehicle>this.game.objectFactory.createObject("garage-shuttle", this.game, true, false);
						        if (newShuttle == null) {
									// something went wrong, reset!
									this.act_2_repair_shuttle_state = 0;
						        } else {
							        newShuttle.ID = shuttle.ID;
							        newShuttle.direction = 2;
							        let map:A4Map = this.game.getMap("Aurora Station")
							        if (map == null) return false;
							        newShuttle.warp(shuttle.x, shuttle.y, map);
									this.game.playSound("data/sfx/itemPickup.wav")
									// done:
									this.act_2_repair_shuttle_state = 2;

						            this.game.shrdluAI.currentAction_scriptQueue = null;
						            this.game.shrdluAI.currentAction = null;
						            this.game.shrdluAI.currentAction_requester = null;
						            this.game.shrdluAI.currentActionHandler = null;
								}
							} else {
								// something went wrong, reset!
								this.act_2_repair_shuttle_state = 0;
							}
						} 
					}
					break;
		}

		if (previous_state == this.act_2_repair_shuttle_state) {
			this.act_2_repair_shuttle_state_timer++;
		} else {
			this.act_2_repair_shuttle_state_timer = 0;
		}
	}


	repairDatapadUpdate()
	{
		let request:Term = this.playerAskedToRepairTheDatapad();
		let requestee:string = null;
		if (request != null && (request.attributes[0] instanceof ConstantTermAttribute)) {
			requestee = (<ConstantTermAttribute>(request.attributes[0])).value;

			// if asked to Shrdlu, say it is too delicate:
			if (requestee == "shrdlu") {
				this.shrdluSays("perf.inform('david'[#id], too-small('shuttle-datapad'[#id]))");
			}
		}


		let previous_state:number = this.act_2_datapad_state;
		switch(this.act_2_datapad_state) {
			case 0: // no progress in this thread yet
				// detect when the player has asked qwerty to fix the broken space suit:
				if (request != null && requestee == "qwerty") {
					let target_l:A4Object[] = this.game.findObjectByID("shuttle-datapad");
					let weCanGetIt:boolean = false;
					if (target_l != null && target_l.length == 1 &&
						this.game.qwertyAI.canSee("shuttle-datapad")) weCanGetIt = true;
					if (target_l != null && target_l.length == 2 && 
						(target_l[0] == this.game.qwertyAI.robot ||
						 target_l[0] == this.game.currentPlayer)) weCanGetIt = true;
					if (weCanGetIt) {
						this.act_2_datapad_state = 1;
					} else {
						this.act_2_datapad_state = 0;
						this.game.qwertyAI.respondToPerformatives = true;
						// I do not see the datapad:
						this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER, #not(verb.see($QWERTY, 'shuttle-datapad'[#id]))))");
					}
				}
				break;

			// qwerty has been asked to repair the datapad
			case 1:
				if (this.act_2_datapad_state_timer == 0) {
					this.game.qwertyAI.respondToPerformatives = false;	// to prevent the player messing up with the sequence
					this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER, #and(V:verb.repair($QWERTY, 'shuttle-datapad'[#id]), time.future(V)) ))");
					// clear whatever qwerty is doing now:
				    this.game.qwertyAI.currentAction = null;
				    this.game.qwertyAI.currentAction_requester = null;
				    this.game.qwertyAI.currentAction_scriptQueue = null;
				    this.game.qwertyAI.currentActionHandler = null;

					let currentRoom:AILocation = this.game.getAILocation(this.game.qwertyAI.robot);
					if (currentRoom.id != "location-as29") {
						// if we are not in the command center, qwerty asks the player to follow it:
						this.qwertyIntention("action.talk($QWERTY, perf.request.action(V0:$PLAYER, verb.follow(V0, $QWERTY)))");
					}
				} else {
					if (this.game.qwertyAI.robot.isIdle() &&
						this.game.qwertyAI.intentions.length == 0 && 
						this.game.qwertyAI.queuedIntentions.length == 0 &&
						this.contextQwerty.expectingAnswerToQuestion_stack.length == 0) {
						this.act_2_datapad_state = 2;
					}					
				}
				break;

			// go towards david to take the datapad:
			case 2:
				let target_l:A4Object[] = this.game.findObjectByID("shuttle-datapad");
				if (target_l == null) {
					this.act_2_datapad_state = 0;
					this.game.qwertyAI.respondToPerformatives = true;
				} else {
					let x1:number = this.game.qwertyAI.robot.x;
					let y1:number = this.game.qwertyAI.robot.y+this.game.qwertyAI.robot.tallness;
					let x2:number = target_l[0].x;
					let y2:number = target_l[0].y+target_l[0].tallness;
					let d:number = Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));
					if (target_l.length == 1) {
						// the spacesuit is in the floor:
						if (d>0) {
							this.game.qwertyAI.robot.AI.addPFTargetObject(A4CHARACTER_COMMAND_IDLE, 10, false, target_l[0]);
						} else {
							if (this.game.qwertyAI.robot.takeAction(this.game)) {
								this.act_2_datapad_state = 3;
							} else {
								this.act_2_datapad_state = 0;
								this.game.qwertyAI.respondToPerformatives = true;
							}
						}
					} else {
						// someone has the spacesuit (this could be qwerty itself):
						if (d>16) {
							this.game.qwertyAI.robot.AI.addPFTargetObject(A4CHARACTER_COMMAND_IDLE, 10, false, target_l[0]);
						} else {
							if (target_l[0] instanceof A4Character) {
								// assume datapad is target_l[1]!!!
				                (<A4Character>(target_l[0])).removeFromInventory(target_l[1]);
				                this.game.qwertyAI.robot.addObjectToInventory(target_l[1], this.game);
								this.act_2_datapad_state = 3;
								this.game.playSound("data/sfx/itemPickup.wav");
							} else {
								this.act_2_datapad_state = 0;
								this.game.qwertyAI.respondToPerformatives = true;
							}
						}
					}
				}
				break;

			case 3:
				// qwerty has the datapad!:
				if (this.act_2_datapad_state_timer == 0) {
					this.qwertyMoves(107*8, 35*8, this.game.qwertyAI.robot.map);
				} else {
					if (this.game.qwertyAI.robot.x == 107*8 &&
						this.game.qwertyAI.robot.y == 35*8) {
						this.act_2_datapad_state = 4;
					} 
				}
				break;

			case 4:
				// wait a bit
				if (this.act_2_datapad_state_timer == 180) this.act_2_datapad_state = 5;
				break;

			case 5:
				// give the datapad back to the player
				let x1:number = this.game.qwertyAI.robot.x;
				let y1:number = this.game.qwertyAI.robot.y;
				let x2:number = this.game.currentPlayer.x;
				let y2:number = this.game.currentPlayer.y;
				let d:number = Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));
				if (d>16) {
					this.game.qwertyAI.robot.AI.addPFTargetObject(A4CHARACTER_COMMAND_IDLE, 10, false, this.game.currentPlayer);
				} else {
					// give the datapad:
					let idx:number = 0;
					for(let i:number = 0;i<this.game.qwertyAI.robot.inventory.length;i++) {
						if (this.game.qwertyAI.robot.inventory[i].ID == "shuttle-datapad") {
							idx = i;
							break;
						}
					}
					this.game.qwertyAI.robot.inventory.splice(idx,1);
					let fixedDatapad:A4Object = this.game.objectFactory.createObject("fixed-datapad", this.game, false, false);
					fixedDatapad.ID = "shuttle-datapad";
					this.game.currentPlayer.addObjectToInventory(fixedDatapad, this.game);
					// replace the background knowledge:
					for(let ai of [this.game.etaoinAI, this.game.qwertyAI, this.game.shrdluAI]) {
						let se:SentenceEntry = ai.longTermMemory.findSentenceEntry(Sentence.fromString("shuttle-datapad('shuttle-datapad'[#id])", this.game.ontology));
						if (se != null) se.sentence.terms[0].functor = this.game.ontology.getSort("fixed-datapad");
					}
			        this.game.currentPlayer.map.addPerceptionBufferRecord(new PerceptionBufferRecord("give", this.game.qwertyAI.robot.ID, this.game.qwertyAI.robot.sort,
			                this.game.currentPlayer.ID, this.game.currentPlayer.sort, null,
			                fixedDatapad.ID, fixedDatapad.sort,
			                this.game.qwertyAI.robot.x, this.game.qwertyAI.robot.y+this.game.qwertyAI.robot.tallness, this.game.qwertyAI.robot.x+this.game.qwertyAI.robot.getPixelWidth(), this.game.qwertyAI.robot.y+this.game.qwertyAI.robot.getPixelHeight()));
			        this.game.currentPlayer.eventWithObject(A4_EVENT_RECEIVE, this.game.qwertyAI.robot, fixedDatapad, this.game.currentPlayer.map, this.game);
			        this.game.qwertyAI.robot.eventWithObject(A4_EVENT_ACTION_GIVE, this.game.currentPlayer, fixedDatapad, this.game.currentPlayer.map, this.game);					
					this.game.playSound("data/sfx/itemPickup.wav");
					this.game.in_game_actions_for_log.push(["give("+this.game.qwertyAI.selfID+","+fixedDatapad.ID+","+this.game.currentPlayer.ID+")",""+this.game.in_game_seconds]);
					this.game.qwertyAI.respondToPerformatives = true;
					this.act_2_datapad_state = 0;

					this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER, #and(V:verb.salvage('etaoin'[#id], #and(some(X:'entry'[symbol], [plural]), noun(X, [plural]))), time.past(V))))");

					this.game.etaoinAI.loadLongTermRulesFromFile("data/additional-kb-datapad.xml");
					this.game.qwertyAI.loadLongTermRulesFromFile("data/additional-kb-datapad.xml");
					this.game.shrdluAI.loadLongTermRulesFromFile("data/additional-kb-datapad.xml");
				}
				break
		}		

		if (previous_state == this.act_2_datapad_state) {
			this.act_2_datapad_state_timer++;
		} else {
			this.act_2_datapad_state_timer = 0;
		}

	}


	/* --------------------------------------------------------
		ACT 3: AURORA
	   -------------------------------------------------------- */
	update_act_3() 
	{
		let previous_state:number = this.act_3_state;

		//switch(this.act_3_state) {
		//}

		this.qwertyAgendaUpdate();

		if (previous_state == this.act_3_state) {
			this.act_3_state_timer++;
		} else {
			this.act_3_state_timer = 0;
			this.act_3_state_start_time = this.game.in_game_seconds;
		}		
	}


	/* --------------------------------------------------------
		EVENTS THAT ARE NOT TIED TO ANY PARTICULAR ACT
	   -------------------------------------------------------- */

	actionRequestHandleByScript(action:Term) : boolean
	{
		if (this.actionRequestIsAboutTakingShrdlu(action)) return true;
		return false;
	}


	update_sideplots()
	{
		// Finding life in Aurora subplot:
		if (!this.finding_life_side_plot_taken_question &&
			this.game.getStoryStateVariable("luminiscent-fungi") == "taken") {
			// Here if the player asks about finding life in aurora, he should be reminded to analyze the fungi with a thought bubble:
			if (this.playerAskedAboutFindingLife() != null) {
				this.queueThoughtBubble("We have not found life yet... But what about that weird dust I found?!");
				this.queueThoughtBubble("I need to find a way to analyze it! Could it be that this planet has developed life?!");
				this.finding_life_side_plot_taken_question = true;
			}
		} else if (!this.finding_life_side_plot_analyzed_question &&
				   this.game.getStoryStateVariable("luminiscent-fungi") == "analyzed") {
			// Here, if the player asks about finding life in aurora, he should just be impressed by what he has found
			if (this.playerAskedAboutFindingLife() != null) {
				this.queueThoughtBubble("I still cannot believe that dust I found is a form of life!");
				this.queueThoughtBubble("How I wish there was some other person to share these amazing news with!");
				this.finding_life_side_plot_analyzed_question = true;
			}
		}
		if (!this.what_is_dust_side_plot_taken_question &&
			this.game.getStoryStateVariable("luminiscent-fungi") == "taken") {
			if (this.playerAskedAboutWhatIsTheDust()) {
				this.queueThoughtBubble("So, we don't know what is this dust...");
				this.queueThoughtBubble("I need to find a way to analyze it!!");
				this.what_is_dust_side_plot_taken_question = true;
			}			
		}
	}


	playerAskedAboutFindingLife() : Term
	{
		if (this.contextEtaoin == null ||
			this.contextQwerty == null ||
			this.contextShrdlu == null) {
			this.contextEtaoin = this.game.etaoinAI.contextForSpeaker(this.playerID);
			this.contextQwerty = this.game.qwertyAI.contextForSpeaker(this.playerID);
			this.contextShrdlu = this.game.shrdluAI.contextForSpeaker(this.playerID);
		}
		for(let context of [this.contextQwerty, this.contextEtaoin, this.contextShrdlu]) {
			if (context != null) {
				let p1:NLContextPerformative = context.lastPerformativeBy(this.playerID);
				let p2:NLContextPerformative = context.lastPerformativeBy(context.ai.selfID);
				if (p1 != null && p2 != null && p2.timeStamp == this.game.in_game_seconds - 1) {	
					let perf:Term = p1.performative;
					if (perf.functor.is_a(this.game.ontology.getSort("perf.q.predicate"))  &&
						perf.attributes.length>1 &&
						perf.attributes[1] instanceof TermTermAttribute) {
						let argument:Term = (<TermTermAttribute>(perf.attributes[1])).term;
						let pattern1:Term = Term.fromString("#and(verb.find(X, Y, Z), living-being(X))", this.game.ontology);
						let pattern2:Term = Term.fromString("#and(verb.find(X, Y), living-being(X))", this.game.ontology);
						let pattern3a:Term = Term.fromString("#and(#not(=(X,'david'[#id])), #and(space.at(X, 'aurora'[#id]), living-being(X)))", this.game.ontology);
						let pattern3b:Term = Term.fromString("#and(space.at(X, 'aurora'[#id]), animal(X))", this.game.ontology);
						if (pattern1.subsumes(argument, true, new Bindings())) return perf;
						if (pattern2.subsumes(argument, true, new Bindings())) return perf;
						if (pattern3a.subsumes(argument, true, new Bindings()) &&
							!pattern3b.subsumes(argument, true, new Bindings())) return perf;
					}
				}
			}
		}
		return null;
	}


	playerAskedAboutWhatIsTheDust() : boolean
	{
		if (this.contextEtaoin == null ||
			this.contextQwerty == null ||
			this.contextShrdlu == null) {
			this.contextEtaoin = this.game.etaoinAI.contextForSpeaker(this.playerID);
			this.contextQwerty = this.game.qwertyAI.contextForSpeaker(this.playerID);
			this.contextShrdlu = this.game.shrdluAI.contextForSpeaker(this.playerID);
		}
		for(let context of [this.contextQwerty, this.contextEtaoin, this.contextShrdlu]) {
			if (context != null) {
				let p1:NLContextPerformative = context.lastPerformativeBy(this.playerID);
				let p2:NLContextPerformative = context.lastPerformativeBy(context.ai.selfID);
				if (p1 != null && p2 != null && p2.timeStamp == this.game.in_game_seconds - 1) {	
					let perf:Term = p1.performative;
					if (perf.functor.is_a(this.game.ontology.getSort("perf.q.whatis.noname"))  &&
						perf.attributes.length>1 &&
						perf.attributes[1] instanceof ConstantTermAttribute) {
						let v:any = (<ConstantTermAttribute>(perf.attributes[1])).value;
						// These are the IDs of the luminiscent dust in West Cave
						if (v == "1110" ||
							v == "1111" ||
							v == "1111" ||
							v == "1113") {
							return true;
						}
					}
				}
			}
		}
		return false;		
	}


	questionAboutBeingAlone(perf:Term) : boolean
	{
		let v:TermAttribute = null;
		let queryTerms:TermAttribute[] = null;
		if (perf.functor.is_a(this.game.ontology.getSort("perf.q.query")) && perf.attributes.length == 3) {
			v = perf.attributes[1];
			let query:Term = (<TermTermAttribute>perf.attributes[2]).term;
			queryTerms = NLParser.elementsInList(query, "#and");
		} else if (perf.functor.is_a(this.game.ontology.getSort("perf.q.predicate")) ||
				   perf.functor.is_a(this.game.ontology.getSort("perf.q.predicate-negated"))) {
			let query:Term = (<TermTermAttribute>perf.attributes[1]).term;
			queryTerms = NLParser.elementsInList(query, "#and");
		}
		if (queryTerms != null) {
			let humanFound:boolean = false;
			let differentThanDavidFound:boolean = false;
			for(let ta of queryTerms) {
				if (!(ta instanceof TermTermAttribute)) continue;
				let t:Term = (<TermTermAttribute>ta).term;
				if ((t.functor.name == "human" || t.functor.name == "character") &&
					t.attributes.length == 1 &&
					t.attributes[0] instanceof VariableTermAttribute) {
					humanFound = true;
				}
				if (t.functor.name == "alone-in" &&
					t.attributes[0] instanceof ConstantTermAttribute &&
					t.attributes[1] instanceof ConstantTermAttribute &&
					(<ConstantTermAttribute>t.attributes[0]).value == "david" &&
					((<ConstantTermAttribute>t.attributes[1]).value == "location-aurora-station" ||
					 (<ConstantTermAttribute>t.attributes[1]).value == "location-aurora-settlement" ||
					 (<ConstantTermAttribute>t.attributes[1]).value == "spacer-valley" ||
					 (<ConstantTermAttribute>t.attributes[1]).value == "aurora")) {
					return true;
				}
				if (t.functor.name == "#not") {
					let t2:Term = (<TermTermAttribute>t.attributes[0]).term;
				 	if (t2.functor.name=="=" &&
						t2.attributes.length == 2 &&
						(t2.attributes[0] instanceof VariableTermAttribute) &&
						(t2.attributes[1] instanceof ConstantTermAttribute) &&
						(<ConstantTermAttribute>t2.attributes[1]).value == "david") {
						differentThanDavidFound = true;
					}
				 	if (t2.functor.name=="=" &&
						t2.attributes.length == 2 &&
						(t2.attributes[1] instanceof VariableTermAttribute) &&
						(t2.attributes[0] instanceof ConstantTermAttribute) &&
						(<ConstantTermAttribute>t2.attributes[0]).value == "david") {
						differentThanDavidFound = true;
					}
				}
			}
			if (humanFound && differentThanDavidFound) return true;
		}

		return false;
	}


	playerAsksQwertyToFixSpacesuit() 
	{
		if (this.contextQwerty != null) {
			let p1:NLContextPerformative = this.contextQwerty.lastPerformativeBy(this.playerID);
			if (p1 != null &&
				p1.timeStamp == this.game.in_game_seconds - 1) {	
				let perf:Term = p1.performative;
				if (perf.functor.is_a(this.game.ontology.getSort("perf.inform")) &&
					perf.attributes.length>1 &&
					perf.attributes[1] instanceof TermTermAttribute) {
					let argument:Term = (<TermTermAttribute>(perf.attributes[1])).term;
					let pattern1:Term = Term.fromString("property.broken('spacesuit'[#id])", this.game.ontology);
					let pattern2:Term = Term.fromString("#and(verb.have(V1:'spacesuit'[#id], T:[#id]), tear(T))", this.game.ontology)
					let b:Bindings = new Bindings();
					if (pattern1.subsumes(argument, true, b) ||
						pattern2.subsumes(argument, true, b)) {
						return true;
					}	

				} else if (perf.functor.is_a(this.game.ontology.getSort("perf.request.action"))  &&
					perf.attributes.length>1 &&
					perf.attributes[1] instanceof TermTermAttribute) {
					let argument:Term = (<TermTermAttribute>(perf.attributes[1])).term;
					let pattern3:Term = Term.fromString("verb.repair('qwerty'[#id], 'spacesuit'[#id])", this.game.ontology);
					let b:Bindings = new Bindings();
					if (pattern3.subsumes(argument, true, b)) return true;
				}

			}
		}			
		return false;
	} 


	playerAsksShrdluToFixShuttle() 
	{
		if (this.contextShrdlu != null) {
			let p1:NLContextPerformative = this.contextShrdlu.lastPerformativeBy(this.playerID);
			if (p1 != null &&
				p1.timeStamp == this.game.in_game_seconds - 1) {	
				let perf:Term = p1.performative;
				if (perf.functor.is_a(this.game.ontology.getSort("perf.request.action"))  &&
					perf.attributes.length>1 &&
					perf.attributes[1] instanceof TermTermAttribute) {
					let argument:Term = (<TermTermAttribute>(perf.attributes[1])).term;
					let pattern3:Term = Term.fromString("verb.repair('shrdlu'[#id], 'garage-shuttle'[#id])", this.game.ontology);
					let b:Bindings = new Bindings();
					if (pattern3.subsumes(argument, true, b)) return true;
				}
			}
		}			
		return false;
	} 


	playerAskedAboutTakingShrdlu() : Term
	{
		if (this.contextEtaoin == null) {
			this.contextEtaoin = this.game.etaoinAI.contextForSpeaker(this.playerID);
		}
		let context:NLContext = this.contextEtaoin;
		if (context != null) {
			let p1:NLContextPerformative = context.lastPerformativeBy(this.playerID);
			if (p1 != null && p1.timeStamp == this.game.in_game_seconds - 1) {	
				let perf:Term = p1.performative;
				if (perf.functor.is_a(this.game.ontology.getSort("perf.q.action")) ||
					perf.functor.is_a(this.game.ontology.getSort("perf.request.action"))) {
					let action:Term = (<TermTermAttribute>(perf.attributes[1])).term;

					if (this.actionRequestIsAboutTakingShrdlu(action)) return perf;
				}
			}
		}
		return null;
	}	


	actionRequestIsAboutTakingShrdlu(action:Term) : boolean
	{
		let pattern1:Term = Term.fromString("action.take('david'[#id], 'shrdlu'[#id])", this.game.ontology);
		let pattern2:Term = Term.fromString("verb.take-to('david'[#id], 'shrdlu'[#id], LOCATION:[#id])", this.game.ontology);
		let pattern3:Term = Term.fromString("action.give('etaoin'[#id], 'david'[#id], permission-to(V3:'david'[#id], action.take('david'[#id], 'shrdlu'[#id])))", this.game.ontology);
		let pattern4:Term = Term.fromString("action.give('etaoin'[#id], 'shrdlu'[#id], permission-to(V3:'shrdlu'[#id], verb.leave('shrdlu'[#id])))", this.game.ontology);
		let pattern5:Term = Term.fromString("action.give('etaoin'[#id], 'shrdlu'[#id], permission-to(V3:'shrdlu'[#id], verb.leave('shrdlu'[#id], 'location-aurora-station'[#id])))", this.game.ontology);
		let pattern6:Term = Term.fromString("action.give('etaoin'[#id], 'shrdlu'[#id], permission-to(V3:'shrdlu'[#id], verb.follow('shrdlu'[#id], 'david'[#id])))", this.game.ontology);

		if (pattern1.subsumes(action, true, new Bindings())) return true;
		if (pattern2.subsumes(action, true, new Bindings())) return true;
		if (pattern3.subsumes(action, true, new Bindings())) return true;
		if (pattern4.subsumes(action, true, new Bindings())) return true;
		if (pattern5.subsumes(action, true, new Bindings())) return true;
		if (pattern6.subsumes(action, true, new Bindings())) return true;	
		return false;	
	}


	playerAskedToRepairTheDatapad() : Term
	{
		if (this.contextEtaoin == null ||
			this.contextQwerty == null ||
			this.contextShrdlu == null) {
			this.contextEtaoin = this.game.etaoinAI.contextForSpeaker(this.playerID);
			this.contextQwerty = this.game.qwertyAI.contextForSpeaker(this.playerID);
			this.contextShrdlu = this.game.shrdluAI.contextForSpeaker(this.playerID);
		}
		for(let context of [this.contextQwerty, this.contextEtaoin, this.contextShrdlu]) {
			if (context != null) {
				let p1:NLContextPerformative = context.lastPerformativeBy(this.playerID);
				if (p1 != null && p1.timeStamp == this.game.in_game_seconds - 1) {	
					let pattern1:Term = Term.fromString("verb.repair(X:[#id], 'shuttle-datapad'[#id])", this.game.ontology);
					let perf:Term = p1.performative;
					if (perf.functor.is_a(this.game.ontology.getSort("perf.q.action")) ||
						perf.functor.is_a(this.game.ontology.getSort("perf.request.action"))) {
						let action:Term = (<TermTermAttribute>(perf.attributes[1])).term;

						if (pattern1.subsumes(action, true, new Bindings())) return perf;
					}
				}
			}
		}
		return null;
	}


	// Controls the behavior of SHRDLU during act 2 (when does it go repair the different parts of the station, etc.)
	shrdluAct2AgendaUpdate()
	{
		let previous_state:number = this.act_2_shrdlu_agenda_state;

		switch(this.act_2_shrdlu_agenda_state) {
			case 0: // agenda has not started yet
					break;

			case 1:
					// shrdlu going to the self-repair spot:
					if (this.game.shrdluAI.intentions.length == 0 && 
						this.game.shrdluAI.queuedIntentions.length == 0 &&
						this.contextShrdlu.expectingAnswerToQuestion_stack.length == 0) {
						this.game.shrdluAI.clearCurrentAction();
						this.shrdluMoves(98*8, 7*8, this.game.qwertyAI.robot.map);
						this.act_2_shrdlu_agenda_state = 2;
					}
					break;

			case 2:
					if (this.game.shrdluAI.intentions.length == 0 && 
						this.game.shrdluAI.queuedIntentions.length == 0 &&
						this.contextShrdlu.expectingAnswerToQuestion_stack.length == 0) {
						this.shrdluMoves(81*8, 5*8, this.game.qwertyAI.robot.map);
						this.act_2_shrdlu_agenda_state = 3;
					}
					break;
			case 3: 	
					// waiting to arrive to the actual repair spot:
					if (this.game.shrdluAI.robot.x == 81*8 &&
						this.game.shrdluAI.robot.y == 5*8) {
						this.act_2_shrdlu_agenda_state = 10;
					}
					break;
			case 10: 
					if (this.act_2_shrdlu_agenda_state_timer >= 8*60*60) {
					// if (this.act_2_shrdlu_agenda_state_timer >= 8*60) {
						// SHRDLU is self-repaired!
						this.act_2_shrdlu_agenda_state = 11;
						this.game.shrdluAI.respondToPerformatives = true;
						this.game.shrdluAI.visionActive = true;	
						this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], verb.repair('shrdlu'[#id], 'broken-stasis-pod'[#id]))", this.game.ontology), PERCEPTION_PROVENANCE);
						this.game.shrdluAI.robot.strength = 8;	// increase Shrdlu's strength
					}
					break;
			case 11:
					// going to repair the stasis chamber:
					if (this.game.shrdluAI.intentions.length == 0 && 
						this.game.shrdluAI.queuedIntentions.length == 0 &&
						this.contextShrdlu.expectingAnswerToQuestion_stack.length == 0) {
						this.shrdluMovesOverrideable(5*8, 24*8, this.game.qwertyAI.robot.map, Term.fromString("verb.repair('shrdlu'[#id], 'broken-stasis-pod'[#id])", this.game.ontology));
						this.act_2_shrdlu_agenda_state = 12;
					}
					break;
			case 12: 	
					// waiting to arrive to the actual spot:
					if (this.game.shrdluAI.robot.x == 5*8 &&
						this.game.shrdluAI.robot.y == 24*8) {
						this.shrdluMovesOverrideable(7*8, 7*8, this.game.qwertyAI.robot.map, Term.fromString("verb.repair('shrdlu'[#id], 'broken-stasis-pod'[#id])", this.game.ontology));
						this.act_2_shrdlu_agenda_state = 13;
					}
					// resume:
					if (this.game.shrdluAI.currentAction_scriptQueue == null &&
						!this.contextShrdlu.inConversation &&
						(this.game.shrdluAI.robot.map.name == "Aurora Station" ||
						 this.game.shrdluAI.robot.map.name == "Aurora Station Outdoors")) {
						this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], verb.repair('shrdlu'[#id], 'broken-stasis-pod'[#id]))", this.game.ontology), PERCEPTION_PROVENANCE);
						this.shrdluMovesOverrideable(5*8, 24*8, this.game.qwertyAI.robot.map, Term.fromString("verb.repair('shrdlu'[#id], 'broken-stasis-pod'[#id])", this.game.ontology));
					}
					break;
			case 13: 	
					// waiting to arrive to the actual spot:
					if (this.game.shrdluAI.robot.x == 7*8 &&
						this.game.shrdluAI.robot.y == 7*8) {
						this.shrdluMovesOverrideable(7*8, 6*8, this.game.qwertyAI.robot.map, Term.fromString("verb.repair('shrdlu'[#id], 'broken-stasis-pod'[#id])", this.game.ontology));
						this.act_2_shrdlu_agenda_state = 20;
					}
					// resume:
					if (this.game.shrdluAI.currentAction_scriptQueue == null &&
						!this.contextShrdlu.inConversation &&
						(this.game.shrdluAI.robot.map.name == "Aurora Station" ||
						 this.game.shrdluAI.robot.map.name == "Aurora Station Outdoors")) {
						this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], verb.repair('shrdlu'[#id], 'broken-stasis-pod'[#id]))", this.game.ontology), PERCEPTION_PROVENANCE);
						this.shrdluMovesOverrideable(7*8, 7*8, this.game.qwertyAI.robot.map, Term.fromString("verb.repair('shrdlu'[#id], 'broken-stasis-pod'[#id])", this.game.ontology));
					}
					break;
			case 20: 
					// repairing the stasis pod:
					if (this.act_2_shrdlu_agenda_state_timer >= 1*60*60 &&
						this.game.shrdluAI.currentAction_scriptQueue == null &&
						!this.contextShrdlu.inConversation) {
						// stasis pod repaired
						this.act_2_shrdlu_agenda_state = 21;
						this.shrdluMovesOverrideable(87*8, 33*8, this.game.qwertyAI.robot.map, Term.fromString("verb.repair('shrdlu'[#id], 'etaoin'[#id])", this.game.ontology));
						this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], verb.repair('shrdlu'[#id], 'etaoin'[#id]))", this.game.ontology), PERCEPTION_PROVENANCE);

						for(let ai of [this.game.etaoinAI, this.game.qwertyAI, this.game.shrdluAI]) {
							let se:SentenceEntry = ai.longTermMemory.findSentenceEntry(Sentence.fromString("property.broken('broken-stasis-pod'[#id])", this.game.ontology));
							se.sentence.sign[0] = false;
						}
					}
					// resume:
					if (this.act_2_shrdlu_agenda_state_timer >= 60 &&
						(this.game.shrdluAI.robot.x != 7*8 ||
						 this.game.shrdluAI.robot.y != 6*8)) {
						this.act_2_shrdlu_agenda_state = 13;
					}
					break;
			case 21:
					// waiting to arrive to the actual spot:
					if (this.game.shrdluAI.robot.x == 87*8 &&
						this.game.shrdluAI.robot.y == 33*8) {
						this.shrdluMovesOverrideable(91*8, 20*8, this.game.qwertyAI.robot.map, Term.fromString("verb.repair('shrdlu'[#id], 'etaoin'[#id])", this.game.ontology));
						this.act_2_shrdlu_agenda_state = 22;
					}
					// resume:
					if (this.game.shrdluAI.currentAction_scriptQueue == null &&
						!this.contextShrdlu.inConversation &&
						(this.game.shrdluAI.robot.map.name == "Aurora Station" ||
						 this.game.shrdluAI.robot.map.name == "Aurora Station Outdoors")) {
						this.shrdluMovesOverrideable(87*8, 33*8, this.game.qwertyAI.robot.map, Term.fromString("verb.repair('shrdlu'[#id], 'etaoin'[#id])", this.game.ontology));
						this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], verb.repair('shrdlu'[#id], 'etaoin'[#id]))", this.game.ontology), PERCEPTION_PROVENANCE);
					}
					break;
			case 22:
					// waiting to arrive to the actual spot:
					if (this.game.shrdluAI.robot.x == 91*8 &&
						this.game.shrdluAI.robot.y == 20*8) {
						this.act_2_shrdlu_agenda_state = 23;
					}
					// resume:
					if (this.game.shrdluAI.currentAction_scriptQueue == null &&
						!this.contextShrdlu.inConversation &&
						(this.game.shrdluAI.robot.map.name == "Aurora Station" ||
						 this.game.shrdluAI.robot.map.name == "Aurora Station Outdoors")) {
						this.shrdluMovesOverrideable(91*8, 20*8, this.game.qwertyAI.robot.map, Term.fromString("verb.repair('shrdlu'[#id], 'etaoin'[#id])", this.game.ontology));
						this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], verb.repair('shrdlu'[#id], 'etaoin'[#id]))", this.game.ontology), PERCEPTION_PROVENANCE);
					}
					break;
			case 23: 
					// repairing etaoin:
					if (this.act_2_shrdlu_agenda_state_timer >= 1*30*60 &&
						this.game.shrdluAI.currentAction_scriptQueue == null &&
						!this.contextShrdlu.inConversation) {
						// etaoin repaired
						this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], verb.repair('shrdlu'[#id], 'comm-tower'[#id]))", this.game.ontology), PERCEPTION_PROVENANCE);
						this.shrdluMovesOverrideable(6*8, 21*8, this.game.getMap("Aurora Station Outdoors"), Term.fromString("verb.repair('shrdlu'[#id], 'comm-tower'[#id])", this.game.ontology));
						this.act_2_shrdlu_agenda_state = 30;
					}
					if ((this.game.shrdluAI.robot.x != 91*8 ||
						 this.game.shrdluAI.robot.y != 20*8)) {
						this.shrdluMovesOverrideable(87*8, 33*8, this.game.qwertyAI.robot.map, Term.fromString("verb.repair('shrdlu'[#id], 'etaoin'[#id])", this.game.ontology));
						this.act_2_shrdlu_agenda_state = 21;
					}
					break;
			case 30: 
					if (this.game.shrdluAI.robot.x == 6*8 &&
						this.game.shrdluAI.robot.y == 21*8 &&
						this.game.shrdluAI.robot.map.name == "Aurora Station Outdoors") {
						this.act_2_shrdlu_agenda_state = 31;
					}
					// resume:
					if (this.game.shrdluAI.currentAction_scriptQueue == null &&
						!this.contextShrdlu.inConversation &&
						(this.game.shrdluAI.robot.map.name == "Aurora Station" ||
						 this.game.shrdluAI.robot.map.name == "Aurora Station Outdoors")) {
						this.shrdluMovesOverrideable(6*8, 21*8, this.game.getMap("Aurora Station Outdoors"), Term.fromString("verb.repair('shrdlu'[#id], 'comm-tower'[#id])", this.game.ontology));
						this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], verb.repair('shrdlu'[#id], 'comm-tower'[#id]))", this.game.ontology), PERCEPTION_PROVENANCE);
					}
					break;
			case 31: 
					// repairing the comm tower:
					if (this.act_2_shrdlu_agenda_state_timer >= 1*30*60 &&
						this.game.shrdluAI.currentAction_scriptQueue == null &&
						!this.contextShrdlu.inConversation) {
						// comm tower repaired
						this.act_2_shrdlu_agenda_state = 40;
						this.shrdluMovesOverrideable(81*8, 5*8, this.game.qwertyAI.robot.map, null);
						this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], 'nothing'[nothing])", this.game.ontology), PERCEPTION_PROVENANCE);
					}
					// resume:
					if (this.game.shrdluAI.robot.x != 6*8 ||
						this.game.shrdluAI.robot.y != 21*8) {
						this.act_2_shrdlu_agenda_state = 30;
					}
					break;


			// Random repairs loop:
			case 40: 
					if (this.game.shrdluAI.robot.x == 81*8 &&
						this.game.shrdluAI.robot.y == 5*8 &&
						this.game.shrdluAI.robot.map.name == "Aurora Station") {
						this.act_2_shrdlu_agenda_state = 41;
					}
					// resume:
					if (this.game.shrdluAI.currentAction_scriptQueue == null &&
						!this.contextShrdlu.inConversation &&
						(this.game.shrdluAI.robot.map.name == "Aurora Station" ||
						 this.game.shrdluAI.robot.map.name == "Aurora Station Outdoors")) {
						this.shrdluMovesOverrideable(81*8, 5*8, this.game.getMap("Aurora Station"), null);
					}
					break;
			case 41: 
					if (this.act_2_shrdlu_agenda_state_timer >= 10*60) {
						if (this.game.shrdluAI.currentAction_scriptQueue == null &&
							!this.contextShrdlu.inConversation) {
							let nextStates:number[] = [50, 60, 70, 80, 90];
							let choice:number =  Math.floor(Math.random() * nextStates.length);
							this.act_2_shrdlu_agenda_state = nextStates[choice];
						} else {
							this.act_2_shrdlu_agenda_state_timer = 0;
						}
					}
					// resume:
					if (this.game.shrdluAI.robot.x != 81*8 ||
						this.game.shrdluAI.robot.y != 5*8) {
						this.act_2_shrdlu_agenda_state = 40;
					}
					break;

			case 50: 
					// power plant
					this.shrdluMovesOverrideable(72*8, 44*8, this.game.getMap("Aurora Station Outdoors"), Term.fromString("verb.repair('shrdlu'[#id], 'aurora-station'[#id])", this.game.ontology));
					this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], verb.repair('shrdlu'[#id], 'aurora-station'[#id]))", this.game.ontology), PERCEPTION_PROVENANCE);
					this.act_2_shrdlu_agenda_state = 51;
					break;
			case 51: 
					// power plant
					if (this.game.shrdluAI.robot.x == 72*8 &&
						this.game.shrdluAI.robot.y == 44*8 &&
						this.game.shrdluAI.robot.map.name == "Aurora Station Outdoors") {
						this.act_2_shrdlu_agenda_state = 52;
					} else if (this.game.shrdluAI.currentAction_scriptQueue == null &&
						!this.contextShrdlu.inConversation &&
						(this.game.shrdluAI.robot.map.name == "Aurora Station" ||
						 this.game.shrdluAI.robot.map.name == "Aurora Station Outdoors")) {
						this.act_2_shrdlu_agenda_state = 40;
					}
					break;
			case 52: 
					// power plant
					if (this.act_2_shrdlu_agenda_state_timer >= 1*60*60 &&
						this.game.shrdluAI.currentAction_scriptQueue == null &&
						!this.contextShrdlu.inConversation) {
						this.act_2_shrdlu_agenda_state = 40;
						this.shrdluMovesOverrideable(81*8, 5*8, this.game.qwertyAI.robot.map, null);
						this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], 'nothing'[nothing])", this.game.ontology), PERCEPTION_PROVENANCE);
					}
					// resume:
					if (this.game.shrdluAI.robot.x != 72*8 ||
						this.game.shrdluAI.robot.y != 44*8) {
						this.act_2_shrdlu_agenda_state = 40;
					}
					break;
			
			case 60: 
					// green houses
					this.shrdluMovesOverrideable(41*8, 17*8, this.game.getMap("Aurora Station Outdoors"), Term.fromString("verb.repair('shrdlu'[#id], 'aurora-station'[#id])", this.game.ontology));
					this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], verb.repair('shrdlu'[#id], 'aurora-station'[#id]))", this.game.ontology), PERCEPTION_PROVENANCE);
					this.act_2_shrdlu_agenda_state = 61;
					break;
			case 61: 
					// green houses
					if (this.game.shrdluAI.robot.x == 41*8 &&
						this.game.shrdluAI.robot.y == 17*8 &&
						this.game.shrdluAI.robot.map.name == "Aurora Station Outdoors") {
						this.act_2_shrdlu_agenda_state = 62;
					} else if (this.game.shrdluAI.currentAction_scriptQueue == null &&
						!this.contextShrdlu.inConversation &&
						(this.game.shrdluAI.robot.map.name == "Aurora Station" ||
						 this.game.shrdluAI.robot.map.name == "Aurora Station Outdoors")) {
						this.act_2_shrdlu_agenda_state = 40;
					}
					break;
			case 62: 
					// green houses
					if (this.act_2_shrdlu_agenda_state_timer >= 1*60*60 &&
						this.game.shrdluAI.currentAction_scriptQueue == null &&
						!this.contextShrdlu.inConversation) {
						this.act_2_shrdlu_agenda_state = 40;
						this.shrdluMovesOverrideable(81*8, 5*8, this.game.qwertyAI.robot.map, null);
						this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], 'nothing'[nothing])", this.game.ontology), PERCEPTION_PROVENANCE);
					}
					// resume:
					if (this.game.shrdluAI.robot.x != 72*8 ||
						this.game.shrdluAI.robot.y != 44*8) {
						this.act_2_shrdlu_agenda_state = 40;
					}
					break;

			case 70: 
					// recycling
					this.shrdluMovesOverrideable(32*8, 17*8, this.game.getMap("Aurora Station Outdoors"), Term.fromString("verb.repair('shrdlu'[#id], 'aurora-station'[#id])", this.game.ontology));
					this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], verb.repair('shrdlu'[#id], 'aurora-station'[#id]))", this.game.ontology), PERCEPTION_PROVENANCE);
					this.act_2_shrdlu_agenda_state = 71;
					break;
			case 71: 
					// recycling
					if (this.game.shrdluAI.robot.x == 32*8 &&
						this.game.shrdluAI.robot.y == 17*8 &&
						this.game.shrdluAI.robot.map.name == "Aurora Station Outdoors") {
						this.act_2_shrdlu_agenda_state = 72;
					} else if (this.game.shrdluAI.currentAction_scriptQueue == null &&
						!this.contextShrdlu.inConversation &&
						(this.game.shrdluAI.robot.map.name == "Aurora Station" ||
						 this.game.shrdluAI.robot.map.name == "Aurora Station Outdoors")) {
						this.act_2_shrdlu_agenda_state = 40;
					}
					break;
			case 72: 
					// recycling
					if (this.act_2_shrdlu_agenda_state_timer >= 1*60*60 &&
						this.game.shrdluAI.currentAction_scriptQueue == null &&
						!this.contextShrdlu.inConversation) {
						this.act_2_shrdlu_agenda_state = 40;
						this.shrdluMovesOverrideable(81*8, 5*8, this.game.qwertyAI.robot.map, null);
						this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], 'nothing'[nothing])", this.game.ontology), PERCEPTION_PROVENANCE);
					}
					// resume:
					if (this.game.shrdluAI.robot.x != 72*8 ||
						this.game.shrdluAI.robot.y != 44*8) {
						this.act_2_shrdlu_agenda_state = 40;
					}
					break;

			case 80: 
					// recycling
					this.shrdluMovesOverrideable(54*8, 16*8, this.game.getMap("Aurora Station Outdoors"), Term.fromString("verb.repair('shrdlu'[#id], 'aurora-station'[#id])", this.game.ontology));
					this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], verb.repair('shrdlu'[#id], 'aurora-station'[#id]))", this.game.ontology), PERCEPTION_PROVENANCE);
					this.act_2_shrdlu_agenda_state = 81;
					break;
			case 81: 
					// recycling
					if (this.game.shrdluAI.robot.x == 54*8 &&
						this.game.shrdluAI.robot.y == 16*8 &&
						this.game.shrdluAI.robot.map.name == "Aurora Station Outdoors") {
						this.act_2_shrdlu_agenda_state = 82;
					} else if (this.game.shrdluAI.currentAction_scriptQueue == null &&
						!this.contextShrdlu.inConversation &&
						(this.game.shrdluAI.robot.map.name == "Aurora Station" ||
						 this.game.shrdluAI.robot.map.name == "Aurora Station Outdoors")) {
						this.act_2_shrdlu_agenda_state = 40;
					}
					break;
			case 82: 
					// recycling
					if (this.act_2_shrdlu_agenda_state_timer >= 1*60*60 &&
						this.game.shrdluAI.currentAction_scriptQueue == null &&
						!this.contextShrdlu.inConversation) {
						this.act_2_shrdlu_agenda_state = 40;
						this.shrdluMovesOverrideable(81*8, 5*8, this.game.qwertyAI.robot.map, null);
						this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], 'nothing'[nothing])", this.game.ontology), PERCEPTION_PROVENANCE);
					}
					// resume:
					if (this.game.shrdluAI.robot.x != 72*8 ||
						this.game.shrdluAI.robot.y != 44*8) {
						this.act_2_shrdlu_agenda_state = 40;
					}
					break;

			case 90: 
					// oxygen
					this.shrdluMovesOverrideable(54*8, 16*8, this.game.getMap("Aurora Station Outdoors"), Term.fromString("verb.repair('shrdlu'[#id], 'aurora-station'[#id])", this.game.ontology));
					this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], verb.repair('shrdlu'[#id], 'aurora-station'[#id]))", this.game.ontology), PERCEPTION_PROVENANCE);
					this.act_2_shrdlu_agenda_state = 91;
					break;
			case 91: 
					// oxygen
					if (this.game.shrdluAI.robot.x == 54*8 &&
						this.game.shrdluAI.robot.y == 16*8 &&
						this.game.shrdluAI.robot.map.name == "Aurora Station Outdoors") {
						this.act_2_shrdlu_agenda_state = 92;
					} else if (this.game.shrdluAI.currentAction_scriptQueue == null &&
						!this.contextShrdlu.inConversation &&
						(this.game.shrdluAI.robot.map.name == "Aurora Station" ||
						 this.game.shrdluAI.robot.map.name == "Aurora Station Outdoors")) {
						this.act_2_shrdlu_agenda_state = 40;
					}
					break;
			case 92: 
					// oxygen
					if (this.act_2_shrdlu_agenda_state_timer >= 1*60*60 &&
						this.game.shrdluAI.currentAction_scriptQueue == null &&
						!this.contextShrdlu.inConversation) {
						this.act_2_shrdlu_agenda_state = 40;
						this.shrdluMovesOverrideable(81*8, 5*8, this.game.qwertyAI.robot.map, null);
						this.game.shrdluAI.addLongTermTerm(Term.fromString("verb.do('shrdlu'[#id], 'nothing'[nothing])", this.game.ontology), PERCEPTION_PROVENANCE);
					}
					// resume:
					if (this.game.shrdluAI.robot.x != 72*8 ||
						this.game.shrdluAI.robot.y != 44*8) {
						this.act_2_shrdlu_agenda_state = 40;
					}
					break;
		}

		// udpate timers:
		if (previous_state == this.act_2_shrdlu_agenda_state) {
			this.act_2_shrdlu_agenda_state_timer++;
		} else {
			this.act_2_shrdlu_agenda_state_timer = 0;
		}
	}


	// Controls the behavior of SHRDLU during act 2 (when does it go repair the different parts of the station, etc.)
	qwertyAgendaUpdate()
	{
		let previous_state:number = this.qwerty_agenda_state;

		if (this.contextQwerty == null) this.contextQwerty = this.game.qwertyAI.contextForSpeaker(this.playerID);

		// if qwerty is doing something, then stop the agenda:
		if (this.act_1_stasis_thread_state > 0 && this.act_1_stasis_thread_state < 10) return;
		if (this.act_2_datapad_state != 0) return;

		switch(this.qwerty_agenda_state) {
			// Random destinations loop:
			case 0: 
					if (this.game.qwertyAI.robot.x == 8*8 &&
						this.game.qwertyAI.robot.y == 27*8 &&
						this.game.qwertyAI.robot.map.name == "Aurora Station") {
						this.qwerty_agenda_state = 1;
					}
					// resume:
					if (this.game.qwertyAI.currentAction_scriptQueue == null &&
						!this.contextQwerty.inConversation) {
						this.qwertyMovesOverrideable(8*8, 27*8, this.game.qwertyAI.robot.map, null);
					}
					break;
			case 1: 
					if (this.qwerty_agenda_state_timer >= QWERTY_AGENDA_DELAY) {
						if (this.game.qwertyAI.currentAction_scriptQueue == null &&
							!this.contextQwerty.inConversation) {
							let nextStates:number[] = [10, 20, 30, 40];
							let choice:number =  Math.floor(Math.random() * nextStates.length);
							this.qwerty_agenda_state = nextStates[choice];
						} else {
							this.qwerty_agenda_state_timer = 0;
						}
					}
					// resume:
					if (this.game.qwertyAI.robot.x != 8*8 ||
						this.game.qwertyAI.robot.y != 27*8) {
						this.qwerty_agenda_state = 0;
					}
					break;

			case 10: 
					this.qwertyMovesOverrideable(9*8, 25*8, this.game.qwertyAI.robot.map, null);
					this.qwerty_agenda_state = 11;
					break;
			case 11: 
					if (this.game.qwertyAI.robot.x == 9*8 &&
						this.game.qwertyAI.robot.y == 25*8) {
						this.qwerty_agenda_state = 12;
					} else if (this.game.qwertyAI.currentAction_scriptQueue == null &&
						!this.contextQwerty.inConversation) {
						this.qwerty_agenda_state = 0;
					}
					break;
			case 12: 
					if (this.qwerty_agenda_state_timer >= QWERTY_AGENDA_DELAY &&
						this.game.qwertyAI.currentAction_scriptQueue == null &&
						!this.contextQwerty.inConversation) {
						this.qwerty_agenda_state = 0;
						this.qwertyMovesOverrideable(8*8, 27*8, this.game.qwertyAI.robot.map, null);
					}
					// resume:
					if (this.game.qwertyAI.robot.x != 9*8 ||
						this.game.qwertyAI.robot.y != 25*8) {
						this.qwerty_agenda_state = 0;
					}
					break;
		
			case 20: 
					this.qwertyMovesOverrideable(3*8, 25*8, this.game.qwertyAI.robot.map, null);
					this.qwerty_agenda_state = 21;
					break;
			case 21: 
					if (this.game.qwertyAI.robot.x == 3*8 &&
						this.game.qwertyAI.robot.y == 25*8) {
						this.qwerty_agenda_state = 22;
					} else if (this.game.qwertyAI.currentAction_scriptQueue == null &&
						!this.contextQwerty.inConversation) {
						this.qwerty_agenda_state = 0;
					}
					break;
			case 22: 
					if (this.qwerty_agenda_state_timer >= QWERTY_AGENDA_DELAY &&
						this.game.qwertyAI.currentAction_scriptQueue == null &&
						!this.contextQwerty.inConversation) {
						this.qwerty_agenda_state = 0;
						this.qwertyMovesOverrideable(8*8, 27*8, this.game.qwertyAI.robot.map, null);
					}
					// resume:
					if (this.game.qwertyAI.robot.x != 3*8 ||
						this.game.qwertyAI.robot.y != 25*8) {
						this.qwerty_agenda_state = 0;
					}
					break;	

			case 30: 
					this.qwertyMovesOverrideable(10*8, 16*8, this.game.qwertyAI.robot.map, null);
					this.qwerty_agenda_state = 31;
					break;
			case 31: 
					if (this.game.qwertyAI.robot.x == 10*8 &&
						this.game.qwertyAI.robot.y == 16*8) {
						this.qwerty_agenda_state = 32;
					} else if (this.game.qwertyAI.currentAction_scriptQueue == null &&
						!this.contextQwerty.inConversation) {
						this.qwerty_agenda_state = 0;
					}
					break;
			case 32: 
					if (this.qwerty_agenda_state_timer >= QWERTY_AGENDA_DELAY &&
						this.game.qwertyAI.currentAction_scriptQueue == null &&
						!this.contextQwerty.inConversation) {
						this.qwerty_agenda_state = 0;
						this.qwertyMovesOverrideable(8*8, 27*8, this.game.qwertyAI.robot.map, null);
					}
					// resume:
					if (this.game.qwertyAI.robot.x != 10*8 ||
						this.game.qwertyAI.robot.y != 16*8) {
						this.qwerty_agenda_state = 0;
					}
					break;	

			case 40: 
					this.qwertyMovesOverrideable(34*8, 12*8, this.game.qwertyAI.robot.map, null);
					this.qwerty_agenda_state = 41;
					break;
			case 41: 
					if (this.game.qwertyAI.robot.x == 34*8 &&
						this.game.qwertyAI.robot.y == 12*8) {
						this.qwerty_agenda_state = 42;
					} else if (this.game.qwertyAI.currentAction_scriptQueue == null &&
						!this.contextQwerty.inConversation) {
						this.qwerty_agenda_state = 0;
					}
					break;
			case 42: 
					if (this.qwerty_agenda_state_timer >= QWERTY_AGENDA_DELAY &&
						this.game.qwertyAI.currentAction_scriptQueue == null &&
						!this.contextQwerty.inConversation) {
						this.qwerty_agenda_state = 0;
						this.qwertyMovesOverrideable(8*8, 27*8, this.game.qwertyAI.robot.map, null);
					}
					// resume:
					if (this.game.qwertyAI.robot.x != 34*8 ||
						this.game.qwertyAI.robot.y != 12*8) {
						this.qwerty_agenda_state = 0;
					}
					break;											
		}

		// udpate timers:
		if (previous_state == this.qwerty_agenda_state) {
			this.qwerty_agenda_state_timer++;
		} else {
			this.qwerty_agenda_state_timer = 0;
		}
	}


	/*
	addKnowledgeToEtaoinAfterRepair()
	{
		this.game.etaoinAI.addLongTermTerm(Term.fromString("ship('tardis8'[#id])", this.game.ontology), BACKGROUND_PROVENANCE);
		this.game.etaoinAI.addLongTermTerm(Term.fromString("ai('tardis8'[#id])", this.game.ontology), BACKGROUND_PROVENANCE);
		this.game.etaoinAI.addLongTermTerm(Term.fromString("name('tardis8'[#id],'tardis 8'[symbol])", this.game.ontology), BACKGROUND_PROVENANCE);

		this.game.etaoinAI.addLongTermTermWithTime(Term.fromString("verb.leave('tardis8'[#id],'earth'[#id])", this.game.ontology), BACKGROUND_PROVENANCE, 41338676700);
		this.game.etaoinAI.addLongTermTermWithTime(Term.fromString("verb.arrive('tardis8'[#id],'aurora'[#id])", this.game.ontology), BACKGROUND_PROVENANCE, 42895872000);
		this.game.etaoinAI.addLongTermTermWithTime(Term.fromString("verb.build('tardis8'[#id],'location-aurora-station'[#id])", this.game.ontology), BACKGROUND_PROVENANCE, 42895872000);

		this.game.etaoinAI.addLongTermTermWithTime(Term.fromString("verb.go-to('etaoin'[#id],'aurora'[#id])", this.game.ontology), BACKGROUND_PROVENANCE, 42895872000);
		this.game.etaoinAI.addLongTermTermWithTime(Term.fromString("verb.go-to('qwerty'[#id],'aurora'[#id])", this.game.ontology), BACKGROUND_PROVENANCE, 42895872000);
		this.game.etaoinAI.addLongTermTermWithTime(Term.fromString("verb.go-to('shrdlu'[#id],'aurora'[#id])", this.game.ontology), BACKGROUND_PROVENANCE, 42895872000);
		this.game.etaoinAI.addLongTermTermWithTime(Term.fromString("verb.go-to('jcuken'[#id],'aurora'[#id])", this.game.ontology), BACKGROUND_PROVENANCE, 42895872000);
		// this.game.etaoinAI.addLongTermTermWithTime(Term.fromString("verb.go-to('david'[#id],'aurora'[#id])", this.game.ontology), BACKGROUND_PROVENANCE, 42895872000);
		// this.game.etaoinAI.addLongTermTermWithTime(Term.fromString("property.born('david'[#id])", this.game.ontology), BACKGROUND_PROVENANCE, 40392525600);
	}
	*/


	playerHasItemP(itemId:string) : boolean
	{
		for(let item of this.game.currentPlayer.inventory) {
			if (item.ID == itemId) return true;
		}
		return false;
	}


	qwertyIntention(pattern:string)
	{
		pattern = pattern.split("$QWERTY").join("'"+this.qwertyID+"'[#id]");
		pattern = pattern.split("$ETAOIN").join("'"+this.etaoinID+"'[#id]");
		pattern = pattern.split("$PLAYER").join("'"+this.playerID+"'[#id]");
		let term:Term = Term.fromString(pattern, this.game.ontology);
		if (term == null) {
			console.error("qwertyIntention: cannot parse pattern " + pattern);
		} else {
			this.game.qwertyAI.queueIntention(term, null, null);
		}
	}


	qwertyMoves(x:number, y:number, map:A4Map)
	{
        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(this.game.qwertyAI.robot, this.game.qwertyAI.robot.map, this.game, null);
        let s:A4Script = new A4Script(A4_SCRIPT_GOTO_OPENING_DOORS, map.name, null, 0, false, false);
        s.x = x;
        s.y = y+this.game.qwertyAI.robot.tallness;
        q.scripts.push(s);
		this.game.qwertyAI.robot.addScriptQueue(q);
	}


	qwertyMovesOverrideable(x:number, y:number, map:A4Map, action:Term)
	{
        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(this.game.qwertyAI.robot, this.game.qwertyAI.robot.map, this.game, null);
        let s:A4Script = new A4Script(A4_SCRIPT_GOTO_OPENING_DOORS, map.name, null, 0, false, false);
        s.x = x;
        s.y = y+this.game.qwertyAI.robot.tallness;
        q.scripts.push(s);
        this.game.qwertyAI.clearCurrentAction();
        this.game.qwertyAI.currentAction = action;
		this.game.qwertyAI.currentAction_scriptQueue = q;
	}


	shrdluMoves(x:number, y:number, map:A4Map)
	{
        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(this.game.shrdluAI.robot, this.game.shrdluAI.robot.map, this.game, null);
        let s:A4Script = new A4Script(A4_SCRIPT_GOTO_OPENING_DOORS, map.name, null, 0, false, false);
        s.x = x;
        s.y = y+this.game.shrdluAI.robot.tallness;
        q.scripts.push(s);
		this.game.shrdluAI.robot.addScriptQueue(q);
	}


	shrdluMovesOverrideable(x:number, y:number, map:A4Map, action:Term)
	{
        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(this.game.shrdluAI.robot, this.game.shrdluAI.robot.map, this.game, null);
        let s:A4Script = new A4Script(A4_SCRIPT_GOTO_OPENING_DOORS, map.name, null, 0, false, false);
        s.x = x;
        s.y = y+this.game.shrdluAI.robot.tallness;
        q.scripts.push(s);
        this.game.shrdluAI.clearCurrentAction();
        this.game.shrdluAI.currentAction = action;
		this.game.shrdluAI.currentAction_scriptQueue = q;
	}


	qwertyDropsObject(objectID:string)
	{
        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(this.game.qwertyAI.robot, this.game.qwertyAI.robot.map, this.game, null);
        let s:A4Script = new A4Script(A4_SCRIPT_DROP, objectID, null, 0, false, false);
        q.scripts.push(s);
		this.game.qwertyAI.robot.addScriptQueue(q);
	}


	etaoinSays(pattern:string)
	{
		pattern = pattern.split("$QWERTY").join("'"+this.qwertyID+"'[#id]");
		pattern = pattern.split("$ETAOIN").join("'"+this.etaoinID+"'[#id]");
		pattern = pattern.split("$PLAYER").join("'"+this.playerID+"'[#id]");
		let term:Term = Term.fromString(pattern, this.game.ontology);
		if (term == null) {
			console.error("etaoinSays: cannot parse pattern " + pattern);
		} else {
			let term2:Term = new Term(this.game.ontology.getSort("action.talk"), 
									 [new ConstantTermAttribute(this.playerID, this.game.ontology.getSort("#id")), 
									  new TermTermAttribute(term)]);
			this.game.etaoinAI.queueIntention(term2, null, null);
		}
	}


	shrdluSays(pattern:string)
	{
		pattern = pattern.split("$QWERTY").join("'"+this.qwertyID+"'[#id]");
		pattern = pattern.split("$ETAOIN").join("'"+this.etaoinID+"'[#id]");
		pattern = pattern.split("$PLAYER").join("'"+this.playerID+"'[#id]");
		let term:Term = Term.fromString(pattern, this.game.ontology);
		if (term == null) {
			console.error("etaoinSays: cannot parse pattern " + pattern);
		} else {
			let term2:Term = new Term(this.game.ontology.getSort("action.talk"), 
									 [new ConstantTermAttribute(this.playerID, this.game.ontology.getSort("#id")), 
									  new TermTermAttribute(term)]);
			this.game.shrdluAI.queueIntention(term2, null, null);
		}
	}


	queueThoughtBubble(message:string) {
		this.thoughtBubbleQueue.push(message);
	}


	processQueuedThoughtBubbles() 
	{
		if (this.thoughtBubbleQueue.length == 0) return;
		if (this.game.currentPlayer.isIdle() &&
			!this.game.qwertyAI.robot.isTalking() &&
			!this.game.shrdluAI.robot.isTalking() &&
			this.game.etaoinAI.intentions.length == 0 &&
			this.game.etaoinAI.queuedIntentions.length == 0 &&
			this.game.currentPlayer.map.textBubbles.length == 0) {
			this.game.currentPlayer.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, this.thoughtBubbleQueue[0], A4_DIRECTION_NONE, this.game);
			this.thoughtBubbleQueue.splice(0,1);
		}
	}


    saveToXML() : string
    {
        let xmlString:string = "";
        xmlString += "<ShrdluGameScript\n";

        // Intro:
        xmlString += "act=\""+this.act+"\"\n";   
        xmlString += "act_intro_state=\""+this.act_intro_state+"\"\n";   
        xmlString += "act_intro_state_timer=\""+this.act_intro_state_timer+"\"\n";   
        xmlString += "act_intro_state_start_time=\""+this.act_intro_state_start_time+"\"\n";   
        xmlString += "act_intro_chair_x=\""+this.act_intro_chair_x+"\"\n";   
        xmlString += "act_intro_chair_y=\""+this.act_intro_chair_y+"\"\n";   

        // act 1:
        xmlString += "act_1_state=\""+this.act_1_state+"\"\n";   
        xmlString += "act_1_state_timer=\""+this.act_1_state_timer+"\"\n";   
        xmlString += "act_1_state_start_time=\""+this.act_1_state_start_time+"\"\n";   
        xmlString += "act_1_number_of_useless_etaoin_answers=\""+this.act_1_number_of_useless_etaoin_answers+"\"\n";   
        xmlString += "act_1_know_etaoin_is_an_AI=\""+this.act_1_know_etaoin_is_an_AI+"\"\n";   
        xmlString += "act_1_player_gone_outside=\""+this.act_1_player_gone_outside+"\"\n";   
        xmlString += "act_1_asked_about_being_alone_to_etaoin=\""+this.act_1_asked_about_being_alone_to_etaoin+"\"\n";   
        xmlString += "act_1_asked_about_being_alone_to_qwerty=\""+this.act_1_asked_about_being_alone_to_qwerty+"\"\n";   

        xmlString += "act_1_stasis_thread_state=\""+this.act_1_stasis_thread_state+"\"\n";   
        xmlString += "act_1_stasis_thread_state_timer=\""+this.act_1_stasis_thread_state_timer+"\"\n";   
        xmlString += "act_1_asked_about_tools=\""+this.act_1_asked_about_tools+"\"\n";   
        xmlString += "act_1_asked_about_battery=\""+this.act_1_asked_about_battery+"\"\n";   
        xmlString += "act_1_stated_spacesuit_is_broken=\""+this.act_1_stated_spacesuit_is_broken+"\"\n";   
        xmlString += "act_1_asked_about_bruce_alper=\""+this.act_1_asked_about_bruce_alper[0]+","+
        												this.act_1_asked_about_bruce_alper[1]+","+
        												this.act_1_asked_about_bruce_alper[2]+"\"\n";   
        xmlString += "act_1_asked_about_corpse=\""+this.act_1_asked_about_corpse[0]+","+
        										   this.act_1_asked_about_corpse[1]+","+
        										   this.act_1_asked_about_corpse[2]+"\"\n";   

        xmlString += "act_2_state=\""+this.act_2_state+"\"\n";   
        xmlString += "act_2_state_timer=\""+this.act_2_state_timer+"\"\n";   
        xmlString += "act_2_state_start_time=\""+this.act_2_state_start_time+"\"\n";   
        xmlString += "act_2_shrdlu_agenda_state=\""+this.act_2_shrdlu_agenda_state+"\"\n";   
        xmlString += "act_2_shrdlu_agenda_state_timer=\""+this.act_2_shrdlu_agenda_state_timer+"\"\n";   
        xmlString += "act_2_datapad_state=\""+this.act_2_datapad_state+"\"\n";
        xmlString += "act_2_datapad_state_timer=\""+this.act_2_datapad_state_timer+"\"\n";
        xmlString += "act_2_repair_shuttle_state=\""+this.act_2_repair_shuttle_state+"\"\n";   
        xmlString += "act_2_repair_shuttle_state_timer=\""+this.act_2_repair_shuttle_state_timer+"\"\n";   

        xmlString += "act_3_state=\""+this.act_3_state+"\"\n";   
        xmlString += "act_3_state_timer=\""+this.act_3_state_timer+"\"\n";   
        xmlString += "act_3_state_start_time=\""+this.act_3_state_start_time+"\"\n";   

        xmlString += "qwerty_agenda_state=\""+this.qwerty_agenda_state+"\"\n";   
        xmlString += "qwerty_agenda_state_timer=\""+this.qwerty_agenda_state_timer+"\"\n";   

        xmlString += "finding_life_side_plot_taken_question=\""+this.finding_life_side_plot_taken_question+"\"\n";   
        xmlString += "finding_life_side_plot_analyzed_question=\""+this.finding_life_side_plot_analyzed_question+"\"\n"; 
        xmlString += "what_is_dust_side_plot_taken_question=\""+this.what_is_dust_side_plot_taken_question+"\"\n";
        xmlString += "player_has_asked_to_take_shrdlu=\""+this.player_has_asked_to_take_shrdlu+"\"\n";

        xmlString += "/>\n";     
        for(let tmp in this.thoughtBubbleQueue) {
        	xmlString += "<thoughtBubbleQueue value=\""+tmp+"\"/>\n";  
    	}
        for(let tmp in this.act_1_explored_rooms) {
        	xmlString += "<act_1_explored_rooms value=\""+tmp+"\"/>\n";  
    	}
        return xmlString;
    }


    restoreFromXML(xml:Element)
    {
    	this.act = xml.getAttribute("act");
    	this.act_intro_state = Number(xml.getAttribute("act_intro_state"));
    	this.act_intro_state_timer = Number(xml.getAttribute("act_intro_state_timer"));
    	this.act_intro_state_start_time = Number(xml.getAttribute("act_intro_state_start_time"));
    	this.act_intro_chair_x = Number(xml.getAttribute("act_intro_chair_x"));
    	this.act_intro_chair_y = Number(xml.getAttribute("act_intro_chair_y"));

    	this.act_1_state = Number(xml.getAttribute("act_1_state"));
    	this.act_1_state_timer = Number(xml.getAttribute("act_1_state_timer"));
    	this.act_1_state_start_time = Number(xml.getAttribute("act_1_state_start_time"));
    	this.act_1_number_of_useless_etaoin_answers = Number(xml.getAttribute("act_1_number_of_useless_etaoin_answers"));
    	this.act_1_explored_rooms = [];
    	for(let xml_tmp of getElementChildrenByTag(xml,"act_1_explored_rooms")) {
    		this.act_1_explored_rooms.push(xml_tmp.getAttribute("value"));
    	}
    	this.act_1_know_etaoin_is_an_AI = xml.getAttribute("act_1_know_etaoin_is_an_AI") == "true";
    	this.act_1_player_gone_outside = xml.getAttribute("act_1_player_gone_outside") == "true";
    	this.act_1_asked_about_being_alone_to_etaoin = xml.getAttribute("act_1_asked_about_being_alone_to_etaoin") == "true";
    	this.act_1_asked_about_being_alone_to_qwerty = xml.getAttribute("act_1_asked_about_being_alone_to_qwerty") == "true";
    	this.act_1_stasis_thread_state = Number(xml.getAttribute("act_1_stasis_thread_state"));
    	this.act_1_stasis_thread_state_timer = Number(xml.getAttribute("act_1_stasis_thread_state_timer"));
    	this.act_1_asked_about_tools = xml.getAttribute("act_1_asked_about_tools") == "true";
    	this.act_1_asked_about_battery = xml.getAttribute("act_1_asked_about_battery") == "true";
    	this.act_1_stated_spacesuit_is_broken = xml.getAttribute("act_1_stated_spacesuit_is_broken") == "true";
    	this.act_1_asked_about_bruce_alper = [];
    	let tmp1:string[] = xml.getAttribute("act_1_asked_about_bruce_alper").split(",");
    	for(let tmp2 of tmp1) this.act_1_asked_about_bruce_alper.push(tmp2 == "true");
    	this.act_1_asked_about_corpse = [];
    	tmp1 = xml.getAttribute("act_1_asked_about_corpse").split(",");
    	for(let tmp2 of tmp1) this.act_1_asked_about_corpse.push(tmp2 == "true");

    	this.act_2_state = Number(xml.getAttribute("act_2_state"));
    	this.act_2_state_timer = Number(xml.getAttribute("act_2_state_timer"));
    	this.act_2_state_start_time = Number(xml.getAttribute("act_2_state_start_time"));
    	this.act_2_shrdlu_agenda_state = Number(xml.getAttribute("act_2_shrdlu_agenda_state"));
    	this.act_2_shrdlu_agenda_state_timer = Number(xml.getAttribute("act_2_shrdlu_agenda_state_timer"));
    	this.act_2_datapad_state = Number(xml.getAttribute("act_2_datapad_state"));
    	this.act_2_datapad_state_timer = Number(xml.getAttribute("act_2_datapad_state_timer"));
    	this.act_2_repair_shuttle_state = Number(xml.getAttribute("act_2_repair_shuttle_state"));
    	this.act_2_repair_shuttle_state_timer = Number(xml.getAttribute("act_2_repair_shuttle_state_timer"));

    	this.act_3_state = Number(xml.getAttribute("act_3_state"));
    	this.act_3_state_timer = Number(xml.getAttribute("act_3_state_timer"));
    	this.act_3_state_start_time = Number(xml.getAttribute("act_3_state_start_time"));

    	this.qwerty_agenda_state = Number(xml.getAttribute("qwerty_agenda_state"));
    	this.qwerty_agenda_state_timer = Number(xml.getAttribute("qwerty_agenda_state_timer"));

    	this.finding_life_side_plot_taken_question = xml.getAttribute("finding_life_side_plot_taken_question") == "true";
    	this.finding_life_side_plot_analyzed_question = xml.getAttribute("finding_life_side_plot_analyzed_question") == "true";
    	this.what_is_dust_side_plot_taken_question = xml.getAttribute("what_is_dust_side_plot_taken_question") == "true";
    	this.player_has_asked_to_take_shrdlu = xml.getAttribute("player_has_asked_to_take_shrdlu") == "true";

		this.thoughtBubbleQueue = []
    	for(let xml_tmp of getElementChildrenByTag(xml,"thoughtBubbleQueue")) {
    		this.thoughtBubbleQueue.push(xml_tmp.getAttribute("value"));
    	}
    }


	app:A4EngineApp = null;
	game:A4Game = null;
	qwertyID:string = null;
	etaoinID:string = null;
	playerID:string = null;

	contextEtaoin:NLContext = null;
	contextQwerty:NLContext = null;
	contextShrdlu:NLContext = null;

	thoughtBubbleQueue:string[] = [];

	act:string = "intro";
	act_intro_state:number = 0;
	act_intro_state_timer:number = 0;
	act_intro_state_start_time:number = 0;
	act_intro_chair_x:number = -1;
	act_intro_chair_y:number = -1;

	act_1_state:number = 0;
	act_1_state_timer:number = 0;
	act_1_state_start_time:number = 0;
	act_1_number_of_useless_etaoin_answers:number = 0;
	act_1_explored_rooms:string[] = [];
	act_1_know_etaoin_is_an_AI:boolean = false;
	act_1_player_gone_outside:boolean = false;
	act_1_asked_about_being_alone_to_etaoin:boolean = false;
	act_1_asked_about_being_alone_to_qwerty:boolean = false;

	act_1_stasis_thread_state:number = 0;
	act_1_stasis_thread_state_timer:number = 0;

	act_1_asked_about_tools:boolean = false;
	act_1_asked_about_battery:boolean = false;
	act_1_stated_spacesuit_is_broken:boolean = false;

	act_1_asked_about_bruce_alper:boolean[] = [false,false,false];
	act_1_asked_about_corpse:boolean[] = [false,false,false];


	act_2_state:number = 0;
	act_2_state_timer:number = 0;
	act_2_state_start_time:number = 0;

	act_2_shrdlu_agenda_state:number = 0;
	act_2_shrdlu_agenda_state_timer:number = 0;

	act_2_datapad_state:number = 0;
	act_2_datapad_state_timer:number = 0;

	act_2_repair_shuttle_state:number = 0;
	act_2_repair_shuttle_state_timer:number = 0;

	qwerty_agenda_state:number = 0;
	qwerty_agenda_state_timer:number = 0;

	act_3_state:number = 0;
	act_3_state_timer:number = 0;
	act_3_state_start_time:number = 0;


	finding_life_side_plot_taken_question:boolean = false;
	finding_life_side_plot_analyzed_question:boolean = false;
	what_is_dust_side_plot_taken_question:boolean = false;
	player_has_asked_to_take_shrdlu:boolean = false;
}
