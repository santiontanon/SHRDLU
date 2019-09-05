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

var testAI:RuleBasedAI = new RuleBasedAI(o, parser, 12, 0, DEFAULT_QUESTION_PATIENCE_TIMER); 

var term_unification_l:[string,string,boolean][] = [
                                        ["actionverb([character])",
                                         "actionverb([character])", 
                                         true],
                                        ["actionverb([character])",
                                         "actionverb([character],[any])",
                                          false],
                                        ["actionverb([character])",
                                         "action.talk([character])",
                                         true],
                                        ["performative([character])",
                                         "actionverb([character])",
                                         false],
                                        ["actionverb('1'[number])",
                                         "actionverb('2'[number])", 
                                         false],
                                        ["actionverb('1'[number])",
                                         "actionverb('1'[actionverb])", 
                                         false],
                                        ["actionverb('1'[number])",
                                         "actionverb([number])", 
                                         true],
                                        ["actionverb(action.talk([number]))",
                                         "actionverb(action.talk([number]))", 
                                         true],
                                        ["actionverb(action.talk([number]))",
                                         "actionverb(action.take([number]))", 
                                         false],
                                        ["actionverb([number])",
                                         "actionverb('2'[number])", 
                                         true],
                                        ["actionverb([number])",
                                         "actionverb([actionverb])", 
                                         false],
                                        ["actionverb(X:[number],X)",
                                         "actionverb('1'[number],'1'[number])", 
                                         true],
                                        ["actionverb(X:[number],X)",
                                         "actionverb('1'[number],'2'[number])", 
                                         false],
                                        ["actionverb(X:[any],any(X))",
                                         "actionverb(any(Y:[any]),Y)", 
                                         false],
                                        ["actionverb([character],[any])",
                                         "action.talk('david'[character],perf.greet(Z:[any]))",
                                         true],
                                        ["action.talk(T:[number], X:[character], perf.greet('self'[character]))",
                                         "action.talk('615'[number], 'david'[character], 'hello':[symbol])",
                                         false],
                                        ["action.talk(T:[number], X:[character], perf.greet('self'[character]))",
                                         "action.talk('615'[number], 'david'[character], perf.greet(X:[character]))",
                                         true],
                                        ["action.talk(T:[number], X:[character], perf.greet('self'[character]))",
                                         "action.talk('615'[number], 'David'[character], perf.greet('chair'[object]))",
                                         false],
//                                        ["action.talk(T:[number])",
//                                         "action.talk('615'[any])",
//                                         true]        // This test does not work, but I'm unsure if should!
                                    ];



/*
var sentence_text_l:string[] = ["~action.talk(T:[number], X:[character], perf.greet(Y:'self'[character])) ; intention(action.talk(Y, perf.greet(X)))"];
for(let str of sentence_text_l) {
    var s:Sentence = Sentence.fromString(str, o);
    console.log("parsed sentence:\n" + s);
}
*/


/*
console.log("-------------------------");
var term1_text:string = "#and(V0:#and(V1:#not(V2:=(V:[any], V4:'etaoin'[#id])), V5:#and(V6:#not(V7:=(V, V8:'david'[#id])), V9:character(V))), V10:space.at(V, V11:'location-aurora-station'[#id]))";
var parsed_term1:Term = Term.fromString(term1_text, o);
var sentences_from_term1:Sentence[] = Term.termToSentences(parsed_term1, o);
console.log("Term: " + parsed_term1);
console.log("Sentences: " + sentences_from_term1);
if (sentences_from_term1.length != 4) {
    console.error("parse is not what was expected when turning term to sentence for term: " + parsed_term1);
}
console.log("-------------------------");
*/

// inference test, it checks whether the query_str contradicts KB_str
function resolutionTest(KB_str:string[], query_str_l:string[], expectedResult:boolean, o:Ontology)
{
    DEBUG_resolution = false;
    DEBUG_resolution_detailed = false;

    var KB:SentenceContainer = new SentenceContainer();
    for(let str of KB_str) {
        var s:Sentence = Sentence.fromString(str, o);
//        console.log("parsed KB sentence: " + s.toString());
        KB.addSentence(s, "background", 1, 0);
    }
    var query:Sentence[] = [];
    for(let query_str of query_str_l) {
        query.push(Sentence.fromString(query_str, o));
    }
//    console.log("parsed query sentence: " + query.toString());
    var r:InterruptibleResolution = new InterruptibleResolution(KB, [], query, true, true, true, testAI);
//    var steps:number = 0;
    while(!r.step()) {
//        steps++;
//        if (steps>=5) break;
    }
    var result:boolean = r.endResults.length > 0;
    if (result != expectedResult) {
        console.error("failed resolutionTest, query: " + query_str_l);
    } else {
        console.log("resolutionTest ok!");
    }
}



