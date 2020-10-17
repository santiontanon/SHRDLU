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
var INFERENCE_allow_variable_to_variable_substitutions:boolean = true;

var INFERENCE_MAX_RESOLUTIONS_PER_STEP:number = 2500;
// var INFERENCE_MAX_TOTAL_RESOLUTIONS:number = 600000;	// at this point, inference will stop
var INFERENCE_MAX_TOTAL_RESOLUTIONS:number = 1000000;	// at this point, inference will stop


class InferenceNode
{
	constructor(s:Sentence, b:Bindings, p1:InferenceNode, p2:InferenceNode)
	{
		this.sentence = s;
		this.bindings = b;
		this.parent1 = p1;
		this.parent2 = p2;
	}


	getBaseSentences(target:Sentence[]) : Sentence[]
	{
		let open:InferenceNode[] = [this];
		let l:Sentence[] = [];
		while(open.length > 0) {
			let current:InferenceNode = open[0];
			if (current.parent1 == null && current.parent2 == null && current.sentence != null) {
				if (l.indexOf(current.sentence) == -1 &&
					target.indexOf(current.sentence) == -1) l.push(current.sentence);
			} else {
				if (current.parent1 != null) open.push(current.parent1);
				if (current.parent2 != null) open.push(current.parent2);
			}
			open.splice(0,1);
		}
		return l;
	}


	toString() : string
	{
		return "[ sentence: " + this.sentence + ", bindings: " + this.bindings + "]"; 
	}


	sentence:Sentence;
	bindings:Bindings;
	parent1:InferenceNode;
	parent2:InferenceNode;
}


