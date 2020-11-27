var ARM_MOVE_SPEED:number = 0.5;

class BWStack_IntentionAction extends IntentionAction {

	constructor()
	{
		super();
		this.needsContinuousExecution = true;
	}

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.stack"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:BlocksWorldRuleBasedAI = <BlocksWorldRuleBasedAI>ai_raw;
		let requester:TermAttribute = ir.requester;

		// This is just a dummy action, it should never be executed (it only exists so that SHRDLU knows that it can 
		// plan for this action)

		let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
		ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
		return true;		
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		let str = "<IntentionAction type=\"BWStack_IntentionAction\"";
		return str + "/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		let a:BWStack_IntentionAction = new BWStack_IntentionAction();
		return a;
	}
}
