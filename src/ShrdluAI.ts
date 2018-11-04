class ShrdluAI extends RobotAI {
	constructor(o:Ontology, nlp:NLParser, shrdlu:A4AICharacter, game:A4Game,
				rulesFileNames:string[])
	{
		super(o, nlp, shrdlu, game, rulesFileNames);
		console.log("ShrdluAI.constructor end...");
		this.robot.ID = "shrdlu";
		this.selfID = "shrdlu";

		this.addLongTermTerm(Term.fromString("name('"+this.robot.ID+"'[#id],'shrdlu'[symbol])", this.o), BACKGROUND_PROVENANCE);
		console.log("ShrdluAI.constructor end...");
	}
}
