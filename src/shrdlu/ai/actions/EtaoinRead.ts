class EtaoinRead_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if ((intention.functor.is_a(ai.o.getSort("verb.analyze")) ||
			 intention.functor.is_a(ai.o.getSort("verb.examine")) ||
			 intention.functor.is_a(ai.o.getSort("verb.read"))) &&
			intention.attributes.length >= 2) {
			let targetID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
			if (targetID == "tardis-memory-core") {
				return true;
			} else {
				return false;
			}
		}
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		this.ir = ir;		
		let ai:EtaoinAI = <EtaoinAI>ai_raw;	
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;
		let targetID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;

		console.log(ai.selfID + " read: " + intention);	

		let item_tmp:A4Object = ai.game.findObjectByIDJustObject(targetID);
		if (item_tmp != null && (item_tmp instanceof A4Item)) {
			if (targetID == "tardis-memory-core") {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", action.put-in("+requester+", '"+targetID+"'[#id], [console])))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
				ir.succeeded = true;
			} else {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
				ir.succeeded = false;
			}
		} else if (item_tmp == null) {
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			ir.succeeded = false;
		} else {
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			ir.succeeded = false;
		}

		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"EtaoinRead_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new EtaoinRead_IntentionAction();
	}
}

