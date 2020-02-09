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


var operators:PlanningOperator[] = [];


operators.push(PlanningOperator.fromString(
	"action.take(X:[#id], Y:[#id])", 
	["empty('shrdlu-arm'[#id])", "space.directly.on.top.of(X, Y)", "top-clear-status(X, 'clear-status-clear'[clear-status-clear])",
	 "~table(Y)"], 
	["verb.hold('shrdlu'[#id], X)", "top-clear-status(Y, 'clear-status-clear'[clear-status-clear])", "~top-clear-status(X, 'clear-status-clear'[clear-status-clear])", "~space.directly.on.top.of(X, Y)", "~empty('shrdlu-arm'[#id])"], o));
operators.push(PlanningOperator.fromString(
	"action.take(X:[#id], Y:[#id])", 
	["empty('shrdlu-arm'[#id])", "space.inside.of(X, Y)", "top-clear-status(X, 'clear-status-clear'[clear-status-clear])"], 
	["verb.hold('shrdlu'[#id], X)", "top-clear-status(Y, 'clear-status-clear'[clear-status-clear])", "~top-clear-status(X, 'clear-status-clear'[clear-status-clear])", "~space.inside.of(X, Y)", "~empty('shrdlu-arm'[#id])"], o));
operators.push(PlanningOperator.fromString(
	"action.take(X:[#id], Y:'table'[#id])", 
	["empty('shrdlu-arm'[#id])", "space.directly.on.top.of(X, Y)", "top-clear-status(X, 'clear-status-clear'[clear-status-clear])"], 
	["verb.hold('shrdlu'[#id], X)", "~top-clear-status(X, 'clear-status-clear'[clear-status-clear])", "~space.directly.on.top.of(X, Y)", "~empty('shrdlu-arm'[#id])"], o));
operators.push(PlanningOperator.fromString(
	"action.put-in(X:[#id], Y:[#id])", 
	["verb.hold('shrdlu'[#id], X)", "object(Y)", "top-clear-status(Y, 'clear-status-clear'[clear-status-clear])",
	 "~box(Y)", "~pyramid(Y)", "~arm(Y)",], 
	["space.directly.on.top.of(X, Y)", "empty('shrdlu-arm'[#id])", "top-clear-status(X, 'clear-status-clear'[clear-status-clear])", "~verb.hold('shrdlu'[#id], X)", "~top-clear-status(Y, 'clear-status-clear'[clear-status-clear])"], o));
operators.push(PlanningOperator.fromString(
	"action.put-in(X:[#id], Y:[#id])", 
	["verb.hold('shrdlu'[#id], X)", "box(Y)", "top-clear-status(Y, 'clear-status-clear'[clear-status-clear])"], 
	["space.inside.of(X, Y)", "empty('shrdlu-arm'[#id])", "top-clear-status(X, 'clear-status-clear'[clear-status-clear])", "~verb.hold('shrdlu'[#id], X)", "~top-clear-status(Y, 'clear-status-clear'[clear-status-clear])"], o));
operators.push(PlanningOperator.fromString(
	"action.put-in(X:[#id], Y:'table'[#id])", 
	["verb.hold('shrdlu'[#id], X)"], 
	["space.directly.on.top.of(X, Y)", "empty('shrdlu-arm'[#id])", "top-clear-status(X, 'clear-status-clear'[clear-status-clear])", "~verb.hold('shrdlu'[#id], X)"], o));

