class A4IntentionActionFactory extends IntentionActionFactory {
	loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{	
		if (xml.getAttribute("type") == "A4AnswerHow_IntentionAction") return A4AnswerHow_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "A4AnswerWhere_IntentionAction") return AnswerWhere_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "EtaoinHelp_IntentionAction") return EtaoinHelp_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "EtaoinClose_IntentionAction") return EtaoinClose_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "EtaoinOpen_IntentionAction") return EtaoinOpen_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "EtaoinSwitchOff_IntentionAction") return EtaoinSwitchOff_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "EtaoinSwitchOn_IntentionAction") return EtaoinSwitchOn_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "EtaoinTalk_IntentionAction") return EtaoinTalk_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "EtaoinConnectTo_IntentionAction") return EtaoinConnectTo_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "Etaoin3DPrint_IntentionAction") return Etaoin3DPrint_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotFollow_IntentionAction") return RobotFollow_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotGive_IntentionAction") return RobotGive_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotGo_IntentionAction") return RobotGo_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotOpenClose_IntentionAction") return RobotOpenClose_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotStop_IntentionAction") return RobotStop_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotTake_IntentionAction") return RobotTake_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotTakeTo_IntentionAction") return RobotTakeTo_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotPutIn_IntentionAction") return RobotPutIn_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotTalk_IntentionAction") return RobotTalk_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotHelp_IntentionAction") return RobotHelp_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotPushPull_IntentionAction") return RobotPushPull_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotEnter_IntentionAction") return RobotEnter_IntentionAction.loadFromXML(xml, ai);
		if (xml.getAttribute("type") == "RobotExit_IntentionAction") return RobotExit_IntentionAction.loadFromXML(xml, ai);

		return super.loadFromXML(xml, ai);
	}
}