function resolutionQueryTest(KB_str:string[], query_str_l:string[], numberOfExpectedResults:number, o:Ontology)
{
//    DEBUG_resolution = true;
    
    var KB:SentenceContainer = new SentenceContainer();
    for(let str of KB_str) {
        var s:Sentence = Sentence.fromString(str, o);
//        console.log("parsed KB sentence: " + s.toString());
        KB.addSentence(s, "background", 1, 0);
    }
    var query:Sentence[] = [];
    for(let query_str of query_str_l) {
        query.push(Sentence.fromString(query_str, o));
    }
//    console.log("parsed query sentence: " + query.toString());

    var r:InterruptibleResolution = new InterruptibleResolution(KB, [], query, true, true, true, testAI);
    while(!r.stepAccumulatingResults());
//    while(!r.step());
    if (r.endResults.length == numberOfExpectedResults) {
        console.log("resolutionQueryTest: " + r.endResults);
    } else {
        console.error("resolutionQueryTest (expected " + numberOfExpectedResults + ", but got "+r.endResults.length+"): " + r.endResults);
    }
}


for(let pair of term_unification_l) {
    var term1:Term = Term.fromString(pair[0], o);
    var term2:Term = Term.fromString(pair[1], o);
    console.log("-------------------------");
    console.log("Term 1: " + term1);
    console.log("Term 2: " + term2);
    var bindings:Bindings = new Bindings();
    var result:boolean = term1.unify(term2, true, bindings);
    if (result) {
        console.log("They unify, bindings: " + bindings);
    } else {
        console.log("They do not unify");
    }
    if (result != pair[2]) console.error("Unification result incorrect!!");
}


resolutionTest(
    ["~space.at(X:[object],Y:[space.location]); ~space.at(X,Y2:[space.location]); =(Y,Y2)",
     "space.at(X:'18':[character], Y:'bedroom'[bedroom])"],
    ["space.at(X:'18'[character], Y:'corridor'[corridor])"],
    true,    // constradicts
    o);
resolutionTest(
    ["~space.at(X:[object],Y:[space.location]); ~space.at(X,Y2:[space.location]); =(Y,Y2)",
     "space.at(X:'18':[character], Y:'bedroom'[bedroom])"],
    ["space.at(X:'19'[character], Y:'corridor'[corridor])"],
    false,    // does not contradict
    o);



o.newSort("IsA", []);
o.newSort("Weight", []);
resolutionTest(
    ["IsA('Bolt3'[symbol],'AB1'[symbol])",
     "IsA('Bolt10'[symbol],'AB1'[symbol])",
     "Weight('Bolt10'[symbol],'18'[number])",
     "~IsA(X:[symbol],C:[symbol]); ~IsA(Y:[symbol],C); ~Weight(X,W:[number]); Weight(Y,W)"],
    ["~Weight('Bolt3'[symbol],'18'[number])"],
    true,    // contradicts
    o);

resolutionTest(
    ["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)",
     "~space.at(X:[#id],L1:[#id]); ~space.at(L1,L2:[#id]); space.at(X,L2)",
     "space.at('c1'[#id],'room1'[#id])",
     "space.at('room1'[#id],'station1'[#id])",
     "space.at('room2'[#id],'station1'[#id])",
     "~space.at('room2'[#id],'room1'[#id])",
     "~space.at('room1'[#id],'room2'[#id])"],
    ["~space.at('c1'[#id],'station1'[#id])"],
    true,    // contradicts
    o);

resolutionTest(
    ["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)",
     "~space.at(X:[#id],L1:[#id]); ~space.at(L1,L2:[#id]); space.at(X,L2)",
     "space.at('c1'[#id],'room1'[#id])",
     "space.at('room1'[#id],'station1'[#id])",
     "space.at('room2'[#id],'station1'[#id])",
     "~space.at('room2'[#id],'room1'[#id])",
     "~space.at('room1'[#id],'room2'[#id])"],
    ["space.at('c1'[#id],'station1'[#id])"],
    false,    // does not contradict
    o);

resolutionTest(
    ["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)",
     "~space.at(X:[#id],L1:[#id]); ~space.at(L1,L2:[#id]); space.at(X,L2)",
     "space.at('c1'[#id],'room1'[#id])",
     "space.at('room1'[#id],'station1'[#id])",
     "space.at('room2'[#id],'station1'[#id])",
     "~space.at('room2'[#id],'room1'[#id])",
     "~space.at('room1'[#id],'room2'[#id])"],
    ["~space.at('c1'[#id],'room2'[#id])"],
    false,    // does not contradict
    o);

