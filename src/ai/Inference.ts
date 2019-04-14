/*

Note (santi):
- This class implements a resolution engine, which is used by the AI of the NPCs to reason about the queries that the player
  enters.
- In order to make inference efficient, a few pruning heuristics were implemented that can be toggled from the global boolean
  variables at the top of the file (INFERENCE_allow_increasing_sentences, INFERENCE_allow_variable_to_variable_substitutions).
- Moreover, in order to let the game flow in real time, the "InterruptibleResolution" class performs only a few inference steps
  per game cycle (controllable from the INFERENCE_MAX_RESOLUTIONS_PER_STEP variable). After INFERENCE_MAX_TOTAL_RESOLUTIONS 
  steps, the inference is abandoned. 
- However, if the pruning rules are removed, and INFERENCE_MAX_TOTAL_RESOLUTIONS is set to infinity, this should, in principle
  be a full sound and complete resolution engine.

*/

var DEBUG_resolution:boolean = false;
var DEBUG_resolution_detailed:boolean = false;

// search prunning strategies to make inference faster:
var INFERENCE_maximum_sentence_size:number = 6;
var INFERENCE_allow_increasing_sentences:boolean = false;
var INFERENCE_allow_variable_to_variable_substitutions:boolean = false;

var INFERENCE_MAX_RESOLUTIONS_PER_STEP:number = 2500;
// var INFERENCE_MAX_TOTAL_RESOLUTIONS:number = 600000;	// at this point, inference will stop
var INFERENCE_MAX_TOTAL_RESOLUTIONS:number = 1000000;	// at this point, inference will stop


class InterruptibleResolution
{
	constructor(KB:SentenceContainer, additionalSentences:Sentence[], target:Sentence[], occursCheck:boolean, reconsiderTarget:boolean, treatSpatialPredicatesSpecially:boolean, ai:RuleBasedAI)
	{
		this.sort_cache_spatial_relation = ai.o.getSort("spatial-relation");

		this.KB = KB;
		this.originalTarget = target;
		this.occursCheck = occursCheck;
		this.reconsiderTarget = reconsiderTarget;
		this.treatSpatialPredicatesSpecially = treatSpatialPredicatesSpecially;
		this.ai = ai;
		this.internal_step_state = 1;	// signal that we need to start from scratch the first time step_internal is called
		this.internal_step_state_index = 0;

		for(let s of additionalSentences) {
			this.additionalSentences.push([s,new Bindings()]);
		}
		for(let s of target) {
			s = this.resolutionEqualityCheck(s);
			if (s != null && this.treatSpatialPredicatesSpecially) s = this.resolutionSpatialPredicatesCheck(s, this.ai);
			if (s == null) continue;
			this.targetWithBindings.push([s,new Bindings()]);
		}
/*
		if (DEBUG_resolution) {
			console.log("InterruptibleResolution:");
			for(let t of KB.plainSentenceList) {
				console.log("   " + t.toString());
			}
*/
			for(let t of target) {
				console.log("   target: " + t.toString());
			}
/*
		}
*/
	}


	// executes resolution till the end:
	resolve() : Bindings[]
	{
		while(!this.step()) {}
		return this.endResults;
	}


