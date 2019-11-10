var o:Ontology = new Ontology();
Sort.clear();
var xmlhttp:XMLHttpRequest = new XMLHttpRequest();
xmlhttp.overrideMimeType("text/xml");
xmlhttp.open("GET", "data/shrdluontology.xml", false);
xmlhttp.send();
o.loadSortsFromXML(xmlhttp.responseXML.documentElement);

var g_posParser:POSParser = new POSParser(o);
var g_nlg:NLGenerator = new NLGenerator(o, g_posParser);
var g_ai:RuleBasedAI = new RuleBasedAI(o, null, 10, 0, DEFAULT_QUESTION_PATIENCE_TIMER);
g_ai.selfID = "etaoin";
var g_context:NLContext = g_ai.contextForSpeaker('david');

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
	"name('location-as26'[#id], 'stasis pod room'[symbol])",
	"command.room('location-as29'[#id])",
	"lab.room('location-as27'[#id])",
	"name('location-as29'[#id], 'command center'[symbol])",
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
}


for(let sentence of g_ai.longTermMemory.plainSentenceList) {
	if (sentence.sentence.terms.length == 1) continue;
	let term:Term = Term.sentenceToTerm(sentence.sentence, o);
	let performative:Term = new Term(o.getSort("perf.inform"), [new ConstantTermAttribute("david", o.getSort("#id")), 
																new TermTermAttribute(term)]);
	var str:string = g_nlg.termToEnglish(performative, "etaoin", new ConstantTermAttribute("david", o.getSort("#id")), g_context);
	console.log("----");
	console.log("term: " + term.toString());
	console.log("str: " + str);
	if (str == null) console.error("Could not render: " + term);
}

