class ShrdluAI extends RobotAI {
	constructor(o:Ontology, nlp:NLParser, shrdlu:A4AICharacter, game:A4Game,
				rulesFileNames:string[])
	{
		super(o, nlp, shrdlu, game, rulesFileNames);
		console.log("ShrdluAI.constructor end...");
		this.robot.ID = "shrdlu";
		this.selfID = "shrdlu";
		this.visionActive = false;

		this.addLongTermTerm(Term.fromString("name('"+this.robot.ID+"'[#id],'shrdlu'[symbol])", this.o), BACKGROUND_PROVENANCE);
		
		this.objectsNotAllowedToGive.push("master-key2");

		console.log("ShrdluAI.constructor end...");
	}
}