	// returns "true" when the inference process is over, and "false", when it still needs more steps.
	step() : boolean
	{
		if (DEBUG_resolution) console.log("resolution step:");
//		var newResolventsWithBindings:[Sentence,Bindings][] = 
		this.step_internal(this.additionalSentences, this.targetWithBindings, this.occursCheck, true);
		if (this.internal_step_state == 0) return false;
		if (this.internal_step_state == 2) return true;	// computation limit reached
		this.firstStep = false;
		if (this.newResolventsWithBindings == null || this.newResolventsWithBindings.length == 0) {
			if (DEBUG_resolution) console.log("  - no more resolvents: no contradiction! (CLOSED: " + this.closed.length + ")");
			return true;
		}

		if (this.reconsiderTarget) this.additionalSentences = this.additionalSentences.concat(this.targetWithBindings);

		var anyNewResolvent:boolean = false;
		this.targetWithBindings = [];
		for(let [r,b] of this.newResolventsWithBindings) {
			if (r.terms.length == 0) {
				// we have found a contradiction!
				if (DEBUG_resolution) console.log("  - contradiction! (CLOSED: " + this.closed.length + ")");
				// get the bindings in the variables from the target:
				var variables:VariableTermAttribute[] = [];
				for(let ts of this.originalTarget) {
					variables = variables.concat(ts.getAllVariables());
				}
//				console.log("Variables: " + variables);
				var endResult:Bindings = new Bindings();
				for(let [v,t] of b.l) {
					if (variables.indexOf(v)>=0) {
						t = t.applyBindings(b);
						endResult.l.push([v,t]);
					}
				}
				this.endResults.push(endResult);
				return true;
			} else {
				var found:boolean = false;
				// make sure we are not inferring something we already knew:
				for(let s of this.closed) {
					if (s.subsetNoBindings(r)) {
						found = true;
						//console.log("R: " + r + "\n was a subset of (in closed): " + s);
						break;
					}
				}
				if (!found) {
					for(let tmp of this.additionalSentences) {
						if (tmp[0].subsetNoBindings(r)) {
							//console.log("R: " + r + "\n was a subset of (in additionalSentences): " + tmp[0]);
							found = true;
							break;
						}
					}
				}
				if (!found) {
					for(let se of this.KB.plainSentenceList) {
						if (se.sentence.subsetNoBindings(r)) {
							//console.log("R: " + r + "\n was a subset of (in plainSentenceList): " + se.sentence);
							found = true;
							break;
						}
					}
				}
				if (!found) {
					this.closed.push(r);
					this.targetWithBindings.push([r,b]);
					anyNewResolvent = true;
				}
			}
			if (DEBUG_resolution) console.log("  " + r.toString());
		}
		if (DEBUG_resolution) console.log("  CLOSED: " + this.closed.length);
		if (DEBUG_resolution) console.log("  CLOSED: " + this.closed);
		if (DEBUG_resolution) console.log("  KB.length: " + this.KB.plainSentenceList.length);
//		if (DEBUG_resolution) console.log("  KB: " + this.KB.plainSentenceList);
//		this.targetWithBindings = newResolventsWithBindings;

		if (!anyNewResolvent) {
			console.log("all the resolvents in this round where already in the closed list, so we are done!");
			return true;
		}

		return false;
	}



	// this is the same as "step", but it does not stop upon finding the same result, and keeps going until all results have been found
	// returns "true" when the inference process is over, and "false", when it still needs more steps.
	stepAccumulatingResults() : boolean
	{
		if (DEBUG_resolution) console.log("resolution stepAccumulatingResults:");
//		var newResolventsWithBindings:[Sentence,Bindings][] = 
		this.step_internal(this.additionalSentences, this.targetWithBindings, this.occursCheck, false);
		if (this.internal_step_state == 0) return false;
		if (this.internal_step_state == 2) return true;	// computation limit reached
		this.firstStep = false;
		if (this.newResolventsWithBindings == null || this.newResolventsWithBindings.length == 0) {
			if (DEBUG_resolution) console.log("  - no more resolvents: " +this.endResults.length + " sets of bindings cause a contradiction! (CLOSED: " + this.closed.length + ")");
			return true;
		}

	//	if (DEBUG_resolution) 
		console.log("resolution stepAccumulatingResults: newResolventsWithBindings.length = " + this.newResolventsWithBindings.length);

		if (this.reconsiderTarget) this.additionalSentences = this.additionalSentences.concat(this.targetWithBindings);

		var anyNewResolvent:boolean = false;
		this.targetWithBindings = [];
		for(let [r,b] of this.newResolventsWithBindings) {
			if (r.terms.length == 0) {
				// we have found a contradiction!
				if (DEBUG_resolution) console.log("  - contradiction! (CLOSED: " + this.closed.length + ")");
				// get the bindings in the variables from the target:
				var variables:VariableTermAttribute[] = [];
				for(let ts of this.originalTarget) {
					variables = variables.concat(ts.getAllVariables());
				}
//				console.log("Variables: " + variables);
				var endResult:Bindings = new Bindings();
				for(let [v,t] of b.l) {
					if (variables.indexOf(v)>=0) {
						var t2:TermAttribute = t.applyBindings(b);
						endResult.l.push([v,t2]);
					}
				}
				this.endResults.push(endResult);
			} else {
				var found:boolean = false;
				// make sure we are not inferring something we already knew:
				for(let s of this.closed) {
					if (s.subsetNoBindings(r)) {
						found = true;
						//console.log("R: " + r + "\n was a subset of (in closed): " + s);
						break;
					}
				}
				if (!found) {
					for(let tmp of this.additionalSentences) {
						if (tmp[0].subsetNoBindings(r)) {
							//console.log("R: " + r + "\n was a subset of (in additionalSentences): " + tmp[0]);
							found = true;
							break;
						}
					}
				}
				if (!found) {
					for(let se of this.KB.plainSentenceList) {
						if (se.sentence.subsetNoBindings(r)) {
							//console.log("R: " + r + "\n was a subset of (in plainSentenceList): " + se.sentence);
							found = true;
							break;
						}
					}
				}
				if (!found) {
					this.closed.push(r);
					this.targetWithBindings.push([r,b]);
					anyNewResolvent = true;
				}
			}
			if (DEBUG_resolution) console.log("  " + r.toString());
		}
		if (DEBUG_resolution) console.log("  CLOSED: " + this.closed.length);
		if (DEBUG_resolution) console.log("  CLOSED: " + this.closed);
		if (DEBUG_resolution) console.log("  KB.length: " + this.KB.plainSentenceList.length);
//		if (DEBUG_resolution) console.log("  KB: " + this.KB.plainSentenceList);
//		this.targetWithBindings = newResolventsWithBindings;

		if (!anyNewResolvent) {
			console.log("all the resolvents in this round where already in the closed list, so we are done!");
			return true;
		}

		return false;
	}	


