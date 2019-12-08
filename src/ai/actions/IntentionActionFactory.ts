class IntentionActionFactory {
	loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		if (xml.getAttribute("type") == "AnswerDefine_IntentionAction") return AnswerDefine_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "AnswerHearSee_IntentionAction") return AnswerHearSee_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "AnswerHow_IntentionAction") return AnswerHow_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "AnswerHowMany_IntentionAction") return AnswerHowMany_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "AnswerPredicate_IntentionAction") return AnswerPredicate_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "AnswerQuery_IntentionAction") return AnswerQuery_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "AnswerWhatIs_IntentionAction") return AnswerWhatIs_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "AnswerWhen_IntentionAction") return AnswerWhen_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "AnswerWhoIs_IntentionAction") return AnswerWhoIs_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "AnswerWhy_IntentionAction") return AnswerWhy_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "Call_IntentionAction") return Call_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "Memorize_IntentionAction") return Memorize_IntentionAction.loadFromXML(xml, ai);
		return null;
	}
}