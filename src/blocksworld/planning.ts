
class PlanningState {

	toString() : string
	{
		let str:string = "[ ";
		for(let i:number = 0; i<this.sign.length; i++) {
			if (this.sign[i]) {
				str += this.predicates[i] + ", ";
			} else {
				str += "~" + this.predicates[i] + ", ";
			}
		}
		return str + "]";
	}


	sign:boolean[] = [];
	predicates:Term[] = [];	
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
				let t:Term = this.predicates[i][j];
				if (first_conjunction) {
					if (!this.sign[i][j]) str += "~";
					str += t.toStringInternal(variables, variableNames);
					first_conjunction = false;
				} else {
					str += ", ";
					if (!this.sign[i][j]) str += "~";
					str += t.toStringInternal(variables, variableNames);
				}
			}
		}
		return str;
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
		let conjunction_terms:Term[] = [];
		let conjunction_sign:boolean[] = [];
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
				conjunction_terms.push(t);
				conjunction_sign.push(sign);
				state = 2;
				sign = true;
				continue;
			}
			if (state == 2) {
				if (tokens[i] == ',') {
				} else if (tokens[i] == ';') {
					s.predicates.push(conjunction_terms);
					s.sign.push(conjunction_sign);
					conjunction_terms = [];
					conjunction_sign = [];
				} else {
					console.error("Sentence.fromString: expected semicolon or colon after term and found: " + tokens[i]);
					return null;
				}
				state = 0;
			}

		}

		if (conjunction_terms.length > 0) {
			s.predicates.push(conjunction_terms);
			s.sign.push(conjunction_sign);
		}

		return s;
	}


	// disjunction of conjunctions:
	sign:boolean[][] = [];	// whether each predicate is positive or negated
	predicates:Term[][] = [];
}


class PlanningOperator {

	constructor(a_s:Term, a_p:PlanningCondition, a_a:Term[], a_d:Term[])
	{
		this.signature = a_s;
		this.precondition = a_p;
		this.add = a_a;
		this.delete = a_d;
	}	


	toString() : string
	{
		return this.signature.toString() + "\n\tprecondition: " + 
			   this.precondition.toString() + "\n\tadd: " + 
			   this.add + "\n\tdelete: " +
			   this.delete;
	}


	static fromString(signature_str:string, precondition_str:string, add_str_l:string[], delete_str_l:string[], o:Ontology) : PlanningOperator
	{
		let variableNames:string[] = [];
		let variableValues:TermAttribute[] = [];
		let operator:PlanningOperator = new PlanningOperator(Term.fromStringInternal(signature_str, o, variableNames, variableValues).term, 
															 PlanningCondition.fromStringInternal(precondition_str, o, variableNames, variableValues),
															 [], []);
		for(let add_str of add_str_l) {
			operator.add.push(Term.fromStringInternal(add_str, o, variableNames, variableValues).term);
		}
		for(let delete_str of delete_str_l) {
			operator.delete.push(Term.fromStringInternal(delete_str, o, variableNames, variableValues).term);
		}

		return operator;
	}


	signature:Term;
	precondition:PlanningCondition;
	add:Term[];
	delete:Term[];
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
	causalLinks:[number,number,Term][] = [];
}


class PlanningBackwardSearchPlanner {

	constructor(a_o:PlanningOperator[]) {
		this.operators = a_o;
	}


	plan(s0:PlanningState, goal:PlanningCondition) : PlanningPlan
	{
		// ...

		return null;
	}


	operators:PlanningOperator[];
}
