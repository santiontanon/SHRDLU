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

// some concepts for the following sentences:
o.newSortStrings("white-key", ["key-card"]);
o.newSortStrings("red-key", ["key-card"]);

// dummy context:
var testAI:RuleBasedAI = new RuleBasedAI(o, parser, 12, 0, DEFAULT_QUESTION_PATIENCE_TIMER); 
testAI.selfID = 'etaoin';

var successfulTests:number = 0;
var totalTests:number = 0;

function NLParseTest(sentence:string, s:Sort, context:NLContext, expectedResultStr:string) : boolean
{
    totalTests++;
    var parses:NLParseRecord[] = parser.parse(sentence, s, context, testAI);
    if (parses == null || parses.length == 0) {
        if (expectedResultStr != null) {
            console.error("Sentence '" + sentence + "' could not be parsed with sort " + s.name);
            return false;
        } else {
            console.log(sentence + "\ncorrectly has 0 parses");
            successfulTests++;
            return true;
        }
    } else {
        if (expectedResultStr == null) {
            console.error("Parsed sentence '"+sentence+"', which was supposed to be non parseable!\nFirst parse was: " + parses[0]);
            return false;
        }
        var parse:NLParseRecord = parser.chooseHighestPriorityParse(parses);
//        if (parses.length > 1) console.warn("Multiple parses for sentence '" + sentence + "'");
        var expectedResult:Term = Term.fromString(expectedResultStr, o);
        var found:boolean = false;
        console.log(sentence + "\n" + parses.length + " parses:");
        for(let p of parses) {
          console.log("    parse: " + p.result.toString());
        }
        console.log("  highest priority parse: " + parse.result.toString());
        if (parse.result.equalsConsideringAnd(expectedResult)) {
            found = true;
        }
        if (!found) {
            console.error("None of the parses of '"+sentence+"' is the expected one! " + expectedResult);
        } else {
            if (context != null && s.name == "performative") {
                var parsePerformatives:TermAttribute[] = NLParser.elementsInList(expectedResult, "#and");
                for(let parsePerformative of parsePerformatives) {
                    context.newPerformative(context.speaker, sentence, (<TermTermAttribute>parsePerformative).term, null, o, testAI.time_in_seconds);
                }
                context.ai.time_in_seconds++;
            }
        }
        successfulTests++;
        return true;
    }
}



function NLParseTestUnifyingListener(sentence:string, s:Sort, context:NLContext, listener:string, expectedResultStr:string) : boolean
{
    totalTests++;
    var parses:NLParseRecord[] = parser.parse(sentence, s, context, testAI);
    if (parses == null || parses.length == 0) {
        if (expectedResultStr != null) {
            console.error("Sentence '" + sentence + "' could not be parsed with sort " + s.name);
            if (parser.error_semantic) console.error("    semantic error!");
            if (parser.error_deref.length > 0) console.error("    could not deref expressions: " + parser.error_deref);
            if (parser.error_unrecognizedTokens.length > 0) console.error("    unrecognized tokens: " + parser.error_unrecognizedTokens);
            if (parser.error_grammatical) console.error("    grammatical error!");
            return false;
        } else {
            console.log(sentence + "\ncorrectly has 0 parses");
            successfulTests++;
            return true;
        }
    } else {
        if (expectedResultStr == null) {
            console.error("Parsed sentence '"+sentence+"', which was supposed to be non parseable!\nFirst parse was: " + parses[0]);
            return false;
        }
        var parse:NLParseRecord = parser.chooseHighestPriorityParse(parses);
//        if (parses.length > 1) console.warn("Multiple parses for sentence '" + sentence + "'");
        var expectedResult:Term = Term.fromString(expectedResultStr, o);
        var found:boolean = false;
        console.log(sentence + "\n" + parses.length + " parses:");
        for(let p of parses) {
          console.log("    parse: " + p.result.toString());
//          console.log("        ruleNames: " + p.ruleNames);
        }
        parse.result = parser.unifyListener(parse.result, listener);
        console.log("  highest priority parse: " + parse.result.toString());
        if (parse.result.equalsConsideringAnd(expectedResult)) {
            found = true;
        }
        if (!found) {
            console.error("None of the parses of '"+sentence+"' is the expected one! " + expectedResult);
        } else {
            if (context != null) {
                var parsePerformatives:TermAttribute[] = NLParser.elementsInList(expectedResult, "#and");
                for(let parsePerformative of parsePerformatives) {
                    context.newPerformative(context.speaker, sentence, (<TermTermAttribute>parsePerformative).term, null, o, testAI.time_in_seconds);
                }
                context.ai.time_in_seconds++;
            }
        }
        successfulTests++;
        return true;
    }
}


var context:NLContext = new NLContext("1", testAI, 5);
var ce1:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('1', o.getSort("#id")), 
                                              null, 0, 
                                              [Term.fromString("human('1'[#id])",o), 
                                               Term.fromString("name('1'[#id], 'david'[symbol])",o),
                                               Term.fromString("relation.owns('1'[#id],'4'[#id])",o),
                                               Term.fromString("space.at('1'[#id],'room1'[#id])",o)]);
var ce2:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('2', o.getSort("#id")),
                                              null, 100, 
                                              [Term.fromString("ship('2'[#id])",o),
                                               Term.fromString("red('2'[#id],'red'[red])",o),
                                               Term.fromString("relation.belongs('2'[#id],'etaoin'[#id])",o)]);
var ce3:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('etaoin', o.getSort("#id")),
                                              null, 10, 
                                              [Term.fromString("disembodied-ai('etaoin'[#id])",o),
                                               Term.fromString("name('etaoin'[#id], 'etaoin'[symbol])",o),
                                               Term.fromString("relation.owns('etaoin'[#id],'2'[#id])",o),
                                               Term.fromString("space.at('1'[#id],'location-aurora-station'[#id])",o),
                                               Term.fromString("relation.owns('etaoin'[#id], 'etaoin-memory'[#id])",o)]);
var ce4:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('4', o.getSort("#id")),
                                              null, 3, 
                                              [Term.fromString("white-key('4'[#id])",o),
                                               Term.fromString("white('4'[#id],'white'[white])",o),
                                               Term.fromString("relation.belongs('4'[#id],'1'[#id])",o)]);
var ce5:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('5', o.getSort("#id")),
                                              null, 5, 
                                              [Term.fromString("crate('5'[#id])",o),
                                               Term.fromString("property.opened('5'[#id])",o)]);
var ce6:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('6', o.getSort("#id")),
                                              null, 4, 
                                              [Term.fromString("red-key('6'[#id])",o),
                                               Term.fromString("red('6'[#id],'red'[red])",o)]);
var ce7:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('room1', o.getSort("#id")),
                                              null, 0, 
                                              [Term.fromString("kitchen('room1'[#id])",o),
                                               Term.fromString("space.at('room1'[#id], 'location-aurora-station'[#id])",o)]);
var ce8:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('location-aurora-station', o.getSort("#id")),
                                              null, 0, 
                                              [Term.fromString("station('location-aurora-station'[#id])",o),
                                               Term.fromString("name('location-aurora-station'[#id], 'aurora station'[symbol])",o),
                                               Term.fromString("space.at('room1'[#id], 'location-aurora-station'[#id])",o),
                                               Term.fromString("space.at('room2'[#id], 'location-aurora-station'[#id])",o),
                                               Term.fromString("space.at('location-aurora-station'[#id], 'spacer-valley'[#id])",o)]);
var ce9:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('etaoin-memory', o.getSort("#id")),
                                              null, 20, 
                                              [Term.fromString("memory-bank('etaoin-memory'[#id])",o),
                                               Term.fromString("relation.belongs('etaoin-memory'[#id], 'etaoin'[#id])",o)]);
var ce10:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('room2', o.getSort("#id")),
                                              null, 30, 
                                              [Term.fromString("bedroom('room2'[#id])",o),
                                               Term.fromString("name('room2'[#id], 'bedroom 5'[symbol])",o),
                                               Term.fromString("space.at('room2'[#id], 'location-aurora-station'[#id])",o)]);
var ce11:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('l1', o.getSort("#id")),
                                              null, 30, 
                                              [Term.fromString("light('l1'[#id])",o),
                                               Term.fromString("space.at('l1'[#id], 'room1'[#id])",o)]);
var ce12:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('space', o.getSort("#id")),
                                              null, 1000, 
                                              [Term.fromString("outer-space('space'[#id])",o),
                                               Term.fromString("name('space'[#id], 'space'[symbol])",o)]);
var ce13:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('spacer-valley', o.getSort("#id")),
                                              null, 1000, 
                                              [Term.fromString("valley('spacer-valley'[#id])",o),
                                               Term.fromString("name('spacer-valley'[#id], 'spacer valley'[symbol])",o),
                                               Term.fromString("space.at('location-aurora-station'[#id], 'spacer-valley'[#id])",o)]);
var ce14:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('english', o.getSort("#id")),
                                              null, null, 
                                              [Term.fromString("language('english'[#id])",o),
                                               Term.fromString("name('english'[#id], 'english'[symbol])",o)]);


context.shortTermMemory.push(ce1);
context.shortTermMemory.push(ce2);
context.shortTermMemory.push(ce3);
context.shortTermMemory.push(ce4);
context.shortTermMemory.push(ce5);
context.shortTermMemory.push(ce6);
context.shortTermMemory.push(ce7);
context.shortTermMemory.push(ce8);
context.shortTermMemory.push(ce9);
context.shortTermMemory.push(ce10);
context.shortTermMemory.push(ce11);
context.shortTermMemory.push(ce12);
context.shortTermMemory.push(ce13);
context.shortTermMemory.push(ce14);


NLParseTest("ship", o.getSort("nounPhrase"), context, "nounPhrase(V0:'ship'[ship], V1:[singular], V2:[third-person], V3:noun(V0, V1))");
NLParseTest("the ship", o.getSort("nounPhrase"), context, "nounPhrase(V0:'ship'[ship], V1:[singular], V2:[third-person], V3:#and(the(V0, V1), V4:noun(V0, V1)))");
NLParseTest("some ships", o.getSort("nounPhrase"), context, "nounPhrase(V0:'ship'[ship], V1:[plural], V2:[third-person], V3:#and(some(V0, V1), V4:noun(V0, V1)))");
NLParseTest("big ships", o.getSort("nounPhrase"), context, "nounPhrase(V0:'ship'[ship], V1:[plural], V2:[third-person], V3:#and(adjective(V0, V4:'big'[big]), V5:noun(V0, V1)))");
NLParseTest("some big ships", o.getSort("nounPhrase"), context, "nounPhrase(V0:'ship'[ship], V1:[plural], V2:[third-person], V3:#and(some(V0, V1), V4:#and(V5:adjective(V0, V6:'big'[big]), V7:noun(V0, V1))))");
NLParseTest("a ship", o.getSort("nounPhrase"), context, "nounPhrase(V0:'ship'[ship], V1:[singular], V2:[third-person], V3:#and(a(V0, V1), V4:noun(V0, V1)))");
NLParseTest("a big ship", o.getSort("nounPhrase"), context, "nounPhrase(V0:'ship'[ship], V1:[singular], V2:[third-person], V3:#and(a(V0, V1), V4:#and(V5:adjective(V0, V6:'big'[big]), V7:noun(V0, V1))))");
NLParseTest("a white ship", o.getSort("nounPhrase"), context, "nounPhrase(V0:'ship'[ship], V1:[singular], V2:[third-person], V3:#and(a(V0, V1), V4:#and(V5:adjective(V0, V6:'white'[white]), V7:noun(V0, V1))))");
NLParseTest("a big white ship", o.getSort("nounPhrase"), context, "nounPhrase(V0:'ship'[ship], V1:[singular], V2:[third-person], V3:#and(a(V0, V1), V4:#and(V5:adjective(V0, V6:'big'[big]), V7:#and(V8:adjective(V0, V9:'white'[white]), V10:noun(V0, V1)))))");