resolutionTest(
    ["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)",
     "~space.at(X:[#id],L1:[#id]); ~space.at(L1,L2:[#id]); space.at(X,L2)",
     "space.at('c1'[#id],'room1'[#id])",
     "space.at('room1'[#id],'station1'[#id])",
     "space.at('room2'[#id],'station1'[#id])",
     "~space.at('room2'[#id],'room1'[#id])",
     "~space.at('room1'[#id],'room2'[#id])"],
    ["space.at('c1'[#id],'room1'[#id])"],
    false,    // does not contradict
    o);


resolutionTest(
    ["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)",
     "~space.at(X:[#id],L1:[#id]); ~space.at(L1,L2:[#id]); space.at(X,L2)",
     "character('c1'[#id])",
     "space.at('c1'[#id],'room1'[#id])",
     "space.at('room1'[#id],'station1'[#id])",
     "space.at('room2'[#id],'station1'[#id])",
     "~space.at('room2'[#id],'room1'[#id])",
     "~space.at('room1'[#id],'room2'[#id])"],
    ["~character(X);~space.at(X,'room1'[#id])"],
    true,    // contradicts
    o);



// scalability test:
var experimentSize:number = 50;
var experimentSentences:string[] = ["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)",
                                    "~space.at(X:[#id],L1:[#id]); ~space.at(L1,L2:[#id]); space.at(X,L2)",
                                    "space.at('c1'[#id],'room1'[#id])"];
for(let i:number = 0;i<experimentSize;i++) {
    experimentSentences.push("space.at('room"+(i+1)+"'[#id],'station1'[#id])");
    for(let j:number = 0;j<experimentSize;j++) {
        if (i!=j) {
            experimentSentences.push("~space.at('room"+(i+1)+"'[#id],'room"+(j+1)+"'[#id])");
        }
    }
}

console.log("scalability test:");
resolutionTest(experimentSentences, ["space.at('c1'[#id],'room2'[#id])"], true, o);
resolutionTest(experimentSentences, ["~space.at('c1'[#id],'room2'[#id])"], false, o);



resolutionTest(
    ["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)",
     "~space.at(X:[#id],L1:[#id]); ~space.at(L1,L2:[#id]); space.at(X,L2)",
     "space.at('david'[#id],'room1'[#id])",
     ],
    ["~space.at('david'[#id],'room1'[#id])"],
    true, // contradicts
    o);

resolutionTest(
    ["~space.at(X:[#id],L1:[#id]); ~space.at(L1,L2:[#id]); space.at(X,L2)",
     "space.at('david'[#id],'room1'[#id])",
     ],
    ["space.at('david'[#id],'room1'[#id])"],
    false, // does not contradict
    o);


resolutionTest(
    ["permitted-in('david'[#id], 'location-garage'[#id])",
     "~permitted-in(X, Y); permission-to(X, verb.access(X,Y))",
     "permitted-in(X, Y); ~permission-to(X, verb.access(X,Y))"],
    ["~permission-to('david'[#id], verb.access('david'[#id], location-garage'[#id]))"],
    true,    // contradicts
    o);

resolutionTest(
    ["permitted-in('david'[#id], 'location-garage'[#id])",
     "~permitted-in(X, Y); permission-to(X, verb.access(X,Y))",
     "permitted-in(X, Y); ~permission-to(X, verb.access(X,Y))"],
    ["permission-to('david'[#id], verb.access('david'[#id], location-garage'[#id]))"],
    false,    // contradicts
    o);


resolutionQueryTest(
    ["key('k1'[#id])", "space.at('k1'[#id],'room1'[#id])",
     "key('k2'[#id])", "space.at('k2'[#id],'room1'[#id])",
     "key('k3'[#id])", "space.at('k3'[#id],'room1'[#id])",
     "key('k4'[#id])", "space.at('k4'[#id],'room1'[#id])",
     ],
    ["~key(X);~space.at(X,'room1'[#id])"],
    4,
    o);

resolutionQueryTest(
    ["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)",
     "~space.at(X:[#id],L1:[#id]); ~space.at(L1,L2:[#id]); space.at(X,L2)",
     "character('c1'[#id])",
     "character('c2'[#id])",
     "space.at('c1'[#id],'room1'[#id])",
     "space.at('c2'[#id],'station1'[#id])",
     "space.at('room1'[#id],'station1'[#id])",
     "space.at('room2'[#id],'station1'[#id])",
     "~space.at('room2'[#id],'room1'[#id])",
     "~space.at('room1'[#id],'room2'[#id])"],
    ["~character(X);~space.at(X,'station1'[#id])"],
    2,
    o);


