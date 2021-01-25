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
var g_parser:NLParser = NLParser.fromXML(xmlhttp.responseXML.documentElement, o);
var g_posParser:POSParser = g_parser.posParser;
var g_nlg:NLGenerator = new NLGenerator(o, g_posParser);
var testAI:RuleBasedAI = new RuleBasedAI(o, g_parser, 12, 0, DEFAULT_QUESTION_PATIENCE_TIMER); 
testAI.selfID = 'etaoin';
var g_context:NLContext = testAI.contextForSpeaker('player');


class TestTalk_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.talk"))) return true;
		return false;
	}

	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		this.ir = ir;
		let intention:Term = ir.action;
		let performative:Term = null;

		if (intention.attributes[1] instanceof TermTermAttribute) {
			performative = (<TermTermAttribute>(intention.attributes[1])).term;
			let txt:string = g_nlg.termToEnglish(performative, ai.selfID, null, g_context);
			txt = g_nlg.capitalize(txt);
			this.last_text = txt;		
		} else if (intention.attributes[1] instanceof ConstantTermAttribute) {
			// this is just a shortcut for the 3 laws of robotics easter egg:
			let txt:string = (<ConstantTermAttribute>intention.attributes[1]).value;
			this.last_text = txt;
		} else {
			console.error("TestTalk_IntentionAction.execute: malformed intention: " + intention.toString());
		}

		this.ir.succeeded = true;
		return true;
	}

	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"TestTalk_IntentionAction\"/>";
	}

	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new TestTalk_IntentionAction();
	}	

	last_text:string = null;
}


var textTalkHandler:TestTalk_IntentionAction = new TestTalk_IntentionAction();
testAI.intentionHandlers.push(textTalkHandler);
testAI.intentionHandlers.push(new AnswerPredicate_IntentionAction());
// testAI.intentionHandlers.push(new AnswerQuery_IntentionAction());
// testAI.intentionHandlers.push(new AnswerHowMany_IntentionAction());
// testAI.intentionHandlers.push(new AnswerWhen_IntentionAction());
// testAI.intentionHandlers.push(new AnswerHearSee_IntentionAction());
// testAI.intentionHandlers.push(new AnswerWhere_IntentionAction());


var successfulTests:number = 0;
var totalTests:number = 0;


// shortTermMemory and longTermMemory are pairs of term/time and sentence/time:
function predicate_test(intention_str:string,
						shortTermMemory:[string, number][],
						longTermMemory:[string, number][],
						timeStamp:number,
						expectedAnswer:string) : boolean
{
	totalTests++;

	// parse the intention:
	let intention:Term = Term.fromString(intention_str, testAI.o);
	testAI.timeStamp = timeStamp;
	testAI.intentions = [];
	testAI.queuedIntentions = [];
	testAI.queueIntention(intention, new ConstantTermAttribute("player", testAI.o.getSort("#id")), null);

	// clear and reconstruct the short and long term memories:
	testAI.shortTermMemory.plainTermList = [];
	testAI.shortTermMemory.plainPreviousTermList = [];
	testAI.shortTermMemory.termHash = {};
	for(let [term_str, term_time] of shortTermMemory) {
		let t:Term = Term.fromString(term_str, testAI.o);
		if (t.functor.is_a(testAI.cache_sort_stateSort)) {
			testAI.shortTermMemory.addStateTermIfNew(t, PERCEPTION_PROVENANCE, 1, term_time);
		} else {
			testAI.shortTermMemory.addTermIfNew(t, PERCEPTION_PROVENANCE, 1, term_time);
		}
		// console.log("memory: " + testAI.shortTermMemory.plainTermList.length + "-" + testAI.shortTermMemory.plainPreviousTermList.length + ", " +
		// 						 testAI.longTermMemory.plainSentenceList.length + "-" + testAI.longTermMemory.plainPreviousSentenceList.length + "-" + testAI.longTermMemory.previousSentencesWithNoCurrentSentence.length);		
	}

	testAI.longTermMemory.plainSentenceList = [];
	testAI.longTermMemory.plainPreviousSentenceList = [];
	testAI.longTermMemory.previousSentencesWithNoCurrentSentence = [];
	testAI.longTermMemory.sentenceHash = {};
	for(let [s_str, s_time] of longTermMemory) {
		let s:Sentence = Sentence.fromString(s_str, testAI.o);
		if (s.terms[0].functor.is_a(testAI.cache_sort_stateSort)) {
			testAI.longTermMemory.addStateSentenceIfNew(s, BACKGROUND_PROVENANCE, 1, s_time);
		} else {
			testAI.longTermMemory.addSentence(s, BACKGROUND_PROVENANCE, 1, s_time);
		}
		// console.log("memory: " + testAI.shortTermMemory.plainTermList.length + "-" + testAI.shortTermMemory.plainPreviousTermList.length + ", " +
		// 						 testAI.longTermMemory.plainSentenceList.length + "-" + testAI.longTermMemory.plainPreviousSentenceList.length + "-" + testAI.longTermMemory.previousSentencesWithNoCurrentSentence.length);		
	}


	// Execute until all inferences/intentinos are empty:
	textTalkHandler.last_text = "";
	while(!testAI.isIdle()) testAI.update(timeStamp);

	// Check the outcome is the expected one:
	if (textTalkHandler.last_text != expectedAnswer) {
		console.error("Answer was " + textTalkHandler.last_text + ", but expected was " + expectedAnswer + " for test: " + intention_str);
	} else {
		successfulTests ++;
	}

	return true;
}

