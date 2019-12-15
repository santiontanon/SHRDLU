class BWInferenceEffectFactory extends InferenceEffectFactory {
	loadFromXML(xml:Element, ai:RuleBasedAI, o:Ontology, variables:TermAttribute[], variableNames:string[]) : InferenceEffect
	{
		if (xml.getAttribute("type") == "BWAnswerWhere_InferenceEffect") return BWAnswerWhere_InferenceEffect.loadFromXML(xml, ai, o, variables, variableNames);

		return super.loadFromXML(xml, ai, o, variables, variableNames);
	}
}