class InterruptibleResolution
{
	constructor(KB:SentenceContainer, additionalSentences:Sentence[], target:Sentence[], occursCheck:boolean, reconsiderTarget:boolean, treatSpatialPredicatesSpecially:boolean, ai:RuleBasedAI)
	{
		this.sort_cache_spatial_relation = ai.o.getSort("spatial-relation");
		this.sort_cache_superlative = ai.o.getSort("superlative-adjective");

		this.KB = KB;
		this.originalTarget = target;
		// get the bindings in the variables from the target:
		for(let ts of this.originalTarget) {
			this.originalTargetVariables = this.originalTargetVariables.concat(ts.getAllVariables());
		}
		this.occursCheck = occursCheck;
		this.reconsiderTarget = reconsiderTarget;
		this.treatSpatialPredicatesSpecially = treatSpatialPredicatesSpecially;
		this.superlativePredicates = [];	// These are predicates such as "nearest", that can only be checked once we have all the solutions
		this.ai = ai;
		this.internal_step_state = 1;	// signal that we need to start from scratch the first time step_internal is called
		this.internal_step_state_index = 0;

		for(let s of additionalSentences) {
			this.additionalSentences.push(new InferenceNode(s, new Bindings(), null, null));
		}
		for(let s of target) {
			let r:InferenceNode = new InferenceNode(s, new Bindings(), null, null);
			this.resolutionEqualityCheck(r);
			if (r.sentence != null && this.treatSpatialPredicatesSpecially) r.sentence = this.resolutionSpatialPredicatesCheck(r.sentence, true);
			if (r.sentence == null) continue;
			this.target.push(r);
		}

		/*
		// Synthesize a test case to debug resolution:
		let KB_str:string = "[";
		for(let sc of KB.plainSentenceList) {
			KB_str += "\"" + sc.sentence + "\",\n";
		}
		KB_str += "],";
		let AS_str:string = "[";
		for(let s of additionalSentences) {
			AS_str += "\"" + s + "\",\n";
		}
		AS_str += "],";
		let query_str:string = "[";
		for(let s of target) {
			query_str += "\"" + s + "\",\n";
		}
		query_str += "]";
		console.log("InterruptibleResolution:");
		console.log(KB_str);
		console.log(AS_str);
		console.log(query_str);
		*/

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
	resolve() : InferenceNode[]
	{
		while(!this.step()) {}
		this.processSuperlatives();
		return this.endResults;
	}


	step() : boolean
	{
		if (this.stepAccumulatingResults()) return true;
		if (this.endResults.length > 0) {
			this.processSuperlatives();
			return true;
		}
		return false;
	}


	stepAccumulatingResults() : boolean
	{
		if (DEBUG_resolution) console.log("resolution stepAccumulatingResults:");
		this.step_internal(this.additionalSentences, this.target, this.occursCheck, false);
		if (this.internal_step_state == 0) return false;
		if (this.internal_step_state == 2) {
			this.processSuperlatives();
			return true;	// computation limit reached
		}
		this.firstStep = false;
		if (this.newResolvents == null || this.newResolvents.length == 0) {
			if (DEBUG_resolution) console.log("  - no more resolvents: " +this.endResults.length + " sets of bindings cause a contradiction! (CLOSED: " + this.closed.length + ")");
			this.processSuperlatives();
			return true;
		}

		console.log("resolution stepAccumulatingResults: newResolvents.length = " + this.newResolvents.length);
		if (DEBUG_resolution) {
			for(let resolvent of this.newResolvents) {
				console.log("    " + resolvent.sentence + " -> " + resolvent.bindings);
				//console.log("        " + resolvent.parent1);
				//console.log("        " + resolvent.parent2);
			}
		}

		//if (this.reconsiderTarget) this.additionalSentences = this.additionalSentences.concat(this.target);
		// console.log("this.additionalSentences: " + this.additionalSentences.length);

		let anyNewResolvent:boolean = false;
		this.target = [];
		for(let newResolvent of this.newResolvents) {
			let r:Sentence = newResolvent.sentence;
			let b:Bindings = newResolvent.bindings;
			if (r.terms.length == 0) {
				// we have found a contradiction!
				if (DEBUG_resolution) console.log("  - contradiction! (CLOSED: " + this.closed.length + ")");
//				console.log("Variables: " + variables);
				let endResult:InferenceNode = new InferenceNode(r, new Bindings(), newResolvent.parent1, newResolvent.parent2);
				for(let [v,t] of b.l) {
					if (this.originalTargetVariables.indexOf(v)>=0) {
						let t2:TermAttribute = t.applyBindings(b);
						if (endResult.bindings.l.indexOf([v,t2]) == -1) endResult.bindings.l.push([v,t2]);
					}
				}
				
				let found:boolean = false;
				for(let tmp of this.endResults) {
					if (tmp.bindings.equals(endResult.bindings)) {
						//console.log("R: " + endResult + "\n filtered out (from endResults): " + tmp);
						found = true;
						break;
					}
				}
				if (!found) {
					this.closed.push(endResult);					
					this.endResults.push(endResult);
				} else {
					console.warn("    end result was already there: " + endResult.bindings);
				}
			} else {
				let found:boolean = false;
				// make sure we are not inferring something we already knew:
				for(let tmp of this.closed) {
					if (this.resultCanBeFilteredOut(newResolvent, tmp.sentence, tmp.bindings)) {
					//if (tmp.sentence.equalsNoBindings(r)) {
					//if (tmp.sentence.subsetNoBindings(r)) {
						//if (tmp.bindings.equals(b)) {
							found = true;
							//console.log("R: " + newResolvent + "\n filtered out (from closed): " + tmp);
							break;
//						} else {
//							console.log("    same sentence: " + tmp.sentence + ", but different bindings: " + tmp.bindings + " vs " + b);
						//}
					}
				}
				if (!found) {
					for(let tmp of this.target) {
						if (this.resultCanBeFilteredOut(newResolvent, tmp.sentence, tmp.bindings)) {
						//if (tmp.sentence.equalsNoBindings(r) &&
						//if (tmp.sentence.subsetNoBindings(r) &&
							//tmp.bindings.equals(b)) {
							//console.log("R: " + newResolvent + "\n filtered out (from this.target): " + tmp);
							found = true;
							break;
						}
					}
				}
				if (!found) {
					for(let tmp of this.additionalSentences) {
						if (this.resultCanBeFilteredOut(newResolvent, tmp.sentence, tmp.bindings)) {
						//if (tmp.sentence.equalsNoBindings(r) &&
						//if (tmp.sentence.subsetNoBindings(r) &&
							//tmp.bindings.equals(b)) {
							//console.log("R: " + newResolvent + "\n filtered out (from additionalSentences): " + tmp);
							found = true;
							break;
						}
					}
				}
				if (!found) {
					for(let tmp of this.KB.plainSentenceList) {
						if (this.resultCanBeFilteredOut(newResolvent, tmp.sentence, null)) {
						//if (tmp.sentence.equalsNoBindings(r)) {
						//if (tmp.sentence.subsetNoBindings(r)) {
							//console.log("R: " + newResolvent + "\n filtered out (from plainSentenceList): " + tmp);
							found = true;
							break;
						}
					}
				}
				if (!found) {
					this.closed.push(newResolvent);
					this.target.push(newResolvent);
					anyNewResolvent = true;
				}
			}
			if (DEBUG_resolution) console.log("  " + r.toString());
		}
		if (DEBUG_resolution) console.log("  CLOSED: " + this.closed.length);
		if (DEBUG_resolution) console.log("  CLOSED: " + this.closed);
		if (DEBUG_resolution) console.log("  KB.length: " + this.KB.plainSentenceList.length);
//		if (DEBUG_resolution) console.log("  KB: " + this.KB.plainSentenceList);
//		this.target = newResolvents;

		if (!anyNewResolvent) {
			console.log("all the resolvents in this round where already in the closed list, so we are done!");
			this.processSuperlatives();
			return true;
		}

		return false;
	}	


	step_internal(sentences:InferenceNode[], 
			      target:InferenceNode[], 
	   		      occursCheck:boolean,
	   		      stopOnFirstContradiction:boolean) : InferenceNode[]
	{
		let resolutions:number = 0;
		if (DEBUG_resolution) console.log("InterruptibleResolution.step_internal with sentences.length = " + sentences.length + ", target.length = " + target.length);		
		if (this.firstStep) {
			for(let i:number = 0;i<target.length;i++) {
				if (target[i].sentence.terms.length == 0) {
					// initial contradiction!
					this.newResolvents = [target[i]];
					this.internal_step_state = 1;
					return this.newResolvents;	// we are done!
				}
			}
		}
		if (this.internal_step_state == 1) {
			this.newResolvents = [];
			this.internal_step_state = 0;
			this.internal_step_state_index = 0;
		}
		for(;this.internal_step_state_index<target.length;this.internal_step_state_index++) {
			let n1:InferenceNode = target[this.internal_step_state_index];
			let s1:Sentence = n1.sentence;
			//for(let [s1,b1] of target) {
			if (this.KB != null) {
				let relevantSentences:Sentence[] = this.KB.allPotentialMatchesWithSentenceForResolution(s1, this.ai.o);
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
							s2.equalsNoBindings(s1)
							//s2.subsetNoBindings(s1)
							) {
							if (DEBUG_resolution) console.log("step_internal: we are done! what we want to proof is in the knowledge base!!!");
							this.internal_step_state = 1;
							this.newResolvents = null;
							return null;
						}
					}
					if (DEBUG_resolution) console.log("    Resolution (relevantSentences) between " + s1 + "   and   " + s2);
					let tmp:InferenceNode[] = this.resolutionBetweenSentencesWithBindings(n1, new InferenceNode(s2, new Bindings(), null, null), occursCheck);
					resolutions++;
					this.total_resolutions++;
//					console.log("    tmp: " + tmp.length);
					for(let r of tmp) {
						this.resolutionEqualityCheck(r);
						if (r.sentence != null && this.treatSpatialPredicatesSpecially) r.sentence = this.resolutionSpatialPredicatesCheck(r.sentence, false);
						if (r.sentence == null) continue;
						let found:boolean = false;
						for(let i:number = 0;i<this.newResolvents.length;i++) {
							if (this.resultCanBeFilteredOut(this.newResolvents[i], r.sentence, r.bindings)) {
							//if (this.newResolvents[i].sentence.terms.length > 0 &&
								//this.newResolvents[i].sentence.equalsNoBindings(r.sentence) &&
								//this.newResolvents[i].sentence.subsetNoBindings(r.sentence) &&
								//this.newResolvents[i].bindings.equals(r.bindings)) {
								found = true;
//								console.log(" bindings filtered1: " + resolvents[i].bindings);
//								console.log(" bindings filtered2: " + r.bindings);
								break;
							/*
							} else if (this.newResolvents[i].sentence.terms.length == 0 &&
								       r.sentence.terms.length == 0 &&
								       this.newResolvents[i].bindings.equals(r.bindings)) {
								found = true;
//								console.log(" bindings filtered1: " + resolvents[i].bindings);
//								console.log(" bindings filtered2: " + r.bindings);
								break;
							*/
							}
						}
						if (!found) {
							this.newResolvents.push(r);
							if (DEBUG_resolution) console.log("step_internal: new resolvent: " + r.sentence  + " , " + r.bindings);
							if (r.sentence.terms.length == 0 && stopOnFirstContradiction) {
								this.internal_step_state = 1;
								return this.newResolvents;	// we are done!
							}
						}
					}						
				}	
			}

//			console.log("resolvents.length (after this.KB): " + resolvents.length);
//			console.log("resolvents (after this.KB): " + resolvents);