// DEBUG_resolution = true;

predicate_test("action.answer.predicate(V0:'etaoin'[#id], 'player'[#id], #and(V:space.at(V0, 'room1'[#id]), time.present(V)))",
			   [],
			   [["space.at('etaoin'[#id], 'room2'[#id])", 500],
			    ["space.at('etaoin'[#id], 'room1'[#id])", 1000],
			    ["kitchen('room1'[#id])", 0],
			    ["disembodied-ai('etaoin'[#id])", 0],
				["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)", 0],
				["~space.at('room1'[#id], 'room2'[#id])", 0],
				["~space.at('room2'[#id], 'room1'[#id])", 0]],
			   1000,
			   "Yes");

predicate_test("action.answer.predicate(V0:'etaoin'[#id], 'player'[#id], #and(V:space.at(V0, 'room1'[#id]), time.past(V)))",
			   [],
			   [["space.at('etaoin'[#id], 'room2'[#id])", 500],
			    ["space.at('etaoin'[#id], 'room1'[#id])", 1000],
			    ["kitchen('room1'[#id])", 0],
			    ["disembodied-ai('etaoin'[#id])", 0],
				["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)", 0],
				["~space.at('room1'[#id], 'room2'[#id])", 0],
				["~space.at('room2'[#id], 'room1'[#id])", 0]],
			   1000,
			   "No");

predicate_test("action.answer.predicate(V0:'etaoin'[#id], 'player'[#id], #and(V:space.at(V0, 'room2'[#id]), time.present(V)))",
			   [],
			   [["space.at('etaoin'[#id], 'room2'[#id])", 500],
			    ["space.at('etaoin'[#id], 'room1'[#id])", 1000],
			    ["kitchen('room1'[#id])", 0],
			    ["disembodied-ai('etaoin'[#id])", 0],
				["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)", 0],
				["~space.at('room1'[#id], 'room2'[#id])", 0],
				["~space.at('room2'[#id], 'room1'[#id])", 0]],
			   1000,
			   "No");

predicate_test("action.answer.predicate(V0:'etaoin'[#id], 'player'[#id], #and(V:space.at(V0, 'room2'[#id]), time.past(V)))",
			   [],
			   [["space.at('etaoin'[#id], 'room2'[#id])", 500],
			    ["space.at('etaoin'[#id], 'room1'[#id])", 1000],
			    ["kitchen('room1'[#id])", 0],
			    ["disembodied-ai('etaoin'[#id])", 0],
				["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)", 0],
				["~space.at('room1'[#id], 'room2'[#id])", 0],
				["~space.at('room2'[#id], 'room1'[#id])", 0]],
			   1000,
			   "Yes");

predicate_test("action.answer.predicate(V0:'etaoin'[#id], 'player'[#id], #and(V:space.at(V0, X), #and(kitchen(X), time.present(V))))",
			   [],
			   [["space.at('etaoin'[#id], 'room2'[#id])", 500],
			    ["space.at('etaoin'[#id], 'room1'[#id])", 1000],
			    ["kitchen('room1'[#id])", 0],
			    ["disembodied-ai('etaoin'[#id])", 0],
				["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)", 0],
				["~space.at('room1'[#id], 'room2'[#id])", 0],
				["~space.at('room2'[#id], 'room1'[#id])", 0]],
			   1000,
			   "Yes");

predicate_test("action.answer.predicate(V0:'etaoin'[#id], 'player'[#id], #and(V:space.at(V0, X), #and(kitchen(X), time.past(V))))",
			   [],
			   [["space.at('etaoin'[#id], 'room2'[#id])", 500],
			    ["space.at('etaoin'[#id], 'room1'[#id])", 1000],
			    ["kitchen('room1'[#id])", 0],
			    ["disembodied-ai('etaoin'[#id])", 0],
				["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)", 0],
				["~space.at('room1'[#id], 'room2'[#id])", 0],
				["~space.at('room2'[#id], 'room1'[#id])", 0]],
			   1000,
			   "No");

predicate_test("action.answer.predicate(V0:'etaoin'[#id], 'player'[#id], #and(V:space.at(V0, X), #and(kitchen(X), time.past(V))))",
			   [],
			   [["space.at('etaoin'[#id], 'room4'[#id])", 0],
			    ["space.at('etaoin'[#id], 'room3'[#id])", 200],
			    ["space.at('etaoin'[#id], 'room2'[#id])", 500],
			    ["space.at('etaoin'[#id], 'room1'[#id])", 1000],
			    ["kitchen('room3'[#id])", 0],
			    ["disembodied-ai('etaoin'[#id])", 0],
				["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)", 0],
				["~space.at('room1'[#id], 'room2'[#id])", 0],
				["~space.at('room2'[#id], 'room1'[#id])", 0]],
			   1000,
			   "Yes");

predicate_test("action.answer.predicate(V0:'etaoin'[#id], 'player'[#id], kitchen('room3'[#id]))",
			   [],
			   [["~kitchen('room3'[#id])", 0],
			    ["disembodied-ai('etaoin'[#id])", 0],
				["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)", 0],
				["~space.at('room1'[#id], 'room2'[#id])", 0],
				["~space.at('room2'[#id], 'room1'[#id])", 0]],
			   1000,
			   "No");


console.log(successfulTests + "/" + totalTests + " successtul parses");