resolutionQueryTest(
    ["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)",
     "~space.at(X:[#id],L1:[#id]); ~space.at(L1,L2:[#id]); space.at(X,L2)",
     "space.at('room1'[#id],'station1'[#id])",
     "space.at('room2'[#id],'station1'[#id])",
     "~space.at('room2'[#id],'room1'[#id])",
     "~space.at('room1'[#id],'room2'[#id])",
     "key('k1'[#id])", "space.at('k1'[#id],'room1'[#id])",
     "key('k2'[#id])", "space.at('k2'[#id],'room1'[#id])",
     "key('k3'[#id])", "space.at('k3'[#id],'room2'[#id])",
     "key('k4'[#id])", "space.at('k4'[#id],'room2'[#id])",
     ],
    ["~key(X);~space.at(X,'station1'[#id])"],
    4,
    o);

resolutionQueryTest(
    ["space.at(X,'location-powerplant'[#id]) ; ~battery(Y) ; ~verb.can(X, verb.fill(X,Y))",
     "verb.can('hypothetical-character'[#id], V2:verb.fill('hypothetical-character'[#id], 'h-b':[#id]))",
     "battery('h-b':[#id])"],
    ["~space.at('hypothetical-character'[#id], WHERE:[#id])"],
    1,
    o);

resolutionQueryTest(
    ["lever(X:'o1'[symbol])"],
    ["~lever(X:[symbol])"],
    1,
    o);        

resolutionQueryTest(
    ["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)",
     "~space.at(X:[#id],L1:[#id]); ~space.at(L1,L2:[#id]); space.at(X,L2)",
     "character('c1'[#id])",
     "space.at('c1'[#id],'room1'[#id])",
     "key('k1'[#id])",
     "space.at('k1'[#id],'room2'[#id])",
     "space.at('room1'[#id],'station1'[#id])",
     "space.at('room2'[#id],'station1'[#id])",
     "~space.at('room2'[#id],'room1'[#id])",
     "~space.at('room1'[#id],'room2'[#id])"],
    ["~character(X);~space.at(X,WHERE)"],
    2,
    o);


resolutionQueryTest(
    ["~spacesuit(SS) ; relation.howto(verb.repair(X,SS),verb.tell(X,verb.repair(Q:'qwerty'[#id],SS),Q))",
     "spacesuit('ss'[#id])"],
    ["~relation.howto(verb.repair('david'[#id],'ss'[#id]),X)"],
    1,
    o);


resolutionTest(
    ["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)",
     "~space.at(X:[#id],L1:[#id]); ~space.at(L1,L2:[#id]); space.at(X,L2)",
     "space.at('david'[#id], 'location-garage'[#id])",
     "space.at('location-garage'[#id], 'aurora-station'[#id])",
     "space.at('aurora-station'[#id], 'communicator-range'[#id])",
     ],
    ["~space.at('david'[#id], 'communicator-range'[#id])"],
    true,    // contradicts
    o);


resolutionTest(
    ["~space.inside.of(X, Y); space.at(X, Y)",
     "~space.at(X:[#id], 'earth'[#id]); rock(X)",
     "space.inside.of('david'[#id], 'earth'[#id])"],
    ["~rock('david'[#id])"],
    true,    // should contradict
    o);


resolutionTest(
    ["~space.at(X:[#id], 'earth'[#id]); rock(X)",
     "space.inside.of('david'[#id], 'earth'[#id])"],
    ["~rock('david'[#id])"],
    true,    // should contradict
    o);

resolutionQueryTest(
    ["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)",
     "~space.at(X:[#id],L1:[#id]); ~space.at(L1,L2:[#id]); space.at(X,L2)",
     "human('c1'[#id])",
     "space.at('c1'[#id],'room1'[#id])",
     "key('k1'[#id])",
     "space.at('k1'[#id],'room2'[#id])",
     "space.at('room1'[#id],'station1'[#id])",
     "space.at('room2'[#id],'station1'[#id])",
     "~space.at('room2'[#id],'room1'[#id])",
     "~space.at('room1'[#id],'room2'[#id])"],
    ["~character(X);~space.at(X,WHERE)"],
    2,
    o);
 

resolutionTest(
    ["~temperature(X:[#id], 'cold'[cold]); ~temperature(X, 'hot'[hot])",
     "cold('david'[#id],'cold'[cold])"],
    ["hot('david'[#id], 'hot'[hot])"],
    true,    // should contradict
    o);


resolutionTest(
    ["~temperature(X:[#id], 'cold'[cold]); ~temperature(X, 'hot'[hot])",
     "temperature('david'[#id],'cold'[cold])"],
    ["temperature('david'[#id], 'hot'[hot])"],
    true,    // should contradict
    o);

