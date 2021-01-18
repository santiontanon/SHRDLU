class Call_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.call")) &&
			intention.attributes.length == 3) return true;
		if (intention.functor.name == "#not" &&
			(intention.attributes[0] instanceof TermTermAttribute) &&
			(<TermTermAttribute>intention.attributes[0]).term.functor.is_a(ai.o.getSort("verb.call")) &&
			(<TermTermAttribute>intention.attributes[0]).term.attributes.length == 3) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		this.ir = ir;		
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;

		// execute the memorize action:
		console.log(ai.selfID + " call: " + intention);	

		if (intention.functor.name == "#not") {
			intention = (<TermTermAttribute>intention.attributes[0]).term;

			// ask about the name of the character:
			let question:Term = Term.fromString("perf.q.query("+requester+", X, name("+intention.attributes[1]+",X))", ai.o);
			let action:Term = new Term(ai.o.getSort("action.talk"),
									   [intention.attributes[0], // this is "self"
									    new TermTermAttribute(question)]);
			ai.intentions.push(new IntentionRecord(action, null, null, null, ai.timeStamp));
			ir.succeeded = true;
		} else if (intention.attributes[2] instanceof ConstantTermAttribute) {
			// see if we were waiting for an answer to this question:
			if (requester instanceof ConstantTermAttribute) {
				let context:NLContext = ai.contextForSpeakerWithoutCreatingANewOne((<ConstantTermAttribute>requester).value);
				let pattern1:Term = Term.fromString("perf.q.query("+requester+", X, name("+intention.attributes[1]+",X))", ai.o);
				let pattern2:Term = Term.fromString("perf.q.predicate("+requester+", verb.know($PLAYER,#and(#query(Y), name($PLAYER,Y))))", ai.o);
				for(let i:number = 0;i<context.expectingAnswerToQuestion_stack.length;i++) {
					let q:NLContextPerformative = context.expectingAnswerToQuestion_stack[i];
					if (q.performative.unify(pattern1, OCCURS_CHECK, new Bindings()) ||
						q.performative.unify(pattern2, OCCURS_CHECK, new Bindings())) {
						// pop it from the stack:
						context.expectingAnswerToQuestion_stack.splice(i,1);
						context.expectingAnswerToQuestionTimeStamp_stack.splice(i,1);
						break;
					}
				}
			}

			let fact:Term = Term.fromString("name(" + intention.attributes[1] + ", " + intention.attributes[2] + ")", ai.o);
			let action:Term = new Term(ai.o.getSort("action.memorize"),
									   [intention.attributes[0], // this is "self"
									    ir.requester,
									    new TermTermAttribute(fact)]);
			ai.intentions.push(new IntentionRecord(action, null, null, null, ai.timeStamp));
			ir.succeeded = true;
		} else {
			// ???
		}

		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"Call_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new Call_IntentionAction();
	}
}