NLParseTest("all chairs", o.getSort("nounPhrase"), context, "nounPhrase(V0:'chair'[chair], V1:[plural], V2:[third-person], V3:#and(all(V0, V1), V4:noun(V0, V1)))");
NLParseTest("these chairs", o.getSort("nounPhrase"), context, "nounPhrase(V0:'chair'[chair], V1:[plural], V2:[third-person], V3:#and(close-demonstrative-determiner(V0, V1), V4:noun(V0, V1)))");
NLParseTest("all these chairs", o.getSort("nounPhrase"), context, "nounPhrase(V0:'chair'[chair], V1:[plural], V2:[third-person], V3:#and(close-demonstrative-determiner(V0, V1), V4:noun(V0, V1)))");
NLParseTest("all of these chairs", o.getSort("nounPhrase"), context, "nounPhrase(V0:'chair'[chair], V1:[plural], V2:[third-person], V3:#and(close-demonstrative-determiner(V0, V1), V4:noun(V0, V1)))");
NLParseTest("my chair", o.getSort("nounPhrase"), context, "nounPhrase(V0:'chair'[chair], V1:[singular], V2:[third-person], V3:#and(V4:determiner.my(V0, V1), V5:noun(V0, V1)))");
NLParseTest("all white chairs", o.getSort("nounPhrase"), context, "nounPhrase(V0:'chair'[chair], V1:[plural], V2:[third-person], V3:#and(all(V0, V1), #and(adjective(V0, 'white'[white]), V4:noun(V0, V1))))");
NLParseTest("all the chairs", o.getSort("nounPhrase"), context, "nounPhrase(V0:'chair'[chair], V1:[plural], V2:[third-person], V3:#and(the(V0, V1), V4:noun(V0, V1)))");
NLParseTest("the red key", o.getSort("nounPhrase"), context, "nounPhrase(V0:'key'[key], V1:[singular], V2:[third-person], V3:#and(the(V0, V1), V4:#and(V5:adjective(V0, V6:'red'[red]), V7:noun(V0, V1))))");

NLParseTest("my name", o.getSort("nounPhrase"), context, "nounPhrase(V0:'name'[name], V1:[singular], V2:[third-person], V3:#and(V4:determiner.my(V0, V1), V5:noun(V0, V1)))");
NLParseTest("David", o.getSort("nounPhrase"), context, "nounPhrase(V0:'david'[symbol], V1:[singular], V2:[third-person], V3:proper-noun(V0, V1))");
NLParseTest("David's name", o.getSort("nounPhrase"), context, "nounPhrase(V0:'name'[name], V1:[singular], V2:[third-person], V3:#and(V4:relation.owns(V5:'david'[symbol], V0), V6:#and(V7:noun(V0, V1), V8:proper-noun(V5, V9:[singular]))))");
NLParseTest("the ship's name", o.getSort("nounPhrase"), context, "nounPhrase(V0:'name'[name], V1:[singular], V2:[third-person], V3:#and(V4:relation.owns(V5:'ship'[ship], V0), V6:#and(V7:noun(V0, V1), V8:#and(V9:the(V5, V10:[singular]), V11:noun(V5, V10)))))");

NLParseTest("the key that is red", o.getSort("nounPhrase"), context, "nounPhrase(V0:'key'[key], V1:[singular], V2:[third-person], V3:#and(the(V0, V1), V4:#and(V5:adjective(V0, V6:'red'[red]), V7:noun(V0, V1))))");
NLParseTest("the key that looks red", o.getSort("nounPhrase"), context, "nounPhrase(V0:'key'[key], V1:[singular], V2:[third-person], V3:#and(the(V0, V1), V4:#and(V5:adjective(V0, V6:'red'[red]), V7:noun(V0, V1))))");
NLParseTest("anyone else", o.getSort("nounPhrase"), context, "nounPhrase(V0:'pronoun.anyone.else'[symbol], V1:[singular], V2:[third-person], V3:indefinite-pronoun(V0, V1, V4:[gender], V2))");

