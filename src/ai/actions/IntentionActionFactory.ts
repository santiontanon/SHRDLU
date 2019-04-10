class IntentionActionFactory {
	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		if (xml.getAttribute("type") == "AnswerDefine_IntentionAction") return AnswerDefine_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "AnswerHearSee_IntentionAction") return AnswerHearSee_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "AnswerHow_IntentionAction") return AnswerHow_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "AnswerHowMany_IntentionAction") return AnswerHowMany_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "AnswerPredicate_IntentionAction") return AnswerPredicate_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "AnswerQuery_IntentionAction") return AnswerQuery_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "AnswerWhatIs_IntentionAction") return AnswerWhatIs_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "AnswerWhen_IntentionAction") return AnswerWhen_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "AnswerWhere_IntentionAction") return AnswerWhere_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "AnswerWhoIs_IntentionAction") return AnswerWhoIs_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "AnswerWhy_IntentionAction") return AnswerWhy_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "Call_IntentionAction") return Call_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "Help_IntentionAction") return Help_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "EtaoinClose_IntentionAction") return EtaoinClose_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "EtaoinOpen_IntentionAction") return EtaoinOpen_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "EtaoinSwitchOff_IntentionAction") return EtaoinSwitchOff_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "EtaoinSwitchOn_IntentionAction") return EtaoinSwitchOn_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "EtaoinTalk_IntentionAction") return EtaoinTalk_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "EtaoinConnectTo_IntentionAction") return EtaoinConnectTo_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "Memorize_IntentionAction") return Memorize_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotFollow_IntentionAction") return RobotFollow_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotGive_IntentionAction") return RobotGive_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotGo_IntentionAction") return RobotGo_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotOpenClose_IntentionAction") return RobotOpenClose_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotStop_IntentionAction") return RobotStop_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotTake_IntentionAction") return RobotTake_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotTakeTo_IntentionAction") return RobotTakeTo_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotPutIn_IntentionAction") return RobotPutIn_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotTalk_IntentionAction") return RobotTalk_IntentionAction.loadFromXML(xml, ai);

		return null;
	}
}
