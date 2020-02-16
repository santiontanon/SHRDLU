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

Sort.precomputeIsA();

testAI.attentionAndPerception();


//var operators:PlanningOperator[] = ShrdluBlocksWorld.getPlanningOperators(o, "forward");
//var planner:PlanningPlanner = new PlanningForwardSearchPlanner(operators, false);
//var initial_state:PlanningState = testAI.getWorldStateForPlanning("forward");

//var operators:PlanningOperator[] = ShrdluBlocksWorld.getPlanningOperators(o, "graphplan");
//var planner:PlanningPlanner = new GraphPlanPlanner(operators, false);
//var initial_state:PlanningState = testAI.getWorldStateForPlanning("graphplan");

var initial_state:PlanningState = null;
var planner:BWPlanner = new BWPlanner(world, o);

//for(let operator of operators) {
//	console.log(operator.toString());
//}



//function planningTest(init:PlanningState, planner:PlanningPlanner, goal_str:string, expected_length:number) : boolean
function planningTest(init:PlanningState, planner:BWPlanner, goal_str:string, expected_length:number) : boolean
{
	let goal:PlanningCondition = PlanningCondition.fromString(goal_str, o);

	console.log("--------------------------------");
	//console.log("Initial State:");
	//console.log(init.toString());
	console.log("Goal:");
	console.log(goal.toString());

	//let plan:PlanningPlan = planner.plan(init, goal, 8);
	let plan:PlanningPlan = planner.plan(goal, 8);

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



// Define a set of sample goals:
// have empty hand: -
planningTest(initial_state, planner, "~verb.hold('shrdlu'[#id], X:[#id])", 0);

// take small pyramid: TAKE
planningTest(initial_state, planner, "verb.hold('shrdlu'[#id], 'pyramid-9'[#id])", 1);

// small pyramid on the table: TAKE - PUT
planningTest(initial_state, planner, "space.directly.on.top.of('pyramid-9'[#id],'table'[#id])", 2);

// red pyramid on small block
planningTest(initial_state, planner, "space.directly.on.top.of('pyramid-10'[#id],'cube-4'[#id])", 4);

// take the box
planningTest(initial_state, planner, "verb.hold('shrdlu'[#id], 'box-8'[#id])", 3);

// anything on blue block
planningTest(initial_state, planner, "space.directly.on.top.of(X:[#id],'block-5'[#id])", 2);

// small pyramid on small block, on blue block
planningTest(initial_state, planner, "space.directly.on.top.of('pyramid-9'[#id],'cube-4'[#id]), space.directly.on.top.of('cube-4'[#id],'block-5'[#id])", 6);

// blue pyramid on the box
planningTest(initial_state, planner, "space.inside.of('pyramid-11'[#id],'box-8'[#id])", 0);

// small pyramid on the box
planningTest(initial_state, planner, "space.inside.of('pyramid-9'[#id],'box-8'[#id])", 4);

// any pyramid on the table:
planningTest(initial_state, planner, "space.directly.on.top.of(X:[#id],'table'[#id]), pyramid(X)", 2);

// anything small on the box:
planningTest(initial_state, planner, "space.inside.of(X:[#id],'box-8'[#id]), small(X)", 4);

// anything green on the box:
planningTest(initial_state, planner, "space.inside.of(X:[#id],'box-8'[#id]), color(X, 'green'[green])", 4);

// anything rectangular on the box:
planningTest(initial_state, planner, "space.inside.of(X:[#id],'box-8'[#id]), shape(X, 'rectangular'[rectangular])", 4);

// green and red pyramids in the box:
planningTest(initial_state, planner, "space.inside.of('pyramid-9'[#id],'box-8'[#id]), space.inside.of('pyramid-10'[#id],'box-8'[#id])", 6);

// something impossible
planningTest(initial_state, planner, "space.directly.on.top.of('table'[#id],'pyramid-9'[#id])", null);

// blue and red pyramids in the box (impossible)
planningTest(initial_state, planner, "space.inside.of('pyramid-11'[#id],'box-8'[#id]), space.inside.of('pyramid-10'[#id],'box-8'[#id])", null);

// blue pyramid on the table, and on it's place the small block/pyramid combo
planningTest(initial_state, planner, "space.directly.on.top.of('pyramid-11'[#id],'table'[#id]), space.directly.on.top.of('pyramid-9'[#id],'cube-4'[#id]), space.inside.of('cube-4'[#id],'box-8'[#id])", 8);


// - WILL YOU PLEASE STACK UP BOTH OF THE RED BLOCKS AND EITHER A GREEN CUBE OR A PYRAMID?
// ...

// - A "STEEPLE" IS A STACK WHICH CONTAINS TWO GREEN CUBES AND A PYRAMID. BUILD ONE.
// ...

// 3) Plan for them:
// ...