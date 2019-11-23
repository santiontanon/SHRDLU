class TermEntry {
	constructor(t:Term, p:string, a:number, time:number)
	{
		this.term = t;
		this.provenance = p;
		this.activation = a;
		this.time = time;
	}

	term:Term;
	provenance:string;
	activation:number;
	time:number;
}


class TermContainer {
	addTerm(t:Term, provenance:string, activation:number, time:number)
	{
//		console.log("addTerm " + t.toString() + " - " + a);
		
		var te:TermEntry = new TermEntry(t, provenance, activation, time);
		this.plainTermList.push(te);
		var l:TermEntry[] = this.termHash[t.functor.name];
		if (l == null) {
			l = [];
			this.termHash[t.functor.name] = l;
		}
		l.push(te);
	}


	static termReplacesPreviousStateTerm(t1:Term, t2:Term) : boolean
	{
		return t1.functor == t2.functor &&
			   (t1.attributes[0] instanceof ConstantTermAttribute) &&
			   (t2.attributes[0] instanceof ConstantTermAttribute) &&
			   (<ConstantTermAttribute>(t1.attributes[0])).value == (<ConstantTermAttribute>(t2.attributes[0])).value;
	}


	addStateTermIfNew(t:Term, provenance:string, activation:number, time:number) : boolean
	{
		// check if we need to replace some term:
		var l:TermEntry[] = this.termHash[t.functor.name];
		var previous_t:TermEntry = null;
		if (l != null) {
			for(let te2 of l) {
				if (TermContainer.termReplacesPreviousStateTerm(t, te2.term)) previous_t = te2;
			}
		}
		if (previous_t == null) {
			this.addTerm(t, provenance, activation, time);
			return true;
		} else {
			// check if it's different from the previous:
			if (t.equalsNoBindings(previous_t.term) != 1) {
				// replace olf with new, and store old:
				this.plainPreviousTermList.push(new TermEntry(previous_t.term, previous_t.provenance, previous_t.activation, previous_t.time));
				if (this.plainPreviousTermList.length > MAXIMUM_MEMORY_OF_PREVIOUS_STATES) this.plainPreviousTermList.splice(0,1);
				// we just overwrite, since it's easier (no need to modify plain list nor hash table):
				previous_t.term = t;
				previous_t.provenance = provenance;
				previous_t.activation = activation;
				previous_t.time = time;
				return true;
			} else {
				if (previous_t.activation < activation) {
					previous_t.activation = activation;
					previous_t.provenance = provenance;
					// time is not updated
				}				
			}
		}
		return false;
	}

	
	removeTerm(t:Term)
	{
//		console.log("removeTerm " + t.toString());
		var l:TermEntry[] = this.termHash[t.functor.name];
		if (l != null) {
			for(let idx:number = 0;idx<l.length;idx++) {
				var te2:TermEntry = l[idx];
				if (t.equalsNoBindings(te2.term) == 1) {
					l.splice(idx,1);
					var t2Idx:number = this.plainTermList.indexOf(te2);
					this.plainTermList.splice(t2Idx,1);
//					console.log("found at idx = " + t2Idx + ", now: " + this.plainTermList.length + "," + this.plainActivationList.length);
					return;
				}
			}
		}
	}


	removeInternal(found:TermEntry)
	{
		var l:TermEntry[] = this.termHash[found.term.functor.name];
		if (l != null) {
			var te2Idx:number = l.indexOf(found);
			l.splice(te2Idx,1);
		}
		var te2Idx:number = this.plainTermList.indexOf(found);
		this.plainTermList.splice(te2Idx,1);
	}	
	

	contains(t:Term) : TermEntry
	{
		var l:TermEntry[] = this.termHash[t.functor.name];
		if (l != null) {
			for(let te2 of l) {
				if (t.equalsNoBindings(te2.term) == 1) return te2;
			}
		}		
		return null;
	}


	addTermIfNew(t:Term, provenance:string, activation:number, time:number) : boolean
	{
		var te:TermEntry = this.contains(t);
		if (te != null) {
			if (te.activation < activation) {
				te.activation = activation;
				te.provenance = provenance;
				// time is not updated
			}
			return false;
		}
		this.addTerm(t, provenance, activation, time);
		return true;
	}


	firstMatch(t:Term) : [Term, Bindings]
	{
		this.match_cache_term = t;
		this.match_cache_l = [];
		for(let sname in this.termHash) {
			var tel:TermEntry[] = this.termHash[sname];
			if (tel.length>0 &&
				(tel[0].term.functor.is_a(t.functor) ||
				 t.functor.is_a(tel[0].term.functor))) {
				this.match_cache_l = this.match_cache_l.concat(tel);		
			}
		}
		this.match_cache_idx = 0;
		return this.nextMatch();
	}


	nextMatch() : [Term, Bindings]
	{
		if (this.match_cache_l==null) return null;
		while(this.match_cache_idx<this.match_cache_l.length) {
			var te2:TermEntry = this.match_cache_l[this.match_cache_idx];
			this.match_cache_idx++;
			var bindings:Bindings = new Bindings();
//			console.log("nextMatch, unifying " + this.match_cache_term + " with " + te2.term);
			if (this.match_cache_term.unify(te2.term, OCCURS_CHECK, bindings)) {
				return [te2.term,bindings];
			}
//			console.log("failed!");
		}
		this.match_cache_term = null;
		this.match_cache_l = null;
		this.match_cache_idx = -1;
		return null;
	}


	allMatches(t:Term) : [Term, Bindings][]
	{
		var l:[Term, Bindings][] = [];
		var match:[Term, Bindings] = this.firstMatch(t);
		if (match == null) return l;
		while(match!=null) {
			l.push(match);
			match = this.nextMatch();
		}
		return l;
	}


/*
	// Returns a list of the terms in this container that can potentially be relevant
	// for unifying with any of the terms in the sentence "s"
	termsRelevantForResolutionWithSentence(s:Sentence) : Term[]
	{
		var l:Term[] = [];

		for(let sName in this.termHash) {
			var l2:Term[] = this.termHash[sName];
			if (l2 == null || l2.length == 0) continue;
			var sort:Sort = l2[0].functor;
			var include:boolean = false;
			for(let t of s.terms) {
				if (sort.subsumes(t.functor) ||
					t.functor.subsumes(sort)) {
					include = true;
					break;
				}
			}
			if (include) {
				l = l.concat(l2);
			}
		}

		return l;
	}
	*/


	activationUpdate()
	{
		let toDelete:TermEntry[] = [];
		for(let te of this.plainTermList) {
			te.activation--;
			if (te.activation <= 0) {
				toDelete.push(te);
			}
		}
		for(let te of toDelete) {
			this.removeInternal(te);
		}
	}


	plainTermList:TermEntry[] = [];
	plainPreviousTermList:TermEntry[] = [];
	termHash: { [functor: string] : TermEntry[]; } = {};

	match_cache_term:Term = null;
	match_cache_l:TermEntry[] = null;
	match_cache_idx:number = -1;
}
