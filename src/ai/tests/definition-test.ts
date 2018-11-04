var g_o:Ontology = new Ontology();
Sort.clear();
var xmlhttp:XMLHttpRequest = new XMLHttpRequest();
xmlhttp.overrideMimeType("text/xml");
xmlhttp.open("GET", "data/shrdluontology.xml", false); 
xmlhttp.send();
g_o.loadSortsFromXML(xmlhttp.responseXML.documentElement);

var g_posParser:POSParser = new POSParser(g_o);
var g_nlg:NLGenerator = new NLGenerator(g_o, g_posParser);
var g_ai:RuleBasedAI = new RuleBasedAI(g_o, null, 10, 0, DEFAULT_QUESTION_PATIENCE_TIMER);
g_ai.selfID = "etaoin";
var g_context:NLContext = g_ai.contextForSpeaker('1');

var idSort:Sort = g_o.getSort("#id");
var ceg1:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('1', g_o.getSort("#id")), 
                                              null, 0, 
                                              [Term.fromString("human('1'[#id])",g_o), 
                                               Term.fromString("name('1'[#id], 'david'[symbol])",g_o)]);
var ceg_l:NLContextEntity[] = [ceg1];
for(let ceg of ceg_l) {
	g_context.shortTermMemory.push(ceg);
	for(let t of ceg.terms) {
		g_ai.addShortTermTerm(t, "perception");
	}
}


let sortsToDefine:Sort[] = [];
for(let pos_key in g_posParser.POS) {
	for(let pos of g_posParser.POS[pos_key]) {
		if (pos.term.functor.is_a(g_o.getSort("noun"))) {
			let s:Sort = g_o.getSort(""+(<ConstantTermAttribute>(pos.term.attributes[0])).value);
			if (POSParser.sortIsConsideredForTypes(s, g_o) &&
				POSParser.sortsToConsiderForTypes.indexOf(s.name)==-1 &&
				sortsToDefine.indexOf(s) == -1) {
				sortsToDefine.push(s);
				//console.log(pos.token + " -> " + s);
			}
		}
	}
}

for(let sortToDefine of sortsToDefine) {
	// sortToDefine.parents is the set of sorts we want to use for the definition:
	var definitionAsTerm:TermAttribute = null;
	for(let i:number = 0;i<sortToDefine.parents.length;i++) {
		var parentSort:Sort = sortToDefine.parents[i];
		if (parentSort.name != "any" && parentSort.name != "abstract-entity") {
			if (POSParser.sortIsConsideredForTypes(parentSort, g_o) ||
				(parentSort.is_a(g_o.getSort("property")) && parentSort.name != "property")) {

				if (definitionAsTerm == null) {
					definitionAsTerm = new VariableTermAttribute(parentSort, null)				
				} else {
					definitionAsTerm = new TermTermAttribute(new Term(g_o.getSort("#and"),
																	  [new VariableTermAttribute(parentSort, null),
																	   definitionAsTerm]));
				}
			}
		}
	}
	if (definitionAsTerm == null) {
		console.log("    Cannot define: " + sortToDefine.name);
	} else {
		var term:Term = Term.fromString("perf.inform('1'[#id],verb.be(["+sortToDefine.name+"],"+definitionAsTerm+"))", g_o);
		var str:string = g_nlg.termToEnglish(term, g_ai.selfID, g_context);
		console.log(str);
	}
}