/*
operators.push(PlanningOperator.fromString("action.take(X:[#id], Y:[#id])", ["~verb.hold('shrdlu'[#id], X2)", "space.directly.on.top.of(X, Y)","~space.directly.on.top.of(Z1:[#id], X)","~space.inside.of(Z2:[#id], X)"], ["verb.hold('shrdlu'[#id], X)", "~space.directly.on.top.of(X, Y)"], o));
operators.push(PlanningOperator.fromString("action.take(X:[#id], Y:[#id])", ["~verb.hold('shrdlu'[#id], X2)", "space.inside.of(X, Y)","~space.directly.on.top.of(Z1:[#id], X)","~space.inside.of(Z2:[#id], X)"], ["verb.hold('shrdlu'[#id], X)", "~space.inside.of(X, Y)"], o));
operators.push(PlanningOperator.fromString("action.put-in(X:[#id], Y:[#id])", ["verb.hold('shrdlu'[#id], X)", "~verb.hold('shrdlu'[#id], Y)", "object(Y)", "~box(Y)", "~pyramid(Y)", "~arm(Y)", "~space.directly.on.top.of(Z, Y)"], ["space.directly.on.top.of(X, Y)", "~verb.hold('shrdlu'[#id], X)"], o));
operators.push(PlanningOperator.fromString("action.put-in(X:[#id], Y:[#id])", ["verb.hold('shrdlu'[#id], X)", "~verb.hold('shrdlu'[#id], Y)", "box(Y)", "~space.inside.of(Z, Y)"], ["space.inside.of(X, Y)", "~verb.hold('shrdlu'[#id], X)"], o));
operators.push(PlanningOperator.fromString("action.put-in(X:[#id], Y:'table'[#id])", ["verb.hold('shrdlu'[#id], X)"], ["space.directly.on.top.of(X, Y)", "~verb.hold('shrdlu'[#id], X)"], o));
*/

for(let operator of operators) {
	console.log(operator.toString());
}

//var planner:PlanningPlanner = new PlanningForwardSearchPlanner(operators, false);
//var planner:PlanningPlanner = new PlanningBackwardSearchPlanner(operators, false);
var planner:PlanningPlanner = new GraphPlanPlanner(operators, false);

Sort.precomputeIsA();

function planningTest(init:PlanningState, planner:PlanningPlanner, goal_str:string, expected_length:number) : boolean
{
	let goal:PlanningCondition = PlanningCondition.fromString(goal_str, o);

	console.log("--------------------------------");
	console.log("Initial State:");
	console.log(initial_state.toString());
	console.log("Goal:");
	console.log(goal.toString());

	let plan:PlanningPlan = planner.plan(initial_state, goal, 8);

	if (plan == null) {
		console.log("Plan: null");
		if (expected_length != null) {
			console.error("No plan found, where a plan of length " + expected_length + " was expected!");
			return false;
		}
		return true;
	} else {
		if (plan.actions.length == expected_length) {
			console.log("Plan:")
			console.log(plan.toString())
			return true;
		}
		console.error("The plan found has length " + plan.actions.length + ", but " + expected_length + " was expected!");
		console.error("Plan:")
		console.error(plan.toString())
		return false;
	}
}


// 1) Get the world state as a planning state:
testAI.attentionAndPerception();
var initial_state:PlanningState = testAI.getWorldStateForPlanning();

// 2) Define a set of sample goals:
// have empty hand: -
planningTest(initial_state, planner, "~verb.hold('shrdlu'[#id], X:[#id])", 0);

// take small pyramid: TAKE
planningTest(initial_state, planner, "verb.hold('shrdlu'[#id], 'pyramid-9'[#id])", 1);

// small pyramid on the table: TAKE - PUT
planningTest(initial_state, planner, "space.directly.on.top.of('pyramid-9'[#id],'table'[#id])", 2);

// red pyramid on small block
planningTest(initial_state, planner, "space.directly.on.top.of('pyramid-10'[#id],'cube-4'[#id])", 4);

// anything on blue block
planningTest(initial_state, planner, "space.directly.on.top.of(X:[#id],'block-5'[#id])", 2);

// small pyramid on small block, on blue block
planningTest(initial_state, planner, "space.directly.on.top.of('pyramid-9'[#id],'cube-4'[#id]), space.directly.on.top.of('cube-4'[#id],'block-5'[#id])", 6);

// something impossible
planningTest(initial_state, planner, "space.directly.on.top.of('table'[#id],'pyramid-9'[#id])", null);

// blue pyramid on the table, and on it's place the small block/pyramid combo
planningTest(initial_state, planner, "space.directly.on.top.of('pyramid-11'[#id],'table'[#id]), space.directly.on.top.of('pyramid-9'[#id],'cube-4'[#id]), space.inside.of('cube-4'[#id],'box-8'[#id])", 8);


// - WILL YOU PLEASE STACK UP BOTH OF THE RED BLOCKS AND EITHER A GREEN CUBE OR A PYRAMID?
// ...

// - A "STEEPLE" IS A STACK WHICH CONTAINS TWO GREEN CUBES AND A PYRAMID. BUILD ONE.
// ...

// 3) Plan for them:
// ...