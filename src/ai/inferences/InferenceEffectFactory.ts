class InferenceEffectFactory {
	loadFromXML(xml:Element, ai:RuleBasedAI, o:Ontology, variables:TermAttribute[], variableNames:string[]) : InferenceEffect
	{
		if (xml.getAttribute("type") == "AnswerHow_InferenceEffect") return AnswerHow_InferenceEffect.loadFromXML(xml, ai, o, variables, variableNames);
		if (xml.getAttribute("type") == "AnswerHowMany_InferenceEffect") return AnswerHowMany_InferenceEffect.loadFromXML(xml, ai, o, variables, variableNames);
		if (xml.getAttribute("type") == "AnswerPredicate_InferenceEffect") return AnswerPredicate_InferenceEffect.loadFromXML(xml, ai, o, variables, variableNames);
		if (xml.getAttribute("type") == "AnswerQuery_InferenceEffect") return AnswerQuery_InferenceEffect.loadFromXML(xml, ai, o, variables, variableNames);
		if (xml.getAttribute("type") == "AnswerWhatIs_InferenceEffect") return AnswerWhatIs_InferenceEffect.loadFromXML(xml, ai, o, variables, variableNames);
		if (xml.getAttribute("type") == "AnswerWho_InferenceEffect") return AnswerWho_InferenceEffect.loadFromXML(xml, ai, o, variables, variableNames);
		if (xml.getAttribute("type") == "AnswerWhy_InferenceEffect") return AnswerWhy_InferenceEffect.loadFromXML(xml, ai, o, variables, variableNames);
		if (xml.getAttribute("type") == "ExecuteAction_InferenceEffect") return ExecuteAction_InferenceEffect.loadFromXML(xml, ai, o, variables, variableNames);
		if (xml.getAttribute("type") == "Memorize_InferenceEffect") return Memorize_InferenceEffect.loadFromXML(xml, ai, o, variables, variableNames);

		return null;
	}
}
