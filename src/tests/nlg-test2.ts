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
var g_posParser:POSParser = new POSParser(o);
var g_nlg:NLGenerator = new NLGenerator(o, g_posParser);
var g_ai:RuleBasedAI = new RuleBasedAI(o, g_parser, 10, 0, DEFAULT_QUESTION_PATIENCE_TIMER);
g_ai.selfID = "etaoin";
var g_ai2:RuleBasedAI = new RuleBasedAI(o, g_parser, 10, 0, DEFAULT_QUESTION_PATIENCE_TIMER);
g_ai2.selfID = "player";
var g_context:NLContext = g_ai.contextForSpeaker('player');
var g_context2:NLContext = g_ai2.contextForSpeaker('etaoin');


var successfulTests:number = 0;
var totalTests:number = 0;


function NLGTest2ParseUnifyingListener(sentence:string, s:Sort, context:NLContext, listener:string, expectedResult:Term) : boolean
{
	totalTests++;
    var parses:NLParseRecord[] = g_parser.parse(sentence, s, context, g_ai);
    if (parses == null || parses.length == 0) {
        if (expectedResult != null) {
            console.error("Sentence '" + sentence + "' could not be parsed with sort " + s.name);
            /*
            if (g_parser.error_semantic.length > 0) console.error("    semantic error!");
            if (g_parser.error_deref.length > 0) console.error("    could not deref expressions: " + g_parser.error_deref);
            if (g_parser.error_unrecognizedTokens.length > 0) console.error("    unrecognized tokens: " + g_parser.error_unrecognizedTokens);
            if (g_parser.error_grammatical) console.error("    grammatical error!");
            */
            return false;
        } else {
            console.log(sentence + "\ncorrectly has 0 parses");
            successfulTests++;
            return true;
        }
    } else {
	    var parse:NLParseRecord = g_parser.chooseHighestPriorityParse(parses);
	    var found:boolean = false;
	    let unifiedResut:Term = g_parser.unifyListener(parse.result, listener);
	    if (unifiedResut != null) {
	      parse.result = unifiedResut;
	    } else {
	      console.warn("Listener unification failed for: '"+sentence+"'");
	    }
	    if (parse.result.equalsConsideringAndList(expectedResult)) found = true;
	    if (!found) {
	        console.log(sentence + "\n" + parses.length + " parses:");
	        for(let p of parses) {
	          console.log("    parse ("+p.priorities+ " // " +p.ruleNames+ "):\n     " + p.result);
	        }
	        console.log("  highest priority parse: " + parse.result);
	        console.log("  highest priority parse ruleNames: " + parse.ruleNames);
	        console.log("  highest priority parse bindings: " + parse.bindings);
	        console.error("None of the parses of '"+sentence+"' is the expected one! " + expectedResult);
	        return false;
	    } else {
	        if (context != null) {
	            var parsePerformatives:TermAttribute[] = NLParser.elementsInList(expectedResult, "#and");
	            for(let parsePerformative of parsePerformatives) {
	                context.newPerformative(context.speaker, sentence, (<TermTermAttribute>parsePerformative).term, null, null, o, g_ai.timeStamp);
	            }
	            context.ai.timeStamp++;
	        }
	    }
	    successfulTests++;
	    return true;
	}
}


o.newSortStrings("player-character", ["character"]);
o.newSortStrings("qwerty", ["robot"]);
o.newSortStrings("shrdlu", ["robot"]);
o.newSortStrings("david", ["man","player-character"]);
o.newSortStrings("blue-key", ["key-card"]);
o.newSortStrings("white-key", ["key-card"]);
o.newSortStrings("red-key", ["key-card"]);
o.newSortStrings("green-key", ["key-card"]);
o.newSortStrings("maintenanceyellow-key", ["key-card"]);
o.newSortStrings("garagepurple-key", ["key-card"]);
o.newSortStrings("master-key", ["key-card"]);
o.newSortStrings("brokenspacesuit", ["spacesuit"]);
o.newSortStrings("microscope-table", ["microscope","table"]);
o.newSortStrings("computer-table", ["computer","table"]);
o.newSortStrings("wall-computer", ["computer","table"]);
o.newSortStrings("horizontal-door", ["door"]);
o.newSortStrings("vertical-door", ["door"]);
o.newSortStrings("batteryrecharge.facility", ["facility"]);

xmlhttp = new XMLHttpRequest();
xmlhttp.overrideMimeType("text/xml");
xmlhttp.open("GET", "data/general-kb.xml", false); 
xmlhttp.send();
g_ai.loadLongTermRulesFromXML(xmlhttp.responseXML.documentElement);

xmlhttp = new XMLHttpRequest();
xmlhttp.overrideMimeType("text/xml");
xmlhttp.open("GET", "data/general-kb.xml", false); 
xmlhttp.send();
g_ai2.loadLongTermRulesFromXML(xmlhttp.responseXML.documentElement);

