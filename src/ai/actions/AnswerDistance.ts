class AnswerDistance_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.answer.distance"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;

		let o1ID:string = null;
		let o2ID:string = null;
		let units:Sort = ai.o.getSort("meter");

		if (intention.attributes.length>=4) {
			if (intention.attributes[2] instanceof ConstantTermAttribute) {
				o1ID = (<ConstantTermAttribute>intention.attributes[2]).value;
			}
			if (intention.attributes[3] instanceof ConstantTermAttribute) {
				o2ID = (<ConstantTermAttribute>intention.attributes[3]).value;
			}
		}
		if (intention.attributes.length>=5) units = intention.attributes[4].sort;

		if (o1ID == null || o2ID == null) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+intention.attributes[1]+",'unknown'[symbol]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, intention.attributes[1], null, null, ai.time_in_seconds));
			}
			return true;
		}

		let d:number = ai.distanceBetweenIds(o1ID, o2ID);
		if (d != null) {
			let d2:number = null;
			d2 = this.convertToUnits(d, units);
			if (d2 != null) {
				d = d2;
			} else {
				units = ai.o.getSort("meter");
			}
			if (requester != null) {
				// we know the answer already without inference!
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+intention.attributes[1]+",'"+d+"'["+units.name+"]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			return true;
		}

		// launch an inference process:
		// ...

		if (requester != null) {
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+intention.attributes[1]+",'unknown'[symbol]))", ai.o);
			ai.intentions.push(new IntentionRecord(term, intention.attributes[1], null, null, ai.time_in_seconds));
		}
		
		return true;
	}


	convertToUnits(meters:number, unit:Sort) : number
	{
		/*
    <sort name="milimeter" super="distance.unit,length.unit"/>
    <sort name="meter" super="distance.unit,length.unit"/>
    <sort name="kilometer" super="distance.unit,length.unit"/>
    <sort name="light-year" super="distance.unit,length.unit"/>
		*/
		if (unit.name == "milimiter") return meters*1000;
		if (unit.name == "meter") return meters;
		if (unit.name == "kilometer") return meters/1000;
		if (unit.name == "light-year") return meters/9.461E15;
		return null;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"AnswerDistance_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new AnswerDistance_IntentionAction();
	}
}
