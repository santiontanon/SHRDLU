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
var INFERENCE_maximum_sentence_size:number = 4;
var INFERENCE_allow_equal_size_sentences:boolean = true;
var INFERENCE_allow_increasing_sentences:boolean = true;
var INFERENCE_allow_variable_to_variable_substitutions:boolean = true;

var INFERENCE_MAX_RESOLUTIONS_PER_STEP:number = 4000;
var INFERENCE_MAX_TOTAL_RESOLUTIONS:number = 1000000;	// at this point, inference will stop
// var INFERENCE_MAX_TOTAL_RESOLUTIONS:number = 400000;	// at this point, inference will stop

// var INFERENCE_STEP_STATE_STILL_RUNNING:number = 0;
var INFERENCE_STEP_STATE_DONE:number = 1;
var INFERENCE_STEP_STATE_COMPUTE_LIMIT_REACHED:number = 2;

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


	getValueForVariableName(vName:string) : TermAttribute
	{
		return this.bindings.getValueForVariableName(vName);
	}


	matchesOnVariableNames(n2:InferenceNode, vNames:string[]) : boolean
	{
		for(let vName of vNames) {
			let v1:TermAttribute = this.getValueForVariableName(vName);
			let v2:TermAttribute = n2.getValueForVariableName(vName);
			if (v1 == null && v2 != null) return false;
			if (v1 != null && v1 == null) return false;
			if (Term.equalsNoBindingsAttribute(v1, v2) != 1) return false;
		}
		return true;
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
	constructor(KB:SentenceContainer, additionalSentences:Sentence[], target:Sentence[], occursCheck:boolean, treatSpatialPredicatesSpecially:boolean, ai:RuleBasedAI)
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
		this.treatSpatialPredicatesSpecially = treatSpatialPredicatesSpecially;
		this.superlativePredicates = [];	// These are predicates such as "nearest", that can only be checked once we have all the solutions
		this.ai = ai;
		this.internal_step_state = INFERENCE_STEP_STATE_DONE;	// signal that we need to start from scratch the first time step_internal is called
		// this.internal_step_state_index = 0;

		for(let s of additionalSentences) {
			this.additionalSentences.push(new InferenceNode(s, new Bindings(), null, null));
		}
		for(let s of target) {
			let r:InferenceNode = new InferenceNode(s, new Bindings(), null, null);
			this.resolutionEqualityCheck(r);
			if (r.sentence != null && this.treatSpatialPredicatesSpecially) {
				let n:number = r.sentence.terms.length;
				r.sentence = this.resolutionSpatialPredicatesCheck(r.sentence, true);
				if (n != r.sentence.terms.length && r.sentence.terms.length==1) {
					// we need to check this again:
					this.resolutionEqualityCheck(r);
				}
			}
			if (r.sentence == null) continue;
			this.open.push(r);
		}

		console.log("InterruptibleResolution: variables: " + this.originalTargetVariables);
		for(let t of this.open) {
			console.log("   target: " + t.toString());
		}
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
		if (this.stepAccumulatingResults(false)) return true;
		return false;
	}


	stepAccumulatingResults(findAllAnswers:boolean) : boolean
	{
		if (DEBUG_resolution) console.log("resolution stepAccumulatingResults:");
		if (this.originalTargetVariables.length == 0) findAllAnswers = false;

		let resolutionsAtStepStart:number = this.total_resolutions;
		while(this.total_resolutions < resolutionsAtStepStart + INFERENCE_MAX_RESOLUTIONS_PER_STEP) {
			let newResolvents:InferenceNode[] = this.step_internal(this.additionalSentences, this.occursCheck, !findAllAnswers);
			if (DEBUG_resolution && newResolvents != null) {
				console.log(this.debug_inferenceSentenceLengths(newResolvents));
			}

			this.firstStep = false;
			if (newResolvents == null ||
				(this.open.length == 0 && newResolvents.length == 0)) {
				console.log("step: finished with #total_resolutions = " + this.total_resolutions + " closed: "+this.closed.length+", open: "+this.open.length+", end results: " + this.endResults.length);
				if (DEBUG_resolution) console.log("  - no more resolvents: " +this.endResults.length + " sets of bindings cause a contradiction! (CLOSED: " + this.closed.length + ")");
				this.processSuperlatives();
				return true;
			}

			// console.log("resolution stepAccumulatingResults: newResolvents.length = " + newResolvents.length);
			if (DEBUG_resolution) {
				for(let resolvent of newResolvents) {
					console.log("    " + resolvent.sentence + " -> " + resolvent.bindings);
				}
			}

			// let anyNewResolvent:boolean = false;
			for(let newResolvent of newResolvents) {
				let r:Sentence = newResolvent.sentence;
				let b:Bindings = newResolvent.bindings;
				if (r.terms.length == 0) {
					// we have found a contradiction!
					if (DEBUG_resolution) console.log("  - contradiction! (CLOSED: " + this.closed.length + ")");
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
							found = true;
							break;
						}
					}
					if (!found) {
						this.closed.push(endResult);					
						this.endResults.push(endResult);
						if (!findAllAnswers) {
							// we are done!
							console.log("step: finished with #total_resolutions = " + this.total_resolutions + " closed: "+this.closed.length+", open: "+this.open.length+", end results: " + this.endResults.length);
							this.processSuperlatives();
							return true;
						}
					} else {
						console.warn("    end result was already there: " + endResult.bindings);
					}
				} else {
					let found:boolean = false;
					// make sure we are not inferring something we already knew:
					for(let tmp of this.closed) {
						if (this.resultCanBeFilteredOut(newResolvent, tmp.sentence, tmp.bindings)) {
							found = true;
							break;
						}
					}
					if (!found) {
						for(let tmp of this.open) {
							if (this.resultCanBeFilteredOut(newResolvent, tmp.sentence, tmp.bindings)) {
								found = true;
								break;
							}
						}
					}
					if (!found) {
						for(let tmp of this.additionalSentences) {
							if (this.resultCanBeFilteredOut(newResolvent, tmp.sentence, tmp.bindings)) {
								found = true;
								break;
							}
						}
					}
					if (!found) {
						for(let tmp of this.KB.plainSentenceList) {
							if (this.resultCanBeFilteredOut(newResolvent, tmp.sentence, null)) {
								found = true;
								break;
							}
						}
					}
					if (!found) {
						this.open.push(newResolvent);
						// anyNewResolvent = true;
					}
				}
				if (DEBUG_resolution) console.log("  " + r.toString());
			}
		}

		console.log("step: finished with #total_resolutions = " + this.total_resolutions + " closed: "+this.closed.length+", open: "+this.open.length+", end results: " + this.endResults.length);

		if (this.total_resolutions >= INFERENCE_MAX_TOTAL_RESOLUTIONS) {
			console.log("step: finished with #total_resolutions = " + this.total_resolutions + " closed: "+this.closed.length+", open: "+this.open.length+", end results: " + this.endResults.length);
			this.processSuperlatives();
			return true;	// computation limit reached
		}

		if (DEBUG_resolution) console.log("  CLOSED: " + this.closed.length);
		if (DEBUG_resolution) console.log("  KB.length: " + this.KB.plainSentenceList.length);

		// if (!anyNewResolvent) {
		// 	console.log("all the resolvents in this round where already in the closed list, so we are done!");
		// 	this.processSuperlatives();
		// 	return true;
		// }

		return false;
	}	


	step_internal(sentences:InferenceNode[], 
			      occursCheck:boolean,
	   		      stopOnFirstContradiction:boolean) : InferenceNode[]
	{
		let newResolvents:InferenceNode[] = [];
		if (DEBUG_resolution) console.log("InterruptibleResolution.step_internal with sentences.length = " + sentences.length + ", open.length = " + this.open.length);
		if (this.firstStep) {
			for(let i:number = 0;i<this.open.length;i++) {
				if (this.open[i].sentence.terms.length == 0) {
					// initial contradiction!
					this.internal_step_state = INFERENCE_STEP_STATE_DONE;
					return [this.open[i]];	// we are done!
				}
			}
		}
		// this.internal_step_state_index = 0;
		if (this.open.length == 0) return [];

		// pick the smallest (notice that this is NOT a time bottleneck, so, although it can be easily done, there is little to gain optimizing this loop):
		let n1_idx:number = 0;
		for(let i:number = 1; i<this.open.length; i++) {
			if (this.open[i].sentence.terms.length < this.open[n1_idx].sentence.terms.length) {
				n1_idx = i;
			}
		}

		let n1:InferenceNode = this.open[n1_idx];
		let s1:Sentence = n1.sentence;
		this.open.splice(n1_idx, 1);
		this.closed.push(n1);

		// console.log("n1.sentence = " + n1.sentence);
		// console.log("n1.sentence = " + n1.sentence.terms.length);

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
						s2.equalsNoBindings(s1)) {
						if (DEBUG_resolution) console.log("step_internal: we are done! what we want to proof is in the knowledge base!!!");
						this.internal_step_state = INFERENCE_STEP_STATE_DONE;
						return null;
					}
				}
				let tmp:InferenceNode[] = this.resolutionBetweenSentencesWithBindings(n1, new InferenceNode(s2, new Bindings(), null, null), occursCheck);
				if (DEBUG_resolution) 
					console.log("    Resolution (relevantSentences) between " + s1 + "   and   " + s2 + "  --> " + this.debug_inferenceSentenceLengths(tmp));
				this.total_resolutions++;
				for(let r of tmp) {
					this.resolutionEqualityCheck(r);
					if (r.sentence != null && this.treatSpatialPredicatesSpecially) r.sentence = this.resolutionSpatialPredicatesCheck(r.sentence, false);
					if (r.sentence == null) continue;
					let found:boolean = false;
					for(let i:number = 0;i<newResolvents.length;i++) {
						if (this.resultCanBeFilteredOut(r, newResolvents[i].sentence, newResolvents[i].bindings)) {
							found = true;
							break;
						}
					}
					if (!found) {
						newResolvents.push(r);
						if (DEBUG_resolution) console.log("step_internal: new resolvent: " + r.sentence  + " , " + r.bindings);
						if (r.sentence.terms.length == 0 && stopOnFirstContradiction) {
							this.internal_step_state = INFERENCE_STEP_STATE_DONE;
							return newResolvents;	// we are done!
						}
					}
				}						
			}	
		}

		for(let n2 of sentences) {
			if (s1 == n2.sentence) continue;
			let s2:Sentence = n2.sentence;
			if (this.firstStep) {
				if (this.originalTarget.length == 1 &&
					s2.equalsNoBindings(s1)) {
					if (DEBUG_resolution) console.log("step_internal: we are done! what we want to proof is in the knowledge base!!!");
					this.internal_step_state = INFERENCE_STEP_STATE_DONE;
					return null;
				}
			}
			let tmp:InferenceNode[] = this.resolutionBetweenSentencesWithBindings(n1, n2, occursCheck);
			if (DEBUG_resolution) 
				console.log("    Resolution (sentences) between " + s1 + "   and   " + s2 + "  --> " + this.debug_inferenceSentenceLengths(tmp));
			this.total_resolutions++;
			for(let r of tmp) {
				this.resolutionEqualityCheck(r);
				if (r.sentence != null && this.treatSpatialPredicatesSpecially) r.sentence = this.resolutionSpatialPredicatesCheck(r.sentence, false);
				if (r.sentence == null) continue;

				let found:boolean = false;
				for(let i:number = 0;i<newResolvents.length;i++) {
					if (this.resultCanBeFilteredOut(r, newResolvents[i].sentence, newResolvents[i].bindings)) {
						found = true;
						break;
					}
				}
				if (!found) {
					newResolvents.push(r);
					if (DEBUG_resolution) console.log("step_internal: new resolvent: " + r.sentence  + " , " + r.bindings);
					if (r.sentence.terms.length == 0 && stopOnFirstContradiction) {
						this.internal_step_state = INFERENCE_STEP_STATE_DONE;
						return newResolvents;	// we are done!
					}
				}
			}						
		}		

		// for(let n2 of this.open) {
		for(let n2 of this.closed) {
			if (s1 == n2.sentence) continue;
			let s2:Sentence = n2.sentence;
			let tmp:InferenceNode[] = this.resolutionBetweenSentencesWithBindings(n1, n2, occursCheck);
			if (DEBUG_resolution) 
				console.log("    Resolution (closed) between " + s1 + "   and   " + s2 + "  --> " + this.debug_inferenceSentenceLengths(tmp));
			this.total_resolutions++;
			for(let r of tmp) {
				this.resolutionEqualityCheck(r);
				if (r.sentence != null && this.treatSpatialPredicatesSpecially) r.sentence = this.resolutionSpatialPredicatesCheck(r.sentence, false);
				if (r.sentence == null) continue;

				let found:boolean = false;
				for(let i:number = 0;i<newResolvents.length;i++) {
					if (this.resultCanBeFilteredOut(newResolvents[i], r.sentence, r.bindings)) {
						found = true;
						break;
					}
				}
				if (!found) {
					newResolvents.push(r);
					if (DEBUG_resolution) console.log("step_internal: new resolvent: " + r.sentence  + " , " + r.bindings);
					if (r.sentence.terms.length == 0 && stopOnFirstContradiction) {
						this.internal_step_state = INFERENCE_STEP_STATE_DONE;
						return newResolvents;	// we are done!
					}
				}
			}						
		}

		// if (resolutions >= INFERENCE_MAX_RESOLUTIONS_PER_STEP) {
		// 	// we need to interrupt:
		// 	console.log("step_internal: interrupted with #resolutions = " + resolutions + " (" + this.total_resolutions + "), closed "+this.closed.length+", open: "+this.open.length+", newResolvents: "+newResolvents.length+", end results: " + this.endResults.length);
		// 	return null;
		// }

		// console.log("step_internal: finished with #total_resolutions = " + this.total_resolutions + " closed: "+this.closed.length+", open: "+this.open.length+", newResolvents: "+newResolvents.length+", end results: " + this.endResults.length);
		this.internal_step_state = INFERENCE_STEP_STATE_DONE;
		return newResolvents;
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
				if (DEBUG_resolution) console.log("checkSpatialRelation: " + s.terms[i] + " -> " + truth );
				if (truth != null &&
					truth != s.sign[i]) {
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
		let resolvents:InferenceNode[] = [];
		this.resolutionBetweenSentencesWithBindings_internal(parent1.sentence, parent2.sentence, parent1, parent2, resolvents, occursCheck);
		// console.log("    resolutionBetweenSentencesWithBindings: resolvents: " + resolvents.length);
		let resolvents2:InferenceNode[] = [];
		for(let r of resolvents) {
			r.bindings = parent1.bindings.concat(parent2.bindings.concat(r.bindings))
			if (r.bindings != null) {
				r.sentence = r.sentence.applyBindings(r.bindings);
				r.bindings.removeUselessBindings(this.originalTargetVariables)

				let found:boolean = false;
				for(let r2 of resolvents2) {
					if (this.resultCanBeFilteredOut(r, r2.sentence, r2.bindings)) {
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
												    resolvents:InferenceNode[],
												    occursCheck:boolean) : void
	{
		let s2_term_cache:Term[] = []
	    let bindings:Bindings = new Bindings();
	    if (parent1.bindings != null) {
	    	bindings = bindings.concat(parent1.bindings);
	    }
	    if (parent2.bindings != null) {
	    	bindings = bindings.concat(parent2.bindings);
	    }

	    // if they are not compatible:
	    if (bindings == null) {
	    	// console.log("incompatible bindings: " + parent1.bindings + "  vs  " + parent2.bindings);
	    	return;
	    }

		for(let i:number = 0;i<s1.terms.length;i++) {
			for(let j:number = 0;j<s2.terms.length;j++) {
				if (s2_term_cache.length <= j) s2_term_cache.push(null);
				if (s1.sign[i] == s2.sign[j]) continue;
				
				let t1:Term = s1.terms[i].applyBindings(bindings);
				let t2:Term = s2_term_cache[j];
				if (t2 == null) {
					t2 = s2.terms[j].applyBindings(bindings);
					s2_term_cache[j] = t2;
				}
				let bindings2:Bindings = new Bindings();
				bindings2 = bindings2.concat(bindings);
				// special cases, where I can use functor sort subsumption and inference is still sound:
				// this is so that I don't need all those ontology rules that make everything very slow!
				if (s1.sign[i]) {
					if (!t1.functor.is_a(t2.functor)) continue;
					if (!t1.unifyIgnoringFirstfunctor(t2, occursCheck, bindings2)) continue;					
				} else {
					if (!t2.functor.is_a(t1.functor)) continue;
					if (!t1.unifyIgnoringFirstfunctor(t2, occursCheck, bindings2)) continue;					
				}

				// only allow steps that replace variables by constants:
				if (!INFERENCE_allow_variable_to_variable_substitutions) {
					let anyNonVariable:boolean = false;
					for(let k:number = bindings.l.length;k<bindings2.l.length;k++) {
						if (!(bindings2.l[k][1] instanceof VariableTermAttribute)) anyNonVariable = true;
					}
					if (bindings2.l.length > bindings.l.length && !anyNonVariable) continue;
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
					if (r.sentence.terms.length > s1.terms.length &&
						r.sentence.terms.length > s2.terms.length) {
						if (DEBUG_resolution_detailed) 
							console.log("Removed because of size (1a)... "  + r.sentence.terms.length + " vs " + s1.terms.length + " and " + s2.terms.length);
						return;
					}
				}
				if (!INFERENCE_allow_equal_size_sentences) {
					if (r.sentence.terms.length >= s1.terms.length &&
						r.sentence.terms.length >= s2.terms.length) {
						if (DEBUG_resolution_detailed) 
							console.log("Removed because of size (1a)... "  + r.sentence.terms.length + " vs " + s1.terms.length + " and " + s2.terms.length);
						return;
					}
				}
				if (r.sentence.terms.length > INFERENCE_maximum_sentence_size) {
					if (DEBUG_resolution_detailed) 
						console.log("Removed because of size (2)... "  + r.sentence.terms.length);
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


	// --> If previousR subset r (the non contained do not have any variables that can affect the final bindings) -> filter
	resultCanBeFilteredOut(r:InferenceNode, previousSentence:Sentence, previousBindings:Bindings): boolean
	{
		let rl:number = r.sentence.terms.length;
		let psl:number = previousSentence.terms.length;
		if (r.sentence.terms.length < psl) return false;
		if (previousBindings != null && !r.bindings.equals(previousBindings)) return false;

		let used:boolean[] = [];
		for(let i:number = 0; i<rl; i++) {
			used.push(false);
		}

		for(let j:number = 0; j<psl; j++) {
			let found:boolean = false;
			for(let i:number = 0; i<rl; i++) {
				if (used[i]) continue;
				if (r.sentence.sign[i] == previousSentence.sign[j] &&
					r.sentence.terms[i].equalsNoBindings(previousSentence.terms[j]) == 1) {
					found = true;
					used[i] = true;
					break;
				}
			}
			if (!found) return false;
		}
		return true;
	}


	filterResultsByForAll(queryVariableNames:string[], forAllVariableName:string, forAllValues:TermAttribute[])
	{
		let results:[InferenceNode, TermAttribute[]][] = [];

		for(let r of this.endResults) {
			let match:boolean = false;
			for(let [prev_r, missingValues] of results) {
				if (r.matchesOnVariableNames(prev_r, queryVariableNames)) {
					let v:TermAttribute = r.getValueForVariableName(forAllVariableName);
					for(let i:number = 0;i<missingValues.length;i++) {
						if (Term.equalsNoBindingsAttribute(missingValues[i], v) == 1) {
							missingValues.splice(i, 1);
							break;
						}
					}
					match = true;
					break;
				}
			}
			if (!match) {
				console.log("filterResultsByForAll (new result): " + r.bindings);
				let bindings:Bindings = new Bindings();
				for(let vv of r.bindings.l) {
					if (vv[0].name != forAllVariableName) {
						bindings.l.push(vv);
					}
				}
				let r2:InferenceNode = new InferenceNode(r.sentence, bindings, r.parent1, r.parent2);
				let missingValues:TermAttribute[] = [...forAllValues];
				let v:TermAttribute = r.getValueForVariableName(forAllVariableName);
				for(let i:number = 0;i<missingValues.length;i++) {
					if (Term.equalsNoBindingsAttribute(missingValues[i], v) == 1) {
						missingValues.splice(i, 1);
						break;
					}
				}
				results.push([r2, missingValues])
			}
		}

		this.endResults = [];
		for(let [r, missingValues] of results) {
			console.log("filterResultsByForAll (final result): " + r.bindings + ", missingValues: " + missingValues);
			if (missingValues.length == 0) {
				this.endResults.push(r);
			}
		}
	}


	debug_inferenceSentenceLengths(inferences:InferenceNode[]) : number[]
	{
		let lengths:number[] = [];
		if (inferences == null) return null;
		for(let r of inferences) {
			lengths.push(r.sentence.terms.length);
		}
		return lengths;
	}


	saveToXML() : string
	{
		let str:string = "<InterruptibleResolution>\n";

		// ...

		str += "</InterruptibleResolution>";
		return str;
	}


	occursCheck:boolean;
	treatSpatialPredicatesSpecially:boolean;
	KB:SentenceContainer = null;
	additionalSentences:InferenceNode[] = [];
	originalTarget:Sentence[] = null;
	originalTargetVariables:VariableTermAttribute[] = [];
	ai:RuleBasedAI = null;

	superlativePredicates:Sentence[] = [];

	firstStep:boolean = true;

	// target:InferenceNode[] = [];
	open:InferenceNode[] = [];
	closed:InferenceNode[] = [];

	endResults:InferenceNode[] = [];

	internal_step_state:number = INFERENCE_STEP_STATE_DONE;			// 0 if it is still running, 1 if it's done, 2 it's that it has reached computation limit
	// internal_step_state_index:number = 0;	// index of the next element of "target" to consider 
	total_resolutions:number = 0;

	sort_cache_spatial_relation:Sort = null;
	sort_cache_superlative:Sort = null;
}