			for(let n2 of sentences) {
				if (s1 == n2.sentence) continue;
				let s2:Sentence = n2.sentence;
				if (this.firstStep) {
					if (this.originalTarget.length == 1 &&
						s2.equalsNoBindings(s1)) {
						//s2.subsetNoBindings(s1)) {
						if (DEBUG_resolution) console.log("step_internal: we are done! what we want to proof is in the knowledge base!!!");
						this.internal_step_state = 1;
						this.newResolvents = null;
						return null;
					}
				}
				// if (DEBUG_resolution) console.log("    Resolution (sentences) between " + s1 + "   and   " + s2);
				let tmp:InferenceNode[] = this.resolutionBetweenSentencesWithBindings(n1, n2, occursCheck);
				resolutions++;
				this.total_resolutions++;
				for(let r of tmp) {
					this.resolutionEqualityCheck(r);
					if (r.sentence != null && this.treatSpatialPredicatesSpecially) r.sentence = this.resolutionSpatialPredicatesCheck(r.sentence, false);
					if (r.sentence == null) continue;

					let found:boolean = false;
					for(let i:number = 0;i<this.newResolvents.length;i++) {
						if (this.resultCanBeFilteredOut(this.newResolvents[i], r.sentence, r.bindings)) {
						//if (this.newResolvents[i].sentence.terms.length > 0 &&
							//this.newResolvents[i].sentence.equalsNoBindings(r.sentence) &&
							//this.newResolvents[i].sentence.subsetNoBindings(r.sentence) &&
							//this.newResolvents[i].bindings.equals(r.bindings)) {
							found = true;
							break;
							/*
						} else if (this.newResolvents[i].sentence.terms.length == 0 &&
							       r.sentence.terms.length == 0 &&
							       this.newResolvents[i].bindings.equals(r.bindings)) {
							found = true;
							break;
							*/
						}
					}
					if (!found) {
						this.newResolvents.push(r);
						if (DEBUG_resolution) console.log("step_internal: new resolvent: " + r.sentence  + " , " + r.bindings);
						if (r.sentence.terms.length == 0 && stopOnFirstContradiction) {
							this.internal_step_state = 1;
							return this.newResolvents;	// we are done!
						}
					}
				}						
			}		

//			console.log("resolvents.length (after sentences): " + resolvents.length);

