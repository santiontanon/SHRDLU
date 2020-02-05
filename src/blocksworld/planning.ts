class PlanningPredicate {

	constructor(t:Term, s:boolean)
	{
		this.term = t;
		this.sign = s;
	}


	unify(p:PlanningPredicate, occursCheck:boolean, bindings:Bindings) : boolean
	{
		if (this.sign != p.sign) return false;
		return this.term.unify(p.term, occursCheck, bindings);
	}

	applyBindings(b:Bindings) : PlanningPredicate
	{
		return new PlanningPredicate(this.term.applyBindings(b), this.sign);
	}


	static fromString(str:string, o:Ontology) : PlanningPredicate
	{
		return PlanningPredicate.fromStringInternal(str, o, [], []);
	}


	static fromStringInternal(str:string, o:Ontology, variableNames:string[], variableValues:TermAttribute[]) : PlanningPredicate
	{
		let sign:boolean = true;
		if (str[0] == '~') {
			sign = false;
			str = str.substring(1);
		}
		return new PlanningPredicate(Term.fromStringInternal(str, o, variableNames, variableValues).term, sign);
	}	


	toString() : string
	{
		if (this.sign) {
			return this.term.toString();
		} else {
			return "~" + this.term.toString();
		}
	}


	term:Term;
	sign:boolean;
}



class PlanningState {

	toString() : string
	{
		let str:string = "[ ";
		for(let i:number = 0; i<this.terms.length; i++) {
			str += this.terms[i] + ", ";
		}
		return str + "]";
	}


	satisfies(p:PlanningPredicate, occursCheck:boolean) : boolean
	{
		let match:boolean = false;
		for(let t of this.terms) {
			if (p.term.subsumes(t, occursCheck, new Bindings())) {
				match = true;
				break;
			}
		}

		if (p.sign) {
			return match;
		} else {
			return !match;
		}
	}


	terms:Term[] = [];	
}


class PlanningCondition {
	
	toString() : string
	{
		let variables:TermAttribute[] = [];
		let variableNames:string[] = [];
		let str:string = "";
		let first_disjunction:boolean = true;
		for(let i:number = 0;i<this.predicates.length;i++) {
			let first_conjunction:boolean = true;
			if (first_disjunction) {
				first_disjunction = false;
			} else {
				str += "; ";				
			}
			for(let j:number = 0;j<this.predicates[i].length;j++) {
				let p:PlanningPredicate = this.predicates[i][j];
				if (first_conjunction) {
					if (!p.sign) str += "~";
					str += p.term.toStringInternal(variables, variableNames);
					first_conjunction = false;
				} else {
					str += ", ";
					if (!p.sign) str += "~";
					str += p.term.toStringInternal(variables, variableNames);
				}
			}
		}
		return str;
	}


	checkState(state:PlanningState, occursCheck:boolean) : boolean
	{
		for(let conjunction of this.predicates) {
			let missing:boolean = false;
			for(let predicate of conjunction) {
				let match:boolean = false;
				for(let term of state.terms) {
					if (predicate.term.unify(term, occursCheck, new Bindings())) {
						match = true;
						break;
					}
				}
				if (predicate.sign != match) {
					missing = true;
					break;
				}
			}
			if (!missing) return true;
		}
		return false;
	}


	checkStateDetailed(state:PlanningState, occursCheck:boolean) : [PlanningPredicate[],PlanningPredicate[]][]
	{
		let goalStateMatch:[PlanningPredicate[],PlanningPredicate[]][] = []
		for(let conjunction of this.predicates) {
			let missing:PlanningPredicate[] = [];
			let alreadySatisfied:PlanningPredicate[] = [];
			for(let predicate of conjunction) {
				let match:boolean = false;
				for(let term of state.terms) {
					if (predicate.term.unify(term, occursCheck, new Bindings())) {
						match = true;
						break;
					}
				}
				if (predicate.sign) {
					if (match) {
						alreadySatisfied.push(predicate);
					} else {
						missing.push(predicate);
					}
				} else {
					if (match) {
						missing.push(predicate);
					} else {
						alreadySatisfied.push(predicate);
					}
				}
			}
			goalStateMatch.push([missing,alreadySatisfied]);
			if (missing.length == 0) return goalStateMatch;
		}
		return goalStateMatch;
	}


	static fromString(str:string, o:Ontology) : PlanningCondition
	{
		return PlanningCondition.fromStringInternal(str, o, [], []);
	}


