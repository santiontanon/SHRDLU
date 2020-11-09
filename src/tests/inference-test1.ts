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
                                        /*["actionverb(X:[any],any(X))",
                                         "actionverb(any(Y:[any]),Y)", 
                                         false],*/    // this one is commented out, since I've deactivated the occurs check
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
var term1_text:string = "#and(V0:#and(V1:#not(V2:=(V:[any], V4:'etaoin'[#id])), V5:#and(V6:#not(V7:=(V, V8:'player'[#id])), V9:character(V))), V10:space.at(V, V11:'location-aurora-station'[#id]))";
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
    resolutionTest2(KB_str, [], query_str_l, expectedResult, o);
}


// inference test, it checks whether the query_str contradicts KB_str
function resolutionTest2(KB_str:string[], AS_str:string[], query_str_l:string[], expectedResult:boolean, o:Ontology)
{
    //DEBUG_resolution = true;
    
    let KB:SentenceContainer = new SentenceContainer();
    for(let str of KB_str) {
        let s:Sentence = Sentence.fromString(str, o);
//        console.log("parsed KB sentence: " + s.toString());
        KB.addSentence(s, "background", 1, 0);
    }
    let additionalSentences:Sentence[] = [];
    for(let str of AS_str) {
        let s:Sentence = Sentence.fromString(str, o);
        additionalSentences.push(s);
    }
    let query:Sentence[] = [];
    for(let query_str of query_str_l) {
        query.push(Sentence.fromString(query_str, o));
    }
//    console.log("parsed query sentence: " + query.toString());
    let r:InterruptibleResolution = new InterruptibleResolution(KB, additionalSentences, query, true, true, true, testAI);
//    let steps:number = 0;
    while(!r.step()) {
//        steps++;
//        if (steps>=5) break;
    }
    let result:boolean = r.endResults.length > 0;
    if (result != expectedResult) {
        console.error("failed resolutionTest, query: " + query_str_l);
    } else {
        console.log("resolutionTest ok!");
    }
    if (r.endResults.length > 0) {
        let baseSentences:Sentence[] = r.endResults[0].getBaseSentences(query);
        console.log("Base sentences ("+baseSentences.length+"):");
        for(let s of baseSentences) {
            console.log(" - " + s.toString());
        }
    }
}


function resolutionQueryTest(KB_str:string[], query_str_l:string[], numberOfExpectedResults:number, o:Ontology)
{
    resolutionQueryTest2(KB_str, [], query_str_l, numberOfExpectedResults, o);
}

function resolutionQueryTest2(KB_str:string[], AS_str:string[], query_str_l:string[], numberOfExpectedResults:number, o:Ontology)
{
    resolutionQueryTest2ForAll(KB_str, AS_str, query_str_l, [], numberOfExpectedResults, o);
}

function resolutionQueryTest2ForAll(KB_str:string[], AS_str:string[], query_str_l:string[], forall_str_l:string[],
                                    numberOfExpectedResults:number, o:Ontology)
{
    //DEBUG_resolution = true;
    
    let KB:SentenceContainer = new SentenceContainer();
    for(let str of KB_str) {
        let s:Sentence = Sentence.fromString(str, o);
//        console.log("parsed KB sentence: " + s.toString());
        KB.addSentence(s, "background", 1, 0);
    }
    let additionalSentences:Sentence[] = [];
    for(let str of AS_str) {
        let s:Sentence = Sentence.fromString(str, o);
        additionalSentences.push(s);
    }
    let query:Sentence[] = [];
    let queryVariables:string[] = [];
    for(let query_str of query_str_l) {
        let s:Sentence = Sentence.fromString(query_str, o);
        query.push(s);
        for(let v of s.getAllVariables()) {
            if (queryVariables.indexOf(v.name) == -1) queryVariables.push(v.name);
        }
    }
//    console.log("parsed query sentence: " + query.toString());
    let forAlls:[VariableTermAttribute, Term][] = [];
    for(let forAll_str of forall_str_l) {
        let forAll_term:Term = Term.fromString(forAll_str, o);
        forAlls.push([<VariableTermAttribute>(forAll_term.attributes[0]), (<TermTermAttribute>(forAll_term.attributes[1])).term]);
        let idx:number = queryVariables.indexOf((<VariableTermAttribute>(forAll_term.attributes[0])).name);
        if (idx != -1) queryVariables.splice(idx,1);
    }

    // for(let v of queryVariables) {
    //     console.log("query variable: " + v);
    // }

    let r:InterruptibleResolution = new InterruptibleResolution(KB, additionalSentences, query, true, true, true, testAI);
    while(!r.stepAccumulatingResults());

    for(let i:number = 0;i<forAlls.length;i++) {
        // console.log("inference for forAll: " + forAlls[i][1]);
        let negatedForAll:Sentence[] = Term.termToSentences(new Term(o.getSort("#not"), [new TermTermAttribute(forAlls[i][1])]), o);
        let r2:InterruptibleResolution = new InterruptibleResolution(KB, additionalSentences, negatedForAll, true, true, true, testAI);
        while(!r2.stepAccumulatingResults());
        let allValues:TermAttribute[] = [];
        for(let result of r2.endResults) {
            let v:TermAttribute = result.getValueForVariableName(forAlls[i][0].name);
            if (v != null) allValues.push(v);
        }
        // console.log("forAll values ("+forAlls[i][0].name+"): " + allValues);

        // filter main inference results based on the forAll results:
        r.filterResultsByForAll(queryVariables, forAlls[i][0].name, allValues);
    }

    if (r.endResults.length == numberOfExpectedResults) {
        console.log("resolutionQueryTest: " + r.endResults);
    } else {
        console.error("resolutionQueryTest (expected " + numberOfExpectedResults + ", but got "+r.endResults.length+"): " + r.endResults);
    }
}


