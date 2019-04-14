var MAXIMUM_MEMORY_OF_PREVIOUS_STATES:number = 5000;

class SentenceEntry {
	constructor(s:Sentence, p:string, a:number, time:number)
	{
		this.sentence = s;
		this.provenance = p;
		this.activation = a;
		this.time = time;
	}

	toString() : string
	{
		return "[" + this.sentence + ", " + this.provenance + ", " + this.activation + "]";
	}

	sentence:Sentence;
	provenance:string;
	activation:number;
	time:number;
	timeEnd:number;	// this is just for the sentences that go to the previous sentence list
	previousInTime:SentenceEntry;	// if this sentence has been overwritten by another one, this points to the previous one

	allPotentialMatchesWithSentenceForResolution_counter:number = -1;	// used to prevent linear search, by marking which sentences have already been retrieved in this cycle
}


class SentenceContainer {
	
	addSentence(s:Sentence, provenance:string, activation:number, time:number) : SentenceEntry
	{
		var se:SentenceEntry = new SentenceEntry(s, provenance, activation, time);
		this.plainSentenceList.push(se);
		for(let t of s.terms) {
			var l:SentenceEntry[] = this.sentenceHash[t.functor.name];
			if (l == null) {
				l = [];
				this.sentenceHash[t.functor.name] = l;
			}
			l.push(se);
		}
		return se;
	}


	addPreviousSentence(s:Sentence, provenance:string, activation:number, time:number, timeEnd:number,
						current:SentenceEntry) : SentenceEntry
	{
		var se:SentenceEntry = new SentenceEntry(s, provenance, activation, time);
		se.timeEnd = timeEnd;
		if (current == null) {
			this.previousSentencesWithNoCurrentSentence.push(se);		
		} else {
			current.previousInTime = se;
			this.plainPreviousSentenceList.push(se);
		}
		return se;
	}


	addStateSentenceIfNew(s:Sentence, provenance:string, activation:number, time:number) : boolean
	{
		if (s.terms.length != 1) {
//			console.error("addStateSentenceIfNew: sentence is not a single term sentence! " + s);
			this.addSentence(s, provenance, activation, time);
			return true;
		}
		// check if we need to replace some sentence:
		var t:Term = s.terms[0];
		var l:SentenceEntry[] = this.sentenceHash[t.functor.name];
		var previous_s:SentenceEntry = null;
		if (l != null) {
			for(let se2 of l) {
				if (se2.sentence.terms.length == 1 &&
					((se2.sentence.sign[0] && 
					  TermContainer.termReplacesPreviousStateTerm(t, se2.sentence.terms[0])) ||
					 (se2.sentence.sign[0] != s.sign[0] &&
					  t.equalsNoBindings(se2.sentence.terms[0]) == 1))) {
					previous_s = se2;
					break;
				}
			}
		}
		if (previous_s == null) {
			this.addSentence(s, provenance, activation, time);
			return true;
		} else {
			// check if it's different from the previous:
			if (!s.equalsNoBindings(previous_s.sentence)) {
				// replace old with new, and store old:
				// "new_s" is the old, and "previous_s" is the new (this seems confusing, but it's for not having to redo the hash calculation,
				// since "previous_s" is already in the correct position where we would like the new sentence to be)
				let new_s:SentenceEntry = new SentenceEntry(previous_s.sentence, previous_s.provenance, previous_s.activation, previous_s.time)
				new_s.timeEnd = time;
				new_s.previousInTime = previous_s.previousInTime;
				this.plainPreviousSentenceList.push(new_s);
				if (this.plainPreviousSentenceList.length > MAXIMUM_MEMORY_OF_PREVIOUS_STATES) this.plainPreviousSentenceList.splice(0,1);
//				console.log("plainPreviousSentenceList.length = " + this.plainPreviousSentenceList.length + ", adding: " + s + " to replace " + previous_s.sentence);
				// we just overwrite, since it's easier (no need to modify plain list nor hash table):
				previous_s.sentence = s;
				previous_s.provenance = provenance;
				previous_s.activation = activation;
				previous_s.time = time;
				previous_s.previousInTime = new_s;
				return true;
			}
		}
		return false;
	}

	
	removeSentence(s:Sentence)
	{
//		console.log("removeSentence " + s.toString());
		var found:SentenceEntry = null;
		for(let t of s.terms) {
			var l:SentenceEntry[] = this.sentenceHash[t.functor.name];
			if (l != null) {
				if (found == null) {
					for(let idx:number = 0;idx<l.length;idx++) {
						var se2:SentenceEntry = l[idx];
						if (s.equalsNoBindings(se2.sentence)) {
							l.splice(idx,1);
							found = se2;
		//					console.log("found at idx = " + se2Idx + ", now: " + this.plainTermList.length + "," + this.plainActivationList.length);
							break;
						}
					}
				} else {
					var se2Idx:number = l.indexOf(found);
					l.splice(se2Idx,1);
				}
			}
		}
		if (found!=null) {
			var se2Idx:number = this.plainSentenceList.indexOf(found);
			this.plainSentenceList.splice(se2Idx,1);
		}
	}