	static fromStringInternal(str:string, o:Ontology, variableNames:string[], variableValues:TermAttribute[]) : PlanningCondition
	{
		let tokens:string[] = [];
		let token:string = "";
		let c:string;
		let state:number = 0;	// 0: no token character yet, 1: inside a token
        let parenthesis:number = 0;
        let squareBrackets:number = 0;
        let quotation:boolean = false;

		// separate the string in tokens:
		// each token can be: semicolon, colon, ~, or a term
		for(let i:number = 0;i<str.length;i++) {
			c = str.charAt(i);
			if (c==';' || c==',' || c=='~') {
				if (state == 0) {
					tokens.push(c);
					token = "";
				} else if (state == 1) {
					if (parenthesis == 0 && squareBrackets ==0 && !quotation) {
						// end of token!
						tokens.push(token.trim());
						tokens.push(c);
						token = "";
						state = 0;
					} else {
						token += c;
					}		
				}
			} else if (c==' ' || c=='\t' || c=='\n' || c=='\r') {

				if (state == 0) {
					// ignore
				} else if (state == 1) {
					if (quotation) {
						token += c;
					} else if (parenthesis == 0 && squareBrackets ==0 && !quotation) {
						// end of token!
						tokens.push(token.trim());
//						console.log("token: " + token);
						token = "";
						state = 0;
					} 			
				}
			} else {
                if (c == "\'") quotation = !quotation;
                if (!quotation) { 
                    if (c == '(') parenthesis++;
                    if (c == ')') parenthesis--;
                    if (c == '[') squareBrackets++;
                    if (c == ']') squareBrackets--;
                }
				token += c;
				state = 1;
			}
		}
		if (state==1) {
			if (parenthesis == 0 && squareBrackets ==0 && !quotation) {
				tokens.push(token.trim());
				//console.log("token: " + token);
			} else {
				console.error("Sentence.fromString: unfinished sentence! " + str);
				return null;
			}
		}

//		for(let t of tokens) {
//			console.log("token: " + t);
//		}

		// check that the sequence is correct: term [[~]term [; [~]term]*]
		let s:PlanningCondition = new PlanningCondition();
		let conjunction:PlanningPredicate[] = [];
		let sign:boolean = true;
		state = 0;
		for(let i:number = 0;i<tokens.length;i++) {
			if (state == 0) {
				if (tokens[i] == "~") {
					sign = false;
					state = 1;
					continue;
				}
			}
			if (state == 0 || state == 1) {
				if (tokens[i] == "~") {
					console.error("Sentence.fromString: two negations in a row!!");
					return null;
				}
				if (tokens[i] == ";") {
					console.error("Sentence.fromString: semicolon found too early!");
					return null;
				}

		        let ta:TermTermAttribute = Term.fromStringInternal(tokens[i], o, variableNames, variableValues);
		        if (ta == null) {
		            console.error("Error parsing sentence: " + str);
		            return null;
		        }
				let t:Term = ta.term; 
				if (t == null) return null;
				conjunction.push(new PlanningPredicate(t, sign));
				state = 2;
				sign = true;
				continue;
			}
			if (state == 2) {
				if (tokens[i] == ',') {
				} else if (tokens[i] == ';') {
					s.predicates.push(conjunction);
					conjunction = [];
				} else {
					console.error("Sentence.fromString: expected semicolon or colon after term and found: " + tokens[i]);
					return null;
				}
				state = 0;
			}

		}

		if (conjunction.length > 0) {
			s.predicates.push(conjunction);
		}

		return s;
	}


	// disjunction of conjunctions:
	predicates:PlanningPredicate[][] = [];

}


class PlanningOperator {

	constructor(a_s:Term, a_p:PlanningPredicate[], a_e:PlanningPredicate[])
	{
		this.signature = a_s;
		this.precondition = a_p;
		this.effect = a_e;
	}	


	instantiate(b:Bindings) : PlanningOperator
	{
		let op:PlanningOperator = new PlanningOperator(this.signature.applyBindings(b), [], []);
		for(let precondition of this.precondition) {
			op.precondition.push(precondition.applyBindings(b));
		}
		for(let effect of this.effect) {
			op.effect.push(effect.applyBindings(b));
		}
		return op;
	}


	applyOperator(state:PlanningState, occursCheck:boolean) : PlanningState
	{
		let state2:PlanningState = new PlanningState();

		for(let term of state.terms) {
			let toDelete:boolean = false;
			for(let effect of this.effect) {
				if (effect.sign) continue;
				if (term.unify(effect.term, occursCheck, new Bindings())) {
					toDelete = true;
				}
			}
			if (!toDelete) state2.terms.push(term);
		}
		for(let effect of this.effect) {
			if (!effect.sign) continue;
			state2.terms.push(effect.term);
		}

		return state2;
	}


	toString() : string
	{
		return this.signature.toString() + "\n\tprecondition: " + 
			   this.precondition + "\n\teffect: " + 
			   this.effect;
	}


	static fromString(signature_str:string, precondition_str_l:string[], effect_str_l:string[], o:Ontology) : PlanningOperator
	{
		let variableNames:string[] = [];
		let variableValues:TermAttribute[] = [];
		let operator:PlanningOperator = new PlanningOperator(Term.fromStringInternal(signature_str, o, variableNames, variableValues).term,
															 [], []);
		for(let add_str of precondition_str_l) {
			operator.precondition.push(PlanningPredicate.fromStringInternal(add_str, o, variableNames, variableValues));
		}
		for(let delete_str of effect_str_l) {
			operator.effect.push(PlanningPredicate.fromStringInternal(delete_str, o, variableNames, variableValues));
		}

		return operator;
	}