function normalFormTest(term_str:string, result_str_l:string[], o:Ontology)
{
    let term:Term = Term.fromString(term_str, o);
    let sentences:Sentence[] = Term.termToSentences(term, o);

    if (sentences == null) {
        console.error("failed normalFormTest: " + term_str);
        console.error("sentences is null!");
    } else if (sentences.length != result_str_l.length) {
        console.error("failed normalFormTest: " + term_str);
        console.error("sentences has length " + sentences.length + ", expected " + result_str_l.length);
        for(let sentence of sentences) {
            console.error("    " + sentence)
        }
    } else {
        for(let i:number = 0;i<sentences.length;i++) {
            let result:Sentence = Sentence.fromString(result_str_l[i], o);
            if (result.toString() != sentences[i].toString()) {
                console.error("failed normalFormTest: " + term_str);
                console.error("Expected " + i + "-th sentence to be " + result_str_l[i] + " but was " + sentences[i]);
                return;
            }
        }
    }
}


for(let pair of term_unification_l) {
    let term1:Term = Term.fromString(pair[0], o);
    let term2:Term = Term.fromString(pair[1], o);
    console.log("-------------------------");
    console.log("Term 1: " + term1);
    console.log("Term 2: " + term2);
    let bindings:Bindings = new Bindings();
    let result:boolean = term1.unify(term2, OCCURS_CHECK, bindings);
    if (result) {
        console.log("They unify, bindings: " + bindings);
    } else {
        console.log("They do not unify");
    }
    if (result != pair[2]) console.error("Unification result incorrect!!");
}


normalFormTest("block(X)",
               ["block(X)"], o);

normalFormTest("#and(block(X),box(X))",
               ["block(X)", "box(X)"], o);
normalFormTest("#or(block(X),box(X))",
               ["block(X);box(X)"], o);

normalFormTest("#not(#and(block(X),box(X)))",
               ["~block(X);~box(X)"], o);
normalFormTest("#not(#or(block(X),box(X)))",
               ["~block(X)","~box(X)"], o);

normalFormTest("#not(#not(#and(block(X),box(X))))",
               ["block(X)", "box(X)"], o);

normalFormTest("#not(#not(#not(#and(block(X),box(X)))))",
               ["~block(X);~box(X)"], o);

normalFormTest("#not(#or(block(X),#not(box(X))))",
               ["~block(X)","box(X)"], o);

normalFormTest("#and(#or(block(X), color(X,'green'[green])), #or(block(X), color(X,'red'[red])))",
               ["block(X);color(X,'green'[green])", "block(X);color(X,'red'[red])"], o);

normalFormTest("#or(#and(block(X), color(X,'green'[green])), #and(block(X), color(X,'red'[red])))",
               ["block(X);block(X)",
                "block(X);color(X,'red'[red])",
                "color(X,'green'[green]);block(X)",
                "color(X,'green'[green]);color(X,'red'[red])"], o);

normalFormTest("#and(#or(color(X, 'green'[green]), color(X,'red'[red])), block(X))",
               ["color(X,'green'[green]);color(X,'red'[red])",
                "block(X)"], o);