	removeInternal(found:SentenceEntry)
	{
		for(let t of found.sentence.terms) {
			var l:SentenceEntry[] = this.sentenceHash[t.functor.name];
			if (l != null) {
				var se2Idx:number = l.indexOf(found);
				l.splice(se2Idx,1);
			}
		}
		var se2Idx:number = this.plainSentenceList.indexOf(found);
		this.plainSentenceList.splice(se2Idx,1);
	}


/*
	containsTerm(t:Term) : SentenceEntry
	{
		var l:SentenceEntry[] = this.sentenceHash[t.functor.name];
		if (l != null) {
			for(let se of l) {
				if (se.sentence.terms.length == 1 &&
					se.sentence.sign[0] && 
					se.sentence.terms[0].equalsNoBindings(t)) return se;
			}
		}
		return null;
	}
*/

	containsUnifyingTerm(t:Term) : SentenceEntry
	{
		var l:SentenceEntry[] = this.sentenceHash[t.functor.name];
		if (l != null) {
			for(let se of l) {
				if (se.sentence.terms.length == 1 &&
					se.sentence.sign[0]) {
					var bindings:Bindings = new Bindings();
					if (t.unify(se.sentence.terms[0], true, bindings)) return se;
				}
			}
		}
		return null;
	}


	contains(s:Sentence) : boolean
	{
		if (s.terms.length == 0) return false;
		var t:Term = s.terms[0];
		var l:SentenceEntry[] = this.sentenceHash[t.functor.name];
		if (l != null) {
			for(let se2 of l) {
				if (s.equalsNoBindings(se2.sentence)) return true;
			}
		}
		return false;
	}


	
	addSentenceIfNew(s:Sentence, provenance:string, activation:number, time:number) : boolean
	{
		if (this.contains(s)) return false;
		this.addSentence(s, provenance, activation, time);
		return true;
	}


	firstMatch(s:Sort, arity:number, o:Ontology) : Sentence
	{
		this.match_cache_l = [];
		for(let sortName in this.sentenceHash) {
			var s2:Sort = o.getSort(sortName);
			if (s2.is_a(s) || s.is_a(s2)) {
				var l:SentenceEntry[] = this.sentenceHash[sortName];
				for(let se of l) {
					var matchesArity:boolean = false;
					for(let t of se.sentence.terms) {
						if (t.functor == s2 && t.attributes.length == arity) {
							matchesArity = true;
							break;
						}
					}
					if (matchesArity && this.match_cache_l.indexOf(se)==-1) {
						this.match_cache_l.push(se);
					}
				}
			}
		}
		this.match_cache_idx = 0;
		return this.nextMatch();
	}


	nextMatch() : Sentence
	{
		if (this.match_cache_l==null) return null;
		while(this.match_cache_idx<this.match_cache_l.length) {
			var se2:SentenceEntry = this.match_cache_l[this.match_cache_idx];
			this.match_cache_idx++;
			return se2.sentence;
		}
		this.match_cache_l = null;
		this.match_cache_idx = -1;
		return null;
	}


	allMatches(s:Sort, arity:number, o:Ontology) : Sentence[]
	{
		var l:Sentence[] = [];
		var match:Sentence = this.firstMatch(s, arity, o);
		if (match == null) return l;
		while(match!=null) {
			l.push(match);
			match = this.nextMatch();
		}
		return l;
	}



