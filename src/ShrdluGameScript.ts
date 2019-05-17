/*

Note (santi):
- This class implements the game story script. All the events that constitute the main storyline are controlled from this class.
- Notice that all the sentences said by the NPCs are actually generated using natural language generation, rather than being
  hardcoded here. That is so that they can have an internal representation of them, and they can reason about them.
- Only the text said by the player character in thought bubbles is hardcoded directly as text.
- I should probably turn this class into some sort of XML or JSON file with the events properly defined, since it very quickly
  grew into a mess. But the flexibility of having it all here in code is hard to match :)

*/

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
		if (this.act == "intro") {
			//this.skip_to_act_end_of_intro();
			this.skip_to_act_1();
			//this.skip_to_end_of_act_1();
			//this.skip_to_act_2();
		}

		if (this.act == "intro") this.update_act_intro();
		if (this.act == "1") this.update_act_1();
		if (this.act == "2") this.update_act_2();
		
		this.update_sideplots();

		this.processQueuedThoughtBubbles();
	}


	// This is a debug function, remove once the game is complete!
	skip_to_act_end_of_intro()
	{
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
		var idx:number = this.game.qwertyAI.objectsNotAllowedToGive.indexOf("garage-key");
		this.game.qwertyAI.objectsNotAllowedToGive.splice(idx,1);

		this.game.qwertyAI.allowPlayerInto("location-garage", "GARAGE");
		this.game.etaoinAI.allowPlayerInto("location-garage", "GARAGE");
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

		// start in the garage:
		//this.game.currentPlayer.x = 864;
		//this.game.currentPlayer.y = 40;
//		this.act_1_state = 11;	// waiting for player to ask about other humans
//		this.act_1_state = 15;	// etaoin will ask to go find Shrdlu
		this.act_1_state = 19;

		var term:Term = Term.fromString("goal(D:'david'[#id],verb.find(X, 'shrdlu'[#id]))",this.game.ontology);
		this.game.etaoinAI.addLongTermTerm(term, MEMORIZE_PROVENANCE);

		this.game.currentPlayer.inventory.push(this.game.qwertyAI.robot.inventory[1]);	// maintenance key
		this.game.qwertyAI.robot.inventory.splice(1,1);
		this.game.currentPlayer.inventory.push(this.game.objectFactory.createObject("workingspacesuit", this.game, false, false));
		this.game.currentPlayer.inventory.push(this.game.objectFactory.createObject("full-battery", this.game, false, false));
		this.game.setStoryStateVariable("act1-corpse", "discovered");

		var term1:Term = Term.fromString("verb.happen('etaoin'[#id], erased('etaoin-memory'[#id]))", this.game.ontology);
		this.game.etaoinAI.addLongTermTerm(term1, PERCEPTION_PROVENANCE);
		this.game.qwertyAI.addLongTermTerm(term1, PERCEPTION_PROVENANCE);
		var term2:Term = Term.fromString("property.problem('etaoin'[#id], erased('etaoin-memory'[#id]))", this.game.ontology);
		this.game.etaoinAI.addLongTermTerm(term2, PERCEPTION_PROVENANCE);
		this.game.qwertyAI.addLongTermTerm(term2, PERCEPTION_PROVENANCE);
		var term3:Term = Term.fromString("property.strange(erased('etaoin-memory'[#id]))", this.game.ontology);
		this.game.etaoinAI.addLongTermTerm(term3, PERCEPTION_PROVENANCE);
		this.game.qwertyAI.addLongTermTerm(term3, PERCEPTION_PROVENANCE);

		// start in spacer valley
		//this.game.requestWarp(this.game.currentPlayer, this.game.maps[2], 40*8, 51*8);
		var suit_l:A4Object[] = this.game.findObjectByID("broken-ss");
		(<A4Container>(suit_l[0])).content.splice((<A4Container>(suit_l[0])).content.indexOf(suit_l[1]), 1);
		this.game.currentPlayer.inventory.push(suit_l[1]);		
		this.game.currentPlayer.inventory.push(this.game.objectFactory.createObject("helmet", this.game, false, false));
	}


	skip_to_end_of_act_1()
	{
		this.skip_to_act_1();
		this.game.currentPlayer.x = 864;
		this.game.currentPlayer.y = 40;
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
		// this.game.currentPlayer.warp(8*8, 12*8, this.game.maps[4]);
	}


	update_act_intro() 
	{
		var previous_state:number = this.act_intro_state;

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
				var term:Term = Term.fromString("healthy('david'[#id])", this.game.ontology);
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
					var lastPerformative:NLContextPerformative = this.contextQwerty.lastPerformativeBy(this.playerID);
					if (lastPerformative.performative.functor.is_a(this.game.ontology.getSort("perf.inform.answer"))) {
						var answer:TermAttribute = lastPerformative.performative.attributes[1];
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
//						var idx:number = this.contextQwerty.expectingAnswerToQuestion_stack.length-1;
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
					var lastPerformative:NLContextPerformative = this.contextQwerty.lastPerformativeBy(this.playerID);
					if (lastPerformative.performative.functor.is_a(this.game.ontology.getSort("perf.inform.answer"))) {
						var answer:TermAttribute = lastPerformative.performative.attributes[1];
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
//						var idx:number = this.contextQwerty.expectingAnswerToQuestion_stack.length-1;
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
					var lastPerformative:NLContextPerformative = this.contextQwerty.lastPerformativeBy(this.playerID);
					if (lastPerformative.performative.functor.is_a(this.game.ontology.getSort("perf.inform.answer"))) {
						var answer:TermAttribute = lastPerformative.performative.attributes[1];
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
//						var idx:number = this.contextQwerty.expectingAnswerToQuestion_stack.length-1;
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

				var term:Term = Term.fromString("goal(D:'david'[#id],action.push(X, '512'[#id]))",this.game.ontology);
				this.game.qwertyAI.addLongTermTerm(term, MEMORIZE_PROVENANCE);

				var chair:A4Object = this.game.findObjectByIDJustObject("512");
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
			var chair:A4Object = this.game.findObjectByIDJustObject("512");
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

				var term:Term = Term.fromString("goal(D:'david'[#id],verb.follow(X, 'qwerty'[#id]))",this.game.ontology);
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
            	var dx:number = this.game.qwertyAI.robot.x - this.game.currentPlayer.x;
            	var dy:number = this.game.qwertyAI.robot.y - this.game.currentPlayer.y;
            	var d2:number = (dx*dx)+(dy*dy);
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
            	var dx:number = this.game.qwertyAI.robot.x - this.game.currentPlayer.x;
            	var dy:number = this.game.qwertyAI.robot.y - this.game.currentPlayer.y;
            	var d2:number = (dx*dx)+(dy*dy);
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
            	var dx:number = this.game.qwertyAI.robot.x - this.game.currentPlayer.x;
            	var dy:number = this.game.qwertyAI.robot.y - this.game.currentPlayer.y;
            	var d2:number = (dx*dx)+(dy*dy);
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
            	var dx:number = this.game.qwertyAI.robot.x - this.game.currentPlayer.x;
            	var dy:number = this.game.qwertyAI.robot.y - this.game.currentPlayer.y;
            	var d2:number = (dx*dx)+(dy*dy);
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
            	var dx:number = this.game.qwertyAI.robot.x - this.game.currentPlayer.x;
            	var dy:number = this.game.qwertyAI.robot.y - this.game.currentPlayer.y;
            	var d2:number = (dx*dx)+(dy*dy);
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
				var term:Term = Term.fromString("goal(D:'david'[#id],action.take(X, 'communicator'[#id]))",this.game.ontology);
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

				var term:Term = Term.fromString("goal(D:'david'[#id],verb.go-to(X, 'verb.sleep'[verb.sleep]))",this.game.ontology);
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
		var previous_state:number = this.act_1_state;

		if (this.contextQwerty == null) this.contextQwerty = this.game.qwertyAI.contextForSpeaker(this.playerID);
		if (this.act_1_state >= 6 && this.contextEtaoin == null) this.contextEtaoin = this.game.etaoinAI.contextForSpeaker(this.playerID);

		// check to see if the knowledge state needs to advance based on what the AI or the player say:
		if (this.act_1_state >= 6) {
			if (!this.act_1_know_etaoin_is_an_AI) {
				var p1:NLContextPerformative = this.contextEtaoin.lastPerformativeBy(this.game.etaoinAI.selfID);
				var p2:NLContextPerformative = this.contextQwerty.lastPerformativeBy(this.game.qwertyAI.selfID);
				if (p1!=null && 
					p1.timeStamp == this.game.in_game_seconds - 1) {
					var pattern:Term = Term.fromString("perf.inform.answer('david'[#id], ai('etaoin'[#id]))", this.game.ontology);
					if (p1.performative.equals(pattern)) {
						this.act_1_know_etaoin_is_an_AI = true;
						console.log("this.act_1_know_etaoin_is_an_AI = true");
					}
				}
				if (p2!=null &&
					p2.timeStamp == this.game.in_game_seconds - 1) {
					var pattern:Term = Term.fromString("perf.inform.answer('david'[#id], ai('etaoin'[#id]))", this.game.ontology);
					if (p2.performative.equals(pattern)) {
						this.act_1_know_etaoin_is_an_AI = true;
						console.log("this.act_1_know_etaoin_is_an_AI = true");
					}
				}
			}
		}

		if (!this.act_1_asked_about_being_alone_to_etaoin && this.contextEtaoin != null) {
			var p1:NLContextPerformative = this.contextEtaoin.lastPerformativeBy(this.playerID);
			if (p1 != null &&
				p1.timeStamp == this.game.in_game_seconds - 1) {	
				var perf:Term = p1.performative;
				if (this.questionAboutBeingAlone(perf)) {
					this.act_1_asked_about_being_alone_to_etaoin = true;
					console.log("this.act_1_asked_about_being_alone_to_etaoin = true");
				}
			}
		}

		if (!this.act_1_asked_about_being_alone_to_qwerty && this.contextQwerty != null) {
			var p1:NLContextPerformative = this.contextQwerty.lastPerformativeBy(this.playerID);
			if (p1 != null &&
				p1.timeStamp == this.game.in_game_seconds - 1) {	
				var perf:Term = p1.performative;
				if (this.questionAboutBeingAlone(perf)) {
					this.act_1_asked_about_being_alone_to_qwerty = true;
					console.log("this.act_1_asked_about_being_alone_to_qwerty = true");
				}
			}
		}		

		if (!this.act_1_asked_about_being_alone_to_etaoin && this.contextEtaoin != null) {
			var p1:NLContextPerformative = this.contextEtaoin.lastPerformativeBy(this.playerID);
			if (p1 != null &&
				p1.timeStamp == this.game.in_game_seconds - 1) {	
				var perf:Term = p1.performative;
				var v:TermAttribute = null;
				var queryTerms:TermAttribute[] = null;
				if (perf.functor.is_a(this.game.ontology.getSort("perf.question")) &&
					perf.attributes.length>=2 && 
					perf.attributes[1] instanceof TermTermAttribute) {
					var patterna:Term = Term.fromString("alone('david'[#id])", this.game.ontology);
					if (patterna.subsumes((<TermTermAttribute>perf.attributes[1]).term, true, new Bindings())) {
						this.act_1_asked_about_being_alone_to_etaoin = true;
						console.log("this.act_1_asked_about_being_alone_to_etaoin = true");
					}
				}
			}
		}
		if (!this.act_1_asked_about_being_alone_to_qwerty && this.contextEtaoin != null) {
			var p1:NLContextPerformative = this.contextQwerty.lastPerformativeBy(this.playerID);
			if (p1 != null &&
				p1.timeStamp == this.game.in_game_seconds - 1) {	
				var perf:Term = p1.performative;
				var v:TermAttribute = null;
				var queryTerms:TermAttribute[] = null;
				if (perf.functor.is_a(this.game.ontology.getSort("perf.question")) &&
					perf.attributes.length>=2 && 
					perf.attributes[1] instanceof TermTermAttribute) {
					var patterna:Term = Term.fromString("alone('david'[#id])", this.game.ontology);
					if (patterna.subsumes((<TermTermAttribute>perf.attributes[1]).term, true, new Bindings())) {
						this.act_1_asked_about_being_alone_to_qwerty = true;
						console.log("this.act_1_asked_about_being_alone_to_qwerty = true");
					}
				}
			}
		}

		var act_1_asked_about_bruce_alper_to_anyone:boolean = false;
		var act_1_asked_about_corpse_to_anyone:boolean = false;
		for(let i:number = 0;i<3;i++) {
			if (this.act_1_asked_about_bruce_alper[i]) act_1_asked_about_bruce_alper_to_anyone = true;
			if (this.act_1_asked_about_corpse[i]) act_1_asked_about_corpse_to_anyone = true;
		}
		for(let i:number = 0;i<3;i++) {
			var name:string = "Etaoin";
			var ctx:NLContext = this.contextEtaoin;
			if (i == 1) {
				ctx = this.contextQwerty;
				name = "Qwerty";
			}
			if (i == 2) {
				ctx = this.contextShrdlu;
				name = "Shrdlu";
			}
			if (ctx != null) {
				var p1:NLContextPerformative = ctx.lastPerformativeBy(this.playerID);
				var p2:NLContextPerformative = ctx.lastPerformativeBy(ctx.ai.selfID);
				if (p2 != null && 
					p2.timeStamp == this.game.in_game_seconds - 1 &&
					p1 != null) {
					if (!this.act_1_asked_about_bruce_alper[i]) {
						var patternq:Term = Term.fromString("perf.q.whois.name(X:[any], Y:[any], name(Y, 'bruce alper'[symbol]))", this.game.ontology);
						var patterna:Term = Term.fromString("perf.inform.answer('david'[#id], 'unknown'[symbol])", this.game.ontology);
						var perfq:Term = p1.performative;
						var perfa:Term = p2.performative;
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
						var patternq:Term = Term.fromString("perf.q.whois.noname(X:[any], 'corpse'[#id])", this.game.ontology);
						var patterna:Term = Term.fromString("perf.inform.answer('david'[#id], 'unknown'[symbol])", this.game.ontology);
						var perfq:Term = p1.performative;
						var perfa:Term = p2.performative;
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
			var p1:NLContextPerformative = this.contextEtaoin.lastPerformativeBy(this.game.etaoinAI.selfID);
			var p2:NLContextPerformative = this.contextEtaoin.lastPerformativeBy(this.playerID);
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
				var currentRoom:AILocation = this.game.getAILocation(this.game.currentPlayer);
				if (currentRoom != null) {
					var name:string = currentRoom.name;
					if (name == null) name = currentRoom.sort.name;
					if (name.indexOf("corridor") == -1 &&
						name != "infirmary" &&
						name != "bedroom 5" &&
						name != "aurora station") {
						if (this.act_1_explored_rooms.indexOf(name) == -1) {
							var messages:string[] = ["There is no one here...",
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
				var term:Term = Term.fromString("erased('etaoin-memory'[#id])", this.game.ontology);
				this.game.etaoinAI.addLongTermTerm(term, PERCEPTION_PROVENANCE);
				this.etaoinSays("perf.inform('david'[#id], #and(V:verb.find(E:'etaoin'[#id], #and(P1:erased(M:'etaoin-memory'[#id]), time.past(P1))), time.past(V)))");
				this.etaoinSays("perf.inform('david'[#id], verb.need('etaoin'[#id], verb.look-at('shrdlu'[#id],'etaoin-memory'[#id])))");

				var term1:Term = Term.fromString("verb.happen('etaoin'[#id], erased('etaoin-memory'[#id]))", this.game.ontology);
				this.game.etaoinAI.addLongTermTerm(term1, PERCEPTION_PROVENANCE);
				this.game.qwertyAI.addLongTermTerm(term1, PERCEPTION_PROVENANCE);
				var term2:Term = Term.fromString("property.problem('etaoin'[#id], erased('etaoin-memory'[#id]))", this.game.ontology);
				this.game.etaoinAI.addLongTermTerm(term2, PERCEPTION_PROVENANCE);
				this.game.qwertyAI.addLongTermTerm(term2, PERCEPTION_PROVENANCE);
				var term3:Term = Term.fromString("property.strange(erased('etaoin-memory'[#id]))", this.game.ontology);
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
				var p:NLContextPerformative = this.contextEtaoin.lastPerformativeBy(this.playerID);
				if (p!=null) {
					if (p.timeStamp == this.game.in_game_seconds - 1) {
						if (p.performative.functor.is_a(this.game.ontology.getSort("perf.inform.answer")) &&
							this.game.etaoinAI.intentions.length == 0 &&
							this.game.etaoinAI.queuedIntentions.length == 0 &&
							this.contextEtaoin.expectingAnswerToQuestion_stack.length == 0) {
							var answer:TermAttribute = p.performative.attributes[1];
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
				this.etaoinSays("perf.request.action('david'[#id], #and(V1:action.take('david'[#id], '559'[#id]), relation.purpose(V1, verb.find('david'[#id],'shrdlu'[#id]))))");
				this.etaoinSays("perf.inform('david'[#id], space.at('559'[#id], 'location-garage'[#id]))");
				this.etaoinSays("perf.inform('david'[#id], verb.have('qwerty'[#id], 'garage-key'[#id]))");

				// the player now has the goal to find shrdlue:
				var term:Term = Term.fromString("goal(D:'david'[#id],verb.find(X, 'shrdlu'[#id]))",this.game.ontology);
				this.game.etaoinAI.addLongTermTerm(term, MEMORIZE_PROVENANCE);

				// tell qwerty it can give the key to the player:
				var idx:number = this.game.qwertyAI.objectsNotAllowedToGive.indexOf("garage-key");
				this.game.qwertyAI.objectsNotAllowedToGive.splice(idx,1);
				this.game.qwertyAI.allowPlayerInto("location-garage", "GARAGE");
				this.game.etaoinAI.allowPlayerInto("location-garage", "GARAGE");
				this.act_1_state = 19;
			}
			break;

		case 19:
			// detect when player asks about where are the tools:
			if (!this.act_1_asked_about_tools && this.contextEtaoin != null) {
				var p1:NLContextPerformative = this.contextEtaoin.lastPerformativeBy(this.playerID);
				if (p1 != null &&
					p1.timeStamp == this.game.in_game_seconds - 1) {	
					var perf:Term = p1.performative;
					var v:TermAttribute = null;
					var queryTerms:TermAttribute[] = null;
					if (perf.functor.is_a(this.game.ontology.getSort("perf.q.whereis"))) {
						v = perf.attributes[1];
						if (v instanceof ConstantTermAttribute) {
							queryTerms = [v];
						} else if (v instanceof TermTermAttribute) {
							var query:Term = (<TermTermAttribute>v).term;
							queryTerms = NLParser.elementsInList(query, "#and");							
						}
					}
					if (queryTerms != null) {
						var toolsFound:boolean = false;
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
							var idx:number = this.game.qwertyAI.objectsNotAllowedToGive.indexOf("maintenance-key");
							this.game.qwertyAI.objectsNotAllowedToGive.splice(idx,1);
							this.game.qwertyAI.allowPlayerInto("location-maintenance","MAINTENANCE");
							this.game.etaoinAI.allowPlayerInto("location-maintenance","MAINTENANCE");
						}
					}
				}
			}

			if (!this.act_1_asked_about_battery && this.contextEtaoin != null) {
				var p1:NLContextPerformative = this.contextEtaoin.lastPerformativeBy(this.playerID);
				if (p1 != null &&
					p1.timeStamp == this.game.in_game_seconds - 1) {	
					var perf:Term = p1.performative;
					if (perf.functor.is_a(this.game.ontology.getSort("perf.inform")) &&
						perf.attributes.length>1 &&
						perf.attributes[1] instanceof TermTermAttribute) {
						var argument:Term = (<TermTermAttribute>(perf.attributes[1])).term;
						var pattern1:Term = Term.fromString("empty('empty-battery'[#id])", this.game.ontology);
						var b:Bindings = new Bindings();
						if (pattern1.subsumes(argument, true, b)) {
							this.act_1_asked_about_battery = true;
							console.log("update_act_1, state 19: detected battery is empty 1");
							this.etaoinSays("perf.inform('david'[#id], verb.can('david'[#id], #and(F:verb.fill('david'[#id], 'empty-battery'[#id]), space.at(F,'location-powerplant'[#id]) )))");
						}						
					} else if (perf.functor.is_a(this.game.ontology.getSort("perf.q.predicate")) &&
							   perf.attributes.length>1 &&
							   perf.attributes[1] instanceof TermTermAttribute) {
						var argument:Term = (<TermTermAttribute>(perf.attributes[1])).term;
						var pattern1:Term = Term.fromString("battery(V)", this.game.ontology);
						var pattern2:Term = Term.fromString("#and(full(V:[any]), V4:battery(V))", this.game.ontology);
						var b:Bindings = new Bindings();
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
						var argument:Term = (<TermTermAttribute>(perf.attributes[2])).term;
						var pattern1:Term = Term.fromString("battery(V)", this.game.ontology);
						var pattern2:Term = Term.fromString("#and(full(V:[any]), V4:battery(V))", this.game.ontology);
						var b:Bindings = new Bindings();
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
				var p1:NLContextPerformative = this.contextEtaoin.lastPerformativeBy(this.playerID);
				if (p1 != null &&
					p1.timeStamp == this.game.in_game_seconds - 1) {	
					var perf:Term = p1.performative;
					if (perf.functor.is_a(this.game.ontology.getSort("perf.inform")) &&
						perf.attributes.length>1 &&
						perf.attributes[1] instanceof TermTermAttribute) {
						var argument:Term = (<TermTermAttribute>(perf.attributes[1])).term;
						var pattern1:Term = Term.fromString("property.broken('broken-ss'[#id])", this.game.ontology);
						var pattern2:Term = Term.fromString("#and(verb.have(V1:'broken-ss'[#id], T:[#id]), tear(T))", this.game.ontology)
						var b:Bindings = new Bindings();
						if (pattern1.subsumes(argument, true, b) ||
							pattern2.subsumes(argument, true, b)) {
							this.act_1_stated_spacesuit_is_broken = true;
//							console.log("update_act_1, state 19: detected spacesuit is broken");
							this.etaoinSays("perf.inform('david'[#id], verb.can('qwerty'[#id], verb.repair('qwerty'[#id], 'broken-ss'[#id])))");
						}						
					} else if ((perf.functor.is_a(this.game.ontology.getSort("perf.q.action")) ||
						 	    perf.functor.is_a(this.game.ontology.getSort("perf.request.action"))) &&
							   perf.attributes.length>1 &&
		  					   perf.attributes[1] instanceof TermTermAttribute) {
						var argument:Term = (<TermTermAttribute>(perf.attributes[1])).term;
						var pattern1:Term = Term.fromString("verb.repair('etaoin'[#id],'broken-ss'[#id])", this.game.ontology);
						var b:Bindings = new Bindings();
						if (pattern1.subsumes(argument, true, b)) {
							this.act_1_stated_spacesuit_is_broken = true;
//							console.log("update_act_1, state 19: detected spacesuit is broken");
							this.etaoinSays("perf.inform('david'[#id], verb.can('qwerty'[#id], verb.repair('qwerty'[#id], 'broken-ss'[#id])))");
						}						
					} else if (perf.functor.is_a(this.game.ontology.getSort("perf.q.whereis")) &&
							   perf.attributes.length == 3 &&
							   (perf.attributes[1] instanceof ConstantTermAttribute) &&
							   perf.attributes[2] instanceof TermTermAttribute) {
						var argument:Term = (<TermTermAttribute>(perf.attributes[2])).term;
						var pattern1:Term = Term.fromString("V2:#and(V3:verb.can(V1, V4:verb.repair(V1, V5:'hypothetical-object'[#id])), V6:spacesuit(V5))", this.game.ontology);
						var pattern2:Term = Term.fromString("V2:verb.can(V1, V3:verb.repair(V1, V4:'broken-ss'[#id]))", this.game.ontology);
						var b:Bindings = new Bindings();
						if (pattern1.subsumes(argument, true, b) ||
							pattern2.subsumes(argument, true, b)) {
							this.act_1_stated_spacesuit_is_broken = true;
//							console.log("update_act_1, state 19: detected spacesuit is broken");
							this.etaoinSays("perf.inform('david'[#id], verb.can('qwerty'[#id], verb.repair('qwerty'[#id], 'broken-ss'[#id])))");
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
					let target_l:A4Object[] = this.game.findObjectByID("broken-ss");
					let weCanGetIt:boolean = false;
					if (target_l != null && target_l.length == 1 &&
						this.game.qwertyAI.canSee("broken-ss")) weCanGetIt = true;
					if (target_l != null && target_l.length == 2 && 
						(target_l[0] == this.game.qwertyAI.robot ||
						 target_l[0] == this.game.currentPlayer)) weCanGetIt = true;
					if (weCanGetIt) {
						this.act_1_stasis_thread_state = 1;
					} else {
						this.act_1_stasis_thread_state = 0;
						this.game.qwertyAI.respondToPerformatives = true;
						// I do not see the spacvesuit:
						this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER, #not(verb.see($QWERTY, 'broken-ss'[#id]))))");
					}
				}
				break;

			// qwerty has been asked to repair the space suit
			case 1:
				if (this.act_1_stasis_thread_state_timer == 0) {
					this.game.qwertyAI.respondToPerformatives = false;	// to prevent the player messing up with the sequence
					this.qwertyIntention("action.talk($QWERTY, perf.inform($PLAYER, #and(V:verb.repair($QWERTY, 'broken-ss'[#id]), time.future(V)) ))");
					// clear whatever qwerty is doing now:
				    this.game.qwertyAI.currentAction = null;
				    this.game.qwertyAI.currentAction_requester = null;
				    this.game.qwertyAI.currentAction_scriptQueue = null;
				    this.game.qwertyAI.currentActionHandler = null;

					var currentRoom:AILocation = this.game.getAILocation(this.game.qwertyAI.robot);
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
				var target_l:A4Object[] = this.game.findObjectByID("broken-ss");
				if (target_l == null) {
					this.act_1_stasis_thread_state = 0;
					this.game.qwertyAI.respondToPerformatives = true;
				} else {
					var x1:number = this.game.qwertyAI.robot.x;
					var y1:number = this.game.qwertyAI.robot.y+this.game.qwertyAI.robot.tallness;
					var x2:number = target_l[0].x;
					var y2:number = target_l[0].y+target_l[0].tallness;
					var d:number = Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));
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
						var currentRoom:AILocation = this.game.getAILocation(this.game.currentPlayer);
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
				var x1:number = this.game.qwertyAI.robot.x;
				var y1:number = this.game.qwertyAI.robot.y;
				var x2:number = this.game.currentPlayer.x;
				var y2:number = this.game.currentPlayer.y;
				var d:number = Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));
				if (d>16) {
					this.game.qwertyAI.robot.AI.addPFTargetObject(A4CHARACTER_COMMAND_IDLE, 10, false, this.game.currentPlayer);
				} else {
					// give the space suit:
					var idx:number = 0;
					for(let i:number = 0;i<this.game.qwertyAI.robot.inventory.length;i++) {
						if (this.game.qwertyAI.robot.inventory[i].ID == "broken-ss") {
							idx = i;
							break;
						}
					}
					this.game.qwertyAI.robot.inventory.splice(idx,1);
					var fixedSuit:A4Object = this.game.objectFactory.createObject("workingspacesuit", this.game, false, false);
					fixedSuit.ID = "fixed-ss";
					this.game.currentPlayer.addObjectToInventory(fixedSuit, this.game);
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
					var currentRoom:AILocation = this.game.getAILocation(this.game.currentPlayer);
					// "location-as26" is the stasis pod room
					if (currentRoom != null && currentRoom.id=="location-as26") {
						this.game.currentPlayer.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, 
																	   "This is a stasis chamber! I must have been in one of these pods... but who is in the closed one?!", A4_DIRECTION_NONE, this.game);
						this.act_1_stasis_thread_state = 11;
					}
				}
				if (this.playerAsksQwertyToFixSpacesuit()) {
					this.qwertyIntention("action.talk($QWERTY, perf.inform(V0:$PLAYER, #not(property.broken('fixed-ss'[#id]))))");
				}
				break;

			case 11:
				// waiting for player to interact with the pod with the corpse:
				var corpsePod:A4Object = this.game.findObjectByIDJustObject("broken-stasis-pod");
				if (!(<A4ObstacleContainer>corpsePod).closed) {
					this.game.cutSceneActivated = CUTSCENE_CORPSE;
					this.act_1_stasis_thread_state = 12;
					this.game.setStoryStateVariable("act1-corpse", "discovered");
				}
				if (this.playerAsksQwertyToFixSpacesuit()) {
					this.qwertyIntention("action.talk($QWERTY, perf.inform(V0:$PLAYER, #not(property.broken('fixed-ss'[#id]))))");
				}
				break;

			case 12:
				if (this.playerAsksQwertyToFixSpacesuit()) {
					this.qwertyIntention("action.talk($QWERTY, perf.inform(V0:$PLAYER, #not(property.broken('fixed-ss'[#id]))))");
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
		var previous_state:number = this.act_2_state;

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
					this.queueThoughtBubble("Etaoin said to to East after reaching this part of Spacer Valley, let's see where is that cave...");
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
							var answer:TermAttribute = p.performative.attributes[1];
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
				var lastPerformative:NLContextPerformative = this.contextShrdlu.lastPerformativeBy(this.playerID);
				if (lastPerformative.performative.functor.is_a(this.game.ontology.getSort("perf.inform.answer"))) {
					var answer:TermAttribute = lastPerformative.performative.attributes[1];
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
			// ...
			break;

		}


		if (previous_state == this.act_2_state) {
			this.act_2_state_timer++;
		} else {
			this.act_2_state_timer = 0;
			this.act_2_state_start_time = this.game.in_game_seconds;
		}

	}


	/* --------------------------------------------------------
		EVENTS THAT ARE NOT TIED TO ANY PARTICULAR ACT
	   -------------------------------------------------------- */
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
		var v:TermAttribute = null;
		var queryTerms:TermAttribute[] = null;
		if (perf.functor.is_a(this.game.ontology.getSort("perf.q.query")) && perf.attributes.length == 3) {
			v = perf.attributes[1];
			var query:Term = (<TermTermAttribute>perf.attributes[2]).term;
			queryTerms = NLParser.elementsInList(query, "#and");
		} else if (perf.functor.is_a(this.game.ontology.getSort("perf.q.predicate")) ||
				   perf.functor.is_a(this.game.ontology.getSort("perf.q.predicate-negated"))) {
			var query:Term = (<TermTermAttribute>perf.attributes[1]).term;
			queryTerms = NLParser.elementsInList(query, "#and");
		}
		if (queryTerms != null) {
			var humanFound:boolean = false;
			var differentThanDavidFound:boolean = false;
			for(let ta of queryTerms) {
				if (!(ta instanceof TermTermAttribute)) continue;
				var t:Term = (<TermTermAttribute>ta).term;
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
					var t2:Term = (<TermTermAttribute>t.attributes[0]).term;
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
		}

		if (humanFound && differentThanDavidFound) return true;
		return false;
	}


	playerAsksQwertyToFixSpacesuit() 
	{
		if (this.contextQwerty != null) {
			var p1:NLContextPerformative = this.contextQwerty.lastPerformativeBy(this.playerID);
			if (p1 != null &&
				p1.timeStamp == this.game.in_game_seconds - 1) {	
				var perf:Term = p1.performative;
				if (perf.functor.is_a(this.game.ontology.getSort("perf.inform")) &&
					perf.attributes.length>1 &&
					perf.attributes[1] instanceof TermTermAttribute) {
					var argument:Term = (<TermTermAttribute>(perf.attributes[1])).term;
					var pattern1:Term = Term.fromString("property.broken('broken-ss'[#id])", this.game.ontology);
					var pattern2:Term = Term.fromString("#and(verb.have(V1:'broken-ss'[#id], T:[#id]), tear(T))", this.game.ontology)
					var b:Bindings = new Bindings();
					if (pattern1.subsumes(argument, true, b) ||
						pattern2.subsumes(argument, true, b)) {
						return true;
					}	

				} else if (perf.functor.is_a(this.game.ontology.getSort("perf.request.action"))  &&
					perf.attributes.length>1 &&
					perf.attributes[1] instanceof TermTermAttribute) {
					var argument:Term = (<TermTermAttribute>(perf.attributes[1])).term;
					var pattern3:Term = Term.fromString("verb.repair('qwerty'[#id], 'broken-ss'[#id])", this.game.ontology);
					var b:Bindings = new Bindings();
					if (pattern3.subsumes(argument, true, b)) return true;
				}

			}
		}			
		return false;
	} 


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
		var term:Term = Term.fromString(pattern, this.game.ontology);
		if (term == null) {
			console.error("qwertyIntention: cannot parse pattern " + pattern);
		} else {
			this.game.qwertyAI.queueIntention(term, null, null);
		}
	}


	qwertyMoves(x:number, y:number, map:A4Map)
	{
        var q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(this.game.qwertyAI.robot, this.game.qwertyAI.robot.map, this.game, null);
        var s:A4Script = new A4Script(A4_SCRIPT_GOTO, map.name, null, 0, false, false);
        s.x = x;
        s.y = y+this.game.qwertyAI.robot.tallness;
        q.scripts.push(s);
		this.game.qwertyAI.robot.addScriptQueue(q);
	}


	qwertyDropsObject(objectID:string)
	{
        var q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(this.game.qwertyAI.robot, this.game.qwertyAI.robot.map, this.game, null);
        var s:A4Script = new A4Script(A4_SCRIPT_DROP, objectID, null, 0, false, false);
        q.scripts.push(s);
		this.game.qwertyAI.robot.addScriptQueue(q);
	}


	etaoinSays(pattern:string)
	{
		pattern = pattern.split("$QWERTY").join("'"+this.qwertyID+"'[#id]");
		pattern = pattern.split("$ETAOIN").join("'"+this.etaoinID+"'[#id]");
		pattern = pattern.split("$PLAYER").join("'"+this.playerID+"'[#id]");
		var term:Term = Term.fromString(pattern, this.game.ontology);
		if (term == null) {
			console.error("etaoinSays: cannot parse pattern " + pattern);
		} else {
			var term2:Term = new Term(this.game.ontology.getSort("action.talk"), 
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
		var term:Term = Term.fromString(pattern, this.game.ontology);
		if (term == null) {
			console.error("etaoinSays: cannot parse pattern " + pattern);
		} else {
			var term2:Term = new Term(this.game.ontology.getSort("action.talk"), 
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
        var xmlString:string = "";
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

        xmlString += "finding_life_side_plot_taken_question=\""+this.finding_life_side_plot_taken_question+"\"\n";   
        xmlString += "finding_life_side_plot_analyzed_question=\""+this.finding_life_side_plot_analyzed_question+"\"\n"; 

        xmlString += "what_is_dust_side_plot_taken_question=\""+this.what_is_dust_side_plot_taken_question+"\"\n";

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

    	this.finding_life_side_plot_taken_question = xml.getAttribute("finding_life_side_plot_taken_question") == "true";
    	this.finding_life_side_plot_analyzed_question = xml.getAttribute("finding_life_side_plot_analyzed_question") == "true";
    	this.what_is_dust_side_plot_taken_question = xml.getAttribute("what_is_dust_side_plot_taken_question") == "true";

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


	finding_life_side_plot_taken_question:boolean = false;
	finding_life_side_plot_analyzed_question:boolean = false;
	what_is_dust_side_plot_taken_question:boolean = false;
}