normalFormTest("#not(#or(#and(block(X), color(X,'green'[green])), #and(block(X), color(X,'red'[red]))))",
               ["~block(X); ~color(X,'green'[green])",
                "~block(X); ~color(X,'red'[red])"], o);

normalFormTest("#not(#and(#or(color(X,'green'[green]), color(X,'red'[red])), block(X)))",
               ["~color(X,'green'[green]); ~block(X)",
                "~color(X,'red'[red]); ~block(X)"], o);


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
     "space.at('player'[#id],'room1'[#id])",
     ],
    ["~space.at('player'[#id],'room1'[#id])"],
    true, // contradicts
    o);

resolutionTest(
    ["~space.at(X:[#id],L1:[#id]); ~space.at(L1,L2:[#id]); space.at(X,L2)",
     "space.at('player'[#id],'room1'[#id])",
     ],
    ["space.at('player'[#id],'room1'[#id])"],
    false, // does not contradict
    o);


resolutionTest(
    ["permitted-in('player'[#id], 'location-garage'[#id])",
     "~permitted-in(X, Y); permission-to(X, verb.access(X,Y))",
     "permitted-in(X, Y); ~permission-to(X, verb.access(X,Y))"],
    ["~permission-to('player'[#id], verb.access('player'[#id], 'location-garage'[#id]))"],
    true,    // contradicts
    o);

resolutionTest(
    ["permitted-in('player'[#id], 'location-garage'[#id])",
     "~permitted-in(X, Y); permission-to(X, verb.access(X,Y))",
     "permitted-in(X, Y); ~permission-to(X, verb.access(X,Y))"],
    ["permission-to('player'[#id], verb.access('player'[#id], 'location-garage'[#id]))"],
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
    ["~relation.howto(verb.repair('player'[#id],'ss'[#id]),X)"],
    1,
    o);


resolutionTest(
    ["~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)",
     "~space.at(X:[#id],L1:[#id]); ~space.at(L1,L2:[#id]); space.at(X,L2)",
     "space.at('player'[#id], 'location-garage'[#id])",
     "space.at('location-garage'[#id], 'aurora-station'[#id])",
     "space.at('aurora-station'[#id], 'communicator-range'[#id])",
     ],
    ["~space.at('player'[#id], 'communicator-range'[#id])"],
    true,    // contradicts
    o);


resolutionTest(
    ["~space.inside.of(X, Y); space.at(X, Y)",
     "~space.at(X:[#id], 'earth'[#id]); rock(X)",
     "space.inside.of('player'[#id], 'earth'[#id])"],
    ["~rock('player'[#id])"],
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
     "temperature('player'[#id],'cold'[cold])"],
    ["hot('player'[#id], 'hot'[hot])"],
    true,    // should contradict
    o);


resolutionTest(
    ["~temperature(X:[#id], 'cold'[cold]); ~temperature(X, 'hot'[hot])",
     "temperature('player'[#id],'cold'[cold])"],
    ["temperature('player'[#id], 'hot'[hot])"],
    true,    // should contradict
    o);



resolutionTest(
    ["~weight(X:[#id], 'heavy-weight'[heavy-weight]); heavy-weight(X)",
     "~weight(X:[#id], 'light-weight'[light-weight]); light-weight(X)",
     "weight(X:[#id], 'heavy-weight'[heavy-weight]); ~heavy-weight(X)",
     "weight(X:[#id], 'light-weight'[light-weight]); ~light-weight(X)",
     "light-weight(X:[#id]); heavy-weight(X)",
     "~light-weight(X:[#id]); ~heavy-weight(X)",
     "heavy-weight('engine1'[#id])"],
    ["weight('engine1'[#id], 'light-weight'[light-weight])"],
    true,    // should contradict
    o);


resolutionTest2(
    ["~clothing(Y:[#id]); ~space.at(X:[#id], 'location-as20'[#id]); verb.can(X, verb.clean(X, Y))",
     "space.at(X:[#id],'location-as20'[#id]) ; ~character(X) ; ~clothing(Y:[#id]); ~verb.can(X, verb.clean(X, Y))"],
    ["space.at('player'[#id],'location-as20'[#id])",
     "clothing('hypothetical-object'[#id])"],
    ["~verb.can('player'[#id],verb.clean('player'[#id], 'hypothetical-object'[#id]))"],
    true,    // should contradict
    o);