	step_internal(sentences:[Sentence,Bindings][], 
			      targetWithBindings:[Sentence,Bindings][], 
	   		      occursCheck:boolean,
	   		      stopOnFirstContradiction:boolean) : [Sentence,Bindings][]
	{
		var resolutions:number = 0;
		if (DEBUG_resolution) console.log("InterruptibleResolution.step_internal with sentences.length = " + sentences.length + ", targetWithBindings.length = " + targetWithBindings.length);		
		if (this.firstStep) {
			for(let i:number = 0;i<targetWithBindings.length;i++) {
				if (targetWithBindings[i][0].terms.length == 0) {
					// initial contradiction!
					this.newResolventsWithBindings = [targetWithBindings[i]];
					this.internal_step_state = 1;
					return this.newResolventsWithBindings;	// we are done!
				}
			}
		}
		if (this.internal_step_state == 1) {
			this.newResolventsWithBindings = [];
			this.internal_step_state = 0;
			this.internal_step_state_index = 0;
		}
		for(;this.internal_step_state_index<targetWithBindings.length;this.internal_step_state_index++) {
			var s1:Sentence = targetWithBindings[this.internal_step_state_index][0];
			var b1:Bindings = targetWithBindings[this.internal_step_state_index][1];
			//for(let [s1,b1] of targetWithBindings) {
			if (this.KB != null) {
				var relevantSentences:Sentence[] = this.KB.allPotentialMatchesWithSentenceForResolution(s1, this.ai.o);
				if (DEBUG_resolution) {
					console.log("    sentences relevant for " + s1.toString() + ": " + relevantSentences.length);
					if (DEBUG_resolution_detailed) {
						for(let s2 of relevantSentences) {
							console.log("        - " + s2);
						}
					}
				}
				for(let s2 of relevantSentences) {
					if (this.firstStep) {
						if (this.originalTarget.length == 1 &&
							s2.subsetNoBindings(s1)) {
							if (DEBUG_resolution) console.log("step_internal: we are done! what we want to proof is in the knowledge base!!!");
							this.newResolventsWithBindings = null;
							return null;
						}
					}
					if (DEBUG_resolution) console.log("    Resolution (relevantSentences) between " + s1 + "   and   " + s2);
					let tmp:[Sentence,Bindings][] = this.resolutionBetweenSentencesWithBindings(s1, s2, b1, new Bindings(), occursCheck);
					resolutions++;
					this.total_resolutions++;
//					console.log("    tmp: " + tmp.length);
					for(let r of tmp) {
						r[0] = this.resolutionEqualityCheck(r[0]);
						if (r[0] != null && this.treatSpatialPredicatesSpecially) r[0] = this.resolutionSpatialPredicatesCheck(r[0], this.ai);
						if (r[0] == null) continue;
						var found:boolean = false;
						for(let i:number = 0;i<this.newResolventsWithBindings.length;i++) {
							if (this.newResolventsWithBindings[i][0].terms.length > 0 &&
								this.newResolventsWithBindings[i][0].subsetNoBindings(r[0])/* &&
								this.newResolventsWithBindings[i][1].subset(r[1])*/) {
								found = true;
//								console.log(" bindings filtered1: " + resolventsWithBindings[i][1]);
//								console.log(" bindings filtered2: " + r[1]);
								break;
							} else if (this.newResolventsWithBindings[i][0].terms.length == 0 &&
								       r[0].terms.length == 0 &&
								       this.newResolventsWithBindings[i][1].subset(r[1])) {
								found = true;
//								console.log(" bindings filtered1: " + resolventsWithBindings[i][1]);
//								console.log(" bindings filtered2: " + r[1]);
								break;
							}
						}
						if (!found) {
							this.newResolventsWithBindings.push(r);
							if (DEBUG_resolution) console.log("step_internal: new resolvent: " + r[0]  + " , " + r[1]);
							if (r[0].terms.length == 0 && stopOnFirstContradiction) {
								this.internal_step_state = 1;
								return this.newResolventsWithBindings;	// we are done!
							}
						}
					}						
				}	
			}

//			console.log("resolventsWithBindings.length (after this.KB): " + resolventsWithBindings.length);
//			console.log("resolventsWithBindings (after this.KB): " + resolventsWithBindings);

			for(let [s2,b2] of sentences) {
				if (s1 == s2) continue;
				if (this.firstStep) {
					if (this.originalTarget.length == 1 &&
						s2.subsetNoBindings(s1)) {
						if (DEBUG_resolution) console.log("step_internal: we are done! what we want to proof is in the knowledge base!!!");
						this.internal_step_state = 1;
						this.newResolventsWithBindings = null;
						return null;
					}
				}
				// if (DEBUG_resolution) console.log("    Resolution (sentences) between " + s1 + "   and   " + s2);
				let tmp:[Sentence,Bindings][] = this.resolutionBetweenSentencesWithBindings(s1, s2, b1, b2, occursCheck);
				resolutions++;
				this.total_resolutions++;
				for(let r of tmp) {
					r[0] = this.resolutionEqualityCheck(r[0]);
					if (r[0] != null && this.treatSpatialPredicatesSpecially) r[0] = this.resolutionSpatialPredicatesCheck(r[0], this.ai);
					if (r[0] == null) continue;

					var found:boolean = false;
//					for(let [s,b] of resolventsWithBindings) {
//						if (r[0].equalsNoBindings(s)) {
					for(let i:number = 0;i<this.newResolventsWithBindings.length;i++) {
						if (this.newResolventsWithBindings[i][0].subsetNoBindings(r[0]) &&
							this.newResolventsWithBindings[i][1].subset(r[1])) {
							found = true;
							break;
						}
					}
					if (!found) {
						this.newResolventsWithBindings.push(r);
						if (DEBUG_resolution) console.log("step_internal: new resolvent: " + r[0]  + " , " + r[1]);
						if (r[0].terms.length == 0 && stopOnFirstContradiction) {
							this.internal_step_state = 1;
							return this.newResolventsWithBindings;	// we are done!
						}
					}
				}						
			}		

//			console.log("resolventsWithBindings.length (after sentences): " + resolventsWithBindings.length);

			for(let [s2,b2] of targetWithBindings) {
				if (s1 == s2) continue;
				//if (DEBUG_resolution) console.log("    Resolution (target with bindings) between " + s1 + "   and   " + s2);
				let tmp:[Sentence,Bindings][] = this.resolutionBetweenSentencesWithBindings(s1, s2, b1, b2, occursCheck);
				resolutions++;
				this.total_resolutions++;
				for(let r of tmp) {
					r[0] = this.resolutionEqualityCheck(r[0]);
					if (r[0] != null && this.treatSpatialPredicatesSpecially) r[0] = this.resolutionSpatialPredicatesCheck(r[0], this.ai);
					if (r[0] == null) continue;

					var found:boolean = false;
//					for(let [s,b] of resolventsWithBindings) {
//						if (r[0].equalsNoBindings(s)) {
					for(let i:number = 0;i<this.newResolventsWithBindings.length;i++) {
						if (this.newResolventsWithBindings[i][0].subsetNoBindings(r[0]) &&
							this.newResolventsWithBindings[i][1].subset(r[1])) {
							found = true;
							break;
						}
					}
					if (!found) {
						this.newResolventsWithBindings.push(r);
						if (DEBUG_resolution) console.log("step_internal: new resolvent: " + r[0]  + " , " + r[1]);
						if (r[0].terms.length == 0 && stopOnFirstContradiction) {
							this.internal_step_state = 1;
							return this.newResolventsWithBindings;	// we are done!
						}
					}
				}						
			}

			if (this.total_resolutions >= INFERENCE_MAX_TOTAL_RESOLUTIONS) {
				console.log("step_internal: final interruption with #resolutions = " + resolutions + "(" + this.total_resolutions + ") end results: " + this.endResults.length);
				this.internal_step_state = 2;
				return null;
			}

//			console.log("resolventsWithBindings.length (after targetWithBindings): " + resolventsWithBindings.length);
			if (resolutions >= INFERENCE_MAX_RESOLUTIONS_PER_STEP) {
				// we need to interrupt:
				console.log("step_internal: interrupted with #resolutions = " + resolutions + "(" + this.total_resolutions + "), closed "+this.closed.length+", end results: " + this.endResults.length);
				return null;
			}
		}

		console.log("step_internal: finished with #resolutions = " + resolutions + "(" + this.total_resolutions + "), closed: "+this.closed.length+", end results: " + this.endResults.length);
		this.internal_step_state = 1;
		return this.newResolventsWithBindings;
	}