			for(let n2 of target) {
				if (s1 == n2.sentence) continue;
				//if (DEBUG_resolution) console.log("    Resolution (target with bindings) between " + s1 + "   and   " + s2);
				let tmp:InferenceNode[] = this.resolutionBetweenSentencesWithBindings(n1, n2, occursCheck);
				resolutions++;
				this.total_resolutions++;
				for(let r of tmp) {
					this.resolutionEqualityCheck(r);
					if (r.sentence != null && this.treatSpatialPredicatesSpecially) r.sentence = this.resolutionSpatialPredicatesCheck(r.sentence, false);
					if (r.sentence == null) continue;

					let found:boolean = false;
					for(let i:number = 0;i<this.newResolvents.length;i++) {
						if (this.resultCanBeFilteredOut(this.newResolvents[i], r.sentence, r.bindings)) {
						//if (this.newResolvents[i].sentence.equalsNoBindings(r.sentence) &&
						//if (this.newResolvents[i].sentence.subsetNoBindings(r.sentence) &&
							//this.newResolvents[i].bindings.equals(r.bindings)) {
							found = true;
							break;
						}
					}
					if (!found) {
						this.newResolvents.push(r);
						if (DEBUG_resolution) console.log("step_internal: new resolvent: " + r.sentence  + " , " + r.bindings);
						if (r.sentence.terms.length == 0 && stopOnFirstContradiction) {
							this.internal_step_state = 1;
							return this.newResolvents;	// we are done!
						}
					}
				}						
			}

