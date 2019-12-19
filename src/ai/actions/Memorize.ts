class Memorize_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.memorize"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;

		// execute the memorize action:
		console.log(ai.selfID + " memorize: " + intention.attributes[2]);	
		// we add the sentence with positive sign, to see if it introduces a contradiction
		let s_l:Sentence[] = Term.termToSentences((<TermTermAttribute>(intention.attributes[2])).term, ai.o);
		console.log("term to sentences (#sentences = " + s_l.length + "): " + s_l);	
		let variablesPresent:boolean = false;
		let timeModifierPresent:boolean = false;

		// 1) see if it has variables AND is more than one sentence:
		let negated_s_l:Sentence[] = [];
		for(let s of s_l) {
			if (s.getAllVariables().length > 0) variablesPresent = true;
			for(let t of s.terms) {
				if (t.functor.is_a(ai.o.getSort("time.past"))) timeModifierPresent = true;
				if (t.functor.is_a(ai.o.getSort("time.future"))) timeModifierPresent = true;
			}
		}

		if (timeModifierPresent) {
			console.log("time modifiers present, not memorizing for now...");
			let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))";
			let term:Term = Term.fromString(tmp, ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			return true;			
		}

		// check for the special case where the player is stating that they "know/remember" something, so we follow up
		// asking about it:
		if (variablesPresent && s_l[0].terms.length == 1 && s_l[0].sign[0]) {
			let term:Term = s_l[0].terms[0];
			if (term.functor.is_a(ai.o.getSort("verb.know")) &&
				term.attributes.length == 2 &&
				term.attributes[0] instanceof ConstantTermAttribute &&
				term.attributes[1] instanceof TermTermAttribute &&
				requester instanceof ConstantTermAttribute) {
				let term2:Term = (<TermTermAttribute>term.attributes[1]).term;
				if ((<ConstantTermAttribute>term.attributes[0]).value == (<ConstantTermAttribute>requester).value &&
					term2.functor.is_a(ai.o.getSort("property-with-value")) &&
					term2.attributes.length == 2 &&
					term2.attributes[0] instanceof ConstantTermAttribute &&
					term2.attributes[1] instanceof VariableTermAttribute) {
					// ask the requester about it, no need to memorize this yet:
					let queryTerm:Term = new Term(ai.o.getSort("perf.q.query"),
												  [requester, term2.attributes[1], term.attributes[1]]);
					let actionTerm:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], "+queryTerm+")", ai.o);
					ai.intentions.push(new IntentionRecord(actionTerm, null, null, null, ai.time_in_seconds));
					return true;
				}
			}
		}

		if (s_l.length > 1 && variablesPresent) {
			// this is the complicated case, we can just launch an inference process to see if we need to memorize or we already knew
			console.log("executeIntention memorize: sentence of length > 1 with variables, this is a complex case, we need to try to negate the sentences: " + s_l);
			let negated_s:Sentence = new Sentence([],[]);
			for(let s of s_l) {
				if (s.getAllVariables().length > 0) variablesPresent = true;
				for(let t of s.terms) {
					if (t.functor.is_a(ai.o.getSort("time.past"))) timeModifierPresent = true;
					if (t.functor.is_a(ai.o.getSort("time.future"))) timeModifierPresent = true;
				}
				let tmp:Sentence[] = s.negate();
				if (tmp == null || tmp.length != 1) {
					console.error("executeIntention memorize: cannot negate sentences in intention!: " + intention);		
					let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.unsure("+requester+"))";
					let term:Term = Term.fromString(tmp, ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					return true;
				}
				negated_s.terms = negated_s.terms.concat(tmp[0].terms);
				negated_s.sign = negated_s.sign.concat(tmp[0].sign);
			}
			negated_s_l = [negated_s];
			ai.inferenceProcesses.push(new InferenceRecord(ai, [], [negated_s_l], 1, 0, false, null, new Memorize_InferenceEffect(intention, true), ai.o));
		} else {
			if (s_l.length == 1 && s_l[0].terms.length == 1) {
				// Check for the special case, where the player is just correcting a wrong statement she stated in the past:
				let negatedToMemorize:Sentence = new Sentence(s_l[0].terms, [!s_l[0].sign[0]]);
				let se:SentenceEntry = ai.longTermMemory.findSentenceEntry(negatedToMemorize)
				if (se != null && se.provenance == MEMORIZE_PROVENANCE) {
					console.log("Correcting a wrong statement she stated in the past! checking if this would cause a contradiction");
					// We can safely remove the "negatedToMemorize" sentence, since, if the new one causes a contradiction, it means it was already
					// implied by the KB, so it wasn't needed. But if it does not, then we had to remove it anyway:
					ai.longTermMemory.removeSentence(negatedToMemorize);
				}
			}
			console.log("executeIntention memorize: sentence list of length 1, easy case: " + s_l);
			ai.inferenceProcesses.push(new InferenceRecord(ai, [], [s_l], 1, 0, false, null, new Memorize_InferenceEffect(intention, false), ai.o));
		}


		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"Memorize_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new Memorize_IntentionAction();
	}
}