// tests with dereference to context:
NLParseTest("David", o.getSort("performative"), context, "perf.callattention('1'[#id])");
NLParseTest("Hi there!", o.getSort("performative"), context, "perf.greet(V0)");
NLParseTest("ok bye", o.getSort("performative"), context, "perf.farewell(V0)");
NLParseTest("Hello, great Etaoin!", o.getSort("performative"), context, "perf.greet(V0:'etaoin'[#id])");
NLParseTest("Hello human", o.getSort("performative"), context, "perf.greet(V0:'1'[#id])");
NLParseTest("Hello white thing", o.getSort("performative"), context, "perf.greet(V0:'4'[#id])");
NLParseTest("Hello open thing", o.getSort("performative"), context, "perf.greet(V0:'5'[#id])");
NLParseTest("Hello keys", o.getSort("performative"), context, "#list(perf.greet(V0:'6'[#id]), perf.greet(V1:'4'[#id]))");
NLParseTest("Thank you!", o.getSort("performative"), context, "perf.thankyou(V0)");
NLParseTest("Thank you, Etaoin!", o.getSort("performative"), context, "perf.thankyou(V0:'etaoin'[#id])");
NLParseTest("You are welcome!", o.getSort("performative"), context, "perf.youarewelcome(V0)");
NLParseTestUnifyingListener("You are welcome!", o.getSort("performative"), context, 'etaoin', "perf.youarewelcome('etaoin'[#id])");
NLParseTestUnifyingListener("You're welcome!", o.getSort("performative"), context, 'etaoin', "perf.youarewelcome('etaoin'[#id])");
NLParseTest("the crate is open", o.getSort("performative"), context, "perf.inform([any], V1:property.opened('5'[#id]))");
NLParseTest("etaoin is a robot", o.getSort("performative"), context, "perf.inform([any], robot(V1:'etaoin'[#id]))");
NLParseTest("etaoin is not a robot", o.getSort("performative"), context, "perf.inform([any], #not(robot(V1:'etaoin'[#id])))");
NLParseTest("I am blue", o.getSort("performative"), context, "perf.inform([any], blue('1'[#id],'blue'[blue]))");
NLParseTest("I'm blue", o.getSort("performative"), context, "perf.inform([any], blue('1'[#id],'blue'[blue]))");
NLParseTest("I am a man", o.getSort("performative"), context, "perf.inform([any], man('1'[#id]))");
NLParseTest("I am not a man", o.getSort("performative"), context, "perf.inform([any], #not(man('1'[#id])))");
NLParseTest("I am at the kitchen", o.getSort("performative"), context, "perf.inform([any], space.at('1'[#id], 'room1'[#id]))");
NLParseTest("etaoin is not in the kitchen", o.getSort("performative"), context, "perf.inform([any], #not(space.at('etaoin'[#id], 'room1'[#id])))");
NLParseTest("the keys are white", o.getSort("performative"), context, "#list(perf.inform(L:[any], white('6'[#id],W:'white'[white])), perf.inform(L, white('4'[#id],W)))");
NLParseTestUnifyingListener("I am a medic in aurora station", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], role('1'[#id], 'location-aurora-station'[#id], 'medic'[medic]))");

// tests with hypothetical dereference:
NLParseTest("all keys are white", o.getSort("performative"), context, "perf.inform([any], V1:#or(#not(key(X:[#id])),white(X,'white'[white])))");
NLParseTest("all chairs are small", o.getSort("performative"), context, "perf.inform([any], V1:#or(#not(chair(X:[#id])),small(X)))");
NLParseTest("socrates was a man", o.getSort("performative"), context, "#list(perf.inform(L:[any], name(V1:'H-1-1'[#id],'socrates'[symbol])), perf.inform(L, man(V1)))");

// we simulate memorization:
let socrates_entity:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('H1', o.getSort("#id")),
                                                          testAI.time_in_seconds, null,
                                                          [Term.fromString("name('H1'[#id],'socrates'[symbol])",o),
                                                           Term.fromString("man('H1'[#id])",o)])
context.shortTermMemory.push(socrates_entity);

NLParseTest("socrates was not a man", o.getSort("performative"), context, "perf.inform([any], #not(man('H1'[#id])))");
NLParseTest("socrates was not mortal", o.getSort("performative"), context, "perf.inform([any], #not(mortal('H1'[#id])))");

// tests using articles
// this one should dereference to Socrates, since we were just talking about him
NLParseTest("the man was blue", o.getSort("performative"), context, "perf.inform([any], blue('H1'[#id],'blue'[blue]))");
NLParseTest("the red key is in the kitchen", o.getSort("performative"), context, "perf.inform([any], space.at('6'[#id], 'room1'[#id]))");
NLParseTest("the key is in the kitchen", o.getSort("performative"), context, "perf.inform([any], space.at('6'[#id], 'room1'[#id]))");
// key '4' is closer than '6', so, "this key" should deref to '4'
NLParseTest("this key is in the kitchen", o.getSort("performative"), context, "perf.inform([any], space.at('4'[#id], 'room1'[#id]))");
NLParseTest("that key is in the kitchen", o.getSort("performative"), context, "perf.inform([any], space.at('6'[#id], 'room1'[#id]))");
NLParseTest("the keys are in the kitchen", o.getSort("performative"), context, "#list(perf.inform(L:[any], space.at('4'[#id], R:'room1'[#id])), perf.inform(L, space.at('6'[#id], R)))");
NLParseTest("every key is in the kitchen", o.getSort("performative"), context, "#list(perf.inform(L:[any], space.at('4'[#id], R:'room1'[#id])), perf.inform(L, space.at('6'[#id], R)))");

// the next should fail, since the previous sentence mentioned two keys at once!
NLParseTest("the key is in the kitchen", o.getSort("performative"), context, null);

// clear the mentions, so we focus on the shortTermMemory:
context.mentions = [];
NLParseTest("this red thing is small", o.getSort("performative"), context, "perf.inform([any], small('6'[#id]))");
context.mentions = [];
NLParseTest("that red thing is big", o.getSort("performative"), context, "perf.inform([any], big('2'[#id]))");

NLParseTestUnifyingListener("my key is white", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], white('4'[#id],'white'[white]))");
NLParseTestUnifyingListener("the color of my key is white", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], color('4'[#id],'white'[white]))");
NLParseTestUnifyingListener("your vehicle is big", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], big('2'[#id]))");
NLParseTestUnifyingListener("the white key is mine", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], relation.owns('1'[#id],'4'[#id]))");
NLParseTestUnifyingListener("the ship is yours", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], relation.owns('etaoin'[#id],'2'[#id]))");
NLParseTestUnifyingListener("the ship is etaoin's", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], relation.owns('etaoin'[#id],'2'[#id]))");

context.expectingAnswerToQuestion_stack.push(new NLContextPerformative("dummy text so that the next are taken as answers", "1", null, null, 0));
context.expectingAnswerToQuestionTimeStamp_stack.push(0);
NLParseTestUnifyingListener("yes", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'yes'[symbol])");
NLParseTestUnifyingListener("I will", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'yes'[symbol])");
NLParseTestUnifyingListener("sure!!, I will", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'yes'[symbol])");
NLParseTestUnifyingListener("no", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'no'[symbol])");
NLParseTestUnifyingListener("absolutely not!!", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'no'[symbol])");
NLParseTestUnifyingListener("santi?", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], V1:proper-noun(V2:'santi'[symbol], V3:[singular]))");
NLParseTestUnifyingListener("I don't know", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'unknown'[symbol])");
NLParseTestUnifyingListener("don't know", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'unknown'[symbol])");
NLParseTestUnifyingListener("not sure", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'unknown'[symbol])");
NLParseTestUnifyingListener("I am not sure", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'unknown'[symbol])");
NLParseTestUnifyingListener("yes, I will find my key", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'yes'[symbol], verb.find('1'[#id], '4'[#id]))");

NLParseTestUnifyingListener("is my key white?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], white('4'[#id],'white'[white]))");
NLParseTestUnifyingListener("is etaoin not a robot?!", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], robot(V1:'etaoin'[#id]))");
NLParseTestUnifyingListener("am I blue?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], blue('1'[#id],'blue'[blue]))");
NLParseTestUnifyingListener("am I a man?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], man('1'[#id]))");
NLParseTestUnifyingListener("am I at the kitchen?!?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], space.at('1'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("is etaoin not in the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], space.at('etaoin'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("are the keys white??", o.getSort("performative"), context, 'etaoin', "#list(perf.q.predicate('etaoin'[#id], white('4'[#id],W:'white'[white])), perf.q.predicate('etaoin'[#id], white('6'[#id],W)))");
NLParseTest("are all keys white?", o.getSort("performative"), context, "perf.q.predicate([any], V1:#or(#not(key(X:[#id])),white(X,'white'[white])))");
NLParseTest("are all chairs small?", o.getSort("performative"), context, "perf.q.predicate([any], V1:#or(#not(chair(X:[#id])),small(X)))");
NLParseTest("is plato a man?", o.getSort("performative"), context, "perf.q.predicate(L:[any], #and(name(V1:'H-1-2'[#id],'plato'[symbol]), man(V1)))");
NLParseTest("was plato a man?", o.getSort("performative"), context, "perf.q.predicate(L:[any], #and(name(V1:'H-1-4'[#id],'plato'[symbol]), #and(V2:man(V1), time.past(V2))))");
NLParseTestUnifyingListener("is my key white?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], white('4'[#id],'white'[white]))");
NLParseTestUnifyingListener("is your vehicle big?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], big('2'[#id]))");
NLParseTestUnifyingListener("is the white key mine?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], relation.owns('1'[#id],'4'[#id]))");
NLParseTestUnifyingListener("is the ship yours?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], relation.owns('etaoin'[#id],'2'[#id]))");
NLParseTestUnifyingListener("is the ship etaoin's?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], relation.owns('etaoin'[#id],'2'[#id]))");

NLParseTestUnifyingListener("where am I?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], '1'[#id])");
NLParseTestUnifyingListener("where is the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], '4'[#id])");
NLParseTestUnifyingListener("where are you?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis(V:'etaoin'[#id], V)"); 
NLParseTestUnifyingListener("where in the station?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis(V:'etaoin'[#id], L, space.at(L,'location-aurora-station'[#id]))"); 
NLParseTestUnifyingListener("where are you in the station?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis(V:'etaoin'[#id], V, L, space.at(L,'location-aurora-station'[#id]))"); 

NLParseTestUnifyingListener("the ship's name is arcadia", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('2'[#id],'arcadia'[symbol]))");
NLParseTestUnifyingListener("what is my name?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, name('1'[#id],X))");
NLParseTestUnifyingListener("what is your name?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, name('etaoin'[#id],X))");
NLParseTestUnifyingListener("what is the ship's name?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, name('2'[#id],X))");
NLParseTestUnifyingListener("what is your small name?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(small(X), name('etaoin'[#id],X)))");

NLParseTestUnifyingListener("who are you?", o.getSort("performative"), context, 'etaoin', "perf.q.whois.noname('etaoin'[#id], 'etaoin'[#id])");
NLParseTestUnifyingListener("who is etaoin?", o.getSort("performative"), context, 'etaoin', "perf.q.whois.name('etaoin'[#id], 'etaoin'[#id])");
NLParseTestUnifyingListener("who was etaoin?", o.getSort("performative"), context, 'etaoin', "perf.q.whois.name('etaoin'[#id], 'etaoin'[#id])");
NLParseTestUnifyingListener("who is the artificial intelligence?", o.getSort("performative"), context, 'etaoin', "perf.q.whois.noname('etaoin'[#id], 'etaoin'[#id])");
NLParseTestUnifyingListener("who is bruce alper?", o.getSort("performative"), context, 'etaoin', "perf.q.whois.name('etaoin'[#id], X, name(X,'bruce alper'[symbol]))");

NLParseTestUnifyingListener("who is an ai?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), ai(X)))");
NLParseTestUnifyingListener("who is an artificial intelligence?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), ai(X)))");
NLParseTestUnifyingListener("who is in aurora station?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), space.at(X, 'location-aurora-station'[#id])))");
NLParseTestUnifyingListener("who is in the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), space.at(X, 'room1'[#id])))");

NLParseTestUnifyingListener("what are you?", o.getSort("performative"), context, 'etaoin', "perf.q.whatis.noname('etaoin'[#id], 'etaoin'[#id])");
NLParseTestUnifyingListener("what is the white thing?", o.getSort("performative"), context, 'etaoin', "perf.q.whatis.noname('etaoin'[#id], '4'[#id])");
NLParseTestUnifyingListener("what is etaoin?", o.getSort("performative"), context, 'etaoin', "perf.q.whatis.name('etaoin'[#id], 'etaoin'[#id])");

NLParseTestUnifyingListener("what is this room?", o.getSort("performative"),  context, 'etaoin', "perf.q.whatis.noname('etaoin'[#id], 'room1'[#id])");
NLParseTestUnifyingListener("what is this room etaoin?", o.getSort("performative"),  context, 'etaoin', "perf.q.whatis.noname('etaoin'[#id], 'room1'[#id])");
NLParseTestUnifyingListener("what is a room?", o.getSort("performative"),  context, 'etaoin', "perf.q.action(X:'etaoin'[#id], verb.define(X,[room]))");
NLParseTestUnifyingListener("I have the white key", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], verb.have('1'[#id],'4'[#id]))");
NLParseTestUnifyingListener("I do not have the white key", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #not(verb.have('1'[#id],'4'[#id])))");
NLParseTestUnifyingListener("Do I have the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.have('1'[#id],'4'[#id]))");
NLParseTestUnifyingListener("Who has the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), verb.have(X,'4'[#id])))");
NLParseTestUnifyingListener("what are the three laws of robotics?", o.getSort("performative"),  context, 'etaoin', "perf.q.action(X:'etaoin'[#id], verb.define(X, [three-laws-of-robotics]))");

NLParseTestUnifyingListener("Where is everybody?", o.getSort("performative"), context, 'etaoin', "#list(perf.q.whereis('etaoin'[#id], 'etaoin'[#id]), #list(perf.q.whereis('etaoin'[#id], '1'[#id]), perf.q.whereis('etaoin'[#id], 'H1'[#id])))");
NLParseTestUnifyingListener("where is everyone?", o.getSort("performative"),  context, 'etaoin', "#list(perf.q.whereis('etaoin'[#id], 'H1'[#id]), #list(perf.q.whereis('etaoin'[#id], 'etaoin'[#id]), perf.q.whereis('etaoin'[#id], '1'[#id])))");
NLParseTestUnifyingListener("is there food?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], food(X))");
NLParseTestUnifyingListener("is there any human in aurora station?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(human(X), space.at(X,'location-aurora-station'[#id])))");
NLParseTestUnifyingListener("is there anyone in aurora station?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(character(X), space.at(X,'location-aurora-station'[#id])))");
NLParseTestUnifyingListener("where is everyone else?", o.getSort("performative"),  context, 'etaoin', "perf.q.whereis('etaoin'[#id], 'H1'[#id])");
NLParseTestUnifyingListener("is there anyone?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], character(X))");
NLParseTestUnifyingListener("is there anyone here?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(space.at(X,'room1'[#id]), character(X)))");
NLParseTestUnifyingListener("who is here?", o.getSort("performative"),  context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), space.at(X,'room1'[#id])))");
NLParseTestUnifyingListener("is there anyone else here?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(#not(=(X,'etaoin'[#id])), #and(#not(=(X,'1'[#id])), #and(space.at(X,'room1'[#id]), character(X)))))");
NLParseTestUnifyingListener("who else is here?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(L:'etaoin'[#id], X, #and(character(X), #and(space.at(X,'room1'[#id]), #and(#not(=(X,'1'[#id])), #not(=(X,L))))))");
NLParseTestUnifyingListener("is there any human other than me here?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(#and(space.at(X,'room1'[#id]), human(X)), #not(=(X,'1'[#id]))))");
NLParseTestUnifyingListener("is there anyone else in aurora station?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(#not(=(X,'etaoin'[#id])), #and(#not(=(X,'1'[#id])), #and(space.at(X,'location-aurora-station'[#id]), character(X)))))");
NLParseTestUnifyingListener("is there someone else in aurora station?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(#not(=(X,'etaoin'[#id])), #and(#not(=(X,'1'[#id])), #and(space.at(X,'location-aurora-station'[#id]), character(X)))))");
NLParseTestUnifyingListener("is there someone else in the station?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(#not(=(X,'etaoin'[#id])), #and(#not(=(X,'1'[#id])), #and(space.at(X,'location-aurora-station'[#id]), character(X)))))");
NLParseTestUnifyingListener("is anyone else in aurora station?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(#not(=(X,'etaoin'[#id])), #and(#not(=(X,'1'[#id])), #and(space.at(X,'location-aurora-station'[#id]), character(X)))))");
NLParseTestUnifyingListener("who else is in the station?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(L:'etaoin'[#id], X, #and(character(X), #and(space.at(X,'location-aurora-station'[#id]), #and(#not(=(X,'1'[#id])), #not(=(X,L))))))");
NLParseTestUnifyingListener("who else is there in the station?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(L:'etaoin'[#id], X, #and(character(X), #and(space.at(X,'location-aurora-station'[#id]), #and(#not(=(X,'1'[#id])), #not(=(X,L))))))");

// tests inserting the target name in front:
NLParseTestUnifyingListener("etaoin my key is white", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], white('4'[#id],'white'[white]))");
NLParseTestUnifyingListener("etaoin, the ship is etaoin's", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], relation.owns('etaoin'[#id],'2'[#id]))");
NLParseTestUnifyingListener("etaoin I don't know", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'unknown'[symbol])");
NLParseTestUnifyingListener("etaoin am I a man?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], man('1'[#id]))");
NLParseTestUnifyingListener("etaoin, was plato a man?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(name(V1:'H-1-6'[#id],'plato'[symbol]), #and(V2:man(V1), time.past(V2))))");
NLParseTestUnifyingListener("etaoin, where am I?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], '1'[#id])");
NLParseTestUnifyingListener("etaoin, my name is david", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('1'[#id],'david'[symbol]))");
NLParseTestUnifyingListener("etaoin what is my name?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, name('1'[#id],X))");
NLParseTestUnifyingListener("etaoin, who are you?", o.getSort("performative"), context, 'etaoin', "perf.q.whois.noname('etaoin'[#id], 'etaoin'[#id])");
NLParseTestUnifyingListener("etaoin who is in aurora station?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), space.at(X, 'location-aurora-station'[#id])))");
NLParseTestUnifyingListener("etaoin what is the white thing?", o.getSort("performative"), context, 'etaoin', "perf.q.whatis.noname('etaoin'[#id], '4'[#id])");
NLParseTestUnifyingListener("etaoin, I have the white key", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], verb.have('1'[#id],'4'[#id]))");
NLParseTestUnifyingListener("etaoin, Do I have the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.have('1'[#id],'4'[#id]))");
NLParseTestUnifyingListener("etaoin, Who has the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), verb.have(X,'4'[#id])))");
NLParseTestUnifyingListener("etaoin Where is everybody?", o.getSort("performative"), context, 'etaoin', "#list(perf.q.whereis('etaoin'[#id], 'etaoin'[#id]), #list(perf.q.whereis('etaoin'[#id], '1'[#id]), perf.q.whereis('etaoin'[#id], 'H1'[#id])))");
NLParseTestUnifyingListener("etaoin, is there anyone in aurora station?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(character(X), space.at(X,'location-aurora-station'[#id])))");
NLParseTestUnifyingListener("etaoin, where is everyone else?", o.getSort("performative"),  context, 'etaoin', "perf.q.whereis('etaoin'[#id], 'H1'[#id])");
NLParseTestUnifyingListener("etaoin is there anyone?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], character(X))");
NLParseTestUnifyingListener("etaoin who else is here?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(L:'etaoin'[#id], X, #and(character(X), #and(space.at(X,'room1'[#id]), #and(#not(=(X,'1'[#id])), #not(=(X,L))))))");
NLParseTestUnifyingListener("etaoin take the white key", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], '4'[#id]))");

NLParseTest("any other human", o.getSort("nounPhrase"), context, "nounPhrase(V0:'human'[human], V1:[singular], V2:[third-person], #and(article.any(V0, V1), #and(determiner.other(V0, V1), V3:noun(V0, V1))))");
NLParseTestUnifyingListener("is there any other human?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate(V0:'etaoin'[#id], V2:#and(V3:#not(V4:=(V:[any], V6:'1'[#id])), V7:#and(V8:#not(V9:=(V, V10:'H1'[#id])), V11:human(V))))");
NLParseTestUnifyingListener("is there any other humans?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate(V0:'etaoin'[#id], V2:#and(V3:#not(V4:=(V:[any], V6:'1'[#id])), V7:#and(V8:#not(V9:=(V, V10:'H1'[#id])), V11:human(V))))");
NLParseTestUnifyingListener("is there any other human in this station?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate(V0:'etaoin'[#id], V1:#and(V2:#and(V3:#not(V4:=(V:[any], V6:'1'[#id])), V7:#and(V8:#not(V9:=(V, V10:'H1'[#id])), V11:human(V))), V12:space.at(V, V13:'location-aurora-station'[#id])))");
NLParseTestUnifyingListener("is there any other humans in this station?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate(V0:'etaoin'[#id], V1:#and(V2:#and(V3:#not(V4:=(V:[any], V6:'1'[#id])), V7:#and(V8:#not(V9:=(V, V10:'H1'[#id])), V11:human(V))), V12:space.at(V, V13:'location-aurora-station'[#id])))");

NLParseTestUnifyingListener("is your memory bank erased?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate(V0:'etaoin'[#id], erased('etaoin-memory'[#id]))");

NLParseTestUnifyingListener("can I have the white key?", o.getSort("performative"),  context, 'etaoin', "perf.q.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '1'[#id]))");  
NLParseTestUnifyingListener("could I have the white key?", o.getSort("performative"),  context, 'etaoin', "perf.q.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '1'[#id]))");
NLParseTestUnifyingListener("can you give me the white key?", o.getSort("performative"),  context, 'etaoin', "perf.q.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '1'[#id]))");
NLParseTestUnifyingListener("give me the white key", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '1'[#id]))");
NLParseTestUnifyingListener("give the white key to me", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '1'[#id]))");
NLParseTestUnifyingListener("give the white key to the crate", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '5'[#id]))");

NLParseTestUnifyingListener("do you see a key?", o.getSort("performative"),  context, 'etaoin', "perf.q.action(V0:'etaoin'[#id], verb.see(V0,X), key(X))");
NLParseTestUnifyingListener("can you see a key?", o.getSort("performative"),  context, 'etaoin', "perf.q.action(V0:'etaoin'[#id], verb.see(V0,X), key(X))");
NLParseTestUnifyingListener("do you see me?", o.getSort("performative"),  context, 'etaoin', "perf.q.action(V0:'etaoin'[#id], verb.see(V0,'1'[#id]))");

NLParseTestUnifyingListener("the white key has a tear", o.getSort("performative"),  context, 'etaoin', "perf.inform(V0:'etaoin'[#id], #and(verb.have('4'[#id], V4), tear(V4)))");

NLParseTestUnifyingListener("can you repair the white key?", o.getSort("performative"),  context, 'etaoin', "perf.q.action(V0:'etaoin'[#id], verb.repair('etaoin'[#id], '4'[#id]))");
NLParseTestUnifyingListener("would you take the white key?", o.getSort("performative"),  context, 'etaoin', "perf.q.action(V0:'etaoin'[#id], action.take('etaoin'[#id], '4'[#id]))");
NLParseTestUnifyingListener("please take the white key", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], '4'[#id]))");

NLParseTestUnifyingListener("what time is it?", o.getSort("performative"),  context, 'etaoin', "perf.q.when(V0:'etaoin'[#id], [time.minute], [time.now])");
NLParseTestUnifyingListener("what year is it?", o.getSort("performative"),  context, 'etaoin', "perf.q.when(V0:'etaoin'[#id], [time.year], [time.now])");
NLParseTestUnifyingListener("what day are we in?", o.getSort("performative"),  context, 'etaoin', "perf.q.when(V0:'etaoin'[#id], [time.day], [time.now])");
NLParseTestUnifyingListener("what day of the week are we in?", o.getSort("performative"),  context, 'etaoin', "perf.q.when(V0:'etaoin'[#id], [time.day], [time.now])");

NLParseTestUnifyingListener("what do you understand?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], X, verb.understand(V0, X))");
NLParseTestUnifyingListener("come here", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.come(V0, [space.here]))");
NLParseTestUnifyingListener("where is a key?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], X, L, key(X))");
NLParseTestUnifyingListener("where can I find a key?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], X, L, key(X))");
NLParseTestUnifyingListener("where can I find a red key?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], X, L, #and(red(X,'red'[red]),key(X)))");
NLParseTestUnifyingListener("where can I find the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], '4'[#id])");
NLParseTestUnifyingListener("it is white", o.getSort("performative"),  context, 'etaoin', "perf.inform(V0:'etaoin'[#id], white('4'[#id],'white'[white]))");
NLParseTestUnifyingListener("it's white", o.getSort("performative"),  context, 'etaoin', "perf.inform(V0:'etaoin'[#id], white('4'[#id],'white'[white]))");
NLParseTestUnifyingListener("give it to me", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '1'[#id]))");

NLParseTestUnifyingListener("where can I repair the white key?", o.getSort("performative"), context, 'etaoin',  "perf.q.whereis('etaoin'[#id], SOMEONE:'hypothetical-character'[#id], LOCATION, verb.can(SOMEONE,verb.repair(SOMEONE,'4'[#id])))");
NLParseTestUnifyingListener("where can I repair keys?", o.getSort("performative"), context, 'etaoin',  "perf.q.whereis('etaoin'[#id], SOMEONE:'hypothetical-character'[#id], LOCATION, #and(verb.can(SOMEONE,verb.repair(SOMEONE, X:'hypothetical-object'[#id])), key(X)))");

NLParseTestUnifyingListener("where should I go to find a key?", o.getSort("performative"), context, 'etaoin', "perf.q.whereto('etaoin'[#id], X, L, key(X))");
NLParseTestUnifyingListener("where should I go to repair the white key?", o.getSort("performative"), context, 'etaoin',  "perf.q.whereto('etaoin'[#id], SOMEONE:'hypothetical-character'[#id], L, verb.can(SOMEONE,verb.repair(SOMEONE,'4'[#id])))");
NLParseTestUnifyingListener("where should I go to repair keys?", o.getSort("performative"), context, 'etaoin',  "perf.q.whereto('etaoin'[#id], SOMEONE:'hypothetical-character'[#id], L, #and(verb.can(SOMEONE,verb.repair(SOMEONE,X:'hypothetical-object'[#id])), key(X)))");
NLParseTestUnifyingListener("where should I go?", o.getSort("performative"), context, 'etaoin',  "perf.q.whereto('etaoin'[#id], SOMEONE:'hypothetical-character'[#id], L, #or(verb.can(SOMEONE,GOAL), #not(goal('1'[#id],GOAL))))"); 
NLParseTestUnifyingListener("what should I do?", o.getSort("performative"), context, 'etaoin',  "perf.q.query('etaoin'[#id], X, goal('1'[#id],X))");

NLParseTestUnifyingListener("do you have the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.have('etaoin'[#id],'4'[#id]))");
NLParseTestUnifyingListener("do you have a key?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(verb.have('etaoin'[#id],X),key(X) ))");

NLParseTestUnifyingListener("who else?", o.getSort("performative"), context, 'etaoin', "perf.moreresults('etaoin'[#id])");
NLParseTestUnifyingListener("what else?", o.getSort("performative"), context, 'etaoin', "perf.moreresults('etaoin'[#id])");
NLParseTestUnifyingListener("anyone else?", o.getSort("performative"), context, 'etaoin', "perf.moreresults('etaoin'[#id])");

NLParseTestUnifyingListener("what is in the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(object(X), space.at(X, 'room1'[#id])))");
NLParseTestUnifyingListener("what is at the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(object(X), space.at(X, 'room1'[#id])))");

NLParseTestUnifyingListener("what color is the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, color('4'[#id], X))");
NLParseTestUnifyingListener("what is the color of the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, color('4'[#id], X))");
NLParseTestUnifyingListener("what is the name of me?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, name('1'[#id], X))");
NLParseTestUnifyingListener("what is my name?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, name('1'[#id], X))");
NLParseTestUnifyingListener("what is your name?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, name('etaoin'[#id], X))");
NLParseTestUnifyingListener("whats my name?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, name('1'[#id], X))");

NLParseTestUnifyingListener("what color is the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, color('4'[#id], X))");
NLParseTestUnifyingListener("what is this key?", o.getSort("performative"), context, 'etaoin', "perf.q.whatis.noname('etaoin'[#id], '4'[#id])");
NLParseTestUnifyingListener("what color is this key?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, color('4'[#id], X))");

NLParseTestUnifyingListener("my name is david", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('1'[#id],'david'[symbol]))");
NLParseTestUnifyingListener("my name is john", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('1'[#id],'john'[symbol]))");
NLParseTestUnifyingListener("my name is david bowman", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('1'[#id],'david bowman'[symbol]))");
NLParseTestUnifyingListener("I am david", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('1'[#id],'david'[symbol]))");
NLParseTestUnifyingListener("I am john", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('1'[#id],'john'[symbol]))");
NLParseTestUnifyingListener("I'm john", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('1'[#id],'john'[symbol]))");
NLParseTestUnifyingListener("I am called john", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('1'[#id],'john'[symbol]))");
NLParseTestUnifyingListener("you can call me john", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('1'[#id],'john'[symbol]))");

NLParseTestUnifyingListener("bedroom 5 is yours", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], relation.owns('etaoin'[#id],'room2'[#id]))");

// clear the mentions to restart
context.mentions = [];
NLParseTestUnifyingListener("who is there?", o.getSort("performative"),  context, 'etaoin', "perf.q.query('etaoin'[#id], X, character(X))");
NLParseTestUnifyingListener("who else is there?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(E:'etaoin'[#id], X, #and(character(X), #and(#not(=(X,'1'[#id])), #not(=(X,E)))))");

// now add a sentence that has a mention to a room:
NLParseTestUnifyingListener("where is the bedroom?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], 'room2'[#id])");
NLParseTestUnifyingListener("who is there?", o.getSort("performative"),  context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), space.at(X,'room2'[#id])))");

NLParseTestUnifyingListener("are you qwerty?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate(X:'etaoin'[#id], name(X,'qwerty'[symbol]))");
NLParseTestUnifyingListener("what do you do?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(X:'etaoin'[#id], QUERY, role(X,QUERY))");
NLParseTestUnifyingListener("what do you do in the station?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(X:'etaoin'[#id], QUERY, role(X, 'location-aurora-station'[#id], QUERY))"); 
NLParseTestUnifyingListener("what is your role?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(X:'etaoin'[#id], QUERY, role(X, QUERY))"); 
NLParseTestUnifyingListener("what is your role in the station?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(X:'etaoin'[#id], QUERY, role(X, 'location-aurora-station'[#id], QUERY))"); 

NLParseTestUnifyingListener("how much do I weight?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(X:'etaoin'[#id], QUERY, weight('1'[#id], QUERY))"); 
NLParseTestUnifyingListener("how heavy am I?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(X:'etaoin'[#id], QUERY, weight('1'[#id], QUERY))"); 
NLParseTestUnifyingListener("how tall am I?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(X:'etaoin'[#id], QUERY, height('1'[#id], QUERY))"); 

NLParseTestUnifyingListener("go to the kitchen", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.go-to(V0, 'room1'[#id]))"); 
NLParseTestUnifyingListener("go away", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.go(V0, [space.away]))"); 
NLParseTestUnifyingListener("move out of the way", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.move(V0, [space.away]))"); 
NLParseTestUnifyingListener("walk with me", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.follow(V0, '1'[#id]))"); 

NLParseTestUnifyingListener("what is this?", o.getSort("performative"),  context, 'etaoin', "perf.q.whatis.noname(V0:'etaoin'[#id], '4'[#id])"); 

// indirect commands:
NLParseTestUnifyingListener("tell the crate to come here", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], action.talk(V0, perf.request.action(TARGET:'5'[#id], verb.come(TARGET, [space.here]))))"); 
NLParseTestUnifyingListener("can you ask the crate to come here?", o.getSort("performative"),  context, 'etaoin', "perf.q.action(V0:'etaoin'[#id], action.talk(V0, perf.request.action(TARGET:'5'[#id], verb.come(TARGET, [space.here]))))"); 
NLParseTestUnifyingListener("tell the crate to tell me to follow you", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], action.talk(V0, perf.request.action(CRATE:'5'[#id], action.talk(CRATE, perf.request.action(ME:'1'[#id], verb.follow(ME, V0))))))"); 

// permission things:
NLParseTestUnifyingListener("I have permission to the kitchen", o.getSort("performative"),  context, 'etaoin', "perf.inform(V0:'etaoin'[#id], V1:permission-to-access(V3:'1'[#id], V8:'room1'[#id]))"); 
NLParseTestUnifyingListener("I have permission to go to the kitchen", o.getSort("performative"),  context, 'etaoin', "perf.inform(V0:'etaoin'[#id], V1:permission-to-access(V3:'1'[#id], V8:'room1'[#id]))"); 
NLParseTestUnifyingListener("I have permission to enter the kitchen", o.getSort("performative"),  context, 'etaoin', "perf.inform(V0:'etaoin'[#id], V1:permission-to-access(V3:'1'[#id], V8:'room1'[#id]))"); 
NLParseTestUnifyingListener("do I have permission to go to the kitchen?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate(V0:'etaoin'[#id], V1:permission-to-access(V3:'1'[#id], V8:'room1'[#id]))"); 
NLParseTestUnifyingListener("am I allowed in the kitchen?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], permitted-in('1'[#id],'room1'[#id]))"); 
NLParseTestUnifyingListener("am I allowed to go to the kitchen?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], permitted-in('1'[#id], 'room1'[#id]))"); 

NLParseTestUnifyingListener("can I go to the kitchen?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate(V0:'etaoin'[#id], V1:verb.can(V3:'1'[#id],verb.go-to(V3:'1'[#id], V8:'room1'[#id])))"); 
NLParseTestUnifyingListener("where can I go?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], X, V1:verb.can(V3:'1'[#id],verb.go(V3:'1'[#id], X)))"); 
NLParseTestUnifyingListener("where am I allowed to go?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], X, V1:permitted-in(V3:'1'[#id], X))"); 
NLParseTestUnifyingListener("where am I not allowed to go?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], X, V1:#not(permitted-in(V3:'1'[#id], X)))"); 
NLParseTestUnifyingListener("where do I have permission to go?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], X, V1:permission-to-access(V3:'1'[#id], X))"); 
NLParseTestUnifyingListener("where don't I have permission to go?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], X, V1:#not(permission-to-access(V3:'1'[#id], X)))"); 

NLParseTestUnifyingListener("how many keys are there?", o.getSort("performative"),  context, 'etaoin', "perf.q.howmany(V0:'etaoin'[#id], X, key(X))");  
NLParseTestUnifyingListener("how many keys do you have?", o.getSort("performative"),  context, 'etaoin', "perf.q.howmany(V0:'etaoin'[#id], X, #and(key(X), verb.have('etaoin'[#id],X)))");  
NLParseTestUnifyingListener("how many keys are there in the kitchen?", o.getSort("performative"),  context, 'etaoin', "perf.q.howmany(V0:'etaoin'[#id], X, #and(key(X), space.at(X,'room1'[#id])))"); 
NLParseTestUnifyingListener("how many keys are white?", o.getSort("performative"),  context, 'etaoin', "perf.q.howmany(V0:'etaoin'[#id], X, #and(white(X, 'white'[white]), key(X)))");

NLParseTestUnifyingListener("when did I come to the kitchen?", o.getSort("performative"),  context, 'etaoin', "perf.q.when('etaoin'[#id],verb.come-to('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("when was I in the kitchen?", o.getSort("performative"),  context, 'etaoin', "perf.q.when('etaoin'[#id],space.at('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("when was aurora station built?", o.getSort("performative"),  context, 'etaoin', "perf.q.when('etaoin'[#id],verb.build(X,'location-aurora-station'[#id]))");
NLParseTestUnifyingListener("when did you go to find minerals?", o.getSort("performative"),  context, 'etaoin', "perf.q.when(S:'etaoin'[#id],verb.go-to(S,verb.find(S,'mineral'[mineral])))");
NLParseTestUnifyingListener("when did you leave?", o.getSort("performative"),  context, 'etaoin', "perf.q.when(S:'etaoin'[#id],verb.leave(S))");

// which questions:
NLParseTestUnifyingListener("which is my room?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,#and(room(X), relation.owns('1'[#id],X)))");
NLParseTestUnifyingListener("which is your room?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,#and(room(X), relation.owns(S,X)))");

// this is just a performative so that the last object mentioned is a location
NLParseTest("the kitchen is big", o.getSort("performative"), context, "perf.inform([any], big('room1'[#id]))");
NLParseTest("where is that?", o.getSort("performative"), context, "perf.q.whereis([any], 'room1'[#id])");
NLParseTest("the kitchen is big", o.getSort("performative"), context, "perf.inform([any], big('room1'[#id]))");
NLParseTest("and where is that?", o.getSort("performative"), context, "perf.q.whereis([any], 'room1'[#id])");

NLParseTestUnifyingListener("lights on", o.getSort("performative"), context, 'etaoin', "perf.request.action(S:'etaoin'[#id], verb.switch-on(S,'l1'[#id]))");
NLParseTestUnifyingListener("turn the lights on", o.getSort("performative"), context, 'etaoin', "perf.request.action(S:'etaoin'[#id], verb.switch-on(S,'l1'[#id]))");
NLParseTestUnifyingListener("please turn on the lights", o.getSort("performative"), context, 'etaoin', "perf.request.action(S:'etaoin'[#id], verb.switch-on(S,'l1'[#id]))");
NLParseTestUnifyingListener("could you please turn on the lights?", o.getSort("performative"), context, 'etaoin', "perf.q.action(S:'etaoin'[#id], verb.switch-on(S,'l1'[#id]))");
NLParseTestUnifyingListener("would you switch off the lights?", o.getSort("performative"), context, 'etaoin', "perf.q.action(S:'etaoin'[#id], verb.switch-off(S,'l1'[#id]))");

NLParseTestUnifyingListener("what are you doing?", o.getSort("performative"), context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,verb.do(S,X))");
NLParseTestUnifyingListener("what are you doing today?", o.getSort("performative"), context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,#and(A:verb.do(S,X), time.today(A)))");
NLParseTestUnifyingListener("what are you doing now?", o.getSort("performative"), context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,#and(A:verb.do(S,X), time.now(A)))");
NLParseTestUnifyingListener("what are you doing right now?", o.getSort("performative"), context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,#and(A:verb.do(S,X), time.now(A)))");

// Why tests:
NLParseTestUnifyingListener("why are you following me?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id],verb.follow(S,'1'[#id]))");
NLParseTestUnifyingListener("why did you come here?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id],verb.come(S,[space.here]))");
NLParseTestUnifyingListener("why was I in stasis?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id],in-stasis('1'[#id]))");
NLParseTestUnifyingListener("why am I here?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id],space.at('1'[#id],[space.here]))");
NLParseTestUnifyingListener("why am I in the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id],space.at('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("why are there no humans?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id],#not(human(X)))");
NLParseTestUnifyingListener("why is there no humans?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id],#not(human(X)))");
NLParseTestUnifyingListener("why there is no humans?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id],#not(human(X)))");
NLParseTestUnifyingListener("why did you leave?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id],verb.leave('etaoin'[#id]))");
NLParseTestUnifyingListener("what am I doing here?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id],space.at('1'[#id],[space.here]))");

// deny request
NLParseTestUnifyingListener("I can not do that", o.getSort("performative"),  context, 'etaoin', "perf.ack.denyrequest('etaoin'[#id])");
NLParseTestUnifyingListener("I cannot do that", o.getSort("performative"),  context, 'etaoin', "perf.ack.denyrequest('etaoin'[#id])");

// causes:
NLParseTestUnifyingListener("I came to the kitchen because I wanted food", o.getSort("performative"),  context, 'etaoin', "perf.inform('etaoin'[#id], relation.cause(verb.come-to('1'[#id],'room1'[#id]), verb.want('1'[#id], [food]) ))");

// how questions:
NLParseTestUnifyingListener("How do I go to the kitchen?", o.getSort("performative"),  context, 'etaoin', "perf.q.how('etaoin'[#id], verb.go-to('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("How do I get to the kitchen?", o.getSort("performative"),  context, 'etaoin', "perf.q.how('etaoin'[#id], verb.go-to('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("How do I reach the kitchen?", o.getSort("performative"),  context, 'etaoin', "perf.q.how('etaoin'[#id], verb.reach('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("How do I go there?", o.getSort("performative"),  context, 'etaoin', "perf.q.how('etaoin'[#id], verb.go('1'[#id],[space.there]))");
NLParseTestUnifyingListener("How do I fix the crate?", o.getSort("performative"),  context, 'etaoin', "perf.q.how('etaoin'[#id], verb.repair('1'[#id],'5'[#id]))");
NLParseTestUnifyingListener("How can I go outside?", o.getSort("performative"),  context, 'etaoin', "perf.q.how('etaoin'[#id], verb.go('1'[#id],[space.outside]))");
NLParseTestUnifyingListener("How can I go outside of the kitchen?", o.getSort("performative"),  context, 'etaoin', "perf.q.how('etaoin'[#id], verb.go-out('1'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("How do I get out of the kitchen?", o.getSort("performative"),  context, 'etaoin', "perf.q.how('etaoin'[#id], verb.go-out('1'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("How do I fix a battery?", o.getSort("performative"),  context, 'etaoin', "perf.q.how('etaoin'[#id], verb.repair('1'[#id],[battery]))");
NLParseTestUnifyingListener("how do i get into the kitchen??", o.getSort("performative"),  context, 'etaoin', "perf.q.how('etaoin'[#id], verb.go-to('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("how do i open the kitchen??", o.getSort("performative"),  context, 'etaoin', "perf.q.how('etaoin'[#id], action.open('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("how do i open kitchen??", o.getSort("performative"),  context, 'etaoin', "perf.q.how('etaoin'[#id], action.open('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("how i open kitchen??", o.getSort("performative"),  context, 'etaoin', "perf.q.how('etaoin'[#id], action.open('1'[#id],'room1'[#id]))");

NLParseTestUnifyingListener("When was I born?", o.getSort("performative"),  context, 'etaoin', "perf.q.when('etaoin'[#id],property.born('1'[#id]))");
NLParseTestUnifyingListener("what year was I born?", o.getSort("performative"),  context, 'etaoin', "perf.q.when('etaoin'[#id], 'time.year'[time.year], property.born('1'[#id]))");
NLParseTestUnifyingListener("what month was I born?", o.getSort("performative"),  context, 'etaoin', "perf.q.when('etaoin'[#id], 'time.month'[time.month], property.born('1'[#id]))");
NLParseTestUnifyingListener("what day was I born?", o.getSort("performative"),  context, 'etaoin', "perf.q.when('etaoin'[#id], 'time.day'[time.day], property.born('1'[#id]))");

// special cases
NLParseTestUnifyingListener("I need the white key", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], '4'[#id])");
NLParseTestUnifyingListener("what is happening?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,verb.happen(WHO, X))");
NLParseTestUnifyingListener("what happens?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,verb.happen(WHO, X))");
NLParseTestUnifyingListener("what happened?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,#and(V:verb.happen(WHO, X),time.past(V)))");
NLParseTestUnifyingListener("did something happen?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,verb.happen(WHO, X))");
NLParseTestUnifyingListener("what happened to me?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,#and(V:verb.happen('1'[#id], X),time.past(V)))");
NLParseTestUnifyingListener("what is happening to me?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,verb.happen('1'[#id], X))");
NLParseTestUnifyingListener("what's up?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,verb.happen(WHO, X))");
NLParseTestUnifyingListener("whats up?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,verb.happen(WHO, X))");
NLParseTestUnifyingListener("what is going on?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,verb.happen(WHO, X))");

// from Ahmed
NLParseTestUnifyingListener("I don't think so", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'no'[symbol])");
NLParseTestUnifyingListener("is there anyone other than me here?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(#and(space.at(X,'room1'[#id]), character(X)), #not(=(X,'1'[#id]))))");
NLParseTestUnifyingListener("is there anyone other than me on the station?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(#and(space.on.top.of(X,'location-aurora-station'[#id]), character(X)), #not(=(X,'1'[#id]))))");
NLParseTestUnifyingListener("Is there anyone beside me in the station?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(#and(space.at(X,'location-aurora-station'[#id]), character(X)), #not(=(X,'1'[#id]))))");
NLParseTestUnifyingListener("Is there anyone beside me in that station?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(#and(space.at(X,'location-aurora-station'[#id]), character(X)), #not(=(X,'1'[#id]))))");
NLParseTestUnifyingListener("what is your functionality?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, role('etaoin'[#id], X))");
NLParseTestUnifyingListener("do I have access to the kitchen?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate(V0:'etaoin'[#id], V1:permission-to-access(V3:'1'[#id], V8:'room1'[#id]))"); 
NLParseTestUnifyingListener("can I enter the kitchen?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate(V0:'etaoin'[#id], verb.can(V2:'1'[#id], V3:verb.enter(V2, V4:'room1'[#id])))"); 
NLParseTestUnifyingListener("can I access the kitchen?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate(V0:'etaoin'[#id], verb.can(V2:'1'[#id], V3:verb.access(V2, V4:'room1'[#id])))"); 
NLParseTestUnifyingListener("are there no humans other than me?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(human(X), #not(=(X,'1'[#id]))))");
NLParseTestUnifyingListener("So, are there no humans other than me?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(human(X), #not(=(X,'1'[#id]))))");
NLParseTestUnifyingListener("So there is no humans other than me?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(human(X), #not(=(X,'1'[#id]))))");
NLParseTestUnifyingListener("can I go to space?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate(V0:'etaoin'[#id], V1:verb.can(V3:'1'[#id],verb.go-to(V3:'1'[#id], V8:'space'[#id])))"); 
NLParseTestUnifyingListener("is david here?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate(V0:'etaoin'[#id], #and(name(X,'david'[symbol]), space.at(X,'room1'[#id])))"); 

// parse errors
NLParseTestUnifyingListener("I cannot parse the sentence", o.getSort("performative"),  context, 'etaoin', "perf.inform(V0:'etaoin'[#id], #not(verb.can('1'[#id],verb.parse('1'[#id],'sentence'[sentence]))))"); 

// Some additional tests for time:
NLParseTestUnifyingListener("when did you malfunction?", o.getSort("performative"),  context, 'etaoin', "perf.q.when('etaoin'[#id],verb.malfunction('etaoin'[#id]))"); 
NLParseTestUnifyingListener("are you malfunctioning?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id],verb.malfunction('etaoin'[#id]))"); 
NLParseTestUnifyingListener("did you malfunction?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id],#and(V:verb.malfunction('etaoin'[#id]), time.past(V)))"); 
NLParseTestUnifyingListener("did you malfunction yesterday?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id],#and(V:verb.malfunction('etaoin'[#id]), time.yesterday(V)))"); 
NLParseTestUnifyingListener("am I in stasis?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id],in-stasis('1'[#id]))"); 
NLParseTestUnifyingListener("was I in stasis?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id],#and(V:in-stasis('1'[#id]), time.past(V)))"); 
NLParseTestUnifyingListener("was I in stasis yesterday?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id],#and(V:in-stasis('1'[#id]), time.yesterday(V)))"); 
NLParseTestUnifyingListener("am I in the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate(S:'etaoin'[#id],space.at('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("was I in the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate(S:'etaoin'[#id],#and(V:space.at('1'[#id],'room1'[#id]), time.past(V)))");
NLParseTestUnifyingListener("was I in the kitchen yesterday?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate(S:'etaoin'[#id],#and(V:space.at('1'[#id],'room1'[#id]), time.yesterday(V)))");
NLParseTestUnifyingListener("have I been in the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate(S:'etaoin'[#id],#and(V:space.at('1'[#id],'room1'[#id]), time.past(V)))");
NLParseTestUnifyingListener("have I been in the kitchen today?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate(S:'etaoin'[#id],#and(V:space.at('1'[#id],'room1'[#id]), time.today(V)))");
NLParseTestUnifyingListener("did I colonize aurora station?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id],#and(V:verb.colonize('1'[#id], 'location-aurora-station'[#id]), time.past(V)))");

NLParseTestUnifyingListener("Who are you supervising?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], X, #and(verb.supervise('etaoin'[#id],X), character(X)))");
NLParseTestUnifyingListener("Who do you supervise?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], X, #and(verb.supervise('etaoin'[#id],X), character(X)))");
NLParseTestUnifyingListener("What is my age?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], X, property.age('1'[#id], X))");
NLParseTestUnifyingListener("How old am I?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], X, property.age('1'[#id], X))");

NLParseTestUnifyingListener("which planet am I in?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], L, #and(planet(L), space.at('1'[#id],L)))");
NLParseTestUnifyingListener("arent you bored?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], bored('etaoin'[#id]))");
NLParseTestUnifyingListener("what is your problem?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, property.problem('etaoin'[#id], X))"); 
NLParseTestUnifyingListener("what is etaoin's problem?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, property.problem('etaoin'[#id], X))");
NLParseTestUnifyingListener("what is the problem of etaoin?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, property.problem('etaoin'[#id], X))");
NLParseTestUnifyingListener("is there something abnormal?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], property.strange(X))");
NLParseTestUnifyingListener("is there anything odd?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], property.strange(X))");
NLParseTestUnifyingListener("is there something weird going on?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], property.strange(X))");

NLParseTestUnifyingListener("what is odd?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, property.strange(X))");
NLParseTestUnifyingListener("what is happening that is weird?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,#and(verb.happen(WHO, X), property.strange(X)))");
NLParseTestUnifyingListener("what is going on that is weird?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,#and(verb.happen(WHO, X), property.strange(X)))");
NLParseTestUnifyingListener("what was going on that is weird?", o.getSort("performative"),  context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,#and(V:verb.happen(WHO, X), #and(property.strange(X), time.past(V))))"); 

NLParseTestUnifyingListener("good!!!", o.getSort("performative"), context, 'etaoin', "perf.sentiment.good('etaoin'[#id])");  
NLParseTestUnifyingListener("owww...", o.getSort("performative"), context, 'etaoin', "perf.sentiment.bad('etaoin'[#id])");  
NLParseTestUnifyingListener("that is sad", o.getSort("performative"), context, 'etaoin', "perf.sentiment.bad('etaoin'[#id])");  
NLParseTestUnifyingListener("wtf!?", o.getSort("performative"), context, 'etaoin', "perf.sentiment.surprise('etaoin'[#id])");  
NLParseTestUnifyingListener("what the hell?!", o.getSort("performative"), context, 'etaoin', "perf.sentiment.surprise('etaoin'[#id])"); 
NLParseTestUnifyingListener("what is west of here?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(object(X), space.west.of(X, 'room1'[#id])))");  
NLParseTestUnifyingListener("what is west of me?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(object(X), space.west.of(X, '1'[#id])))");
NLParseTestUnifyingListener("what is behind this crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(object(X), space.behind(X, '5'[#id])))");  
NLParseTestUnifyingListener("is there anyone in this room?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(character(X), space.at(X, 'room1'[#id])))");
NLParseTestUnifyingListener("is there anyone behind this crate?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(character(X), space.behind(X, '5'[#id])))");  
NLParseTestUnifyingListener("is there any human in this room?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(human(X), space.at(X, 'room1'[#id])))");  
NLParseTestUnifyingListener("what room is behind this crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(room(X), space.behind(X, '5'[#id])))");  
NLParseTestUnifyingListener("which room is behind this crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(room(X), space.behind(X, '5'[#id])))");  

NLParseTestUnifyingListener("I remember my name", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], verb.remember(P:'1'[#id], name(P, X)))");
NLParseTestUnifyingListener("I think I remember my name", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], verb.remember(P:'1'[#id], name(P, X)))");
NLParseTestUnifyingListener("I know my name", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], verb.know(P:'1'[#id], name(P, X)))");
NLParseTestUnifyingListener("I know my name now", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #and(PRED:verb.know(P:'1'[#id], name(P, X)), time.now(PRED)))");

NLParseTestUnifyingListener("call me john", o.getSort("performative"), context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.call('etaoin'[#id], '1'[#id], 'john'[symbol]))");
NLParseTestUnifyingListener("don't call me john", o.getSort("performative"), context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], #not(verb.call('etaoin'[#id], '1'[#id], 'john'[symbol])))");
NLParseTestUnifyingListener("don't call me human", o.getSort("performative"), context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], #not(verb.call('etaoin'[#id], '1'[#id], 'human'[human])))");

NLParseTestUnifyingListener("take me to the kitchen", o.getSort("performative"), context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.take-to('etaoin'[#id], '1'[#id], 'room1'[#id]))"); 
NLParseTestUnifyingListener("take the crate to the kitchen", o.getSort("performative"), context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.take-to('etaoin'[#id], '5'[#id], 'room1'[#id]))"); 
NLParseTestUnifyingListener("can you take me to the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.action(V0:'etaoin'[#id], verb.take-to('etaoin'[#id], '1'[#id], 'room1'[#id]))"); 
NLParseTestUnifyingListener("can you show me to the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.action(V0:'etaoin'[#id], verb.take-to('etaoin'[#id], '1'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("guide me to the kitchen", o.getSort("performative"), context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.take-to('etaoin'[#id], '1'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("show me the way to the kitchen", o.getSort("performative"), context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.take-to('etaoin'[#id], '1'[#id], 'room1'[#id]))");

// clear the mentions to restart
context.shortTermMemory.splice(context.shortTermMemory.indexOf(socrates_entity));

// follow-up questions:
NLParseTestUnifyingListener("where?", o.getSort("performative"),  context, 'etaoin', "perf.q.whereis(S:'etaoin'[#id])");
NLParseTestUnifyingListener("how many?", o.getSort("performative"),  context, 'etaoin', "perf.q.howmany(S:'etaoin'[#id])");
NLParseTestUnifyingListener("why?", o.getSort("performative"),  context, 'etaoin', "perf.q.why(S:'etaoin'[#id])");
NLParseTestUnifyingListener("why not?", o.getSort("performative"),  context, 'etaoin', "perf.q.why(S:'etaoin'[#id])");
NLParseTestUnifyingListener("how come?", o.getSort("performative"),  context, 'etaoin', "perf.q.why(S:'etaoin'[#id])");
NLParseTestUnifyingListener("who?", o.getSort("performative"),  context, 'etaoin', "perf.q.query-followup(S:'etaoin'[#id],'character'[character])");
NLParseTestUnifyingListener("which?", o.getSort("performative"),  context, 'etaoin', "perf.q.query-followup(S:'etaoin'[#id],'object'[object])");
NLParseTestUnifyingListener("which one?", o.getSort("performative"),  context, 'etaoin', "perf.q.query-followup(S:'etaoin'[#id],'object'[object])");
NLParseTestUnifyingListener("which ones?", o.getSort("performative"),  context, 'etaoin', "perf.q.query-followup(S:'etaoin'[#id],'object'[object])");
NLParseTestUnifyingListener("like what?", o.getSort("performative"),  context, 'etaoin', "perf.q.query-followup(S:'etaoin'[#id],'any'[any])");
NLParseTestUnifyingListener("what is?", o.getSort("performative"),  context, 'etaoin', "perf.q.query-followup(S:'etaoin'[#id],'any'[any])");
NLParseTestUnifyingListener("which room?", o.getSort("performative"),  context, 'etaoin', "perf.q.query-followup(S:'etaoin'[#id],'room'[room])");
NLParseTestUnifyingListener("I mean which room?", o.getSort("performative"),  context, 'etaoin', "perf.q.query-followup(S:'etaoin'[#id],'room'[room])");

NLParseTestUnifyingListener("I don't", o.getSort("performative"),  context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'no'[symbol])");
NLParseTestUnifyingListener("Oh hi!", o.getSort("performative"),  context, 'etaoin', "perf.greet(V0:'etaoin'[#id])");
NLParseTestUnifyingListener("how to take the crate?", o.getSort("performative"),  context, 'etaoin', "perf.q.how('etaoin'[#id], action.take('1'[#id],'5'[#id]))");
NLParseTestUnifyingListener("am I alone in the station?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate(S:'etaoin'[#id], alone-in('1':[#id],'location-aurora-station':[#id]))");
NLParseTestUnifyingListener("am I the only human in the station?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate-negated(S:'etaoin'[#id], #and(#not(=(X,'1'[#id])), #and(space.at(X,'location-aurora-station'[#id]), human(X))))");
NLParseTestUnifyingListener("any human here?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(human(X), space.at(X,'room1'[#id])))");
NLParseTestUnifyingListener("any other human here?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(#not(=(X,'1'[#id])), #and(human(X), space.at(X,'room1'[#id]))))");
NLParseTestUnifyingListener("any human here other than me?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(#not(=(X,'1'[#id])), #and(human(X), space.at(X,'room1'[#id]))))");
NLParseTestUnifyingListener("any human other than me here?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(#not(=(X,'1'[#id])), #and(human(X), space.at(X,'room1'[#id]))))");
NLParseTestUnifyingListener("any humans the crate?", o.getSort("performative"),  context, 'etaoin', null);
NLParseTestUnifyingListener("who is this?", o.getSort("performative"),  context, 'etaoin', "perf.q.whois.noname('etaoin'[#id], 'etaoin'[#id])");
NLParseTestUnifyingListener("is someone there with you?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(character(X), #and(#not(=(X,'etaoin'[#id])), #and(space.at('etaoin'[#id], L), space.at(X, L)))))");
NLParseTestUnifyingListener("is this the kitchen?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], space.at('1'[#id], 'room1'[#id]))"); 
NLParseTestUnifyingListener("help me!", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.help(V0, '1'[#id]))");
NLParseTestUnifyingListener("help!!!", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.help(V0, '1'[#id]))");

NLParseTestUnifyingListener("connect me with etaoin", o.getSort("performative"), context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.connect-to('etaoin'[#id], '1'[#id], 'etaoin'[#id]))"); 
NLParseTestUnifyingListener("put me through to etaoin", o.getSort("performative"), context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.connect-to('etaoin'[#id], '1'[#id], 'etaoin'[#id]))"); 
NLParseTestUnifyingListener("can I talk to etaoin?", o.getSort("performative"), context, 'etaoin', "perf.q.action(V0:'etaoin'[#id], verb.connect-to('etaoin'[#id], '1'[#id], 'etaoin'[#id]))"); 
NLParseTestUnifyingListener("can I talk with etaoin?", o.getSort("performative"), context, 'etaoin', "perf.q.action(V0:'etaoin'[#id], verb.connect-to('etaoin'[#id], '1'[#id], 'etaoin'[#id]))"); 
NLParseTestUnifyingListener("I want to talk to etaoin", o.getSort("performative"), context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.connect-to('etaoin'[#id], '1'[#id], 'etaoin'[#id]))"); 

NLParseTestUnifyingListener("can this crate talk?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate(V0:'etaoin'[#id], verb.can('5'[#id], action.talk('5'[#id])))");
NLParseTestUnifyingListener("what can this crate do?", o.getSort("performative"), context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], X, verb.can('5'[#id], X))");
NLParseTestUnifyingListener("can you talk?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate(V0:'etaoin'[#id], verb.can('etaoin'[#id], action.talk('etaoin'[#id])))");

NLParseTestUnifyingListener("do you know my password?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, password('1'[#id], X))");
NLParseTestUnifyingListener("do you know what is my password?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, password('1'[#id], X))");
NLParseTestUnifyingListener("who might know?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], WHO, #and(character(WHO), verb.know(WHO, password('1'[#id], X))))");  
NLParseTestUnifyingListener("would the crate know?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.know('5'[#id], password('1'[#id], X)))");
NLParseTestUnifyingListener("do you think the crate would know?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.know('5'[#id], password('1'[#id], X)))");
NLParseTestUnifyingListener("do you know anyone who might know?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], WHO, #and(character(WHO), verb.know(WHO, password('1'[#id], X))))");
NLParseTestUnifyingListener("is there anyone who may know?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(character(WHO), verb.know(WHO, password('1'[#id], X))))");
NLParseTestUnifyingListener("is there anyone who knows?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(character(WHO), verb.know(WHO, password('1'[#id], X))))");
NLParseTestUnifyingListener("who might know my name?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], WHO, #and(character(WHO), verb.know(WHO, name('1'[#id], X))))");  
NLParseTestUnifyingListener("who knows my name?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], WHO, #and(character(WHO), verb.know(WHO, name('1'[#id], X))))");  

NLParseTestUnifyingListener("what is the gravity of this room?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, gravity('room1'[#id], X))");
NLParseTestUnifyingListener("what is the gravity in this room?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, gravity('room1'[#id], X))");
NLParseTestUnifyingListener("what is the gravity here?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, gravity('room1'[#id], X))");

NLParseTestUnifyingListener("why am I so light?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id], light-weight('1'[#id],'light-weight'[light-weight]))");  
NLParseTestUnifyingListener("why do I feel light?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id], light-weight('1'[#id],'light-weight'[light-weight]))");  
NLParseTestUnifyingListener("why is the gravity in this room so low?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id], gravity('room1'[#id],'gravity.low'[gravity.low]))");  
NLParseTestUnifyingListener("why is gravity so low here?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id], gravity('room1'[#id],'gravity.low'[gravity.low]))");  
NLParseTestUnifyingListener("why is gravity so low?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id], gravity('room1'[#id],'gravity.low'[gravity.low]))");
NLParseTestUnifyingListener("why is david's gravity so low?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id], gravity('1'[#id],'gravity.low'[gravity.low]))");  

NLParseTestUnifyingListener("what is the temperature outside?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, temperature('spacer-valley'[#id], X))"); 
NLParseTestUnifyingListener("what's the temperature?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, temperature('room1'[#id], X))"); 
NLParseTestUnifyingListener("how hot is it?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, temperature('room1'[#id], X))"); 
NLParseTestUnifyingListener("how cold is it in the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, temperature('room1'[#id], X))"); 
NLParseTestUnifyingListener("how warm is it here?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, temperature('room1'[#id], X))"); 

// From AIIDE:
NLParseTestUnifyingListener("hey there", o.getSort("performative"), context, 'etaoin', "perf.greet('etaoin'[#id])");
NLParseTestUnifyingListener("not at all", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'no'[symbol])");
NLParseTestUnifyingListener("hell no", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'no'[symbol])");
NLParseTestUnifyingListener("I do", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'yes'[symbol])");
NLParseTestUnifyingListener("great, thanks", o.getSort("performative"), context, 'etaoin', "perf.thankyou('etaoin'[#id])");
NLParseTestUnifyingListener("how is it going?", o.getSort("performative"), context, 'etaoin', "perf.q.howareyou('etaoin'[#id])");
NLParseTestUnifyingListener("how's it going", o.getSort("performative"), context, 'etaoin', "perf.q.howareyou('etaoin'[#id])");
NLParseTestUnifyingListener("stop following me", o.getSort("performative"), context, 'etaoin', "perf.request.stopaction(V0:'etaoin'[#id], verb.follow('etaoin'[#id], '1'[#id]))");
NLParseTestUnifyingListener("do not follow me", o.getSort("performative"), context, 'etaoin', "perf.request.stopaction(V0:'etaoin'[#id], verb.follow('etaoin'[#id], '1'[#id]))");
NLParseTestUnifyingListener("stop moving", o.getSort("performative"), context, 'etaoin', "perf.request.stopaction(V0:'etaoin'[#id], verb.move('etaoin'[#id]))");
NLParseTestUnifyingListener("get out of the way", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.go(V0, [space.away]))"); 
NLParseTestUnifyingListener("get out of the way please", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.go(V0, [space.away]))"); 
NLParseTestUnifyingListener("get out of the way please etaoin", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.go(V0, [space.away]))"); 
NLParseTestUnifyingListener("will you come with me?", o.getSort("performative"), context, 'etaoin', "perf.q.action(V0:'etaoin'[#id], verb.follow('etaoin'[#id], '1'[#id]))");
NLParseTestUnifyingListener("great, what should I do?", o.getSort("performative"), context, 'etaoin',  "perf.q.query('etaoin'[#id], X, goal('1'[#id],X))");
NLParseTestUnifyingListener("do you speak english?", o.getSort("performative"), context, 'etaoin',  "perf.q.predicate('etaoin'[#id], verb.speak('etaoin'[#id], 'english'[#id]))");
NLParseTestUnifyingListener("where is the other people?", o.getSort("performative"), context, 'etaoin',  "perf.q.whereis('etaoin'[#id], X, L, #and(human(X), #and(#not(=(X,'1'[#id])), #not(=(X,'etaoin'[#id])))))");
NLParseTestUnifyingListener("how many keys are here?", o.getSort("performative"),  context, 'etaoin', "perf.q.howmany(V0:'etaoin'[#id], X, #and(key(X), space.at(X,'room1'[#id])))"); 
NLParseTestUnifyingListener("how many keys are there here?", o.getSort("performative"),  context, 'etaoin', "perf.q.howmany(V0:'etaoin'[#id], X, #and(key(X), space.at(X,'room1'[#id])))"); 
NLParseTestUnifyingListener("Why is there a dead human?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id], #and(human(X), dead(X)))");
NLParseTestUnifyingListener("Why is there a dead human in the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id], #and(space.at(X, 'room1'[#id]), #and(human(X), dead(X))))");
NLParseTestUnifyingListener("Why is there a dead human here?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id], #and(space.at(X, 'room1'[#id]), #and(human(X), dead(X))))");  
NLParseTestUnifyingListener("okay, how can I reach the kitchen?", o.getSort("performative"),  context, 'etaoin', "perf.q.how('etaoin'[#id], verb.reach('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("my name is not santi", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #not(name('1'[#id],'santi'[symbol])))");
NLParseTestUnifyingListener("am I the only human?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate-negated(S:'etaoin'[#id], #and(#not(=(X,'1'[#id])), human(X)))");
NLParseTestUnifyingListener("am I the last human?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate-negated(S:'etaoin'[#id], #and(#not(=(X,'1'[#id])), #and(alive(X), human(X))))");
NLParseTestUnifyingListener("am I the only human alive?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate-negated(S:'etaoin'[#id], #and(#not(=(X,'1'[#id])), #and(alive(X), human(X))))");
NLParseTestUnifyingListener("am I the last human alive?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate-negated(S:'etaoin'[#id], #and(#not(=(X,'1'[#id])), #and(alive(X), human(X))))");
NLParseTestUnifyingListener("Why can't you repair the crate??", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id],#not(verb.can('etaoin'[#id], verb.repair('etaoin'[#id],'5'[#id]))))");
NLParseTestUnifyingListener("there is a corpse here", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #and(corpse(X), space.at(X,'room1'[#id])))");
NLParseTestUnifyingListener("there is a crate in the kitchen", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #and(crate(X), space.at(X,'room1'[#id])))");

// Notice that the "is there a corpse?" is asked twice, this is because the second was earlier parsed as "is the bedroom a corpse?"
testAI.time_in_seconds++;
NLParseTestUnifyingListener("is there a corpse?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], corpse(X))"); 
NLParseTestUnifyingListener("the bedroom is a room", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], room(V1:'room2'[#id]))");
NLParseTestUnifyingListener("is there a corpse?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], corpse(X))"); 

NLParseTestUnifyingListener("how do i get outside of the kitchen", o.getSort("performative"), context, 'etaoin', "perf.q.how('etaoin'[#id], verb.go-out('1'[#id], 'room1'[#id]))"); 
NLParseTestUnifyingListener("You need a space suit", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #and(verb.need('etaoin'[#id], X), spacesuit(X)))"); 
NLParseTestUnifyingListener("You will need a space suit", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #and(#and(V:verb.need('etaoin'[#id], X), spacesuit(X)), time.future(V)))");
NLParseTestUnifyingListener("how should i find the crate", o.getSort("performative"), context, 'etaoin', "perf.q.how('etaoin'[#id], verb.find('1'[#id], '5'[#id]))");
NLParseTestUnifyingListener("whose crate is this?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, relation.owns(X, '5'[#id]))");
NLParseTestUnifyingListener("who is the owner of this crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, relation.owns(X, '5'[#id]))");
NLParseTestUnifyingListener("who owns this crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], V1:[any], V2:#and(V3:character(V1), V4:verb.own(V1, V5:'5'[#id])))");
NLParseTestUnifyingListener("am I the last human here?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate-negated(S:'etaoin'[#id], #and(#not(=(X,'1'[#id])), #and(alive(X), #and(human(X), space.at(X, 'room1'[#id])))))");
NLParseTestUnifyingListener("am I the only human here?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate-negated(S:'etaoin'[#id], #and(#not(=(X,'1'[#id])), #and(human(X), space.at(X, 'room1'[#id]))))");
NLParseTestUnifyingListener("why am i the only human?", o.getSort("performative"),  context, 'etaoin', "perf.q.why(S:'etaoin'[#id], #not(#and(#not(=(X,'1'[#id])), #and(alive(X), human(X)))))");
NLParseTestUnifyingListener("why am i the only human here?", o.getSort("performative"),  context, 'etaoin', "perf.q.why(S:'etaoin'[#id], #not(#and(#not(=(X,'1'[#id])), #and(alive(X), #and(human(X), space.at(X, 'room1'[#id]))))))");
NLParseTestUnifyingListener("why are there no humans here?", o.getSort("performative"),  context, 'etaoin', "perf.q.why(S:'etaoin'[#id], #not(#and(human(X), space.at(X, 'room1'[#id]))))");
NLParseTestUnifyingListener("why don't i remember anything?", o.getSort("performative"),  context, 'etaoin', "perf.q.why(S:'etaoin'[#id], #not(verb.remember('1'[#id], 'pronoun.anything'[pronoun.anything])))");
NLParseTestUnifyingListener("how do i turn on the ship", o.getSort("performative"), context, 'etaoin', "perf.q.how('etaoin'[#id], verb.switch-on('1'[#id], '2'[#id]))"); 
NLParseTestUnifyingListener("who is in the other rooms?", o.getSort("performative"),  context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), #and(space.at(X, Y), #and(room(Y), #not(=(Y, 'room1'[#id]))))))");
NLParseTestUnifyingListener("were there other humans here before?", o.getSort("performative"),  context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(human(X), #and(#not(=(X,'1'[#id])), #and(V:space.at(X, 'room1'[#id]), time.past(V)))))");
NLParseTestUnifyingListener("etaoin send the crate here", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], action.talk(V0, perf.request.action(TARGET:'5'[#id], verb.go-to(TARGET, 'room1'[#id]))))"); 
NLParseTestUnifyingListener("can you send the crate here?", o.getSort("performative"),  context, 'etaoin', "perf.q.action(V0:'etaoin'[#id], action.talk(V0, perf.request.action(TARGET:'5'[#id], verb.go-to(TARGET, 'room1'[#id]))))"); 
NLParseTestUnifyingListener("send the crate to the kitchen", o.getSort("performative"),  context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], action.talk(V0, perf.request.action(TARGET:'5'[#id], verb.go-to(TARGET, 'room1'[#id]))))"); 
NLParseTestUnifyingListener("turn the ship on", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], verb.switch-on('etaoin'[#id], '2'[#id]))"); 
NLParseTestUnifyingListener("how do I turn the ship on", o.getSort("performative"), context, 'etaoin', "perf.q.how('etaoin'[#id], verb.switch-on('1'[#id], '2'[#id]))");

NLParseTestUnifyingListener("how do I get permission to the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.how('etaoin'[#id], verb.get('1'[#id], permission-to-access(V3:'1'[#id], V8:'room1'[#id])))");
NLParseTestUnifyingListener("how do I get permission to enter the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.how('etaoin'[#id], verb.get('1'[#id], permission-to-access(V3:'1'[#id], V8:'room1'[#id])))");
NLParseTestUnifyingListener("how do I get access to the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.how('etaoin'[#id], verb.get('1'[#id], permission-to-access(V3:'1'[#id], V8:'room1'[#id])))");
NLParseTestUnifyingListener("give me permission to the kitchen", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], action.give('etaoin'[#id], '1'[#id], permission-to-access(V3:'1'[#id], V8:'room1'[#id])))");
NLParseTestUnifyingListener("can you give me access to the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.action('etaoin'[#id], action.give('etaoin'[#id], '1'[#id], permission-to-access(V3:'1'[#id], V8:'room1'[#id])))");

NLParseTestUnifyingListener("I will sleep", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #and(V:verb.sleep('1'[#id]), time.future(V)))");
NLParseTestUnifyingListener("I am going to sleep", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #and(V:verb.sleep('1'[#id]), time.future(V)))");
NLParseTestUnifyingListener("I'm going to sleep", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #and(V:verb.sleep('1'[#id]), time.future(V)))");


console.log(successfulTests + "/" + totalTests + " successtul parses");