resolutionTest2(
    ["~space.inside.of(X:[#id],L1:[#id]); ~space.inside.of(L1,L2:[#id]); space.inside.of(X,L2)",
     //"~space.inside.of(X:[#id], Y:[#id]); space.at(X, Y)",
     ],
    ["space.directly.on.top.of(V4:'block-7'[#id], V5:'table'[#id])",
     "space.directly.on.top.of(V4:'block-10'[#id], V5:'block-7'[#id])"],
    ["~space.directly.on.top.of(V4:'block-10'[#id], V5:'table'[#id])"],
    false,    // should not contradict
    o);


resolutionQueryTest(
    ["3dprinter('p1'[#id])",
     "~3dprinter(X) ; verb.can('1'[#id], action.print('1'[#id], 'plastic-cup'[plastic-cup], X))",
     "~3dprinter(X) ; verb.can('1'[#id], action.print('1'[#id], 'plastic-fork'[plastic-fork], X))"],
    ["~verb.can('1'[#id], action.print('1'[#id], X, 'p1'[#id]))"],
    2,
    o);


resolutionQueryTest(
    ["3dprinter('p1'[#id])",
     "~3dprinter(X) ; verb.can('1'[#id], action.print('1'[#id], 'plastic-cup'[plastic-cup], X))",
     "~3dprinter(X) ; verb.can('1'[#id], action.print('1'[#id], 'plastic-fork'[plastic-fork], X))",
     "~verb.can(X, action.print(X, Y, Z)) ; verb.can(X, verb.make(X, Y, Z))"],
    ["~verb.can('1'[#id], verb.make('1'[#id], X, 'p1'[#id]))"],
    2,
    o);


resolutionTest2(
    ["~space.inside.of(X:[#id],L1:[#id]); ~space.inside.of(L1,L2:[#id]); space.inside.of(X,L2)",
     "~space.at(X:[#id],L1:[#id]); ~space.at(X,L2:[#id]); =(L1,L2); space.at(L1,L2); space.at(L2,L1)",
     "space.inside.of('l1'[#id], 'l2'[#id])",
     "space.inside.of('l2'[#id], 'l3'[#id])",
     "space.inside.of('l3'[#id], 'l4'[#id])",
     "space.inside.of('l4'[#id], 'l5'[#id])",
     "space.inside.of('l5'[#id], 'l6'[#id])",
     "space.inside.of('l6'[#id], 'l7'[#id])",
     "space.inside.of('l7'[#id], 'l8'[#id])",
     "space.inside.of('l8'[#id], 'l9'[#id])",
     "space.inside.of('l9'[#id],'l10'[#id])",
     //"~space.inside.of(X:[#id], Y:[#id]); space.at(X, Y)",
     ],
    ["space.inside.of( '1'[#id], 'l1'[#id])",
     ],
    ["~space.at('1'[#id], 'l10'[#id])"],
    true,    // should contradict
    o);


// some concepts for the following test:
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
o.newSortStrings("workingspacesuit", ["spacesuit"]);
o.newSortStrings("microscope-table", ["microscope","table"]);
o.newSortStrings("computer-table", ["computer","table"]);
o.newSortStrings("wall-computer", ["computer","table"]);
o.newSortStrings("tardis-stasis-pod", ["stasis-pod"]);
o.newSortStrings("horizontal-door", ["door"]);
o.newSortStrings("vertical-door", ["door"]);
o.newSortStrings("batteryrecharge.facility", ["facility"]);
o.newSortStrings("rover-battery", ["battery"]);
o.newSortStrings("full-battery", ["rover-battery"]);
o.newSortStrings("fixed-datapad", ["datapad","item"]);
o.newSortStrings("garage-rover", ["rover", "vehicle"]);
o.newSortStrings("tardis-memory-core", ["memory-core", "item"]);
o.newSortStrings("luminiscent-dust", ["dust"]);
o.newSortStrings("garage-airlock", ["obstacle"]);
o.newSortStrings("rover-wheel-stack", ["wheel", "obstacle"]);
o.newSortStrings("rover-wheel", ["wheel", "obstacle"]);
o.newSortStrings("garage-shuttle", ["shuttle", "vehicle"]);


