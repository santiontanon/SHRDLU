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
		for(let i:number = 0; i<this.predicates.length; i++) {
			if (this.predicates[i].sign) {
				str += this.predicates[i].term + ", ";
			} else {
				str += "~" + this.predicates[i].term + ", ";
			}
		}
		return str + "]";
	}


	predicates:PlanningPredicate[] = [];	
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


	checkState(state:PlanningState) : PlanningPredicate[][]
	{
		let missing_disjunction:PlanningPredicate[][] = [];
		for(let conjunction of this.predicates) {
			let missing:PlanningPredicate[] = [];
			for(let predicate of conjunction) {
				let match:boolean = false;
				for(let predicate2 of state.predicates) {
					if (predicate.unify(predicate2, true, new Bindings())) {
						match = true;
						break;
					}
				}
				if (!match) missing.push(predicate);
			}
			missing_disjunction.push(missing);
			if (missing.length == 0) return missing_disjunction;
		}
		return missing_disjunction;
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


class PlanningAction {

	constructor(a_o:PlanningOperator, a_b:Bindings)
	{
		this.operator = a_o;
		this.bindings = a_b;
	}


	toString() : string
	{
		let instantiated:Term = this.operator.signature.applyBindings(this.bindings);
		return instantiated.toString();
	}


	operator:PlanningOperator;
	bindings:Bindings;
}


class PlanningPlan {

	toString() : string
	{
		let str:string = "";
		for(let action of this.actions) {
			str += action.toString() + "\n";
		}

		return str;
	}


	actions:PlanningAction[] = [];
	causalLinks:[number,number,PlanningPredicate][] = [];
}


class PlanningBackwardSearchPlanner {

	constructor(a_o:PlanningOperator[]) {
		this.operators = a_o;
	}


	plan(s0:PlanningState, goal:PlanningCondition) : PlanningPlan
	{
		let targets:PlanningPredicate[][] = goal.checkState(s0);
		console.log("targets: " + targets);
		// check if we are done:
		for(let target of targets) {
			if (target.length == 0) {
				// we are done!
				// ...
				return null;
			}
		}

		//let relevantAndConsistentActions:PlanningAction[] = [];
		//for(let operator of this.operators) {
			// get relevant and consistent actions for each predicate in each target:
			// ...
		//}

		return null;
	}


	operators:PlanningOperator[];
}