			if (this.total_resolutions >= INFERENCE_MAX_TOTAL_RESOLUTIONS) {
				console.log("step_internal: final interruption with #resolutions = " + resolutions + "(" + this.total_resolutions + ") end results: " + this.endResults.length);
				this.internal_step_state = 2;
				return null;
			}

//			console.log("resolvents.length (after target): " + resolvents.length);
			if (resolutions >= INFERENCE_MAX_RESOLUTIONS_PER_STEP) {
				// we need to interrupt:
				console.log("step_internal: interrupted with #resolutions = " + resolutions + "(" + this.total_resolutions + "), closed "+this.closed.length+", end results: " + this.endResults.length);
				return null;
			}
		}

		console.log("step_internal: finished with #resolutions = " + resolutions + "(" + this.total_resolutions + "), closed: "+this.closed.length+", end results: " + this.endResults.length);
		//console.log("closed: " + this.closed)
		this.internal_step_state = 1;
		return this.newResolvents;
	}


	// Checks to see if the equality predicate results in a contradiction: sets r.sentence = null
	// Or if there are any terms of the from x = x (which are then removed)
	resolutionEqualityCheck(r:InferenceNode)
	{
		let s:Sentence = r.sentence;
		let toDelete:Term[] = [];
		for(let i:number = 0;i<s.terms.length;i++) {
			if (s.terms[i].functor.name == "=" &&
				s.terms[i].attributes.length == 2) {
				let equals:number = Term.equalsNoBindingsAttribute(s.terms[i].attributes[0], 
							   								       s.terms[i].attributes[1]);
				if (equals == 0) {
					if (s.terms.length == 1) {
						// special case where the sentences is just something of the form: "=(X,constant)"
						if ((s.terms[i].attributes[0] instanceof VariableTermAttribute) &&
							(s.terms[i].attributes[1] instanceof ConstantTermAttribute) &&
							s.terms[i].attributes[0].sort.subsumes(s.terms[i].attributes[1].sort)) {
							r.bindings.l.push([<VariableTermAttribute>(s.terms[i].attributes[0]), s.terms[i].attributes[1]]);
							toDelete.push(s.terms[i]);
						} else if ((s.terms[i].attributes[1] instanceof VariableTermAttribute) &&
							(s.terms[i].attributes[0] instanceof ConstantTermAttribute) &&
							s.terms[i].attributes[1].sort.subsumes(s.terms[i].attributes[0].sort)) {
							r.bindings.l.push([<VariableTermAttribute>(s.terms[i].attributes[1]), s.terms[i].attributes[0]]);
							toDelete.push(s.terms[i]);
						}
					}
					continue;
				}
				if ((s.sign[i] && equals==1) ||
				    (!s.sign[i] && equals==-1)) {
					r.sentence = null;
					return;
				} else {
					toDelete.push(s.terms[i]);
				}
			}
		}

		for(let t of toDelete) {
			let idx:number = s.terms.indexOf(t);
			s.terms.splice(idx,1);
			s.sign.splice(idx,1);
		}
	}


	resolutionSpatialPredicatesCheck(s:Sentence, firstTime:boolean) : Sentence
	{
		let toDelete:Term[] = [];
		for(let i:number = 0;i<s.terms.length;i++) {
			if (firstTime) {
				if (s.terms[i].functor.is_a(this.sort_cache_superlative) &&
					s.terms[i].functor.is_a(this.sort_cache_spatial_relation)) {
					toDelete.push(s.terms[i]);
					this.superlativePredicates.push(new Sentence([s.terms[i]], [!s.sign[i]]))
					continue;
				}
			}

			if (s.terms[i].functor.is_a(this.sort_cache_spatial_relation) &&
				s.terms[i].attributes.length == 2 &&
				s.terms[i].attributes[0] instanceof ConstantTermAttribute &&
				s.terms[i].attributes[1] instanceof ConstantTermAttribute) {
				// check if it's true or false, and see if it has to be eliminated from the sentence:
				let truth:boolean = this.ai.checkSpatialRelation(s.terms[i].functor,
															(<ConstantTermAttribute>s.terms[i].attributes[0]).value,
															(<ConstantTermAttribute>s.terms[i].attributes[1]).value,
															this.ai.selfID);
				//console.log("checkSpatialRelation: " + s.terms[i] + " -> " + truth );
				if (truth != null &&
					truth != s.sign[i]) {
					//console.log("    removing it from sentence");
					toDelete.push(s.terms[i]);
				}
			}
		}

		for(let t of toDelete) {
			let idx:number = s.terms.indexOf(t);
			s.terms.splice(idx,1);
			s.sign.splice(idx,1);
		}
		return s;
	}


	processSuperlatives()
	{
		for(let superlative of this.superlativePredicates) {
			this.endResults = this.ai.processSuperlatives(this.endResults, superlative);
		}
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
	// parent1: is from the query
	// parent2: is from the KB
	resolutionBetweenSentencesWithBindings(parent1:InferenceNode, parent2:InferenceNode,
 									       occursCheck:boolean) : InferenceNode[]
	{
//		console.log("resolutionBetweenSentencesWithBindings: " + s1 + " with " + s2);
		let resolvents:InferenceNode[] = [];
//		this.resolutionBetweenSentencesWithBindings_internal(s1, s2, [], [], new Bindings(), resolvents, occursCheck);
		this.resolutionBetweenSentencesWithBindings_internal(parent1.sentence, parent2.sentence, parent1, parent2, new Bindings(), resolvents, occursCheck);
		let resolvents2:InferenceNode[] = [];
		for(let r of resolvents) {
			r.bindings = parent1.bindings.concat(parent2.bindings.concat(r.bindings))
			if (r.bindings != null) {
				r.sentence = r.sentence.applyBindings(r.bindings);
				//r.bindings.removeUselessBindingsSentence(r.sentence, this.originalTargetVariables)
				r.bindings.removeUselessBindings(this.originalTargetVariables)
				/*
				for(let ts of this.originalTarget) {
					this.originalTargetVariables = this.originalTargetVariables.concat(ts.getAllVariables());
				}
				*/

				/*
				// debug check:
				for(let i:number = 0; i<r.bindings.l.length; i++) {
					for(let j:number = i+1; j<r.bindings.l.length; j++) {
						if (r.bindings.l[i] == r.bindings.l[j]) {
							console.error("repeated bindings!");
						}
					}
				}
				*/

				let found:boolean = false;
				for(let r2 of resolvents2) {
					if (this.resultCanBeFilteredOut(r, r2.sentence, r2.bindings)) {
					//if (r2.sentence.equalsNoBindings(r.sentence) &&
					//if (r2.sentence.subsetNoBindings(r.sentence) &&
						//r2.bindings.equals(r.bindings)) {
						//console.log("R: " + r + "\n filtered out (from newResolvents): " + r2);
						found = true;
					}
				}
				if (!found) resolvents2.push(r);
			}
		}
		return resolvents2;
	}



	// s1: is from the query
	// s2: is from the KB
	resolutionBetweenSentencesWithBindings_internal(s1:Sentence, s2:Sentence, 
													parent1:InferenceNode, parent2:InferenceNode,
												    bindings:Bindings, 
												    resolvents:InferenceNode[],
												    occursCheck:boolean) : void
	{
		//console.log("s1: " + s1);
		//console.log("s2: " + s2);

		for(let i:number = 0;i<s1.terms.length;i++) {
			for(let j:number = 0;j<s2.terms.length;j++) {
				if (s1.sign[i] == s2.sign[j]) continue;
				
				let t1:Term = s1.terms[i].applyBindings(bindings);
				let t2:Term = s2.terms[j].applyBindings(bindings);
//				console.log("p: " + p);
//				console.log("q: " + q);
				let bindings2:Bindings = new Bindings();
				bindings2 = bindings2.concat(bindings);
				// if (!p.unify(q, occursCheck, bindings2)) continue;
				// special cases, where I can use functor sort subsumption and inference is still sound:
				// this is so that I don't need all those ontology rules that make everything very slow!
				if (s1.sign[i]) {
					if (!t1.functor.is_a(t2.functor)) continue;
					if (!t1.unifyIgnoringFirstfunctor(t2, occursCheck, bindings2)) continue;					
				} else {
					if (!t2.functor.is_a(t1.functor)) continue;
					if (!t1.unifyIgnoringFirstfunctor(t2, occursCheck, bindings2)) continue;					
				}
				/*
				if (s1.terms.length == 1) {
					if (s2.terms.length == 1) {
						//if (!p.functor.is_a(q.functor) && !q.functor.is_a(p.functor)) continue;
						if (!p.functor.is_a(q.functor)) continue;
						if (!p.unifyIgnoringFirstfunctor(q, occursCheck, bindings2)) continue;
					} else {
						if (!p.functor.is_a(q.functor)) continue;
						if (!p.unifyIgnoringFirstfunctor(q, occursCheck, bindings2)) continue;
					}
				} else if (s2.terms.length == 1) {
					if (!q.functor.is_a(p.functor)) continue;
					if (!p.unifyIgnoringFirstfunctor(q, occursCheck, bindings2)) continue;
				} else {
					if (!p.unifySameFunctor(q, occursCheck, bindings2)) continue;
				}
				*/

				// only allow steps that replace variables by constants:
				if (!INFERENCE_allow_variable_to_variable_substitutions) {
					let anyNonVariable:boolean = false;
					for(let k:number = bindings.l.length;k<bindings2.l.length;k++) {
						if (!(bindings2.l[k][1] instanceof VariableTermAttribute)) anyNonVariable = true;
					}
					if (bindings2.l.length > 0 && !anyNonVariable) continue;
				}

				// generate one resolvent:
				let r:InferenceNode = new InferenceNode(new Sentence([],[]), bindings2, parent1, parent2);
				for(let i2:number = 0;i2<s1.terms.length;i2++) {
					if (i == i2) continue;
					r.sentence.terms.push(s1.terms[i2].applyBindings(bindings2));
					r.sentence.sign.push(s1.sign[i2]);
				}
				for(let j2:number = 0;j2<s2.terms.length;j2++) {
					if (j == j2) continue;
					r.sentence.terms.push(s2.terms[j2].applyBindings(bindings2));
					r.sentence.sign.push(s2.sign[j2]);
				}

				// only allow steps that do not increase the size of the sentences:
				if (!INFERENCE_allow_increasing_sentences) {
		//			console.log("resolvent: " + resolvent.terms);
		//			console.log("bindings: " + bindings);
					if (r.sentence.terms.length >= s1.terms.length &&
						r.sentence.terms.length >= s2.terms.length) {
						if (DEBUG_resolution_detailed) console.log("Removed because of size (1)... "  + r.sentence.terms.length + " vs " + s1.terms.length + " and " + s2.terms.length);
						return;
					}
				}
				if (r.sentence.terms.length > INFERENCE_maximum_sentence_size) {
					if (DEBUG_resolution_detailed) console.log("Removed because of size (2)... "  + r.sentence.terms.length);
					return;
				}

				resolvents.push(r);
				if (DEBUG_resolution) {
					console.log("resolutionBetweenSentencesWithBindings_internal: new resolvent");
					console.log("    s1: " + s1);
					console.log("    s2: " + s2);
					console.log("    indexes: " + i + " , " + j);
					console.log("    bindings: " + r.bindings);
					console.log("    resolvent: " + r.sentence);
				}
			}
		}
	}


	//subsetNoBindings(s:Sentence) : boolean
	// --> If previousR subset r (the non contained do not have any variables that can affect the final bindings) -> filter
	resultCanBeFilteredOut(r:InferenceNode, previousSentence:Sentence, previousBindings:Bindings): boolean
	{
		if (r.sentence.terms.length < previousSentence.terms.length) return false;
		if (previousBindings != null && !r.bindings.equals(previousBindings)) return false;

		let anyNotFound:boolean = false;
		for(let i:number = 0;i<r.sentence.terms.length;i++) {
			let found:boolean = false;
			for(let j:number = 0;j<previousSentence.terms.length;j++) {
				if (r.sentence.sign[i] == previousSentence.sign[j] &&
					r.sentence.terms[i].equalsNoBindings(previousSentence.terms[j]) == 1) {
					found = true;
					break;
				}
			}
			if (!found) {
				return false;
				/*
				anyNotFound = true;
				// check if the new term in the result could potentially change the end result:
				let vl:VariableTermAttribute[] = r.sentence.terms[i].getAllVariables();
				let variableFound:boolean = false;
				for(let binding of r.bindings.l) {
					if (binding[1] instanceof VariableTermAttribute) {
						if (vl.indexOf(<VariableTermAttribute>binding[1]) != -1) {
							variableFound = true;
							break;
						}
					} else if (binding[1] instanceof TermTermAttribute) {
						let vl2:VariableTermAttribute[] = (<TermTermAttribute>binding[1]).term.getAllVariables();
						for(let v of vl2) {
							if (vl.indexOf(v) != -1) {
								variableFound = true;
								break;								
							}
						}
						if (variableFound) break;
					}
				}
				if (variableFound) return false;
				if (previousBindings != null) return true;
				*/
			}
		}

		if (anyNotFound) {
			if (previousBindings == null) return false;
			return true;
		} else {
			return true;
		}
	}


	saveToXML() : string
	{
		let str:string = "<InterruptibleResolution>\n";

		// ...

		str += "</InterruptibleResolution>";
		return str;
	}


	occursCheck:boolean;
	reconsiderTarget:boolean;
	treatSpatialPredicatesSpecially:boolean;
	KB:SentenceContainer = null;
	additionalSentences:InferenceNode[] = [];
	target:InferenceNode[] = [];
	originalTarget:Sentence[] = null;
	originalTargetVariables:VariableTermAttribute[] = [];
	ai:RuleBasedAI = null;

	superlativePredicates:Sentence[] = [];

	firstStep:boolean = true;
	closed:InferenceNode[] = [];

	endResults:InferenceNode[] = [];

	internal_step_state:number = 0;			// 0 if it is still running, 1 if it's done, 2 it's that it has reached computation limit
	internal_step_state_index:number = 0;	// index of the next element of "target" to consider 
	newResolvents:InferenceNode[] = null;
	total_resolutions:number = 0;

	sort_cache_spatial_relation:Sort = null;
	sort_cache_superlative:Sort = null;
}