	signature:Term;
	precondition:PlanningPredicate[];
	effect:PlanningPredicate[]
}


class PlanningPlan {

	toString() : string
	{
		let str:string = "";
		for(let action of this.actions) {
			str += action.signature.toString() + "\n";
		}

		return str;
	}


	autoCausalLinks(s0:PlanningState, occursCheck:boolean)
	{
		this.causalLinks = [];

		for(let i:number = 0;i<this.actions.length;i++) {
			for(let precondition of this.actions[i].precondition) {
				let satisfiedOn:number = null;
				let s:PlanningState = s0;
				if (s.satisfies(precondition, occursCheck)) {
					satisfiedOn = -1;
				}
				for(let j:number = 0;j<i;j++) {
					s = this.actions[j].applyOperator(s, occursCheck);
					if (s.satisfies(precondition, occursCheck)) {
						if (satisfiedOn == null) satisfiedOn = j;
					} else {
						satisfiedOn = null;
					}
				}
				if (satisfiedOn == null) {
					console.error("autoCausalLinks: Precondition never satisfied in a plan!");
				} else {
					if (satisfiedOn >= 0) {
						this.causalLinks.push([satisfiedOn, i, precondition]);
						// console.log("  CL: " + satisfiedOn + " -> " + i + " (" + precondition.toString() + ")");
					}
				}
			}
		}
	}


	actions:PlanningOperator[] = [];
	causalLinks:[number,number,PlanningPredicate][] = [];
}


class PlanningForwardSearchPlanner {
	constructor(a_o:PlanningOperator[], occursCheck:boolean) {
		this.operators = a_o;
		this.occursCheck = occursCheck;
	}


	plan(s0:PlanningState, goal:PlanningCondition) : PlanningPlan
	{
		let maxDepth:number = 8;
		let plan:PlanningPlan = new PlanningPlan();
		// iterative deepening:
		for(let depth:number = 1;depth<=maxDepth;depth++) {
			if (this.DEBUG >= 1) console.log("- plan -------- max depth: " + depth + " - ");
			if (this.planInternal(s0, goal, plan, depth)) {
				plan.autoCausalLinks(s0, this.occursCheck);
				return plan;
			}
		}
		return null;
	}


	planInternal(s0:PlanningState, goal:PlanningCondition, plan:PlanningPlan, maxDepth:number) : boolean
	{
		if (this.DEBUG >= 1) {
			console.log("- planInternal -------- depth left: " + maxDepth + " - ");
			if (this.DEBUG >= 2) {
				console.log("State:");
				console.log(s0.toString());
			}
		}
	
		// check if we are done:
		if (goal.checkState(s0, this.occursCheck)) return true;
		if (maxDepth <= 0) return false;

		// obtain candidate actions:
		let children:[PlanningOperator,PlanningState][] = [];
		for(let operator of this.operators) {
			this.generateChildren(operator, s0, 0, children);
		}
		if (this.DEBUG >= 1) {
			for(let tmp of children) {
				console.log("    candidate action: " + tmp[0].signature.toString());
			}
		}

		// search:
		for(let [action,s_next] of children) {
			plan.actions.push(action)
			if (this.DEBUG >= 1) console.log("Executing action: " + action.signature.toString());
			if (this.planInternal(s_next, goal, plan, maxDepth-1)) return true;
			plan.actions.pop();
		}

		return false;
	}


	generateChildren(operator:PlanningOperator, state:PlanningState, 
					 nextPrecondition:number, children:[PlanningOperator,PlanningState][])
	{
		if (nextPrecondition >= operator.precondition.length) {
			// make sure the negated preconditions are also satisfied:
			for(let precondition of operator.precondition) {
				if (precondition.sign) continue;
				for(let term of state.terms) {
					if (precondition.term.unify(term, this.occursCheck, new Bindings())) {
						// console.log("        Action " + operator.signature.toString() + " removed as precondition " + precondition.toString() + " is not satisfied");
						return;
					}
				}
			}
			// apply the operator:
			let newState:PlanningState = operator.applyOperator(state, this.occursCheck);
			if (newState != null) children.push([operator, newState]);
		}  else {
			let precondition:PlanningPredicate = operator.precondition[nextPrecondition];
			if (precondition.sign) {
				for(let term of state.terms) {
					let b:Bindings = new Bindings();
					if (precondition.term.subsumes(term, this.occursCheck, b)) {
						let newOperator:PlanningOperator = operator.instantiate(b);
						// console.log("        -> precondition: " + precondition.term.toString() + " satisfied");
						this.generateChildren(newOperator, state, nextPrecondition+1, children);
					}
				}
			} else {
				this.generateChildren(operator, state, nextPrecondition+1, children);
			}
		}
	}

	DEBUG:number = 0;
	occursCheck:boolean = false;
	operators:PlanningOperator[];	
}