resolutionQueryTest2(
    [
    "~space.inside.of(X_0:[#id], L1_0:[#id]); ~space.inside.of(L1_0, L2_0:[#id]); space.inside.of(X_0, L2_0)",
    //"~space.inside.of(X_0:[#id], L1_0:[#id]); ~space.inside.of(X_0, L2_0:[#id]); =(L1_0, L2_0); space.inside.of(L1_0, L2_0); space.inside.of(L2_0, L1_0)",

    "david(V0:'player'[#id])",
    "robot(V0:'shrdlu'[#id])",
    "qwerty(V0:'qwerty'[#id])",
    "disembodied-ai(V0:'etaoin'[#id])",

    "space.inside.of(V0:'player'[#id], V1:'location-garage'[#id])",
    "space.inside.of(V0:'location-garage'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-aurora-station'[#id], V1:'location-aurora-settlement'[#id])",
    "space.inside.of(V0:'location-aurora-settlement'[#id], V1:'spacer-valley-south'[#id])",
    "space.inside.of(V0:'spacer-valley-south'[#id], V1:'spacer-valley'[#id])",
    "space.inside.of('spacer-valley'[#id],'aurora'[#id])",    
    
    "space.inside.of(V0:'qwerty'[#id], V1:'location-as25'[#id])",
    "space.inside.of(V0:'shrdlu'[#id], V1:'location-east-cave'[#id])",
    "space.inside.of(V0:'etaoin'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'communicator'[#id], V1:'location-garage'[#id])",
    "space.inside.of(V0:'science-key'[#id], V1:'location-as25'[#id])",
    "space.inside.of(V0:'maintenance-key'[#id], V1:'location-garage'[#id])",
    "space.inside.of(V0:'command-key'[#id], V1:'location-as25'[#id])",
    "space.inside.of(V0:'stasis-key'[#id], V1:'location-as25'[#id])",
    "space.inside.of(V0:'garage-key'[#id], V1:'location-garage'[#id])",
    "space.inside.of(V0:'bedroom5-key'[#id], V1:'location-garage'[#id])",
    "space.inside.of(V0:'master-key1'[#id], V1:'location-as25'[#id])",
    "space.inside.of(V0:'stasis-door'[#id], V1:'location-as25'[#id])",
    "space.inside.of(V0:'207'[#id], V1:'location-as25'[#id])",
    "space.inside.of(V0:'208'[#id], V1:'location-as25'[#id])",
    "space.inside.of(V0:'432'[#id], V1:'location-as19'[#id])",
    "space.inside.of(V0:'501'[#id], V1:'location-as25'[#id])",
    "space.inside.of(V0:'502'[#id], V1:'location-as25'[#id])",
    "space.inside.of(V0:'503'[#id], V1:'location-as25'[#id])",
    "space.inside.of(V0:'505'[#id], V1:'location-as25'[#id])",
    "space.inside.of(V0:'512'[#id], V1:'location-as25'[#id])",
    "space.inside.of(V0:'516'[#id], V1:'location-as24'[#id])",
    "space.inside.of(V0:'517'[#id], V1:'location-as24'[#id])",
    "space.inside.of(V0:'566'[#id], V1:'location-as25'[#id])",
    "space.inside.of(V0:'120'[#id], V1:'location-as19'[#id])",
    "space.inside.of(V0:'593'[#id], V1:'location-as25'[#id])",
    "space.inside.of(V0:'594'[#id], V1:'location-as25'[#id])",
    "space.inside.of(V0:'595'[#id], V1:'location-as25'[#id])",    

    "space.inside.of(V0:'location-as1'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as2'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as3'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as4'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as5'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as6'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as7'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as8'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as9'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as10'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as11'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as12'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as13'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as14'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as15'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as16'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as17'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as18'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as19'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as20'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as21'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as22'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as23'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as24'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as25'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as26'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as27'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-maintenance'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as29'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as31'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as32'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as33'[#id], V1:'location-aurora-station'[#id])",
    "space.inside.of(V0:'location-as34'[#id], V1:'location-aurora-station'[#id])",    
    "space.inside.of(V0:'location-comm-tower'[#id], V1:'location-aurora-settlement'[#id])",
    "space.inside.of(V0:'location-recycling'[#id], V1:'location-aurora-settlement'[#id])",
    "space.inside.of(V0:'location-oxygen'[#id], V1:'location-aurora-settlement'[#id])",
    "space.inside.of(V0:'location-water'[#id], V1:'location-aurora-settlement'[#id])",
    "space.inside.of(V0:'location-greenhouse'[#id], V1:'location-aurora-settlement'[#id])",
    "space.inside.of(V0:'location-powerplant'[#id], V1:'location-aurora-settlement'[#id])",
    "space.inside.of(V0:'spacer-valley-north'[#id], V1:'spacer-valley'[#id])",
    "space.inside.of(V0:'location-east-cave'[#id], V1:'spacer-valley-north'[#id])",
    "space.inside.of(V0:'location-east-cave-dark'[#id], V1:'location-east-cave'[#id])",
    "space.inside.of(V0:'location-west-cave'[#id], V1:'spacer-valley-north'[#id])",
    "space.inside.of(V0:'location-west-cave-dark'[#id], V1:'location-west-cave'[#id])",  
    "space.inside.of(V0:'spacer-gorge'[#id], V1:'aurora'[#id])"],
    [],
    //["~space.at('shrdlu'[#id], V1:'aurora'[#id])"],
    ["~space.at(X, V1:'aurora'[#id]) ; ~character(X)"],
    //["~character(X)"],
    //["~space.at(X, V1:'aurora'[#id])"],
    4,
    o);

