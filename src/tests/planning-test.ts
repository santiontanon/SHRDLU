var o:Ontology = new Ontology();
Sort.clear();

var xmlhttp:XMLHttpRequest = new XMLHttpRequest();
xmlhttp.overrideMimeType("text/xml");
xmlhttp.open("GET", "data/shrdluontology.xml", false); 
xmlhttp.send();
o.loadSortsFromXML(xmlhttp.responseXML.documentElement);

xmlhttp = new XMLHttpRequest();
xmlhttp.overrideMimeType("text/xml");
xmlhttp.open("GET", "data/nlpatternrules.xml", false); 
xmlhttp.send();

var parser:NLParser = NLParser.fromXML(xmlhttp.responseXML.documentElement, o);
var posParser:POSParser = parser.posParser;
var nlg = new NLGenerator(o, posParser);

var world = new ShrdluBlocksWorld();
var testAI:BlocksWorldRuleBasedAI = new BlocksWorldRuleBasedAI(o, parser, nlg, world, null, 1, 0, DEFAULT_QUESTION_PATIENCE_TIMER, ["data/blocksworld-kb.xml"]); 
testAI.selfID = 'shrdlu';

// 1) Get the world state as a planning state:
testAI.attentionAndPerception();
var initial_state:PlanningState = testAI.getWorldStateForPlanning();



let operators:PlanningOperator[] = [];

operators.push(PlanningOperator.fromString("action.take(X:[#id], Y:[#id])", "~space.directly.on.top.of(Z:[#id], X)", ["verb.hold('shrdlu':[#id], X)"], ["space.directly.on.top.of(X, Y)"], o));
operators.push(PlanningOperator.fromString("action.put-in(X:[#id], Y:[#id])", "verb.hold('shrdlu':[#id], X), object(Y), ~pyramid(Y)", ["space.directly.on.top.of(X, Y)"], ["verb.hold('shrdlu':[#id], X)"], o));



function planningTest(init:PlanningState, operators:PlanningOperator[], goal_str:string) : boolean
{
	let goal:PlanningCondition = PlanningCondition.fromString(goal_str, o);

	console.log("--------------------------------");
	console.log("Initial State:");
	console.log(initial_state.toString());
	console.log("Goal:");
	console.log(goal.toString());
	for(let operator of operators) {
		console.log(operator.toString());
	}

	return true;
}

// 2) Define a set of sample goals:
// small pyramid on the table: TAKE - PUT
planningTest(initial_state, operators, "space.directly.on.top.of('block-9'[#id],'table'[#id])");

// red pyramid on small block
planningTest(initial_state, operators, "space.directly.on.top.of('block-10'[#id],'block-4'[#id])");


// - WILL YOU PLEASE STACK UP BOTH OF THE RED BLOCKS AND EITHER A GREEN CUBE OR A PYRAMID?
// ...

// - A "STEEPLE" IS A STACK WHICH CONTAINS TWO GREEN CUBES AND A PYRAMID. BUILD ONE.
// ...

// 3) Plan for them:
// ...