// additional needed sentences:
var additionalSentences:string[] = [
	"powerplant.facility('location-powerplant'[#id])",
	"corridor('location-as1'[#id])",
	"name('location-as1'[#id], 'central corridor'[symbol])",
	"corridor('location-as2'[#id])",
	"name('location-as2'[#id], 'west corridor'[symbol])",
	"corridor('location-as3'[#id])",
	"name('location-as3'[#id], 'east corridor'[symbol])",
	"bedroom('location-as4'[#id])",
	"name('location-as4'[#id], 'bedroom 1'[symbol])",
	"bedroom('location-as5'[#id])",
	"name('location-as5'[#id], 'bedroom 2'[symbol])",
	"bedroom('location-as6'[#id])",
	"name('location-as6'[#id], 'bedroom 3'[symbol])",
	"bedroom('location-as7'[#id])",
	"name('location-as7'[#id], 'bedroom 4'[symbol])",
	"bedroom('location-as8'[#id])",
	"name('location-as8'[#id], 'bedroom 5'[symbol])",
	"bedroom('location-as9'[#id])",
	"name('location-as9'[#id], 'bedroom 6'[symbol])",
	"bedroom('location-as10'[#id])",
	"name('location-as10'[#id], 'bedroom 7'[symbol])",
	"bedroom('location-as11'[#id])",
	"name('location-as11'[#id], 'bedroom 8'[symbol])",
	"bedroom('location-as12'[#id])",
	"name('location-as12'[#id], 'bedroom 9'[symbol])",
	"bedroom('location-as13'[#id])",
	"name('location-as13'[#id], 'bedroom 10'[symbol])",
	"bedroom('location-as14'[#id])",
	"name('location-as14'[#id], 'bedroom 11'[symbol])",
	"bedroom('location-as15'[#id])",
	"name('location-as15'[#id], 'bedroom 12'[symbol])",
	"mess.hall('location-as16'[#id])",
	"kitchen('location-as17'[#id])",
	"bathroom('location-as18'[#id])",
	"name('location-as18'[#id], 'main bathroom'[symbol])",
	"bathroom('location-as19'[#id])",
	"name('location-as19'[#id], 'infirmary bathroom'[symbol])",
	"laundry.room('location-as20'[#id])",
	"gym.room('location-as21'[#id])",
	"storage.room('location-as22'[#id])",
	"name('location-as22'[#id], 'main storage'[symbol])",
	"storage.room('location-as23'[#id])",
	"name('location-as23'[#id], 'kitchen storage'[symbol])",
	"storage.room('location-as24'[#id])",
	"name('location-as24'[#id], 'medical storage'[symbol])",
	"infirmary('location-as25'[#id])",
	"stasis.room('location-as26'[#id])",
	"command.room('location-as29'[#id])",
	"lab.room('location-as27'[#id])",
	"garage('location-garage'[#id])",
	"maintenance.room('location-maintenance'[#id])",
	"name('location-maintenance'[#id], 'maintenance'[symbol])",
	"airlock('location-as31'[#id])",
	"name('location-as31'[#id], 'airlock 1'[symbol])",
	"airlock('location-as32'[#id])",
	"name('location-as32'[#id], 'airlock 2'[symbol])",
	"airlock('location-as33'[#id])",
	"name('location-as33'[#id], 'airlock 3'[symbol])",
	"airlock('location-as34'[#id])",
	"name('location-as34'[#id], 'airlock 4'[symbol])",

	"valley('spacer-valley'[#id])",
	"name('spacer-valley'[#id], 'spacer valley'[symbol])",
	"valley('spacer-valley-south'[#id])",
	"name('spacer-valley-south'[#id], 'spacer valley south'[symbol])",

	"canyon('spacer-gorge'[#id])",
	"name('spacer-gorge'[#id], 'spacer gorge'[symbol])",

	"cave('location-east-cave'[#id])",
	"name('location-east-cave'[#id], 'east cave'[symbol])",
];

for(let tmp of additionalSentences) {
	let s:Sentence = Sentence.fromString(tmp, o);
	g_ai.addLongTermRuleNow(s, LOCATIONS_PROVENANCE);
	g_ai2.addLongTermRuleNow(s, LOCATIONS_PROVENANCE);
}

/*
let performative:Term = Term.fromString("perf.inform('etaoin'[#id], height(V0:'qwerty'[#id], V1:'1.5'[meter]))", o);
let out:string = g_nlg.termToEnglish(performative, "player", null, g_context2);
console.log(out);
*/

/*
NLGTest2ParseUnifyingListener("the memory bank of shrdlu is a memory bank", o.getSort("performative"),  g_context, 'etaoin', 
		 						   new Term(o.getSort("perf.inform"),
							  		   		[new ConstantTermAttribute("etaoin", o.getSort("#id"))]));
*/

for(let sentence of g_ai.longTermMemory.plainSentenceList) {
	if (sentence.sentence.terms.length != 1) continue;
	g_context2.mentions = [];
	g_context2.performatives = [];
	let term:Term = Term.sentenceToTerm(sentence.sentence, o);
	let performative:Term = new Term(o.getSort("perf.inform"), [new ConstantTermAttribute("etaoin", o.getSort("#id")), 
																new TermTermAttribute(term)]);
	var str:string = g_nlg.termToEnglish(performative, "player", null, g_context2);
	console.log("---- " + successfulTests + "/" + totalTests + " ----");
	console.log("term: " + term.toString());
	console.log("str: " + str);
	if (str == null) {
		console.error("Could not render: " + term);
		break;
	} else if (str.indexOf("null") != -1 || str.indexOf("undefined") != -1) {
		console.error("Could not render: " + term);
		break;
	} else {
		// Now test if we can parse it:
		g_context.mentions = [];
		g_context.performatives = [];
		NLGTest2ParseUnifyingListener(str, o.getSort("performative"),  g_context, 'etaoin', 
				 						   new Term(o.getSort("perf.inform"),
									  		   		[new ConstantTermAttribute("etaoin", o.getSort("#id")),
									  		   		 new TermTermAttribute(term)]));
	}
}


console.log("results: " + successfulTests + "/" + totalTests + "/" + g_ai.longTermMemory.plainSentenceList.length);