	// Checks to see if the equality predicate results in a contradiction: returns null
	// Or if there are any terms of the from x = x (which are then removed)
	resolutionEqualityCheck(s:Sentence) : Sentence
	{
		var toDelete:Term[] = [];
		for(let i:number = 0;i<s.terms.length;i++) {
			if (s.terms[i].functor.name == "=" &&
				s.terms[i].attributes.length == 2) {
				var equals:number = Term.equalsNoBindingsAttribute(s.terms[i].attributes[0], 
							   								       s.terms[i].attributes[1]);
				if (equals == 0) continue;
				if ((s.sign[i] && equals==1) ||
				    (!s.sign[i] && equals==-1)) {
					return null;
				} else {
					toDelete.push(s.terms[i]);
				}
			}
		}

		for(let t of toDelete) {
			var idx:number = s.terms.indexOf(t);
			s.terms.splice(idx,1);
			s.sign.splice(idx,1);
		}
		return s;
	}


	resolutionSpatialPredicatesCheck(s:Sentence, ai:RuleBasedAI) : Sentence
	{
		var toDelete:Term[] = [];
		for(let i:number = 0;i<s.terms.length;i++) {
			if (s.terms[i].functor.is_a(this.sort_cache_spatial_relation) &&
				s.terms[i].attributes.length == 2 &&
				s.terms[i].attributes[0] instanceof ConstantTermAttribute &&
				s.terms[i].attributes[1] instanceof ConstantTermAttribute) {
				// check if it's true or false, and see if it has to be eliminated from the sentence:
				var truth:boolean = ai.checkSpatialRelation(s.terms[i].functor,
															(<ConstantTermAttribute>s.terms[i].attributes[0]).value,
															(<ConstantTermAttribute>s.terms[i].attributes[1]).value,
															ai.selfID);
				//console.log("checkSpatialRelation: " + s.terms[i] + " -> " + truth );
				if (truth != null &&
					truth != s.sign[i]) {
					//console.log("    removing it from sentence");
					toDelete.push(s.terms[i]);
				}
			}
		}

		for(let t of toDelete) {
			var idx:number = s.terms.indexOf(t);
			s.terms.splice(idx,1);
			s.sign.splice(idx,1);
		}
		return s;
	}


/*
			- algorithm should be: P1...Pn, Q1...Qm, usedP (initially []), usedQ (initially [])
			found = false
			for i = 0;i<n;i++:
				if !usedP.contains(i)
					for j = 0;j<m;j++:
						if !usedQ.contains(j)
							if (Pi unifies with Qj):
								add bindings
								usedP.add(i), usedQ.add(j)
								found = true
								recursivecall(P, Q usedP, usedQ)
								usedP.remove(i), usedQ.remove(j)
			if !found:
				generate result with Pis and Pjs not in usedP and usedQ
				remove replicate predicates in the result (identical without creating new bindings)
*/

