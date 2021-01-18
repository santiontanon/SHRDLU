class AnswerDefine_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.define"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		this.ir = ir;		
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;

		if (intention.attributes.length == 2 &&
			(intention.attributes[0] instanceof ConstantTermAttribute) &&
			((intention.attributes[1] instanceof VariableTermAttribute) ||
			 (intention.attributes[1] instanceof ConstantTermAttribute)) &&
			(<ConstantTermAttribute>(intention.attributes[0])).value == ai.selfID) {
			let sortToDefine:Sort = intention.attributes[1].sort;
			let definitionAsTerm:TermAttribute = null;

			if (sortToDefine.name == "three-laws-of-robotics") {
				// easeter egg!
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], '1. A robot may not injure a human being or, through inaction, allow a human being to come to harm.'[symbol])", ai.o);
				ai.intentions.push(new IntentionRecord(term, requester, null, null, ai.timeStamp));
				term = Term.fromString("action.talk('"+ai.selfID+"'[#id], '2. A robot must obey the orders given it by human beings except where such orders would conflict with the First Law.'[symbol])", ai.o);
				ai.intentions.push(new IntentionRecord(term, requester, null, null, ai.timeStamp));
				term = Term.fromString("action.talk('"+ai.selfID+"'[#id], '3. A robot must protect its own existence as long as such protection does not conflict with the First or Second Laws.'[symbol])", ai.o);
				ai.intentions.push(new IntentionRecord(term, requester, null, null, ai.timeStamp));
				ir.succeeded = true;
				return true;
			}

			for(let i:number = 0;i<sortToDefine.parents.length;i++) {
				let parentSort:Sort = sortToDefine.parents[i];
				if (parentSort.name != "any" && parentSort.name != "abstract-entity") {
					if (POSParser.sortIsConsideredForTypes(parentSort, ai.o) ||
						(parentSort.is_a(ai.o.getSort("property")) && parentSort.name != "property")) {
						if (definitionAsTerm == null) {
							definitionAsTerm = new VariableTermAttribute(parentSort, null)				
						} else {
							definitionAsTerm = new TermTermAttribute(new Term(ai.o.getSort("#and"),
																			  [new VariableTermAttribute(parentSort, null),
																			   definitionAsTerm]));
						}
					}
				}
			}
			if (definitionAsTerm == null) {
				// console.log("Cannot define: " + sortToDefine.name);
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+", 'verb.define'[symbol]))", ai.o);
					ai.intentions.push(new IntentionRecord(term, requester, null, null, ai.timeStamp));
				}
				ir.succeeded = false;
			} else {
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+",verb.be(["+sortToDefine.name+"],"+definitionAsTerm+")))", ai.o);
					ai.intentions.push(new IntentionRecord(term, requester, null, null, ai.timeStamp));
				}
				ir.succeeded = true;
			}
		} else {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, requester, null, null, ai.timeStamp));
			}
			ir.succeeded = false;
		}
		
		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"AnswerDefine_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new AnswerDefine_IntentionAction();
	}

}
