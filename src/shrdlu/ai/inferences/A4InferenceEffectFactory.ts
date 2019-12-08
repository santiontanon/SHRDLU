class A4InferenceEffectFactory extends InferenceEffectFactory {
	loadFromXML(xml:Element, ai:RuleBasedAI, o:Ontology, variables:TermAttribute[], variableNames:string[]) : InferenceEffect
	{
		if (xml.getAttribute("type") == "AnswerHowGoto_InferenceEffect") return AnswerHowGoto_InferenceEffect.loadFromXML(xml, ai, o, variables, variableNames);
		if (xml.getAttribute("type") == "AnswerWhere_InferenceEffect") return AnswerWhere_InferenceEffect.loadFromXML(xml, ai, o, variables, variableNames);

		return super.loadFromXML(xml, ai, o, variables, variableNames);
	}
}