	// Tries to apply the principle of "Resolution" between two sentences, and
	// returns all possible resolvents
	resolutionBetweenSentencesWithBindings(s1:Sentence, s2:Sentence, 
 									       s1_bindings:Bindings,
										   s2_bindings:Bindings,
										   occursCheck:boolean) : [Sentence,Bindings][]
	{
//		console.log("resolutionBetweenSentencesWithBindings: " + s1 + " with " + s2);
		var resolvents:[Sentence,Bindings][] = [];
//		this.resolutionBetweenSentencesWithBindings_internal(s1, s2, [], [], new Bindings(), resolvents, occursCheck);
		this.resolutionBetweenSentencesWithBindings_internal(s1, s2, new Bindings(), resolvents, occursCheck);
		for(let r of resolvents) {
			r[1] = s1_bindings.concat(s2_bindings.concat(r[1]));
		}
		return resolvents;
	}



	resolutionBetweenSentencesWithBindings_internal(s1:Sentence, s2:Sentence, 
												    bindings:Bindings, 
												    resolvents:[Sentence,Bindings][],
												    occursCheck:boolean) : void
	{
		for(let i:number = 0;i<s1.terms.length;i++) {
			for(let j:number = 0;j<s2.terms.length;j++) {
				if (s1.sign[i] == s2.sign[j]) continue;
				
				var p:Term = s1.terms[i].applyBindings(bindings);
				var q:Term = s2.terms[j].applyBindings(bindings);
//				console.log("p: " + p);
//				console.log("q: " + q);
				var bindings2:Bindings = new Bindings();
				bindings2 = bindings2.concat(bindings);
				if (!p.unify(q, occursCheck, bindings2)) continue;

				// only allow steps that replace variables by constants:
				if (!INFERENCE_allow_variable_to_variable_substitutions) {
					var anyNonVariable:boolean = false;
					for(let k:number = bindings.l.length;k<bindings2.l.length;k++) {
						if (!(bindings2.l[k][1] instanceof VariableTermAttribute)) anyNonVariable = true;
					}
					if (bindings2.l.length > 0 && !anyNonVariable) continue;
				}

				// generate one resolvent:
				var r:[Sentence,Bindings] = [new Sentence([],[]), bindings2];
				for(let i2:number = 0;i2<s1.terms.length;i2++) {
					if (i == i2) continue;
					r[0].terms.push(s1.terms[i2].applyBindings(bindings2));
					r[0].sign.push(s1.sign[i2]);
				}
				for(let j2:number = 0;j2<s2.terms.length;j2++) {
					if (j == j2) continue;
					r[0].terms.push(s2.terms[j2].applyBindings(bindings2));
					r[0].sign.push(s2.sign[j2]);
				}

				// only allow steps that do not increase the size of the sentences:
				if (!INFERENCE_allow_increasing_sentences) {
		//			console.log("resolvent: " + resolvent.terms);
		//			console.log("bindings: " + bindings);
					if (r[0].terms.length >= s1.terms.length &&
						r[0].terms.length >= s2.terms.length) {
						if (DEBUG_resolution_detailed) console.log("Removed because of size (1)... "  + r[0].terms.length + " vs " + s1.terms.length + " and " + s2.terms.length);
						return;
					}
				}
				if (r[0].terms.length > INFERENCE_maximum_sentence_size) {
					if (DEBUG_resolution_detailed) console.log("Removed because of size (2)... "  + r[0].terms.length);
					return;
				}

				resolvents.push(r);
				if (DEBUG_resolution) {
					console.log("resolutionBetweenSentencesWithBindings_internal: new resolvent");
					console.log("    s1: " + s1);
					console.log("    s2: " + s2);
					console.log("    indexes: " + i + " , " + j);
					console.log("    bindings: " + r[1]);
					console.log("    resolvent: " + r[0]);
				}
			}
		}
	}


	saveToXML() : string
	{
		var str:string = "<InterruptibleResolution>\n";

		// ...

		str += "</InterruptibleResolution>";
		return str;
	}


	occursCheck:boolean;
	reconsiderTarget:boolean;
	treatSpatialPredicatesSpecially:boolean;
	KB:SentenceContainer = null;
	additionalSentences:[Sentence,Bindings][] = [];
	targetWithBindings:[Sentence,Bindings][] = [];
	originalTarget:Sentence[] = null;
	ai:RuleBasedAI = null;

	firstStep:boolean = true;
	closed:Sentence[] = [];

	endResults:Bindings[] = [];

	internal_step_state:number = 0;			// 0 if it is still running, 1 if it's done, 2 it's that it has reached computation limit
	internal_step_state_index:number = 0;	// index of the next element of "targetWithBindings" to consider 
	newResolventsWithBindings:[Sentence,Bindings][] = null;
	total_resolutions:number = 0;

	sort_cache_spatial_relation:Sort = null;
}