resolutionQueryTest2(
    ["action.print('1'[#id], 'plastic-cup'[plastic-cup])",
     "action.print('1'[#id], 'plastic-cup'[plastic-plate])",
     "~action.print(X,Y); relation(X,Y)",
     ],
    [],
    ["~relation('1'[#id], X)"],
    2,
    o);

resolutionQueryTest2(
    ["action.print('1'[#id], [plastic-cup])",
     "action.print('1'[#id], [plastic-plate])",
     "~action.print(X,Y); relation(X,Y)",
     ],
    [],
    ["~relation('1'[#id], X)"],
    2,
    o);

resolutionQueryTest2(
    [],
    [],
    ["~=('1'[#id], X)"],
    1,
    o);


console.log("negating: #and(pyramid(X),#and(cube(Y),space.at(X,Y)))");
for(let s of Term.termToSentences(Term.fromString("#not(#and(pyramid(X),#and(cube(Y),space.at(X,Y))))", o), o)) {
    console.log(s.toString());
}
resolutionQueryTest2ForAll(
    ["cube('c1'[#id])", "cube('c2'[#id])", "pyramid('p1'[#id])", "pyramid('p2'[#id])", 
     "space.at('p1'[#id],'c1'[#id])", "~space.at('p1'[#id],'c2'[#id])",
     "~space.at('p2'[#id],'c1'[#id])", "~space.at('p2'[#id],'c2'[#id])"],
    [],
    ["~pyramid(X);~cube(Y);~space.at(X,Y)"], // query
    [], // forall
    1,
    o);


console.log("negating: #and(pyramid(X),#or(#not(cube(Y)),#not(space.at(X,Y))))");
for(let s of Term.termToSentences(Term.fromString("#not(#and(pyramid(X),#or(#not(cube(Y)),#not(space.at(X,Y)))))", o), o)) {
    console.log(s.toString());
}
resolutionQueryTest2ForAll(
    ["cube('c1'[#id])", "cube('c2'[#id])", "pyramid('p1'[#id])", "pyramid('p2'[#id])", 
     "space.at('p1'[#id],'c1'[#id])", "~space.at('p1'[#id],'c2'[#id])", "~space.at('p1'[#id],'p2'[#id])",
     "~space.at('p2'[#id],'c1'[#id])", "~space.at('p2'[#id],'c2'[#id])", "~space.at('p2'[#id],'p1'[#id])"],
    [], // additional sentences
    ["~pyramid(X);cube(Y)","~pyramid(X);space.at(X,Y)"], // query
    ["#forall(Y,cube(Y))"], // forall
    1,
    o);


console.log("negating: #or(#and(=(X,'c1'[#id]), taller(X,'c2'[#id])), #and(=(X,'c2'[#id]), taller(X,'c1'[#id])))");
for(let s of Term.termToSentences(Term.fromString("#not(#or(#and(=(X,'c1'[#id]), taller(X,'c2'[#id])), #and(=(X,'c2'[#id]), taller(X,'c1'[#id]))))", o), o)) {
    console.log(s.toString());
}
resolutionQueryTest2ForAll(
    ["taller('c2'[#id],'c1'[#id])"],
    [], // additional sentences
    ["~=(X:[any], 'c1'[#id]); ~taller(X, 'c2'[#id])",
     "~=(X:[any], 'c2'[#id]); ~taller(X, 'c1'[#id])"], // query
    [], // forall
    1,
    o);