	cacheMatchesWithSign(query:Term, sign:boolean, o:Ontology)
	{
		this.match_cache_l = [];
		for(let sortName in this.sentenceHash) {
			var s2:Sort = o.getSort(sortName);
			if (s2.is_a(query.functor) || query.functor.is_a(s2)) {
				var l:SentenceEntry[] = this.sentenceHash[sortName];
				for(let se of l) {
					if (se.allPotentialMatchesWithSentenceForResolution_counter == this.allPotentialMatchesWithSentenceForResolution_counter) continue;
					var matches:boolean = false;
					for(let i:number = 0;i<se.sentence.terms.length;i++) {
						var t:Term = se.sentence.terms[i];
						if (t.functor == s2 && 
							t.attributes.length == query.attributes.length && 
							se.sentence.sign[i] == sign) {
							matches = true;
							for(let j:number = 0;j<t.attributes.length;j++) {
								if (query.attributes[j] instanceof ConstantTermAttribute) {
									if (t.attributes[j] instanceof TermTermAttribute) matches = false;
									else if ((t.attributes[j] instanceof ConstantTermAttribute) &&
											 (<ConstantTermAttribute>t.attributes[j]).value != (<ConstantTermAttribute>query.attributes[j]).value) matches = false;
								}
							}
							break;
						}
					}
					if (matches && this.match_cache_l.indexOf(se)==-1) {
						this.match_cache_l.push(se);
					}
					se.allPotentialMatchesWithSentenceForResolution_counter = this.allPotentialMatchesWithSentenceForResolution_counter;
				}
			}
		}
		this.allPotentialMatchesWithSentenceForResolution_counter++;
		this.match_cache_idx = 0;
	}


	allPotentialMatchesWithSentenceForResolution(s:Sentence, o:Ontology) : Sentence[]
	{
		let potentialMatches:Sentence[] = [];
		for(let i:number = 0;i<s.terms.length;i++) {
			let query:Term = s.terms[i];
			let sign:boolean = !s.sign[i];
//			console.log("query " + query + " (" + (i+1) + " / " + s.terms.length + ")");
			for(let sortName in this.sentenceHash) {
				let s2:Sort = o.getSort(sortName);
				if (s2.is_a(query.functor) || query.functor.is_a(s2)) {
					let l:SentenceEntry[] = this.sentenceHash[sortName];
//					console.log(l.length + " sentences for " + sortName);
					for(let se of l) {
//						console.log("allPotentialMatchesWithSentenceForResolution, considering (for "+i+"/"+s.terms.length+"): " + se.sentence);
						if (se.allPotentialMatchesWithSentenceForResolution_counter == this.allPotentialMatchesWithSentenceForResolution_counter) continue;
						let matches:boolean = false;
						for(let j:number = 0;j<se.sentence.terms.length;j++) {
							let t:Term = se.sentence.terms[j];
//							console.log(t.functor.name + "/" + t.attributes.length + " vs " + query.functor.name + "/" + query.attributes.length)
							if (t.functor == s2 && 
								t.attributes.length == query.attributes.length && 
								se.sentence.sign[j] == sign) {
								matches = true;
								for(let k:number = 0;k<t.attributes.length;k++) {
									if (query.attributes[k] instanceof ConstantTermAttribute) {
										if (t.attributes[k] instanceof TermTermAttribute) {
											matches = false;
//											console.log("attribute " + k + " is a term and not a constant...");
										} else if ((t.attributes[k] instanceof ConstantTermAttribute) &&
												 (<ConstantTermAttribute>(t.attributes[k])).value != (<ConstantTermAttribute>(query.attributes[k])).value) {
											matches = false;
//											console.log("  attribute " + k + " is a different constant...");
//											console.log("    query ("+(<ConstantTermAttribute>(query.attributes[k])).value+"): " + query);
//											console.log("    t ("+(<ConstantTermAttribute>(t.attributes[k])).value+"): " + t);
										}
									}
								}
								break;
							}
						}
						if (matches) {
							if (potentialMatches.indexOf(se.sentence) == -1) potentialMatches.push(se.sentence);
						}
						se.allPotentialMatchesWithSentenceForResolution_counter = this.allPotentialMatchesWithSentenceForResolution_counter;
					}
				}
			}
			this.allPotentialMatchesWithSentenceForResolution_counter++;
		}
		return potentialMatches;
	}


	activationUpdate()
	{
		var toDelete:SentenceEntry[] = [];
		for(let idx:number = 0;idx<this.plainSentenceList.length;idx++) {
			this.plainSentenceList[idx].activation--;
			if (this.plainSentenceList[idx].activation<=0) {
				toDelete.push(this.plainSentenceList[idx]);
			}
		}
		for(let se of toDelete) {
			this.removeInternal(se);
		}
	}
	

	plainSentenceList:SentenceEntry[] = [];
	plainPreviousSentenceList:SentenceEntry[] = [];
	previousSentencesWithNoCurrentSentence:SentenceEntry[] = [];
	sentenceHash: { [functor: string] : SentenceEntry[]; } = {};

	match_cache_l:SentenceEntry[] = null;
	match_cache_idx:number = -1;

	allPotentialMatchesWithSentenceForResolution_counter:number = 0;	// used to prevent linear search, by marking which sentences have already been retrieved in this cycle
}
