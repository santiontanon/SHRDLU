/*

- This file contains a series of test sentences with their expected logic parses. 
- Every time I detect the game failing to parse a sentence, I add it to this list, and then fix the grammar.
- So, this is sort of a list of "unit tests" for the natural language parsing module.

*/

var SPACE_NEAR_FAR_THRESHOLD:number = 12;

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
parser.talkingTargets = ["1", "4", "5", "6", "etaoin", "qwerty"];

// some concepts for the following sentences:
o.newSortStrings("white-key", ["key-card"]);
o.newSortStrings("red-key", ["key-card"]);

// dummy context:
var testAI:RuleBasedAI = new RuleBasedAI(o, parser, 12, 0, DEFAULT_QUESTION_PATIENCE_TIMER); 
testAI.selfID = 'etaoin';

var successfulTests:number = 0;
var totalTests:number = 0;

var nParametersPerPerformative:{ [performative: string] : number[]; } = {};

Sort.precomputeIsA();

function NLParseTest(sentence:string, s:Sort, context:NLContext, expectedResultStr:string) : boolean
{
    totalTests++;
    let parses:NLParseRecord[] = parser.parse(sentence, s, context, testAI);
    if (parses == null || parses.length == 0) {
        let derefErrors:NLDerefErrorRecord[] = parser.error_deref;
        if (derefErrors != null && derefErrors.length > 0) {
          context.newPerformative(context.speaker, sentence, null, null, derefErrors, null, o, testAI.timeStamp);
        }
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
            console.error("Parsed sentence '"+sentence+"', which was supposed to be non parseable!\nFirst parse was: " + parses[0].result);
            return false;
        }
        let parse:NLParseRecord = parser.chooseHighestPriorityParse(parses);
//        if (parses.length > 1) console.warn("Multiple parses for sentence '" + sentence + "'");
        let expectedResult:Term = Term.fromString(expectedResultStr, o);
        let found:boolean = false;
        if (parse.result.equalsConsideringAndList(expectedResult)) found = true;
        if (!found) {
            console.log(sentence + "\n" + parses.length + " parses:");
            for(let p of parses) {
              console.log("    parse ("+p.priorities+ " // " +p.ruleNames+ "):\n     " + p.result);
            }
            console.log("  highest priority parse: " + parse.result);
            console.log("  highest priority parse ruleNames: " + parse.ruleNames);
            console.error("None of the parses of '"+sentence+"' is the expected one! " + expectedResult);
            return false;
        } else {
            if (context != null && s.name == "performative") {
                let parsePerformatives:TermAttribute[] = Term.elementsInList(expectedResult, "#and");
                for(let parsePerformative of parsePerformatives) {
                    context.newPerformative(context.speaker, sentence, (<TermTermAttribute>parsePerformative).term, parse, null, null, o, testAI.timeStamp);
                }
                context.ai.timeStamp++;
            }
        }
        {
          let n:number = expectedResult.attributes.length;
          let tmp:number[] = nParametersPerPerformative[expectedResult.functor.name];
          if (tmp == undefined) {
            nParametersPerPerformative[expectedResult.functor.name] = [n];
          } else {
            if (tmp.indexOf(n) == -1) {
              tmp.push(n);
            }
          }
        }
        successfulTests++;
        return true;
    }
}


function NLParseTestUnifyingListener(sentence:string, s:Sort, context:NLContext, listener:string, expectedResultStr:string) : boolean
{
    totalTests++;
    let parses:NLParseRecord[] = parser.parse(sentence, s, context, testAI);
    if (parses == null || parses.length == 0) {
        let derefErrors:NLDerefErrorRecord[] = parser.error_deref;
        if (derefErrors != null && derefErrors.length > 0) {
          context.newPerformative(context.speaker, sentence, null, null, derefErrors, null, o, testAI.timeStamp);
        }
        if (expectedResultStr != null) {
            console.error("Sentence '" + sentence + "' could not be parsed with sort " + s.name);
            if (parser.error_semantic.length > 0) console.error("    semantic error!");
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
            console.error("Parsed sentence '"+sentence+"', which was supposed to be non parseable!\nFirst parse was: " + parses[0].result);
            return false;
        }
        let parse:NLParseRecord = parser.chooseHighestPriorityParse(parses);
        // let parse:NLParseRecord = parser.chooseHighestPriorityParseWithListener(parses, listener);
//        if (parses.length > 1) console.warn("Multiple parses for sentence '" + sentence + "'");
        let expectedResult:Term = Term.fromString(expectedResultStr, o);
        let found:boolean = false;
        //console.log("result BEFORE unifyListener: " + parse.result);
        let unifiedResult:Term = parser.unifyListener(parse.result, listener);
        if (unifiedResult != null) {
          parse.result = unifiedResult;
        } else {
          console.warn("Listener unification failed for: '"+sentence+"'");
        }
        //console.log("result AFTER unifyListener: " + parse.result);
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

            for(let i:number = 0;i<parses.length;i++) {
              for(let j:number = i+1;j<parses.length;j++) {
                if (parses[i].result.equalsNoBindings(parses[j].result)==1) {
                  console.log(i + "==" + j);
                }
              }
            }
            return false;
        } else {
            //console.log("  highest priority parse: " + parse.result);
            //console.log("  highest priority parse ruleNames: " + parse.ruleNames);
            //console.log("  highest priority parse bindings: " + parse.bindings);
            if (context != null) {
                let parsePerformatives:TermAttribute[] = Term.elementsInList(expectedResult, "#and");
                for(let parsePerformative of parsePerformatives) {
                    context.newPerformative(context.speaker, sentence, (<TermTermAttribute>parsePerformative).term, parse, [], null, o, testAI.timeStamp);
                }
                context.ai.timeStamp++;
            }
        }
        {
          let n:number = expectedResult.attributes.length;
          let tmp:number[] = nParametersPerPerformative[expectedResult.functor.name];
          if (tmp == undefined) {
            nParametersPerPerformative[expectedResult.functor.name] = [n];
          } else {
            if (tmp.indexOf(n) == -1) {
              tmp.push(n);
            }
          }
        }  
        // console.log("derefs: " + parse.derefs);
        // console.log("previousPOS: " + parse.previousPOS);
        successfulTests++;
        return true;
    }
}


function NLClarificationParseTestUnifyingListener(presentence:string, sentence:string, s:Sort, context:NLContext, listener:string, expectedResultStr:string) : boolean
{
  context = resetContext();
  if (!NLParseTestUnifyingListener(presentence, s, context, listener, null)) {
    console.error("NLClarificationParseTestUnifyingListener for ('"+presentence+"','"+sentence+"') failed because presentence was parsed!");
    return false;
  }
  totalTests--;   // to compensate for the increase due to "presentence"
  successfulTests--;
  return NLParseTestUnifyingListener(sentence, s, context, listener, expectedResultStr);
}


function resetContext() : NLContext
{
  let context:NLContext = new NLContext("1", testAI, 5);
  let ce1:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('1', o.getSort("#id")), 
                                                0, 0, 
                                                [Term.fromString("human('1'[#id])",o), 
                                                 Term.fromString("name('1'[#id], 'david'[symbol])",o),
                                                 Term.fromString("verb.own('1'[#id],'4'[#id])",o),
                                                 Term.fromString("space.at('1'[#id],'room1'[#id])",o)]);
  let ce2:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('2', o.getSort("#id")),
                                                0, 100, 
                                                [Term.fromString("ship('2'[#id])",o),
                                                 Term.fromString("color('2'[#id],'red'[red])",o),
                                                 Term.fromString("verb.belong('2'[#id],'etaoin'[#id])",o),
                                                 Term.fromString("verb.support('2'[#id], '5'[#id])",o)]);
  let ce3:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('etaoin', o.getSort("#id")),
                                                0, 10, 
                                                [Term.fromString("disembodied-ai('etaoin'[#id])",o),
                                                 Term.fromString("name('etaoin'[#id], 'etaoin'[symbol])",o),
                                                 Term.fromString("verb.own('etaoin'[#id],'2'[#id])",o),
                                                 Term.fromString("space.at('etaoin'[#id],'location-aurora-station'[#id])",o),
                                                 Term.fromString("verb.own('etaoin'[#id], 'etaoin-memory'[#id])",o),
                                                 Term.fromString("space.left.of('4'[#id],'etaoin'[#id])",o)]);
  let ce4:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('4', o.getSort("#id")),
                                                0, 3, 
                                                [Term.fromString("white-key('4'[#id])",o),
                                                 Term.fromString("name('4'[#id], 'bedroom key'[symbol])",o),
                                                 Term.fromString("color('4'[#id],'white'[white])",o),
                                                 Term.fromString("verb.belong('4'[#id],'1'[#id])",o),
                                                 Term.fromString("space.left.of('4'[#id],'etaoin'[#id])",o)]);
  let ce5:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('5', o.getSort("#id")),
                                                0, 5, 
                                                [Term.fromString("crate('5'[#id])",o),
                                                 Term.fromString("property.opened('5'[#id])",o),
                                                 Term.fromString("verb.support('2'[#id], '5'[#id])",o)]);
  let ce6:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('6', o.getSort("#id")),
                                                0, 4, 
                                                [Term.fromString("red-key('6'[#id])",o),
                                                 Term.fromString("color('6'[#id],'red'[red])",o)]);
  let ce7:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('room1', o.getSort("#id")),
                                                0, 0, 
                                                [Term.fromString("kitchen('room1'[#id])",o),
                                                 Term.fromString("space.inside.of('room1'[#id], 'location-aurora-station'[#id])",o),
                                                 Term.fromString("verb.belong('door1'[#id], 'room1'[#id])",o),
                                                 Term.fromString("space.at('1'[#id],'room1'[#id])",o),
                                                 Term.fromString("space.at('vitamins'[#id],'room1'[#id])",o)]);
  let ce8:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('location-aurora-station', o.getSort("#id")),
                                                0, 0, 
                                                [Term.fromString("station('location-aurora-station'[#id])",o),
                                                 Term.fromString("name('location-aurora-station'[#id], 'aurora station'[symbol])",o),
                                                 Term.fromString("space.inside.of('room1'[#id], 'location-aurora-station'[#id])",o),
                                                 Term.fromString("space.inside.of('room2'[#id], 'location-aurora-station'[#id])",o),
                                                 Term.fromString("space.at('location-aurora-station'[#id], 'spacer-valley'[#id])",o)]);
  let ce9:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('etaoin-memory', o.getSort("#id")),
                                                0, 20, 
                                                [Term.fromString("memory-bank('etaoin-memory'[#id])",o),
                                                 Term.fromString("verb.belong('etaoin-memory'[#id], 'etaoin'[#id])",o)]);
  let ce10:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('room2', o.getSort("#id")),
                                                0, 30, 
                                                [Term.fromString("bedroom('room2'[#id])",o),
                                                 Term.fromString("name('room2'[#id], 'bedroom 5'[symbol])",o),
                                                 Term.fromString("space.inside.of('room2'[#id], 'location-aurora-station'[#id])",o),
                                                 Term.fromString("verb.belong('door2'[#id], 'room2'[#id])",o)]);
  let ce11:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('l1', o.getSort("#id")),
                                                0, 30, 
                                                [Term.fromString("light('l1'[#id])",o),
                                                 Term.fromString("space.at('l1'[#id], 'room1'[#id])",o)]);
  let ce12:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('space', o.getSort("#id")),
                                                0, 1000, 
                                                [Term.fromString("outer-space('space'[#id])",o),
                                                 Term.fromString("name('space'[#id], 'space'[symbol])",o)]);
  let ce13:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('spacer-valley', o.getSort("#id")),
                                                0, 1000, 
                                                [Term.fromString("valley('spacer-valley'[#id])",o),
                                                 Term.fromString("name('spacer-valley'[#id], 'spacer valley'[symbol])",o),
                                                 Term.fromString("space.at('location-aurora-station'[#id], 'spacer-valley'[#id])",o)]);
  let ce14:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('english', o.getSort("#id")),
                                                0, null, 
                                                [Term.fromString("language('english'[#id])",o),
                                                 Term.fromString("name('english'[#id], 'english'[symbol])",o)]);
  let ce15:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('door1', o.getSort("#id")),
                                                0, 10, 
                                                [Term.fromString("door('door1'[#id])",o),
                                                 Term.fromString("verb.belong('door1'[#id], 'room1'[#id])",o)]);
  let ce16:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('door2', o.getSort("#id")),
                                                0, 30, 
                                                [Term.fromString("door('door2'[#id])",o),
                                                 Term.fromString("verb.belong('door2'[#id], 'room2'[#id])",o)]);

  let ce17:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('qwerty', o.getSort("#id")),
                                                0, 30, 
                                                [Term.fromString("robot('qwerty'[#id])",o),
                                                 Term.fromString("small('qwerty'[#id])",o),
                                                 Term.fromString("color('qwerty'[#id], 'white'[white])",o),
                                                 Term.fromString("name('qwerty'[#id], 'qwerty'[symbol])",o),
                                                 Term.fromString("space.at('etaoin'[#id],'room2'[#id])",o)]);

  let ce18:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('vitamins', o.getSort("#id")),
                                                0, 30, 
                                                [Term.fromString("vitamins('vitamins'[#id])",o),
                                                 Term.fromString("space.at('vitamins'[#id],'room1'[#id])",o)]);  
  for(let ce of [ce1, ce2, ce3, ce4, ce5, ce6, ce7, ce8,
                 ce9, ce10, ce11, ce12, ce13, ce14, ce15, ce16,
                 ce17, ce18]) {
    ce.mentionTime = 0;
    context.shortTermMemory.push(ce);
  }

  return context;
}


var context:NLContext = resetContext();

// add all the terms to short term memory of the AI
for(let ce of context.shortTermMemory) {
  for(let t of ce.terms) {
    testAI.shortTermMemory.addTerm(t, PERCEPTION_PROVENANCE, 0, 0);
  }
}


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
NLParseTest("all of these chairs", o.getSort("nounPhrase"), context, "nounPhrase(V0:'chair'[chair], V1:[plural], V2:[third-person], V3:#and(close-demonstrative-determiner(V0, V1), V4:noun(V0, V1)))");
NLParseTest("my chair", o.getSort("nounPhrase"), context, "nounPhrase(V0:'chair'[chair], V1:[singular], V2:[third-person], V3:#and(V4:determiner.my(V0, V1), V5:noun(V0, V1)))");
NLParseTest("all white chairs", o.getSort("nounPhrase"), context, "nounPhrase(V0:'chair'[chair], V1:[plural], V2:[third-person], V3:#and(all(V0, V1), #and(adjective(V0, 'white'[white]), V4:noun(V0, V1))))");
NLParseTest("all the chairs", o.getSort("nounPhrase"), context, "nounPhrase(V0:'chair'[chair], V1:[plural], V2:[third-person], V3:#and(the(V0, V1), V4:noun(V0, V1)))");
NLParseTest("the red key", o.getSort("nounPhrase"), context, "nounPhrase(V0:'key'[key], V1:[singular], V2:[third-person], V3:#and(the(V0, V1), V4:#and(V5:adjective(V0, V6:'red'[red]), V7:noun(V0, V1))))");
NLParseTest("my name", o.getSort("nounPhrase"), context, "nounPhrase(V0:'name'[name], V1:[singular], V2:[third-person], V3:#and(V4:determiner.my(V0, V1), V5:noun(V0, V1)))");
NLParseTest("David", o.getSort("nounPhrase"), context, "nounPhrase(V0:'david'[symbol], V1:[singular], V2:[third-person], V3:proper-noun(V0, V1))");
NLParseTest("David's name", o.getSort("nounPhrase"), context, "nounPhrase(V0:'name'[name], V1:[singular], V2:[third-person], V3:#and(V4:saxon-genitive(V5:'david'[symbol], V0), V6:#and(V7:noun(V0, V1), V8:proper-noun(V5, V9:[singular]))))");
NLParseTest("the ship's name", o.getSort("nounPhrase"), context, "nounPhrase(V0:'name'[name], V1:[singular], V2:[third-person], V3:#and(V4:saxon-genitive(V5:'ship'[ship], V0), V6:#and(V7:noun(V0, V1), V8:#and(V9:the(V5, V10:[singular]), V11:noun(V5, V10)))))");
NLParseTest("the key that is red", o.getSort("nounPhrase"), context, "nounPhrase(V0:'key'[key], V1:[singular], V2:[third-person], V3:#and(the(V0, V1), V4:#and(V5:adjective(V0, V6:'red'[red]), V7:noun(V0, V1))))");
NLParseTest("the key that looks red", o.getSort("nounPhrase"), context, "nounPhrase(V0:'key'[key], V1:[singular], V2:[third-person], V3:#and(the(V0, V1), V4:#and(V5:adjective(V0, V6:'red'[red]), V7:noun(V0, V1))))");
NLParseTest("anyone else", o.getSort("nounPhrase"), context, "nounPhrase(V0:'pronoun.anyone.else'[symbol], V1:[singular], V2:[third-person], V3:indefinite-pronoun(V0, V1, V4:[gender], V2))");
NLParseTest("the David", o.getSort("nounPhrase"), context, "nounPhrase(V0:'david'[symbol], V1:[singular], V2:[third-person], V3:proper-noun(V0, V1))");
NLParseTest("the small white robot", o.getSort("nounPhrase"), context, "nounPhrase(V0:'robot'[robot], V1:[singular], [third-person], #and(the(V0, V1), #and(adjective(V0, 'small'[small]), #and(adjective(V0, 'white'[white]), noun(V0, V1)))))");

// tests with dereference to context:
NLParseTest("David", o.getSort("performative"), context, null);  // this one should not work, since you cannot call yourself!
context = resetContext();
NLParseTest("Etaoin", o.getSort("performative"), context, "perf.callattention('etaoin'[#id])");
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
NLParseTest("I am blue", o.getSort("performative"), context, "perf.inform([any], color('1'[#id],'blue'[blue]))");
NLParseTest("I'm blue", o.getSort("performative"), context, "perf.inform([any], color('1'[#id],'blue'[blue]))");
NLParseTest("I am a man", o.getSort("performative"), context, "perf.inform([any], man('1'[#id]))");
NLParseTest("I am not a man", o.getSort("performative"), context, "perf.inform([any], #not(man('1'[#id])))");
NLParseTest("I am at the kitchen", o.getSort("performative"), context, "perf.inform([any], space.at('1'[#id], 'room1'[#id]))");
NLParseTest("etaoin is not in the kitchen", o.getSort("performative"), context, "perf.inform([any], #not(space.at('etaoin'[#id], 'room1'[#id])))");
NLParseTest("the keys are white", o.getSort("performative"), context, "#list(perf.inform(L:[any], color('6'[#id],W:'white'[white])), perf.inform(L, color('4'[#id],W)))");
NLParseTestUnifyingListener("I am a medic in aurora station", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], profession('1'[#id], 'location-aurora-station'[#id], 'medic'[medic]))");

NLParseTest("Hi there!", o.getSort("performative"), context, "perf.greet(V0)");

// tests with hypothetical dereference:
NLParseTest("all keys are white", o.getSort("performative"), context, "perf.inform([any], V1:#or(#not(key(X:[#id])),color(X,'white'[white])))");
NLParseTest("all chairs are small", o.getSort("performative"), context, "perf.inform([any], V1:#or(#not(chair(X:[#id])),small(X)))");
NLParseTest("socrates was a man", o.getSort("performative"), context, "#list(perf.inform(L:[any], name(V1:'H-1-2'[#id],'socrates'[symbol])), perf.inform(L, man(V1)))");

// we simulate memorization:
let socrates_entity:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('H1', o.getSort("#id")),
                                                          testAI.timeStamp, null,
                                                          [Term.fromString("name('H1'[#id],'socrates'[symbol])",o),
                                                           Term.fromString("man('H1'[#id])",o)])
context.shortTermMemory.push(socrates_entity);
for(let t of socrates_entity.terms) {
  testAI.shortTermMemory.addTerm(t, PERCEPTION_PROVENANCE, 0, 0);
}

NLParseTest("socrates was not a man", o.getSort("performative"), context, "perf.inform([any], #not(man('H1'[#id])))");
NLParseTest("socrates was not mortal", o.getSort("performative"), context, "perf.inform([any], #not(mortal('H1'[#id])))");

// tests using articles
// this one should dereference to Socrates, since we were just talking about him
NLParseTest("the man was blue", o.getSort("performative"), context, "perf.inform([any], color('H1'[#id],'blue'[blue]))");
NLParseTest("the red key is in the kitchen", o.getSort("performative"), context, "perf.inform([any], space.at('6'[#id], 'room1'[#id]))");
NLParseTest("the key is in the kitchen", o.getSort("performative"), context, "perf.inform([any], space.at('6'[#id], 'room1'[#id]))");
// key '4' is closer than '6', so, "this key" should deref to '4'
NLParseTest("this key is in the kitchen", o.getSort("performative"), context, "perf.inform([any], space.at('4'[#id], 'room1'[#id]))");
NLParseTest("that key is in the kitchen", o.getSort("performative"), context, "perf.inform([any], space.at('6'[#id], 'room1'[#id]))");
NLParseTest("the keys are in the kitchen", o.getSort("performative"), context, "#list(perf.inform(L:[any], space.at('4'[#id], R:'room1'[#id])), perf.inform(L, space.at('6'[#id], R)))");
NLParseTest("every key is in the kitchen", o.getSort("performative"), context, "#list(perf.inform(L:[any], space.at('4'[#id], R:'room1'[#id])), perf.inform(L, space.at('6'[#id], R)))");

// clear the mentions, so we focus on the shortTermMemory:
context.mentions = [];
NLParseTest("this red thing is small", o.getSort("performative"), context, "perf.inform([any], small('6'[#id]))");
context.mentions = [];
NLParseTest("that red thing is big", o.getSort("performative"), context, "perf.inform([any], big('2'[#id]))");
NLParseTestUnifyingListener("my key is white", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], color('4'[#id],'white'[white]))");
NLParseTestUnifyingListener("the color of my key is white", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], color('4'[#id],'white'[white]))");
NLParseTestUnifyingListener("your vehicle is big", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], big('2'[#id]))");
NLParseTestUnifyingListener("the white key is mine", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], verb.own('1'[#id],'4'[#id]))");
NLParseTestUnifyingListener("the ship is yours", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], verb.own('etaoin'[#id],'2'[#id]))");
NLParseTestUnifyingListener("the ship is etaoin's", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], verb.own('etaoin'[#id],'2'[#id]))");

context.expectingAnswerToQuestion_stack.push(new NLContextPerformative("dummy text so that the next are taken as answers", "1", null, null, null, null, context, 0));
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
NLParseTestUnifyingListener("is my key white?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], color('4'[#id],'white'[white]))");
NLParseTestUnifyingListener("is etaoin not a robot?!", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], robot(V1:'etaoin'[#id]))");
NLParseTestUnifyingListener("am I blue?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], color('1'[#id],'blue'[blue]))");
NLParseTestUnifyingListener("am I a man?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], man('1'[#id]))");
NLParseTestUnifyingListener("am I at the kitchen?!?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], space.at('1'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("is etaoin not in the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], space.at('etaoin'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("are the keys white??", o.getSort("performative"), context, 'etaoin', "#list(perf.q.predicate('etaoin'[#id], color('4'[#id],W:'white'[white])), perf.q.predicate('etaoin'[#id], color('6'[#id],W)))");
NLParseTest("are all keys white?", o.getSort("performative"), context, "perf.q.predicate([any], V1:#or(#not(key(X:[#id])),color(X,'white'[white])))");
NLParseTest("are all chairs small?", o.getSort("performative"), context, "perf.q.predicate([any], V1:#or(#not(chair(X:[#id])),small(X)))");
NLParseTest("is plato a man?", o.getSort("performative"), context, "perf.q.predicate(L:[any], man(V1:'H-1-7'[#id]), name(V1,'plato'[symbol]))"); 
NLParseTest("was plato a man?", o.getSort("performative"), context, "perf.q.predicate(L:[any], #and(V2:man(V1:'H-1-11'[#id]), time.past(V2)), name(V1,'plato'[symbol]))"); 
NLParseTestUnifyingListener("is my key white?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], color('4'[#id],'white'[white]))");
NLParseTestUnifyingListener("is your vehicle big?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], big('2'[#id]))");
NLParseTestUnifyingListener("is the white key mine?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.own('1'[#id],'4'[#id]))");
NLParseTestUnifyingListener("is the ship yours?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.own('etaoin'[#id],'2'[#id]))");
NLParseTestUnifyingListener("is the ship etaoin's?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.own('etaoin'[#id],'2'[#id]))");
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
NLParseTestUnifyingListener("what is this room?", o.getSort("performative"), context, "etaoin", "perf.q.whatis.noname('etaoin'[#id], 'room1'[#id])");
NLParseTestUnifyingListener("what is this room etaoin?", o.getSort("performative"), context, "etaoin", "perf.q.whatis.noname('etaoin'[#id], 'room1'[#id])");
NLParseTestUnifyingListener("what is a room?", o.getSort("performative"), context, "etaoin", "perf.q.action(X:'etaoin'[#id], verb.define(X,[room]))");
NLParseTestUnifyingListener("I have the white key", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], verb.have('1'[#id],'4'[#id]))");
NLParseTestUnifyingListener("I do not have the white key", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #not(verb.have('1'[#id],'4'[#id])))");
NLParseTestUnifyingListener("Do I have the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.have('1'[#id],'4'[#id]))");
NLParseTestUnifyingListener("Who has the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), verb.have(X,'4'[#id])))");
NLParseTestUnifyingListener("what are the three laws of robotics?", o.getSort("performative"), context, "etaoin", "perf.q.action(X:'etaoin'[#id], verb.define(X, [three-laws-of-robotics]))");
NLParseTestUnifyingListener("Where is everybody?", o.getSort("performative"), context, 'etaoin', "#list(V0:perf.q.whereis(V1:'etaoin'[#id], V2:'etaoin'[#id]), V3:#list(V4:perf.q.whereis(V5:'etaoin'[#id], V6:'1'[#id]), V7:#list(V8:perf.q.whereis(V9:'etaoin'[#id], V10:'qwerty'[#id]), V11:perf.q.whereis(V12:'etaoin'[#id], V13:'H1'[#id]))))");
NLParseTestUnifyingListener("where is everyone?", o.getSort("performative"), context, "etaoin", "#list(V0:perf.q.whereis(V1:'etaoin'[#id], V2:'etaoin'[#id]), V3:#list(V4:perf.q.whereis(V5:'etaoin'[#id], V6:'1'[#id]), V7:#list(V8:perf.q.whereis(V9:'etaoin'[#id], V10:'qwerty'[#id]), V11:perf.q.whereis(V12:'etaoin'[#id], V13:'H1'[#id]))))");
NLParseTestUnifyingListener("is there food?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], food(X))");
NLParseTestUnifyingListener("is there any human in aurora station?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(human(X), space.at(X,'location-aurora-station'[#id])))");
NLParseTestUnifyingListener("is there anyone in aurora station?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(character(X), space.at(X,'location-aurora-station'[#id])))");
NLParseTestUnifyingListener("where is everyone else?", o.getSort("performative"), context, "etaoin", "#list(V0:perf.q.whereis(V1:'etaoin'[#id], V2:'qwerty'[#id]), V3:perf.q.whereis(V4:'etaoin'[#id], V5:'H1'[#id]))");
NLParseTestUnifyingListener("is there anyone?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], character(X))");
NLParseTestUnifyingListener("is there anyone here?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(space.at(X,'room1'[#id]), character(X)))");
NLParseTestUnifyingListener("who is here?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, #and(character(X), space.at(X,'room1'[#id])))");
NLParseTestUnifyingListener("is there anyone else here?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(!=(X,'etaoin'[#id]), #and(!=(X,'1'[#id]), #and(space.at(X,'room1'[#id]), character(X)))))");
NLParseTestUnifyingListener("who else is here?", o.getSort("performative"), context, "etaoin", "perf.q.query(L:'etaoin'[#id], X, #and(character(X), #and(space.at(X,'room1'[#id]), #and(!=(X,'1'[#id]), !=(X,L)))))");
NLParseTestUnifyingListener("is there any human other than me here?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(#and(space.at(X,'room1'[#id]), human(X)), !=(X,'1'[#id])))");
NLParseTestUnifyingListener("is there anyone else in aurora station?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(!=(X,'etaoin'[#id]), #and(!=(X,'1'[#id]), #and(space.at(X,'location-aurora-station'[#id]), character(X)))))");
NLParseTestUnifyingListener("is there someone else in aurora station?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(!=(X,'etaoin'[#id]), #and(!=(X,'1'[#id]), #and(space.at(X,'location-aurora-station'[#id]), character(X)))))");
NLParseTestUnifyingListener("is there someone else in the station?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(!=(X,'etaoin'[#id]), #and(!=(X,'1'[#id]), #and(space.at(X,'location-aurora-station'[#id]), character(X)))))");
NLParseTestUnifyingListener("is anyone else in aurora station?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(!=(X,'etaoin'[#id]), #and(!=(X,'1'[#id]), #and(space.at(X,'location-aurora-station'[#id]), character(X)))))");
NLParseTestUnifyingListener("who else is in the station?", o.getSort("performative"), context, "etaoin", "perf.q.query(L:'etaoin'[#id], X, #and(character(X), #and(space.at(X,'location-aurora-station'[#id]), #and(!=(X,'1'[#id]), !=(X,L)))))");
NLParseTestUnifyingListener("who else is there in the station?", o.getSort("performative"), context, "etaoin", "perf.q.query(L:'etaoin'[#id], X, #and(character(X), #and(space.at(X,'location-aurora-station'[#id]), #and(!=(X,'1'[#id]), !=(X,L)))))");

// tests inserting the target name in front:
NLParseTestUnifyingListener("etaoin my key is white", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], color('4'[#id],'white'[white]))");
NLParseTestUnifyingListener("etaoin, the ship is etaoin's", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], verb.own('etaoin'[#id],'2'[#id]))");
NLParseTestUnifyingListener("etaoin I don't know", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'unknown'[symbol])");
NLParseTestUnifyingListener("etaoin am I a man?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], man('1'[#id]))");
NLParseTestUnifyingListener("etaoin, was plato a man?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(V2:man(V1:'H-1-15'[#id]), time.past(V2)), name(V1,'plato'[symbol]))");
NLParseTestUnifyingListener("etaoin, where am I?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], '1'[#id])");
NLParseTestUnifyingListener("etaoin, my name is david", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('1'[#id],'david'[symbol]))");
NLParseTestUnifyingListener("etaoin what is my name?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, name('1'[#id],X))");
NLParseTestUnifyingListener("etaoin, who are you?", o.getSort("performative"), context, 'etaoin', "perf.q.whois.noname('etaoin'[#id], 'etaoin'[#id])");
NLParseTestUnifyingListener("etaoin who is in aurora station?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), space.at(X, 'location-aurora-station'[#id])))");
NLParseTestUnifyingListener("etaoin what is the white thing?", o.getSort("performative"), context, 'etaoin', "perf.q.whatis.noname('etaoin'[#id], '4'[#id])");
NLParseTestUnifyingListener("etaoin, I have the white key", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], verb.have('1'[#id],'4'[#id]))");
NLParseTestUnifyingListener("etaoin, Do I have the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.have('1'[#id],'4'[#id]))");
NLParseTestUnifyingListener("etaoin, Who has the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), verb.have(X,'4'[#id])))");
NLParseTestUnifyingListener("etaoin Where is everybody?", o.getSort("performative"), context, 'etaoin', "#list(V0:perf.q.whereis(V1:'etaoin'[#id], V1), V2:#list(V3:perf.q.whereis(V1, V4:'1'[#id]), V5:#list(V6:perf.q.whereis(V1, V7:'qwerty'[#id]), V8:perf.q.whereis(V1, V9:'H1'[#id]))))");
NLParseTestUnifyingListener("etaoin, is there anyone in aurora station?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(character(X), space.at(X,'location-aurora-station'[#id])))");
NLParseTestUnifyingListener("etaoin, where is everyone else?", o.getSort("performative"), context, "etaoin", "#list(V0:perf.q.whereis(V1:'etaoin'[#id], V2:'qwerty'[#id]), V3:perf.q.whereis(V1, V4:'H1'[#id]))");
NLParseTestUnifyingListener("etaoin is there anyone?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], character(X))");
NLParseTestUnifyingListener("etaoin who else is here?", o.getSort("performative"), context, "etaoin", "perf.q.query(L:'etaoin'[#id], X, #and(character(X), #and(space.at(X,'room1'[#id]), #and(!=(X,'1'[#id]), !=(X,L)))))");
NLParseTestUnifyingListener("etaoin take the white key", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], '4'[#id]))");

NLParseTestUnifyingListener("ok, my name is david", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('1'[#id],'david'[symbol]))");
NLParseTestUnifyingListener("alright! my name is david", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('1'[#id],'david'[symbol]))");

NLParseTest("any other human", o.getSort("nounPhrase"), context, "nounPhrase(V0:'human'[human], V1:[singular], V2:[third-person], #and(article.any(V0, V1), #and(determiner.other(V0, V1), V3:noun(V0, V1))))");
NLParseTestUnifyingListener("is there any other human?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], V2:#and(!=(V:[any], V6:'1'[#id]), V7:#and(!=(V, V10:'H1'[#id]), V11:human(V))))");
NLParseTestUnifyingListener("is there any other humans?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], V2:#and(!=(V:[any], V6:'1'[#id]), V7:#and(!=(V, V10:'H1'[#id]), V11:human(V))))");
NLParseTestUnifyingListener("is there any other human in this station?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], V1:#and(V2:#and(!=(V:[any], V6:'1'[#id]), V7:#and(!=(V, V10:'H1'[#id]), V11:human(V))), V12:space.at(V, V13:'location-aurora-station'[#id])))");
NLParseTestUnifyingListener("is there any other humans in this station?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], V1:#and(V2:#and(!=(V:[any], V6:'1'[#id]), V7:#and(!=(V, V10:'H1'[#id]), V11:human(V))), V12:space.at(V, V13:'location-aurora-station'[#id])))");
NLParseTestUnifyingListener("is your memory bank erased?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], erased('etaoin-memory'[#id]))");
NLParseTestUnifyingListener("can I have the white key?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '1'[#id]))");  
NLParseTestUnifyingListener("could I have the white key?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '1'[#id]))");
NLParseTestUnifyingListener("can you give me the white key?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '1'[#id]))");
NLParseTestUnifyingListener("give me the white key", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '1'[#id]))");
NLParseTestUnifyingListener("give the white key to me", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '1'[#id]))");
NLParseTestUnifyingListener("give the white key to the crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '5'[#id]))");
NLParseTestUnifyingListener("do you see a key?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], verb.see(V0,X), key(X), [number.1])");
NLParseTestUnifyingListener("can you see a key?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], verb.see(V0,X), key(X), [number.1])");
NLParseTestUnifyingListener("do you see me?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], verb.see(V0,'1'[#id]))");
NLParseTestUnifyingListener("the white key has a tear", o.getSort("performative"), context, "etaoin", "perf.inform(V0:'etaoin'[#id], #and(verb.have('4'[#id], V4:[#id]), tear(V4)))");
NLParseTestUnifyingListener("can you repair the white key?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], verb.repair('etaoin'[#id], '4'[#id]))");
NLParseTestUnifyingListener("would you take the white key?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], action.take('etaoin'[#id], '4'[#id]))");
NLParseTestUnifyingListener("please take the white key", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], '4'[#id]))");
NLParseTestUnifyingListener("what time is it?", o.getSort("performative"), context, "etaoin", "perf.q.when(V0:'etaoin'[#id], [time.now], [time.minute])");
NLParseTestUnifyingListener("what year is it?", o.getSort("performative"), context, "etaoin", "perf.q.when(V0:'etaoin'[#id], [time.now], [time.year])");
NLParseTestUnifyingListener("what day are we in?", o.getSort("performative"), context, "etaoin", "perf.q.when(V0:'etaoin'[#id], [time.now], [time.day])");
NLParseTestUnifyingListener("what day of the week are we in?", o.getSort("performative"), context, "etaoin", "perf.q.when(V0:'etaoin'[#id], [time.now], [time.day])");
NLParseTestUnifyingListener("what do you understand?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, verb.understand(V0, X))");
NLParseTestUnifyingListener("come here", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.come(V0, [space.here]))");
NLParseTestUnifyingListener("where is a key?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], X, L, key(X))");
NLParseTestUnifyingListener("where can I find a key?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], X, L, key(X))");
NLParseTestUnifyingListener("where can I find a red key?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], X, L, #and(color(X,'red'[red]),key(X)))");
NLParseTestUnifyingListener("where can I find the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], '4'[#id])");
NLParseTestUnifyingListener("it is white", o.getSort("performative"), context, "etaoin", "perf.inform(V0:'etaoin'[#id], color('4'[#id],'white'[white]))");
NLParseTestUnifyingListener("it's white", o.getSort("performative"), context, "etaoin", "perf.inform(V0:'etaoin'[#id], color('4'[#id],'white'[white]))");
NLParseTestUnifyingListener("give it to me", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '1'[#id]))");
NLParseTestUnifyingListener("where can I repair the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], SOMEONE:'hypothetical-character'[#id], LOCATION, verb.can(SOMEONE,verb.repair(SOMEONE,'4'[#id])))");
NLParseTestUnifyingListener("where can I repair keys?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], SOMEONE:'hypothetical-character'[#id], LOCATION, #and(verb.can(SOMEONE,verb.repair(SOMEONE, 'hypothetical-object'[#id])), key('hypothetical-object'[#id])))");
NLParseTestUnifyingListener("where should I go to find a key?", o.getSort("performative"), context, 'etaoin', "perf.q.whereto('etaoin'[#id], X, L, key(X))");
NLParseTestUnifyingListener("where should I go to repair the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.whereto('etaoin'[#id], SOMEONE:'hypothetical-character'[#id], L, verb.can(SOMEONE,verb.repair(SOMEONE,'4'[#id])))");
NLParseTestUnifyingListener("where should I go to repair keys?", o.getSort("performative"), context, 'etaoin', "perf.q.whereto('etaoin'[#id], SOMEONE:'hypothetical-character'[#id], L, #and(verb.can(SOMEONE,verb.repair(SOMEONE,'hypothetical-object'[#id])), key('hypothetical-object'[#id])))"); 
NLParseTestUnifyingListener("where should I go?", o.getSort("performative"), context, 'etaoin', "perf.q.whereto('etaoin'[#id], SOMEONE:'hypothetical-character'[#id], L, #or(verb.can(SOMEONE,GOAL), #not(goal('1'[#id],GOAL))))"); 
NLParseTestUnifyingListener("what should I do?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, goal('1'[#id],X))");
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
NLParseTestUnifyingListener("bedroom 5 is yours", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], verb.own('etaoin'[#id],'room2'[#id]))");

// clear the mentions to restart
context.mentions = [];
NLParseTestUnifyingListener("who is there?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, character(X))");
NLParseTestUnifyingListener("who else is there?", o.getSort("performative"), context, "etaoin", "perf.q.query(E:'etaoin'[#id], X, #and(character(X), #and(!=(X,'1'[#id]), !=(X,E))))");

// now add a sentence that has a mention to a room:
NLParseTestUnifyingListener("where is the bedroom?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], 'room2'[#id])");
NLParseTestUnifyingListener("who is there?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, #and(character(X), space.at(X,'room2'[#id])))");
NLParseTestUnifyingListener("are you qwerty?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(X:'etaoin'[#id], name(X,'qwerty'[symbol]))");
NLParseTestUnifyingListener("what do you do?", o.getSort("performative"), context, "etaoin", "perf.q.query(X:'etaoin'[#id], QUERY, role(X,QUERY))");
NLParseTestUnifyingListener("what do you do in the station?", o.getSort("performative"), context, "etaoin", "perf.q.query(X:'etaoin'[#id], QUERY, role(X, 'location-aurora-station'[#id], QUERY))"); 
NLParseTestUnifyingListener("what is your role?", o.getSort("performative"), context, "etaoin", "perf.q.query(X:'etaoin'[#id], QUERY, role(X, QUERY))"); 
NLParseTestUnifyingListener("what is your role in the station?", o.getSort("performative"), context, "etaoin", "perf.q.query(X:'etaoin'[#id], QUERY, role(X, 'location-aurora-station'[#id], QUERY))"); 
NLParseTestUnifyingListener("how much do I weight?", o.getSort("performative"), context, "etaoin", "perf.q.query(X:'etaoin'[#id], QUERY, weight('1'[#id], QUERY))"); 
NLParseTestUnifyingListener("how heavy am I?", o.getSort("performative"), context, "etaoin", "perf.q.query(X:'etaoin'[#id], QUERY, weight('1'[#id], QUERY))"); 
NLParseTestUnifyingListener("how tall am I?", o.getSort("performative"), context, "etaoin", "perf.q.query(X:'etaoin'[#id], QUERY, height('1'[#id], QUERY))"); 
NLParseTestUnifyingListener("go to the kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.go-to(V0, 'room1'[#id]))"); 
NLParseTestUnifyingListener("go away", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.go(V0, [space.away]))"); 
NLParseTestUnifyingListener("move out of the way", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.move(V0, [space.away]))"); 
NLParseTestUnifyingListener("walk with me", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.follow(V0, '1'[#id]))"); 
NLParseTestUnifyingListener("what is this?", o.getSort("performative"), context, "etaoin", "perf.q.whatis.noname(V0:'etaoin'[#id], '4'[#id])"); 

// indirect commands:
NLParseTestUnifyingListener("tell the crate to come here", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.talk(V0, perf.request.action(TARGET:'5'[#id], verb.come(TARGET, [space.here]))))"); 
NLParseTestUnifyingListener("can you ask the crate to come here?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], action.talk(V0, perf.request.action(TARGET:'5'[#id], verb.come(TARGET, [space.here]))))"); 
NLParseTestUnifyingListener("tell the crate to tell me to follow you", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.talk(V0, perf.request.action(CRATE:'5'[#id], action.talk(CRATE, perf.request.action(ME:'1'[#id], verb.follow(ME, V0))))))"); 


// permission things:
NLParseTestUnifyingListener("I have permission to the kitchen", o.getSort("performative"), context, "etaoin", "perf.inform(V0:'etaoin'[#id], V1:permission-to(V3:'1'[#id], V8:'room1'[#id]))"); 
NLParseTestUnifyingListener("I have permission to go to the kitchen", o.getSort("performative"), context, "etaoin", "perf.inform(V0:'etaoin'[#id], V1:permission-to(V3:'1'[#id], verb.go-to(V3, V8:'room1'[#id])))"); 
NLParseTestUnifyingListener("I have permission to enter the kitchen", o.getSort("performative"), context, "etaoin", "perf.inform(V0:'etaoin'[#id], V1:permission-to(V3:'1'[#id], verb.enter(V3, V8:'room1'[#id])))"); 
NLParseTestUnifyingListener("do I have permission to go to the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], V1:permission-to(V3:'1'[#id], verb.go-to(V3, V8:'room1'[#id])))"); 
NLParseTestUnifyingListener("am I allowed in the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], permitted-in('1'[#id],'room1'[#id]))"); 
NLParseTestUnifyingListener("am I allowed to go to the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], permitted-in('1'[#id], 'room1'[#id]))"); 
NLParseTestUnifyingListener("can I go to the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], V1:verb.can(V3:'1'[#id],verb.go-to(V3, V8:'room1'[#id])))"); 
NLParseTestUnifyingListener("where can I go?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, V1:verb.can(V3:'1'[#id],verb.go(V3, X)))"); 
NLParseTestUnifyingListener("where am I allowed to go?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, V1:permitted-in(V3:'1'[#id], X))"); 
NLParseTestUnifyingListener("where am I not allowed to go?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, V1:#not(permitted-in(V3:'1'[#id], X)))"); 
NLParseTestUnifyingListener("where do I have permission to go?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, V1:permission-to(V3:'1'[#id], verb.go(V3, X)))");   
NLParseTestUnifyingListener("where don't I have permission to go?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, V1:#not(permission-to(V3:'1'[#id], verb.go(V3, X))))"); 
NLParseTestUnifyingListener("how many keys are there?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, key(X))");  
NLParseTestUnifyingListener("how many keys do you have?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(key(X), verb.have('etaoin'[#id],X)))");  
NLParseTestUnifyingListener("how many keys are there in the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(key(X), space.at(X,'room1'[#id])))"); 
NLParseTestUnifyingListener("how many keys are white?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(color(X, 'white'[white]), key(X)))");
NLParseTestUnifyingListener("when did I come to the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.when('etaoin'[#id],verb.come-to('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("when was I in the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.when('etaoin'[#id],space.at('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("when was aurora station built?", o.getSort("performative"), context, "etaoin", "perf.q.when('etaoin'[#id],verb.build(X,'location-aurora-station'[#id]))");
NLParseTestUnifyingListener("when did you go to find minerals?", o.getSort("performative"), context, "etaoin", "perf.q.when(S:'etaoin'[#id],verb.go-to(S,verb.find(S,'mineral'[mineral])))");
NLParseTestUnifyingListener("when did you leave?", o.getSort("performative"), context, "etaoin", "perf.q.when(S:'etaoin'[#id],verb.leave(S))");

// which questions:
NLParseTestUnifyingListener("which is my room?", o.getSort("performative"), context, "etaoin", "perf.q.query(S:'etaoin'[#id],X,#and(room(X), verb.own('1'[#id],X)))");
NLParseTestUnifyingListener("which is your room?", o.getSort("performative"), context, "etaoin", "perf.q.query(S:'etaoin'[#id],X,#and(room(X), verb.own(S,X)))");

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
NLParseTestUnifyingListener("I can not do that", o.getSort("performative"), context, "etaoin", "perf.ack.denyrequest('etaoin'[#id])");
NLParseTestUnifyingListener("I cannot do that", o.getSort("performative"), context, "etaoin", "perf.ack.denyrequest('etaoin'[#id])");

// causes:
NLParseTestUnifyingListener("I came to the kitchen because I wanted food", o.getSort("performative"), context, "etaoin", "perf.inform('etaoin'[#id], relation.cause(verb.come-to('1'[#id],'room1'[#id]), verb.want('1'[#id], [food]) ))");

// how questions:
NLParseTestUnifyingListener("How do I go to the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.go-to('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("How do I get to the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.go-to('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("How do I reach the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.reach('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("How do I go away?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.go('1'[#id],[space.away]))");
NLParseTestUnifyingListener("How do I fix the crate?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.repair('1'[#id],'5'[#id]))");
NLParseTestUnifyingListener("How can I go outside?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.go('1'[#id],[space.outside]))");
NLParseTestUnifyingListener("How can I go outside of the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.leave('1'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("How do I get out of the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.leave('1'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("How do I fix a battery?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.repair('1'[#id], [battery]))");
NLParseTestUnifyingListener("how do i get into the kitchen??", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.enter('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("how do i open the kitchen??", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], action.open('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("how do i open kitchen??", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], action.open('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("how i open kitchen??", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], action.open('1'[#id],'room1'[#id]))");

NLParseTestUnifyingListener("When was I born?", o.getSort("performative"), context, "etaoin", "perf.q.when('etaoin'[#id],property.born('1'[#id]))");
NLParseTestUnifyingListener("what year was I born?", o.getSort("performative"), context, "etaoin", "perf.q.when('etaoin'[#id], property.born('1'[#id]), 'time.year'[time.year])");
NLParseTestUnifyingListener("what month was I born?", o.getSort("performative"), context, "etaoin", "perf.q.when('etaoin'[#id], property.born('1'[#id]), 'time.month'[time.month])");
NLParseTestUnifyingListener("what day was I born?", o.getSort("performative"), context, "etaoin", "perf.q.when('etaoin'[#id], property.born('1'[#id]), 'time.day'[time.day])");

// special cases
NLParseTestUnifyingListener("I need the white key", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], '4'[#id])");
NLParseTestUnifyingListener("what is happening?", o.getSort("performative"), context, "etaoin", "perf.q.query(S:'etaoin'[#id],X,verb.happen(WHO, X))");
NLParseTestUnifyingListener("what happens?", o.getSort("performative"), context, "etaoin", "perf.q.query(S:'etaoin'[#id],X,verb.happen(WHO, X))");
NLParseTestUnifyingListener("what happened?", o.getSort("performative"), context, "etaoin", "perf.q.query(S:'etaoin'[#id],X,#and(V:verb.happen(WHO, X),time.past(V)))");
NLParseTestUnifyingListener("did something happen?", o.getSort("performative"), context, "etaoin", "perf.q.query(S:'etaoin'[#id],X,verb.happen(WHO, X))");
NLParseTestUnifyingListener("what happened to me?", o.getSort("performative"), context, "etaoin", "perf.q.query(S:'etaoin'[#id],X,#and(V:verb.happen('1'[#id], X),time.past(V)))");
NLParseTestUnifyingListener("what is happening to me?", o.getSort("performative"), context, "etaoin", "perf.q.query(S:'etaoin'[#id],X,verb.happen('1'[#id], X))");
NLParseTestUnifyingListener("what's up?", o.getSort("performative"), context, "etaoin", "perf.q.query(S:'etaoin'[#id],X,verb.happen(WHO, X))");
NLParseTestUnifyingListener("whats up?", o.getSort("performative"), context, "etaoin", "perf.q.query(S:'etaoin'[#id],X,verb.happen(WHO, X))");
NLParseTestUnifyingListener("what is going on?", o.getSort("performative"), context, "etaoin", "perf.q.query(S:'etaoin'[#id],X,verb.happen(WHO, X))");

// from Ahmed
NLParseTestUnifyingListener("I don't think so", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'no'[symbol])");
NLParseTestUnifyingListener("is there anyone other than me here?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(#and(space.at(X,'room1'[#id]), character(X)), !=(X,'1'[#id])))");
NLParseTestUnifyingListener("is there anyone other than me on the station?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(#and(space.directly.on.top.of(X,'location-aurora-station'[#id]), character(X)), !=(X,'1'[#id])))");
NLParseTestUnifyingListener("Is there anyone beside me in the station?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(#and(space.at(X,'location-aurora-station'[#id]), character(X)), !=(X,'1'[#id])))");
NLParseTestUnifyingListener("Is there anyone beside me in that station?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(#and(space.at(X,'location-aurora-station'[#id]), character(X)), !=(X,'1'[#id])))");
NLParseTestUnifyingListener("what is your functionality?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, role('etaoin'[#id], X))");
NLParseTestUnifyingListener("do I have access to the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], V1:permission-to(V3:'1'[#id], V8:'room1'[#id]))"); 
NLParseTestUnifyingListener("can I enter the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], verb.can(V2:'1'[#id], V3:verb.enter(V2, V4:'room1'[#id])))"); 
NLParseTestUnifyingListener("can I access the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], verb.can(V2:'1'[#id], V3:verb.access(V2, V4:'room1'[#id])))"); 
NLParseTestUnifyingListener("are there no humans other than me?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(human(X), !=(X,'1'[#id])))");
NLParseTestUnifyingListener("So, are there no humans other than me?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(human(X), !=(X,'1'[#id])))");
NLParseTestUnifyingListener("So there is no humans other than me?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(human(X), !=(X,'1'[#id])))");
NLParseTestUnifyingListener("can I go to space?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], V1:verb.can(V3:'1'[#id],verb.go-to(V3, V8:'space'[#id])))"); 
NLParseTestUnifyingListener("is david here?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], #and(name(X,'david'[symbol]), space.at(X,'room1'[#id])))"); 

// parse errors
NLParseTestUnifyingListener("I cannot parse the sentence", o.getSort("performative"), context, "etaoin", "perf.inform(V0:'etaoin'[#id], #not(verb.can('1'[#id],verb.parse('1'[#id],'sentence'[sentence]))))"); 

// Some additional tests for time:
NLParseTestUnifyingListener("when did you malfunction?", o.getSort("performative"), context, "etaoin", "perf.q.when('etaoin'[#id],verb.malfunction('etaoin'[#id]))"); 
NLParseTestUnifyingListener("are you malfunctioning?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id],verb.malfunction('etaoin'[#id]))"); 
NLParseTestUnifyingListener("did you malfunction?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id],#and(V:verb.malfunction('etaoin'[#id]), time.past(V)))"); 
NLParseTestUnifyingListener("did you malfunction yesterday?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id],#and(V:verb.malfunction('etaoin'[#id]), time.yesterday(V)))"); 
NLParseTestUnifyingListener("am I in stasis?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id],in-stasis('1'[#id]))"); 
NLParseTestUnifyingListener("was I in stasis?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id],#and(V:in-stasis('1'[#id]), time.past(V)))"); 
NLParseTestUnifyingListener("was I in stasis yesterday?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id],#and(V:in-stasis('1'[#id]), time.yesterday(V)))"); 
NLParseTestUnifyingListener("am I in the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate(S:'etaoin'[#id],space.at('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("was I in the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate(S:'etaoin'[#id],#and(V:space.at('1'[#id],'room1'[#id]), time.past(V)))");
NLParseTestUnifyingListener("was I in the kitchen yesterday?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate(S:'etaoin'[#id],#and(V:space.at('1'[#id],'room1'[#id]), time.yesterday(V)))");
NLParseTestUnifyingListener("have I been in the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate(S:'etaoin'[#id],#and(V:space.at('1'[#id],'room1'[#id]), time.past(V)))");
NLParseTestUnifyingListener("have I been in the kitchen today?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate(S:'etaoin'[#id],#and(V:space.at('1'[#id],'room1'[#id]), time.today(V)))");
NLParseTestUnifyingListener("did I colonize aurora station?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id],#and(V:verb.colonize('1'[#id], 'location-aurora-station'[#id]), time.past(V)))");

NLParseTestUnifyingListener("Who are you supervising?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, #and(verb.supervise('etaoin'[#id],X), character(X)))");
NLParseTestUnifyingListener("Who do you supervise?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, #and(verb.supervise('etaoin'[#id],X), character(X)))");
NLParseTestUnifyingListener("What is my age?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, property.age('1'[#id], X))");
NLParseTestUnifyingListener("How old am I?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, property.age('1'[#id], X))");
NLParseTestUnifyingListener("which planet am I in?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], L, #and(planet(L), space.at('1'[#id],L)))");
NLParseTestUnifyingListener("arent you bored?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], bored('etaoin'[#id]))");
NLParseTestUnifyingListener("what is your problem?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, property.problem('etaoin'[#id], X))"); 
NLParseTestUnifyingListener("what is etaoin's problem?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, property.problem('etaoin'[#id], X))");
NLParseTestUnifyingListener("what is the problem of etaoin?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, property.problem('etaoin'[#id], X))");
NLParseTestUnifyingListener("is there something abnormal?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], property.strange(X))");
NLParseTestUnifyingListener("is there anything odd?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], property.strange(X))");
NLParseTestUnifyingListener("is there something weird going on?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], property.strange(X))");
NLParseTestUnifyingListener("what is odd?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, property.strange(X))");
NLParseTestUnifyingListener("what is happening that is weird?", o.getSort("performative"), context, "etaoin", "perf.q.query(S:'etaoin'[#id],X,#and(verb.happen(WHO, X), property.strange(X)))");
NLParseTestUnifyingListener("what is going on that is weird?", o.getSort("performative"), context, "etaoin", "perf.q.query(S:'etaoin'[#id],X,#and(verb.happen(WHO, X), property.strange(X)))");
NLParseTestUnifyingListener("what was going on that is weird?", o.getSort("performative"), context, "etaoin", "perf.q.query(S:'etaoin'[#id],X,#and(V:verb.happen(WHO, X), #and(property.strange(X), time.past(V))))"); 
NLParseTestUnifyingListener("good!!!", o.getSort("performative"), context, 'etaoin', "perf.sentiment('etaoin'[#id], 'good'[symbol])");  
NLParseTestUnifyingListener("owww...", o.getSort("performative"), context, 'etaoin', "perf.sentiment('etaoin'[#id], 'bad'[symbol])");  
NLParseTestUnifyingListener("that is sad", o.getSort("performative"), context, 'etaoin', "perf.sentiment('etaoin'[#id], 'bad'[symbol])");  
NLParseTestUnifyingListener("wtf!?", o.getSort("performative"), context, 'etaoin', "perf.sentiment('etaoin'[#id], 'surprise'[symbol])");  
NLParseTestUnifyingListener("what the hell?!", o.getSort("performative"), context, 'etaoin', "perf.sentiment('etaoin'[#id], 'surprise'[symbol])"); 
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
NLParseTestUnifyingListener("please, guide me to the kitchen", o.getSort("performative"), context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.take-to('etaoin'[#id], '1'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("show me the way to the kitchen", o.getSort("performative"), context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.take-to('etaoin'[#id], '1'[#id], 'room1'[#id]))");

// clear the mentions to restart
context.shortTermMemory.splice(context.shortTermMemory.indexOf(socrates_entity));

// follow-up questions:
NLParseTestUnifyingListener("where?", o.getSort("performative"), context, "etaoin", "perf.q.whereis(S:'etaoin'[#id])");
NLParseTestUnifyingListener("how many?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(S:'etaoin'[#id])");
NLParseTestUnifyingListener("why?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id])");
NLParseTestUnifyingListener("why not?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id])");
NLParseTestUnifyingListener("how come?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id])");
NLParseTestUnifyingListener("who?", o.getSort("performative"), context, "etaoin", "perf.q.query-followup(S:'etaoin'[#id],'character'[character])");
NLParseTestUnifyingListener("which?", o.getSort("performative"), context, "etaoin", "perf.q.query-followup(S:'etaoin'[#id],'object'[object])");
NLParseTestUnifyingListener("which one?", o.getSort("performative"), context, "etaoin", "perf.q.query-followup(S:'etaoin'[#id],'object'[object])");
NLParseTestUnifyingListener("which ones?", o.getSort("performative"), context, "etaoin", "perf.q.query-followup(S:'etaoin'[#id],'object'[object])");
NLParseTestUnifyingListener("like what?", o.getSort("performative"), context, "etaoin", "perf.q.query-followup(S:'etaoin'[#id],'any'[any])");
NLParseTestUnifyingListener("what is?", o.getSort("performative"), context, "etaoin", "perf.q.query-followup(S:'etaoin'[#id],'any'[any])");
NLParseTestUnifyingListener("which room?", o.getSort("performative"), context, "etaoin", "perf.q.query-followup(S:'etaoin'[#id],'room'[room])");
NLParseTestUnifyingListener("I mean which room?", o.getSort("performative"), context, "etaoin", "perf.q.query-followup(S:'etaoin'[#id],'room'[room])");
NLParseTestUnifyingListener("how?", o.getSort("performative"), context, "etaoin", "perf.q.how(S:'etaoin'[#id])");

NLParseTestUnifyingListener("I don't", o.getSort("performative"), context, "etaoin", "perf.inform.answer('etaoin'[#id], 'no'[symbol])");
NLParseTestUnifyingListener("Oh hi!", o.getSort("performative"), context, "etaoin", "perf.greet(V0:'etaoin'[#id])");
NLParseTestUnifyingListener("how to take the crate?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], action.take('1'[#id],'5'[#id]))");
NLParseTestUnifyingListener("am I alone in the station?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(S:'etaoin'[#id], alone-in('1':[#id],'location-aurora-station':[#id]))");
NLParseTestUnifyingListener("am I the only human in the station?", o.getSort("performative"), context, "etaoin", "perf.q.predicate-negated(S:'etaoin'[#id], #and(!=(X,'1'[#id]), #and(space.at(X,'location-aurora-station'[#id]), human(X))))");
NLParseTestUnifyingListener("any human here?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(human(X), space.at(X,'room1'[#id])))");
NLParseTestUnifyingListener("any other human here?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(!=(X,'1'[#id]), #and(human(X), space.at(X,'room1'[#id]))))");
NLParseTestUnifyingListener("any human here other than me?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(!=(X,'1'[#id]), #and(human(X), space.at(X,'room1'[#id]))))");
NLParseTestUnifyingListener("any human other than me here?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(!=(X,'1'[#id]), #and(human(X), space.at(X,'room1'[#id]))))");
NLParseTestUnifyingListener("any humans the crate?", o.getSort("performative"), context, "etaoin", null);
NLParseTestUnifyingListener("who is this?", o.getSort("performative"), context, "etaoin", "perf.q.whois.noname('etaoin'[#id], 'qwerty'[#id])");
NLParseTestUnifyingListener("is someone there with you?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(character(X), #and(!=(X,'etaoin'[#id]), #and(space.at('etaoin'[#id], L), space.at(X, L)))))");
NLParseTestUnifyingListener("is this the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], space.at('1'[#id], 'room1'[#id]))"); 
NLParseTestUnifyingListener("help me!", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.help(V0, '1'[#id]))");
NLParseTestUnifyingListener("help!!!", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.help(V0, '1'[#id]))");
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
NLParseTestUnifyingListener("why am I so light?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id], weight('1'[#id],'light-weight'[light-weight]))");  
NLParseTestUnifyingListener("why do I feel light?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id], weight('1'[#id],'light-weight'[light-weight]))");  
NLParseTestUnifyingListener("why is the gravity in this room so low?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id], gravity('room1'[#id],'low'[low]))");  
NLParseTestUnifyingListener("why is gravity so low here?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id], gravity('room1'[#id],'low'[low]))");  
NLParseTestUnifyingListener("why is gravity so low?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id], gravity('room1'[#id],'low'[low]))");
NLParseTestUnifyingListener("why is david's gravity so low?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id], gravity('1'[#id],'low'[low]))");  
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
NLParseTestUnifyingListener("get out of the way", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.go(V0, [space.away]))"); 
NLParseTestUnifyingListener("get out of the way please", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.go(V0, [space.away]))"); 
NLParseTestUnifyingListener("get out of the way please etaoin", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.go(V0, [space.away]))"); 
NLParseTestUnifyingListener("will you come with me?", o.getSort("performative"), context, 'etaoin', "perf.q.action(V0:'etaoin'[#id], verb.follow('etaoin'[#id], '1'[#id]))");
NLParseTestUnifyingListener("great, what should I do?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, goal('1'[#id],X))");
NLParseTestUnifyingListener("do you speak english?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.speak('etaoin'[#id], 'english'[#id]))");
NLParseTestUnifyingListener("where is the other people?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], X, L, #and(human(X), #and(!=(X,'1'[#id]), !=(X,'etaoin'[#id]))))");
NLParseTestUnifyingListener("how many keys are here?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(key(X), space.at(X,'room1'[#id])))"); 
NLParseTestUnifyingListener("how many keys are there here?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(key(X), space.at(X,'room1'[#id])))"); 
NLParseTestUnifyingListener("Why is there a dead human?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id], #and(human(X), dead(X)))");
NLParseTestUnifyingListener("Why is there a dead human in the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id], #and(space.at(X, 'room1'[#id]), #and(human(X), dead(X))))");
NLParseTestUnifyingListener("Why is there a dead human here?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id], #and(space.at(X, 'room1'[#id]), #and(human(X), dead(X))))");  
NLParseTestUnifyingListener("okay, how can I reach the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.reach('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("my name is not santi", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #not(name('1'[#id],'santi'[symbol])))");
NLParseTestUnifyingListener("am I the only human?", o.getSort("performative"), context, "etaoin", "perf.q.predicate-negated(S:'etaoin'[#id], #and(!=(X,'1'[#id]), human(X)))");
NLParseTestUnifyingListener("am I the last human?", o.getSort("performative"), context, "etaoin", "perf.q.predicate-negated(S:'etaoin'[#id], #and(!=(X,'1'[#id]), #and(alive(X), human(X))))");
NLParseTestUnifyingListener("am I the only human alive?", o.getSort("performative"), context, "etaoin", "perf.q.predicate-negated(S:'etaoin'[#id], #and(!=(X,'1'[#id]), #and(alive(X), human(X))))");
NLParseTestUnifyingListener("am I the last human alive?", o.getSort("performative"), context, "etaoin", "perf.q.predicate-negated(S:'etaoin'[#id], #and(!=(X,'1'[#id]), #and(alive(X), human(X))))");
NLParseTestUnifyingListener("Why can't you repair the crate??", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id],#not(verb.can('etaoin'[#id], verb.repair('etaoin'[#id],'5'[#id]))))");
NLParseTestUnifyingListener("there is a corpse here", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #and(corpse(X), space.at(X,'room1'[#id])))");
NLParseTestUnifyingListener("there is a crate in the kitchen", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #and(crate(X), space.at(X,'room1'[#id])))");

// Notice that the "is there a corpse?" is asked twice, this is because the second was earlier parsed as "is the bedroom a corpse?"
testAI.timeStamp++;
NLParseTestUnifyingListener("is there a corpse?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], corpse(X))"); 
NLParseTestUnifyingListener("the bedroom is a room", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], room(V1:'room2'[#id]))");
NLParseTestUnifyingListener("is there a corpse?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], corpse(X))"); 

NLParseTestUnifyingListener("how do i get outside of the kitchen", o.getSort("performative"), context, 'etaoin', "perf.q.how('etaoin'[#id], verb.leave('1'[#id], 'room1'[#id]))"); 
NLParseTestUnifyingListener("You need a space suit", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #and(verb.need('etaoin'[#id], X:[#id]), spacesuit(X)))"); 
NLParseTestUnifyingListener("You will need a space suit", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #and(#and(V:verb.need('etaoin'[#id], X), spacesuit(X)), time.future(V)))");
NLParseTestUnifyingListener("how should i find the crate", o.getSort("performative"), context, 'etaoin', "perf.q.how('etaoin'[#id], verb.find('1'[#id], '5'[#id]))");
NLParseTestUnifyingListener("whose crate is this?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, verb.own(X, '5'[#id]))");
NLParseTestUnifyingListener("who is the owner of this crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, verb.own(X, '5'[#id]))");
NLParseTestUnifyingListener("who owns this crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], V1:[any], V2:#and(V3:character(V1), V4:verb.own(V1, V5:'5'[#id])))");
NLParseTestUnifyingListener("am I the last human here?", o.getSort("performative"), context, "etaoin", "perf.q.predicate-negated(S:'etaoin'[#id], #and(!=(X,'1'[#id]), #and(alive(X), #and(human(X), space.at(X, 'room1'[#id])))))");
NLParseTestUnifyingListener("am I the only human here?", o.getSort("performative"), context, "etaoin", "perf.q.predicate-negated(S:'etaoin'[#id], #and(!=(X,'1'[#id]), #and(human(X), space.at(X, 'room1'[#id]))))");
NLParseTestUnifyingListener("why am i the only human?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id], #not(#and(!=(X,'1'[#id]), #and(alive(X), human(X)))))");
NLParseTestUnifyingListener("why am i the only human here?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id], #not(#and(!=(X,'1'[#id]), #and(alive(X), #and(human(X), space.at(X, 'room1'[#id]))))))");
NLParseTestUnifyingListener("why are there no humans here?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id], #not(#and(human(X), space.at(X, 'room1'[#id]))))");
NLParseTestUnifyingListener("why don't i remember anything?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id], #not(verb.remember('1'[#id], 'pronoun.anything'[pronoun.anything])))");
NLParseTestUnifyingListener("how do i turn on the ship", o.getSort("performative"), context, 'etaoin', "perf.q.how('etaoin'[#id], verb.switch-on('1'[#id], '2'[#id]))"); 
NLParseTestUnifyingListener("who is in the other rooms?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, #and(character(X), #and(space.at(X, Y), #and(room(Y), !=(Y, 'room1'[#id])))))");
NLParseTestUnifyingListener("were there other humans here before?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(human(X), #and(!=(X,'1'[#id]), #and(V:space.at(X, 'room1'[#id]), time.past(V)))))");
NLParseTestUnifyingListener("etaoin send the crate here", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.talk(V0, perf.request.action(TARGET:'5'[#id], verb.go-to(TARGET, 'room1'[#id]))))"); 
NLParseTestUnifyingListener("can you send the crate here?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], action.talk(V0, perf.request.action(TARGET:'5'[#id], verb.go-to(TARGET, 'room1'[#id]))))"); 
NLParseTestUnifyingListener("send the crate to the kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.talk(V0, perf.request.action(TARGET:'5'[#id], verb.go-to(TARGET, 'room1'[#id]))))"); 
NLParseTestUnifyingListener("turn the ship on", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], verb.switch-on('etaoin'[#id], '2'[#id]))"); 
NLParseTestUnifyingListener("how do I turn the ship on", o.getSort("performative"), context, 'etaoin', "perf.q.how('etaoin'[#id], verb.switch-on('1'[#id], '2'[#id]))");
NLParseTestUnifyingListener("how do I get permission to the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.how('etaoin'[#id], verb.get('1'[#id], permission-to(V3:'1'[#id], V8:'room1'[#id])))");
NLParseTestUnifyingListener("how do I get permission to enter the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.how('etaoin'[#id], verb.get('1'[#id], permission-to(V3:'1'[#id], verb.enter('1'[#id], V8:'room1'[#id]))))");
NLParseTestUnifyingListener("how do I get access to the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.how('etaoin'[#id], verb.get('1'[#id], permission-to(V3:'1'[#id], V8:'room1'[#id])))");
NLParseTestUnifyingListener("give me permission to the kitchen", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], action.give('etaoin'[#id], '1'[#id], permission-to(V3:'1'[#id], V8:'room1'[#id])))");
NLParseTestUnifyingListener("can you give me access to the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.action('etaoin'[#id], action.give('etaoin'[#id], '1'[#id], permission-to(V3:'1'[#id], V8:'room1'[#id])))");
NLParseTestUnifyingListener("can you give me access to enter the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.action('etaoin'[#id], action.give('etaoin'[#id], '1'[#id], permission-to(V3:'1'[#id], verb.enter('1'[#id], V8:'room1'[#id])) ))");
NLParseTestUnifyingListener("I will sleep", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #and(V:verb.sleep('1'[#id]), time.future(V)))");
NLParseTestUnifyingListener("I am going to sleep", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #and(V:verb.sleep('1'[#id]), time.future(V)))");
NLParseTestUnifyingListener("I'm going to sleep", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #and(V:verb.sleep('1'[#id]), time.future(V)))");
NLParseTestUnifyingListener("How did I get here?", o.getSort("performative"), context, 'etaoin', "perf.q.how('etaoin'[#id], #and(V:verb.go('1'[#id], 'room1'[#id]), time.past(V)))");
NLParseTestUnifyingListener("which rover should i take?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(rover(X), goal('1'[#id], action.take('1'[#id], X))))");
NLParseTestUnifyingListener("what did happen to humans?", o.getSort("performative"), context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,#and(V:verb.happen('1'[#id], X), time.past(V)))");  
NLParseTestUnifyingListener("what happened to humans?", o.getSort("performative"), context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,#and(V:verb.happen('1'[#id], X), time.past(V)))");
NLParseTestUnifyingListener("what happened to the other humans?", o.getSort("performative"), context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,#and(V:verb.happen(H, X), #and(human(H), #and(!=(H, '1'[#id]), time.past(V)))))");
NLParseTestUnifyingListener("what happened to other humans?", o.getSort("performative"), context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,#and(V:verb.happen(H, X), #and(human(H), #and(!=(H, '1'[#id]), time.past(V)))))");
NLParseTestUnifyingListener("what happened to the others?", o.getSort("performative"), context, 'etaoin', "perf.q.query(S:'etaoin'[#id],X,#and(V:verb.happen(H, X), #and(human(H), #and(!=(H, '1'[#id]), time.past(V)))))");  
NLParseTestUnifyingListener("no other humans?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], V2:#and(!=(V:[any], V6:'1'[#id]), V11:human(V)))");
NLParseTestUnifyingListener("no other humans here?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], V2:#and(!=(V:[any], V6:'1'[#id]), #and(space.at(V, 'room1'[#id]), V11:human(V))))"); 
NLParseTestUnifyingListener("no other humans in the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], V2:#and(!=(V:[any], V6:'1'[#id]), #and(space.at(V, 'room1'[#id]), V11:human(V))))");

// For ACT 2:
NLParseTestUnifyingListener("did you find life in the station?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], #and(verb.find(V0, X, 'location-aurora-station'[#id]), living-being(X)))");
NLParseTestUnifyingListener("have you found life in the station?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], #and(verb.find(V0, X, 'location-aurora-station'[#id]), living-being(X)))");
NLParseTestUnifyingListener("have we found life in the station?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], #and(verb.find(Y, X, 'location-aurora-station'[#id]), living-being(X)))");
NLParseTestUnifyingListener("is there life in the station?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], #and(space.at(X, 'location-aurora-station'[#id]), living-being(X)))");
NLParseTestUnifyingListener("is there life in the station other than me?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], #and(!=(X,'1'[#id]), #and(space.at(X, 'location-aurora-station'[#id]), living-being(X))))");
NLParseTestUnifyingListener("do you know what is this room?", o.getSort("performative"), context, "etaoin", "perf.q.whatis.noname('etaoin'[#id], 'room1'[#id])");
NLParseTestUnifyingListener("do you know what is etaoin?", o.getSort("performative"), context, 'etaoin', "perf.q.whatis.name('etaoin'[#id], 'etaoin'[#id])");
NLParseTestUnifyingListener("do you know who are you?", o.getSort("performative"), context, 'etaoin', "perf.q.whois.noname('etaoin'[#id], 'etaoin'[#id])");
NLParseTestUnifyingListener("do you know who is etaoin?", o.getSort("performative"), context, 'etaoin', "perf.q.whois.name('etaoin'[#id], 'etaoin'[#id])");

NLParseTestUnifyingListener("does this mean I am the last human?", o.getSort("performative"), context, "etaoin", "perf.q.predicate-negated(S:'etaoin'[#id], #and(!=(X,'1'[#id]), #and(alive(X), human(X))))");
NLParseTestUnifyingListener("so, does that mean I am the last human?", o.getSort("performative"), context, "etaoin", "perf.q.predicate-negated(S:'etaoin'[#id], #and(!=(X,'1'[#id]), #and(alive(X), human(X))))");
NLParseTestUnifyingListener("why is it dark in this room?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id], dark('room1'[#id]))");
NLParseTestUnifyingListener("why is it so dark in this room?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id], dark('room1'[#id]))");
NLParseTestUnifyingListener("why is it so dark here?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id], dark('room1'[#id]))");
NLParseTestUnifyingListener("why is it so dark in here?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id], dark('room1'[#id]))");
NLParseTestUnifyingListener("why is it dark?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id], dark('room1'[#id]))");
NLParseTestUnifyingListener("why is this room dark?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id], dark('room1'[#id]))");
NLParseTestUnifyingListener("why is there no light in here?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id], dark('room1'[#id]))");
NLParseTestUnifyingListener("why is there no light in this room?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id], dark('room1'[#id]))");
NLParseTestUnifyingListener("take the light", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], 'l1'[#id]))");
NLParseTestUnifyingListener("take the light in the kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], 'l1'[#id]))");
NLParseTestUnifyingListener("take the light from the kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], 'l1'[#id]))");
NLParseTestUnifyingListener("could you please take the light from the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.action(V0:'etaoin'[#id], action.take('etaoin'[#id], 'l1'[#id]))");
NLParseTestUnifyingListener("put the white key in the crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], '4'[#id], '5'[#id]))");
NLParseTestUnifyingListener("bring me to the kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.take-to('etaoin'[#id], '1'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("can you open keys?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], #and(verb.can('etaoin'[#id], action.open('etaoin'[#id], X)), key(X)))");
NLParseTestUnifyingListener("my direction is north", o.getSort("performative"), context, "etaoin", "perf.inform(V0:'etaoin'[#id], facing-direction('1'[#id], 'north'[north]))");
NLParseTestUnifyingListener("your direction is north", o.getSort("performative"), context, "etaoin", "perf.inform(V0:'etaoin'[#id], facing-direction('etaoin'[#id], 'north'[north]))");
NLParseTestUnifyingListener("I am facing north", o.getSort("performative"), context, "etaoin", "perf.inform(V0:'etaoin'[#id], facing-direction('1'[#id], 'north'[north]))");
NLParseTestUnifyingListener("I face north", o.getSort("performative"), context, "etaoin", "perf.inform(V0:'etaoin'[#id], facing-direction('1'[#id], 'north'[north]))");
NLParseTestUnifyingListener("I am looking to the north", o.getSort("performative"), context, "etaoin", "perf.inform(V0:'etaoin'[#id], facing-direction('1'[#id], 'north'[north]))");
NLParseTestUnifyingListener("I look to the north", o.getSort("performative"), context, "etaoin", "perf.inform(V0:'etaoin'[#id], facing-direction('1'[#id], 'north'[north]))");
NLParseTestUnifyingListener("which direction am I facing?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, facing-direction('1'[#id], X))");
NLParseTestUnifyingListener("which direction am I looking at?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, facing-direction('1'[#id], X))");
NLParseTestUnifyingListener("what is my direction?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, facing-direction('1'[#id], X))");
NLParseTestUnifyingListener("am I facing north?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], facing-direction('1'[#id], 'north'[north]))");
NLParseTestUnifyingListener("is my direction north?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], facing-direction('1'[#id], 'north'[north]))");
NLParseTestUnifyingListener("I am in the kitchen", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], space.at('1'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("I am in a kitchen", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #and(space.at('1'[#id], X), kitchen(X)))");
NLParseTestUnifyingListener("am I in the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], space.at('1'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("am I in a kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(space.at('1'[#id], X), kitchen(X)))");
NLParseTestUnifyingListener("can you help me go to the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.action('etaoin'[#id], verb.help('etaoin'[#id], X:'1'[#id], verb.go-to(X, 'room1'[#id])))");
NLParseTestUnifyingListener("help me go to the kitchen", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], verb.help('etaoin'[#id], X:'1'[#id], verb.go-to(X, 'room1'[#id])))");
NLParseTestUnifyingListener("help me open the crate", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], verb.help('etaoin'[#id], X:'1'[#id], action.open(X, '5'[#id])))");
NLParseTestUnifyingListener("may I have the white key?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '1'[#id]))");  
NLParseTestUnifyingListener("do you have any keys?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(verb.have('etaoin'[#id],X),key(X) ))");
NLParseTestUnifyingListener("what keys do you have?", o.getSort("performative"), context, "etaoin", "perf.q.query(S:'etaoin'[#id], X, #and(key(X), verb.have('etaoin'[#id],X)))");
NLParseTestUnifyingListener("which keys does etaoin have?", o.getSort("performative"), context, "etaoin", "perf.q.query(S:'etaoin'[#id], X, #and(key(X), verb.have('etaoin'[#id],X)))");
NLParseTestUnifyingListener("do you know where is the bedroom?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], 'room2'[#id])");
NLParseTestUnifyingListener("do you know where the bedroom is?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], 'room2'[#id])");

// For version 2.4:
NLParseTestUnifyingListener("hand over the white key", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '1'[#id]))");
NLParseTestUnifyingListener("please give me your ships", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.give(V0, '2'[#id], '1'[#id]))");
NLParseTestUnifyingListener("please give me all your ships", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.give(V0, '2'[#id], '1'[#id]))");
NLParseTestUnifyingListener("please give me all your ships", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.give(V0, '2'[#id], '1'[#id]))");
NLParseTestUnifyingListener("who was the artificial intelligence?", o.getSort("performative"), context, 'etaoin', "perf.q.whois.noname('etaoin'[#id], 'etaoin'[#id])");
NLParseTestUnifyingListener("how do I move?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.move('1'[#id]))");
NLParseTestUnifyingListener("where is this?", o.getSort("performative"), context, "etaoin", "perf.q.whereis('etaoin'[#id], X, L, space.at('1'[#id], X))");
NLParseTestUnifyingListener("stop talking to me", o.getSort("performative"), context, 'etaoin', "perf.request.stopaction(V0:'etaoin'[#id], action.talk('etaoin'[#id], X, '1'[#id]))");
NLParseTestUnifyingListener("nice to meet you!", o.getSort("performative"), context, "etaoin", "perf.nicetomeetyou(V0:'etaoin'[#id])");
NLParseTestUnifyingListener("nice to meet you, etaoin!", o.getSort("performative"), context, "etaoin", "perf.nicetomeetyou(V0:'etaoin'[#id])");
NLParseTestUnifyingListener("it is a pleasure to make your acquaintance", o.getSort("performative"), context, "etaoin", "perf.nicetomeetyou(V0:'etaoin'[#id])");
NLParseTestUnifyingListener("glad to meet you too", o.getSort("performative"), context, "etaoin", "perf.nicetomeetyoutoo(V0:'etaoin'[#id])");
NLParseTestUnifyingListener("how do I get in the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.enter('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("how do I get in?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.enter('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("yep, same here!", o.getSort("performative"), context, "etaoin", "perf.ackresponse('etaoin'[#id])");
NLParseTestUnifyingListener("go forward", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.go(V0, [forward]))");
NLParseTestUnifyingListener("move backwards", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.move(V0, [backward]))");
NLParseTestUnifyingListener("go north", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.go(V0, [north]))");
NLParseTestUnifyingListener("go to the left", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.go-to(V0, [direction.left]))");
NLParseTestUnifyingListener("move to the south", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.move-to(V0, [south]))");
NLParseTestUnifyingListener("move a bit to the south", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.move(V0, [south], [small-amount]))");
NLParseTestUnifyingListener("go to the east a bit", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.go-to(V0, [east], [small-amount]))");
NLParseTestUnifyingListener("head straight", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.go(V0, [forward]))");
NLParseTestUnifyingListener("turn left", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.rotate(V0, [direction.left]))");
NLParseTestUnifyingListener("rotate right", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.rotate(V0, [direction.right]))");
NLParseTestUnifyingListener("push forward", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.push(V0, [forward]))");
NLParseTestUnifyingListener("push the crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.push(V0, '5'[#id]))");
NLParseTestUnifyingListener("push the crate forward", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.push(V0, '5'[#id], [forward]))");
NLParseTestUnifyingListener("push the crate north", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.push(V0, '5'[#id], [north]))");
NLParseTestUnifyingListener("pull from the crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.pull(V0, '5'[#id]))");
NLParseTestUnifyingListener("again", o.getSort("performative"), context, "etaoin", "perf.request.repeataction(V0:'etaoin'[#id])");
NLParseTestUnifyingListener("keep going", o.getSort("performative"), context, "etaoin", "perf.request.repeataction(V0:'etaoin'[#id], [verb.go])");
NLParseTestUnifyingListener("keep pushing", o.getSort("performative"), context, "etaoin", "perf.request.repeataction(V0:'etaoin'[#id], [action.push])");
NLParseTestUnifyingListener("a bit more", o.getSort("performative"), context, "etaoin", "perf.request.repeataction(V0:'etaoin'[#id])");
NLParseTestUnifyingListener("one more time", o.getSort("performative"), context, "etaoin", "perf.request.repeataction(V0:'etaoin'[#id])");
NLParseTestUnifyingListener("could you go forward?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], verb.go(V0, [forward]))");
NLParseTestUnifyingListener("could you move a bit to the left?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], verb.move(V0, [direction.left], [small-amount]))");
NLParseTestUnifyingListener("enter the ship", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.enter(V0, '2'[#id]))");
NLParseTestUnifyingListener("exit the ship", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.leave(V0, '2'[#id]))");

// For version 2.5:
NLParseTestUnifyingListener("etaoin thank you", o.getSort("performative"), context, "etaoin", "perf.thankyou('etaoin'[#id])"); 
NLParseTestUnifyingListener("same here!", o.getSort("performative"), context, "etaoin", "perf.ackresponse('etaoin'[#id])");
NLParseTestUnifyingListener("why did you turn on the light?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id],verb.switch-on(S,'l1'[#id]))");
NLParseTestUnifyingListener("why did you turn the lights on?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id],verb.switch-on(S,'l1'[#id]))");
NLParseTestUnifyingListener("how many keys do you see?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, key(X))");  
NLParseTestUnifyingListener("where did you go?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis(V:'etaoin'[#id], V)"); 
NLParseTestUnifyingListener("etaoin fix the ship", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], verb.repair(P:'etaoin'[#id], '2'[#id]))");
NLParseTestUnifyingListener("etaoin repaired the ship", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], verb.repair(P:'etaoin'[#id], '2'[#id]))");
NLParseTestUnifyingListener("what do I do?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, goal('1'[#id],X))");

// For version 2.6:
NLParseTestUnifyingListener("who erased the ship?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), #and(V2:action.erase(X, '2'[#id]), time.past(V2))))"); 
NLParseTestUnifyingListener("who erase the ship?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), action.erase(X, '2'[#id])))");
NLParseTestUnifyingListener("All humans speak english", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #or(#not(human(X:[#id])),verb.speak(X, 'english'[#id])))");
NLParseTestUnifyingListener("the ship is either white or blue", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #or(color('2'[#id],'white'[white]), color('2'[#id],'blue'[blue])))");
NLParseTestUnifyingListener("the ship is white or blue", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #or(color('2'[#id],'white'[white]), color('2'[#id],'blue'[blue])))");
NLParseTestUnifyingListener("the color of the ship is either white or blue", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #or(color('2'[#id],'white'[white]), color('2'[#id],'blue'[blue])))");
NLParseTestUnifyingListener("All robots are machines", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #or(#not(robot(X:[#id])), machine(X)))");
NLParseTestUnifyingListener("robots are machines", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #or(#not(robot(X:[#id])), machine(X)))");
NLParseTestUnifyingListener("robots are not machines", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #or(#not(robot(X:[#id])), #not(machine(X))))");
NLParseTestUnifyingListener("I do not have a key", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #or(#not(verb.have('1'[#id], X:[#id])), #not(key(X))))");
NLParseTestUnifyingListener("all of my keys are white", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], color('4'[#id],'white'[white]))");
NLParseTestUnifyingListener("all humans who are alive are small", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #or(#not(#and(human(X:[#id]), alive(X))), small(X)))");
NLParseTestUnifyingListener("all alive humans are small", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #or(#not(#and(human(X:[#id]), alive(X))), small(X)))");
NLParseTestUnifyingListener("where do you come from?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, verb.come-from('etaoin'[#id],X))");
NLParseTestUnifyingListener("where are you coming from?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, verb.come-from('etaoin'[#id],X))");
NLParseTestUnifyingListener("open the door", o.getSort("performative"), context, 'etaoin', "perf.request.action(LISTENER_0:'etaoin'[#id], V1:action.open(LISTENER_0, V2:'door1'[#id]))");
NLParseTestUnifyingListener("open the kitchen", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], action.open('etaoin'[#id], 'room1'[#id]))"); 
NLParseTestUnifyingListener("open the door of the kitchen", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], action.open('etaoin'[#id], 'door1'[#id]))"); 
NLParseTestUnifyingListener("open the door to the kitchen", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], action.open('etaoin'[#id], 'door1'[#id]))"); 
NLParseTestUnifyingListener("close the kitchen door", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], action.close('etaoin'[#id], 'door1'[#id]))"); 
NLParseTestUnifyingListener("open the kitchen's door", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], action.open('etaoin'[#id], 'door1'[#id]))"); 
NLParseTestUnifyingListener("can you open the kitchen door?", o.getSort("performative"), context, 'etaoin', "perf.q.action('etaoin'[#id], action.open('etaoin'[#id], 'door1'[#id]))"); 
NLParseTestUnifyingListener("can you close the kitchen's door?", o.getSort("performative"), context, 'etaoin', "perf.q.action('etaoin'[#id], action.close('etaoin'[#id], 'door1'[#id]))"); 
NLParseTestUnifyingListener("can I take etaoin?", o.getSort("performative"), context, 'etaoin', "perf.q.action('etaoin'[#id], action.take('1'[#id], 'etaoin'[#id]))"); 
NLParseTestUnifyingListener("can I take etaoin with me?", o.getSort("performative"), context, 'etaoin', "perf.q.action('etaoin'[#id], action.take('1'[#id], 'etaoin'[#id]))"); 
NLParseTestUnifyingListener("give me permission to take etaoin", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], action.give('etaoin'[#id], '1'[#id], permission-to(V3:'1'[#id], action.take('1'[#id], 'etaoin'[#id]))))");
NLParseTestUnifyingListener("give etaoin permission to leave", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], action.give('etaoin'[#id], 'etaoin'[#id], permission-to(V3:'etaoin'[#id], verb.leave('etaoin'[#id]))))");
NLParseTestUnifyingListener("give permission to etaoin to leave", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], action.give('etaoin'[#id], 'etaoin'[#id], permission-to(V3:'etaoin'[#id], verb.leave('etaoin'[#id]))))");
NLParseTestUnifyingListener("give permission to leave to etaoin", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], action.give('etaoin'[#id], 'etaoin'[#id], permission-to(V3:'etaoin'[#id], verb.leave('etaoin'[#id]))))");
NLParseTestUnifyingListener("grant etaoin permission to leave the station", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], action.give('etaoin'[#id], 'etaoin'[#id], permission-to(V3:'etaoin'[#id], verb.leave('etaoin'[#id], 'location-aurora-station'[#id]))))");
NLParseTestUnifyingListener("grant permission to etaoin to leave the station", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], action.give('etaoin'[#id], 'etaoin'[#id], permission-to(V3:'etaoin'[#id], verb.leave('etaoin'[#id], 'location-aurora-station'[#id]))))");
NLParseTestUnifyingListener("grant etaoin permission to come with me", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], action.give('etaoin'[#id], 'etaoin'[#id], permission-to(V3:'etaoin'[#id], verb.follow('etaoin'[#id], '1'[#id]))))");
NLParseTestUnifyingListener("I want to take etaoin", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], action.take('1'[#id], 'etaoin'[#id]))");
NLParseTestUnifyingListener("I want to take etaoin with me", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], action.take('1'[#id], 'etaoin'[#id]))");
NLParseTestUnifyingListener("let me take etaoin", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], action.take('1'[#id], 'etaoin'[#id]))");
NLParseTestUnifyingListener("let me take etaoin with me", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], action.take('1'[#id], 'etaoin'[#id]))");
NLParseTestUnifyingListener("I need to take etaoin with me", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], action.take('1'[#id], 'etaoin'[#id]))");
NLParseTestUnifyingListener("let me take etaoin to the kitchen", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], verb.take-to('1'[#id], 'etaoin'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("enter into the ship", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.enter(V0, '2'[#id]))");

// For version 2.7:
NLParseTestUnifyingListener("who can fix the ship?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, #and(character(X), verb.can(X, verb.repair(X, '2'[#id]))))");
NLParseTestUnifyingListener("do you know who can fix the ship?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, #and(character(X), verb.can(X, verb.repair(X, '2'[#id]))))");
NLParseTestUnifyingListener("who can repair a ship?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, #and(character(X), #and(verb.can(X, verb.repair(X, Y)), ship(Y))))");
NLParseTestUnifyingListener("keep going south", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.go(V0, [south]))");
NLParseTestUnifyingListener("keep pushing south", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.push(V0, [south]))");

// For version 2.8:
NLParseTestUnifyingListener("drop the ship here", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], action.drop('etaoin'[#id], '2'[#id], [space.here]))");
NLParseTestUnifyingListener("drop the ship on the floor", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], action.drop('etaoin'[#id], '2'[#id]))");
NLParseTestUnifyingListener("could you drop the ship on the ground?", o.getSort("performative"), context, "etaoin", "perf.q.action('etaoin'[#id], action.drop('etaoin'[#id], '2'[#id]))");
NLParseTestUnifyingListener("drop the ship in the kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], action.drop-in('etaoin'[#id], '2'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("put the ship in the kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], action.put-in('etaoin'[#id], '2'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("how do I talk to etaoin?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], action.talk('1'[#id],'etaoin'[#id]))");
NLParseTestUnifyingListener("how long do I wait?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, time.duration(verb.wait('1'[#id]), X))");
NLParseTestUnifyingListener("how long do I have to wait?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, time.duration(goal('1'[#id], verb.wait('1'[#id])), X))");
NLParseTestUnifyingListener("can I clean the ship?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.can('1'[#id],verb.clean('1'[#id], '2'[#id])))");
NLParseTestUnifyingListener("can I clean clothes?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.can('1'[#id],verb.clean('1'[#id], 'hypothetical-object'[#id])), clothing('hypothetical-object'[#id]))");
NLParseTestUnifyingListener("can I clean some clothes?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.can('1'[#id],verb.clean('1'[#id], 'hypothetical-object'[#id])), clothing('hypothetical-object'[#id]))");
NLParseTestUnifyingListener("where can I clean some clothes?", o.getSort("performative"), context, "etaoin", "perf.q.whereis('etaoin'[#id], SOMEONE:'hypothetical-character'[#id], LOCATION, #and(verb.can(SOMEONE,verb.clean(SOMEONE, 'hypothetical-object'[#id])), clothing('hypothetical-object'[#id])))");
NLParseTestUnifyingListener("where can I clean clothes?", o.getSort("performative"), context, "etaoin", "perf.q.whereis('etaoin'[#id], SOMEONE:'hypothetical-character'[#id], LOCATION, #and(verb.can(SOMEONE,verb.clean(SOMEONE, 'hypothetical-object'[#id])), clothing('hypothetical-object'[#id])))"); 
NLParseTestUnifyingListener("can I do laundry?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.can('1'[#id],verb.clean('1'[#id], 'hypothetical-object'[#id])), clothing('hypothetical-object'[#id]))");
NLParseTestUnifyingListener("can I do laundry in the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.can(SOMEONE:'hypothetical-character'[#id], verb.clean(SOMEONE, 'hypothetical-object'[#id])), #and(clothing('hypothetical-object'[#id]), space.at('hypothetical-character'[#id], 'room1'[#id])))"); 
NLParseTestUnifyingListener("can I do laundry in here?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.can(SOMEONE:'hypothetical-character'[#id], verb.clean(SOMEONE, 'hypothetical-object'[#id])), #and(clothing('hypothetical-object'[#id]), space.at('hypothetical-character'[#id], 'room1'[#id])))");
NLParseTestUnifyingListener("can I clean the ship in the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.can(SOMEONE:'hypothetical-character'[#id], verb.clean(SOMEONE, '2'[#id])), space.at('hypothetical-character'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("can I clean the ship here?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.can(SOMEONE:'hypothetical-character'[#id], verb.clean(SOMEONE, '2'[#id])), space.at('hypothetical-character'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("where can I do laundry?", o.getSort("performative"), context, "etaoin", "perf.q.whereis('etaoin'[#id], SOMEONE:'hypothetical-character'[#id], LOCATION, #and(verb.can(SOMEONE,verb.clean(SOMEONE, X:'hypothetical-object'[#id])), clothing(X)))");
NLParseTestUnifyingListener("where can I clean the ship?", o.getSort("performative"), context, "etaoin", "perf.q.whereis('etaoin'[#id], SOMEONE:'hypothetical-character'[#id], LOCATION, verb.can(SOMEONE,verb.clean(SOMEONE, '2'[#id])))");
context.expectingAnswerToQuestion_stack.push(new NLContextPerformative("dummy text so that the next are taken as answers", "1", null, null, null, null, context, 0));
context.expectingAnswerToQuestionTimeStamp_stack.push(0);
NLParseTestUnifyingListener("No I do not", o.getSort("performative"), context, "etaoin", "perf.inform.answer('etaoin'[#id], 'no'[symbol])");
NLParseTestUnifyingListener("No, I don't", o.getSort("performative"), context, "etaoin", "perf.inform.answer('etaoin'[#id], 'no'[symbol])");
NLParseTestUnifyingListener("Yes I do", o.getSort("performative"), context, "etaoin", "perf.inform.answer('etaoin'[#id], 'yes'[symbol])");
NLParseTestUnifyingListener("can I clean keys?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.can(SOMEONE:'1'[#id], verb.clean(SOMEONE, 'hypothetical-object'[#id])), key('hypothetical-object'[#id]))"); 
NLParseTestUnifyingListener("can I clean keys in the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.can(SOMEONE:'hypothetical-character'[#id], verb.clean(SOMEONE, 'hypothetical-object'[#id])), #and(key('hypothetical-object'[#id]), space.at('hypothetical-character'[#id], 'room1'[#id])))"); 
NLParseTestUnifyingListener("how do i get outside the kitchen", o.getSort("performative"), context, 'etaoin', "perf.q.how('etaoin'[#id], verb.leave('1'[#id], 'room1'[#id]))"); 
NLParseTestUnifyingListener("go outside the kitchen", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], verb.leave('etaoin'[#id], 'room1'[#id]))"); 
NLParseTestUnifyingListener("where is the whole bedroom?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], 'room2'[#id])");
NLParseTestUnifyingListener("No I meant the whole ship", o.getSort("performative"), context, 'etaoin', "perf.rephrase.entity('etaoin'[#id], '2'[#id])");
NLParseTestUnifyingListener("I wanted to say the whole ship", o.getSort("performative"), context, 'etaoin', "perf.rephrase.entity('etaoin'[#id], '2'[#id])");

// For version 3.1:
context.expectingAnswerToQuestion_stack.push(new NLContextPerformative("dummy text so that the next are taken as answers", "1", null, null, null, null, context, 0));
context.expectingAnswerToQuestionTimeStamp_stack.push(0);
NLParseTestUnifyingListener("no.", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'no'[symbol])");
NLParseTestUnifyingListener("I don't.", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'no'[symbol])");
NLParseTestUnifyingListener("move east a little", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.move(V0, [east], [small-amount]))");
NLParseTestUnifyingListener("wow", o.getSort("performative"), context, 'etaoin', "perf.sentiment('etaoin'[#id], 'surprise'[symbol])");  
NLParseTestUnifyingListener(":)", o.getSort("performative"), context, 'etaoin', "perf.sentiment('etaoin'[#id], 'good'[symbol])");  
NLParseTestUnifyingListener(":(", o.getSort("performative"), context, 'etaoin', "perf.sentiment('etaoin'[#id], 'bad'[symbol])");  
NLParseTestUnifyingListener("tell me what you have", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, verb.have(V0, X))");
NLParseTestUnifyingListener("etaoin where is someone?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], X, L, character(X))");
NLParseTestUnifyingListener("etaoin where is someone else?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], X, L, #and(character(X), #and(!=(X,'1'[#id]), !=(X,'etaoin'[#id]))))");
NLParseTestUnifyingListener("go to sleep", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.sleep('etaoin'[#id]))");
NLParseTestUnifyingListener("how can i die?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.die('1'[#id]))");
NLParseTestUnifyingListener("what is oxygen", o.getSort("performative"), context, "etaoin", "perf.q.action(X:'etaoin'[#id], verb.define(X,[oxygen]))");
NLParseTestUnifyingListener("how do i wear my key", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.wear('1'[#id], '4'[#id]))");
NLParseTestUnifyingListener("was there anyone else here?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(!=(X,'etaoin'[#id]), #and(!=(X,'1'[#id]), #and(AT:space.at(X,'room1'[#id]), #and(character(X), time.past(AT))))))");
NLParseTestUnifyingListener("was there ever anyone else here?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(!=(X,'etaoin'[#id]), #and(!=(X,'1'[#id]), #and(AT:space.at(X,'room1'[#id]), #and(character(X), time.past(AT))))))");
NLParseTestUnifyingListener("i'm awake?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], awake('1'[#id]))"); 
NLParseTestUnifyingListener("i'm healthy?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], healthy('1'[#id]))"); 
NLParseTestUnifyingListener("print money", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.print('etaoin'[#id], X), money(X), [number.1])");
NLParseTestUnifyingListener("print a key", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.print('etaoin'[#id], X), key(X), [number.1])"); 
NLParseTestUnifyingListener("3d print pliers", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.print('etaoin'[#id], X), pliers(X), [number.1])"); 
NLParseTestUnifyingListener("locate the other person?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], X, L, #and(human(X), #and(!=(X,'1'[#id]), !=(X,'etaoin'[#id]))))");
NLParseTestUnifyingListener("tell the crate to go in ship", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.talk(V0, perf.request.action(TARGET:'5'[#id], verb.enter(TARGET, '2'[#id]))))"); 
NLParseTestUnifyingListener("tell the crate to follow me,etaoin", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.talk(V0, perf.request.action(TARGET:'5'[#id], verb.follow(TARGET, '1'[#id]))))"); 
NLParseTestUnifyingListener("who else is in the station too", o.getSort("performative"), context, "etaoin", "perf.q.query(L:'etaoin'[#id], X, #and(character(X), #and(space.at(X,'location-aurora-station'[#id]), #and(!=(X,'1'[#id]), !=(X,L)))))");
NLParseTestUnifyingListener("who else is in the station as well", o.getSort("performative"), context, "etaoin", "perf.q.query(L:'etaoin'[#id], X, #and(character(X), #and(space.at(X,'location-aurora-station'[#id]), #and(!=(X,'1'[#id]), !=(X,L)))))")
NLParseTestUnifyingListener("am i a video game protagonist?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], role('1'[#id], 'game-protagonist'[game-protagonist]))"); 
NLParseTestUnifyingListener("is this a game?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], game('4'[#id]))");

// deprecated (replaced by the 3 below):
// NLParseTestUnifyingListener("i like pizza", o.getSort("performative"), context, 'etaoin', "#list( perf.inform('etaoin'[#id], verb.like('1'[#id], 'pizza':[pizza])), perf.inform('etaoin'[#id], #or(#not(pizza(X:[#id])), verb.like('1'[#id], X))))");
// NLParseTestUnifyingListener("i do not like pizza", o.getSort("performative"), context, 'etaoin', "#list( perf.inform('etaoin'[#id], #not(verb.like('1'[#id], 'pizza':[pizza]))), perf.inform('etaoin'[#id], #or(#not(pizza(X:[#id])), #not(verb.like('1'[#id], X)))))");
// NLParseTestUnifyingListener("do i like pizza?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.like('1'[#id], 'pizza':[pizza]))");
NLParseTestUnifyingListener("i like pizza", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #or(#not(pizza(X)), verb.like('1'[#id], X)))");
NLParseTestUnifyingListener("i do not like pizza", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #or(#not(pizza(X)), #not(verb.like('1'[#id], X))))");
NLParseTestUnifyingListener("do i like pizza?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.like('1'[#id], 'hypothetical-object'[#id]), pizza('hypothetical-object'[#id]))");

NLParseTestUnifyingListener("do i like this ship?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.like('1'[#id], '2':[#id]))");
NLParseTestUnifyingListener("do you see any rover?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], verb.see(V0,X), rover(X), [number.1])");
NLParseTestUnifyingListener("do you see wheels?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], verb.see(V0,X:[#id]), wheel(X), [number.1])");
NLParseTestUnifyingListener("How do I take out a battery?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.take-out('1'[#id], [battery]))");
NLParseTestUnifyingListener("How do I take a battery out?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.take-out('1'[#id], [battery]))");
NLParseTestUnifyingListener("How do I take out batteries?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.take-out('1'[#id], [battery]))");
NLParseTestUnifyingListener("play some music please", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.reproduce-media(V0, X), music(X), [number.1])");
NLParseTestUnifyingListener("give me everything you have", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.give(V0, X:[#id], '1'[#id]), verb.have(V0, X), [all])");
NLParseTestUnifyingListener("give me what you have", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.give(V0, X:[#id], '1'[#id]), verb.have(V0, X), [all])");
NLParseTestUnifyingListener("no, what is my name?", o.getSort("performative"), context, 'etaoin', "#list(perf.inform.answer('etaoin'[#id], 'no'[symbol]), perf.q.query('etaoin'[#id], X, name('1'[#id],X)))");
NLParseTestUnifyingListener("I will find etaoin", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], #and(X:verb.find('1'[#id], 'etaoin'[#id]), time.future(X)))");
NLParseTestUnifyingListener("yes I will find etaoin", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'yes'[symbol], verb.find('1'[#id], 'etaoin'[#id]))");
NLParseTestUnifyingListener("push the room north", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.push(V0, 'room1'[#id], [north]))");
NLParseTestUnifyingListener("push room north", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.push(V0, 'room1'[#id], [north]))");
NLParseTestUnifyingListener("I bump into the crate", o.getSort("performative"), context, "etaoin", "perf.inform('etaoin'[#id], verb.collide-with('1'[#id], '5'[#id]))");
NLParseTestUnifyingListener("I collided with a rock", o.getSort("performative"), context, "etaoin", "perf.inform(V0:'etaoin'[#id], V1:#and(V2:verb.collide-with(V3:'1'[#id], NOUN_V_0:[#id]), V5:rock(NOUN_V_0)))");
NLParseTestUnifyingListener("I had a collision with a rock", o.getSort("performative"), context, "etaoin", "perf.inform('etaoin'[#id], V1:#and(V2:verb.collide-with(V3:'1'[#id], NOUN_V_0:[#id]), V5:rock(NOUN_V_0)))");
NLParseTestUnifyingListener("did you bump into the crate?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(V:verb.collide-with('etaoin'[#id], '5'[#id]), time.past(V)))");
NLParseTestUnifyingListener("did you collide with something?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(V:verb.collide-with('etaoin'[#id], X), time.past(V)))");
NLParseTestUnifyingListener("did you have a collision?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(V:verb.collide-with('etaoin'[#id], X), time.past(V)))");
NLParseTestUnifyingListener("did you bump into a rock?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(V:verb.collide-with('etaoin'[#id], X:[#id]), #and(time.past(V), rock(X))))");
NLParseTestUnifyingListener("did you run into a rock?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(V:verb.collide-with('etaoin'[#id], X:[#id]), #and(time.past(V), rock(X))))");
NLParseTestUnifyingListener("did you collide with a rock?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(V:verb.collide-with('etaoin'[#id], X:[#id]), #and(time.past(V), rock(X))))");
NLParseTestUnifyingListener("did you have a collision with a rock?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(V:verb.collide-with('etaoin'[#id], X:[#id]), #and(time.past(V), rock(X))))");
NLParseTestUnifyingListener("what did you collide with?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, #and(V:verb.collide-with('etaoin'[#id], X), time.past(V)))");
NLParseTestUnifyingListener("what did you have a collision with?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, #and(V:verb.collide-with('etaoin'[#id], X), time.past(V)))");

// For version 3.2:
// now add a sentence that has a mention to a room:
NLParseTestUnifyingListener("where is the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], 'room1'[#id])");
NLParseTestUnifyingListener("How do I go there?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.go('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("it's dark", o.getSort("performative"), context, "etaoin", "perf.inform('etaoin'[#id], dark('room1'[#id]))");
NLParseTestUnifyingListener("it's dark here", o.getSort("performative"), context, "etaoin", "perf.inform('etaoin'[#id], dark('room1'[#id]))");
NLParseTestUnifyingListener("it's dark in here", o.getSort("performative"), context, "etaoin", "perf.inform('etaoin'[#id], dark('room1'[#id]))");

context.expectingAnswerToQuestion_stack = [];
context.expectingAnswerToQuestionTimeStamp_stack = [];
NLParseTestUnifyingListener("the crate", o.getSort("performative"), context, 'etaoin', null);
context.expectingAnswerToQuestion_stack.push(new NLContextPerformative("dummy text so that the next are taken as answers", "1", null, null, null, null, context, 0));
context.expectingAnswerToQuestionTimeStamp_stack.push(0);
NLParseTestUnifyingListener("the crate", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], '5'[#id])");
NLParseTestUnifyingListener("you suck", o.getSort("performative"), context, "etaoin", "perf.inform(X:'etaoin'[#id], verb.suck(X))");
NLParseTestUnifyingListener("do you suck?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(X:'etaoin'[#id], verb.suck(X))");
NLParseTestUnifyingListener("who sucks?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, #and(verb.suck(X), character(X)))");
NLParseTestUnifyingListener("what's wrong with me?", o.getSort("performative"), context, "etaoin", "perf.q.query(S:'etaoin'[#id],X,verb.happen('1'[#id], X))");
NLParseTestUnifyingListener("let me go", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], verb.go('1'[#id]))");
NLParseTestUnifyingListener("which is the nearest bathroom?!", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(bathroom(X), space.nearest-to(X,'1'[#id])))");
NLParseTestUnifyingListener("which is the bathroom closest to you?!", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(bathroom(X), space.nearest-to(X,'etaoin'[#id])))");
NLParseTestUnifyingListener("which is the closest bathroom to you?!", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(bathroom(X), space.nearest-to(X,'etaoin'[#id])))");
NLParseTestUnifyingListener("where is the nearest bathroom?!", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], X, L, #and(bathroom(X), space.nearest-to(X,'1'[#id])))");
NLParseTestUnifyingListener("where is the bathroom closest to you?!", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], X, L, #and(bathroom(X), space.nearest-to(X,'etaoin'[#id])))");
NLParseTestUnifyingListener("where is the closest bathroom to you?!", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], X, L, #and(bathroom(X), space.nearest-to(X,'etaoin'[#id])))");
NLParseTestUnifyingListener("why don't you know?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id], #not(verb.know(S)))"); 
NLParseTestUnifyingListener("how don't you know?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id], #not(verb.know(S)))"); 
NLParseTestUnifyingListener("how come you don't know?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id], #not(verb.know(S)))"); 
NLParseTestUnifyingListener("I want to explore", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], verb.explore('1'[#id]))");
NLParseTestUnifyingListener("do you need my help?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate(L:'etaoin'[#id], verb.need(L, verb.help('1'[#id], L)))");
NLParseTestUnifyingListener("can I help you?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate(L:'etaoin'[#id], verb.can('1'[#id], verb.help('1'[#id], L)))");
NLParseTestUnifyingListener("what can I help you with?", o.getSort("performative"), context, 'etaoin', "perf.q.query(L:'etaoin'[#id], Q, verb.can('1'[#id], verb.help('1'[#id], L, Q)))");
NLParseTestUnifyingListener("how can I help?", o.getSort("performative"), context, 'etaoin', "perf.q.how(V0:'etaoin'[#id], verb.help('1'[#id], V0))");
NLParseTestUnifyingListener("how can I help you?", o.getSort("performative"), context, 'etaoin', "perf.q.how(V0:'etaoin'[#id], verb.help('1'[#id], V0))");
NLParseTestUnifyingListener("which direction is west?", o.getSort("performative"), context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], V, relative-direction('1'[#id], [west], V))");
NLParseTestUnifyingListener("which way is west?", o.getSort("performative"), context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], V, relative-direction('1'[#id], [west], V))");
NLParseTestUnifyingListener("what can I 3d print?", o.getSort("performative"), context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], V, verb.can('1'[#id], action.print('1'[#id], V)))");
NLParseTestUnifyingListener("can I print a fork?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate(V0:'etaoin'[#id], verb.can('1'[#id], action.print('1'[#id], [fork])))");
NLParseTestUnifyingListener("can I print forks?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate(V0:'etaoin'[#id], verb.can('1'[#id], action.print('1'[#id], [fork])))");
NLParseTestUnifyingListener("How do I print something?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], action.print('1'[#id], X))");
NLParseTestUnifyingListener("How do I 3d print a fork?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], action.print('1'[#id], [fork]))");
NLParseTestUnifyingListener("what do I need to print a fork?", o.getSort("performative"), context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], V, verb.need-for('1'[#id], V, action.print('1'[#id], [fork])))");
NLParseTestUnifyingListener("what materials do I need to print a fork?", o.getSort("performative"), context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], V:[material], verb.need-for('1'[#id], V, action.print('1'[#id], [fork])))");
NLParseTestUnifyingListener("what is needed to print a fork?", o.getSort("performative"), context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], V, verb.need-for(X, V, action.print(X, [fork])))");
NLParseTestUnifyingListener("what materials are needed to print a fork?", o.getSort("performative"), context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], V:[material], verb.need-for(X, V, action.print(X, [fork])))");
NLParseTestUnifyingListener("print some pliers", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.print('etaoin'[#id], X), pliers(X), [number.1])"); 

// For version 3.3:
NLParseTestUnifyingListener("fix this", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.repair('etaoin'[#id], '4'[#id]))");
NLParseTestUnifyingListener("can you fix this?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], verb.repair('etaoin'[#id], '4'[#id]))");
NLParseTestUnifyingListener("fix the ship etaoin", o.getSort("performative"), context, 'etaoin', "perf.request.action('etaoin'[#id], verb.repair(P:'etaoin'[#id], '2'[#id]))");
NLParseTestUnifyingListener("can you fix the ship, etaoin?", o.getSort("performative"), context, 'etaoin', "perf.q.action('etaoin'[#id], verb.repair(P:'etaoin'[#id], '2'[#id]))");
NLParseTestUnifyingListener("fix this etaoin", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.repair('etaoin'[#id], '4'[#id]))");
NLParseTestUnifyingListener("can you fix this etaoin?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], verb.repair('etaoin'[#id], '4'[#id]))");
NLParseTestUnifyingListener("your name is etaoin", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('etaoin'[#id],'etaoin'[symbol]))");
NLParseTestUnifyingListener("etaoin's name is etaoin", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('etaoin'[#id],'etaoin'[symbol]))");
NLParseTestUnifyingListener("the ai's name is etaoin", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('etaoin'[#id],'etaoin'[symbol]))");
NLParseTestUnifyingListener("etaoin is a medic", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], profession('etaoin'[#id],'medic'[medic]))");
NLParseTestUnifyingListener("etaoin is a medic in aurora station", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], profession('etaoin'[#id], 'location-aurora-station'[#id], 'medic'[medic]))");
NLParseTestUnifyingListener("who is a game protagonist?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), role(X, 'game-protagonist'[game-protagonist])))");  
NLParseTest("arthur c. clarke was a man", o.getSort("performative"), context, "#list(perf.inform(L:[any], name(V1:'H-1-18'[#id],'arthur c. clarke'[symbol])), perf.inform(L, man(V1)))");
NLParseTestUnifyingListener("you are the supervisor in aurora station", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], profession('etaoin'[#id], 'location-aurora-station'[#id], 'supervisor'[supervisor]))"); 
NLParseTestUnifyingListener("you are the supervisor in the station", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], profession('etaoin'[#id], 'location-aurora-station'[#id], 'supervisor'[supervisor]))"); 
NLParseTestUnifyingListener("etaoin's weight is 120 kilograms", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], weight('etaoin'[#id],'120'[kilogram]))");
NLParseTestUnifyingListener("the weight of etaoin is 120 kilograms", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], weight('etaoin'[#id],'120'[kilogram]))");
NLParseTestUnifyingListener("your weight is 120 kilograms", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], weight('etaoin'[#id],'120'[kilogram]))");
NLParseTestUnifyingListener("give me the bedroom key", o.getSort("performative"), context, 'etaoin', "perf.request.action(LISTENER_0:'etaoin'[#id], V1:action.give(LISTENER_0, V2:'4'[#id], '1'[#id]))");
NLParseTestUnifyingListener("give me bedroom key", o.getSort("performative"), context, 'etaoin', "perf.request.action(LISTENER_0:'etaoin'[#id], V1:action.give(LISTENER_0, V2:'4'[#id], '1'[#id]))");
NLParseTestUnifyingListener("take the bedroom key", o.getSort("performative"), context, 'etaoin', "perf.request.action(LISTENER_0:'etaoin'[#id], V1:action.take(LISTENER_0, V2:'4'[#id]))");

// For version 3.4:
context.expectingAnswerToQuestion_stack = [];
context.expectingAnswerToQuestionTimeStamp_stack = [];
context.expectingAnswerToQuestion_stack.push(new NLContextPerformative("dummy text so that the next are taken as answers", "1", null, null, null, null, context, 0));
context.expectingAnswerToQuestionTimeStamp_stack.push(0);
NLParseTestUnifyingListener("I have no choice", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], 'yes'[symbol])");
NLParseTestUnifyingListener("the human in the kitchen's name is david", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('1'[#id],'david'[symbol]))");
NLParseTestUnifyingListener("the name of the human in the kitchen is david", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('1'[#id],'david'[symbol]))");
NLParseTestUnifyingListener("the room with david's name is foo", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('room1'[#id],'foo'[symbol]))");
NLParseTestUnifyingListener("the name of the room with david is foo", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('room1'[#id],'foo'[symbol]))");
NLParseTestUnifyingListener("the room with david is called foo", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('room1'[#id],'foo'[symbol]))");
NLParseTestUnifyingListener("the ai that owns the ship's name is foo", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('etaoin'[#id],'foo'[symbol]))");
NLParseTestUnifyingListener("aurora station's radius is large", o.getSort("performative"), context, 'etaoin', "perf.inform(V0:'etaoin'[#id], radius('location-aurora-station'[#id],'big'[big]))"); 
NLParseTestUnifyingListener("aurora station's gravity is low because of aurora station's radius is large", o.getSort("performative"), context, 'etaoin', "perf.inform(V0:'etaoin'[#id], relation.cause(gravity('location-aurora-station'[#id],'low'[low]), radius('location-aurora-station'[#id],'big'[big])))");
NLParseTestUnifyingListener("etaoin leaves the station because etaoin wants mineral", o.getSort("performative"), context, 'etaoin', "perf.inform(V0:'etaoin'[#id], V1:relation.cause(V2:verb.leave(V3:'etaoin'[#id], V4:'location-aurora-station'[#id]), V5:verb.want(V6:'etaoin'[#id], V7:[mineral])))");
NLParseTestUnifyingListener("etaoin leaves because etaoin wants mineral", o.getSort("performative"), context, 'etaoin', "perf.inform(V0:'etaoin'[#id], V1:relation.cause(V2:verb.leave(V3:'etaoin'[#id]), V5:verb.want(V6:'etaoin'[#id], V7:[mineral])))");
NLParseTestUnifyingListener("this crate can talk", o.getSort("performative"), context, 'etaoin', "perf.inform(V0:'etaoin'[#id], verb.can('5'[#id], action.talk('5'[#id])))");
NLParseTestUnifyingListener("this crate does nothing", o.getSort("performative"), context, 'etaoin', "perf.inform(V0:'etaoin'[#id], verb.do('5'[#id], 'nothing'[nothing]))");
NLParseTestUnifyingListener("I can help you", o.getSort("performative"), context, 'etaoin', "perf.inform(V0:'etaoin'[#id], verb.can('1'[#id], verb.help('1'[#id], 'etaoin'[#id])))");
NLParseTestUnifyingListener("I changed my mind", o.getSort("performative"), context, 'etaoin', "perf.changemind(V0:'etaoin'[#id])");
NLParseTestUnifyingListener("I take that back", o.getSort("performative"), context, 'etaoin', "perf.changemind(V0:'etaoin'[#id])");

// For version 3.5:
NLParseTestUnifyingListener("what is on top of a block?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(object(X), #and(block(Y), space.directly.on.top.of(X, Y))))"); 
NLParseTestUnifyingListener("what is on top of a green block?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(object(X), #and(block(Y), #and(color(Y, 'green'[green]), space.directly.on.top.of(X, Y)))))"); 
NLParseTestUnifyingListener("is there something on top of a block?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(object(X), #and(block(Y), space.directly.on.top.of(X, Y))))"); 
NLParseTestUnifyingListener("is there something on top of a green block?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(object(X), #and(block(Y), #and(color(Y, 'green'[green]), space.directly.on.top.of(X, Y)))))"); 
NLParseTestUnifyingListener("what is contained by the crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, verb.contains('5'[#id], X))");
NLParseTestUnifyingListener("is etaoin contained by the crate?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.contains('5'[#id], 'etaoin'[#id]))"); 
NLParseTestUnifyingListener("take a crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], X), crate(X), [number.1])");
NLParseTestUnifyingListener("take a large crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], X), #and(crate(X), big(X)), [number.1])");
NLParseTestUnifyingListener("take a green crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], X), #and(crate(X), color(X, 'green'[green])), [number.1])");
NLParseTestUnifyingListener("put etaoin in a crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], 'etaoin'[#id], X), crate(X), [number.1])");
NLParseTestUnifyingListener("put etaoin in a large crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], 'etaoin'[#id], X), #and(crate(X), big(X)), [number.1])");
NLParseTestUnifyingListener("put etaoin in a green crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], 'etaoin'[#id], X), #and(crate(X), color(X, 'green'[green])), [number.1])");
NLParseTestUnifyingListener("walk to the kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.walk-to(V0, 'room1'[#id]))"); 
NLParseTestUnifyingListener("is there another human on the kitchen", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(#and(space.at(X,'room1'[#id]), human(X)), !=(X,'1'[#id])))");
NLParseTestUnifyingListener("why can you not open the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id],#not(verb.can(E:'etaoin'[#id], action.open(E, 'room1'[#id]))))");
NLParseTestUnifyingListener("why can't you open the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id],#not(verb.can(E:'etaoin'[#id], action.open(E, 'room1'[#id]))))");
NLParseTestUnifyingListener("is there a bedroom key", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], white-key(X))");
NLParseTestUnifyingListener("who is dead?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), dead(X)))");
NLParseTestUnifyingListener("who is alive?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), alive(X)))");
NLParseTestUnifyingListener("put down the ship", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], action.drop('etaoin'[#id], '2'[#id]))");
NLParseTestUnifyingListener("board the ship", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.enter(V0, '2'[#id]))");
NLParseTestUnifyingListener("what is the date?", o.getSort("performative"), context, "etaoin", "perf.q.when(V0:'etaoin'[#id], [time.now], [time.day])");
NLParseTestUnifyingListener("3d print crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.print('etaoin'[#id], X), crate(X), [number.1])"); 
NLParseTestUnifyingListener("what can i print with the crate", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, verb.can(D:'1'[#id], action.print(D, X, '5'[#id])))"); 
NLParseTestUnifyingListener("what can i create with the crate", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, verb.can(D:'1'[#id], verb.create(D, X, '5'[#id])))"); 
NLParseTestUnifyingListener("can I make a fork with the crate?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.can(D:'1'[#id], verb.make(D, 'fork'[fork], '5'[#id])))");
context.expectingAnswerToQuestion_stack = [];
context.expectingAnswerToQuestionTimeStamp_stack = [];
context.expectingAnswerToQuestion_stack.push(new NLContextPerformative("dummy text so that the next are taken as answers", "1", null, null, null, null, context, 0));
context.expectingAnswerToQuestionTimeStamp_stack.push(0);
NLParseTestUnifyingListener("Gray", o.getSort("performative"), context, 'etaoin', "perf.inform.answer('etaoin'[#id], proper-noun('gray'[symbol], [singular]))"); 
NLParseTestUnifyingListener("do I need plastic to print a fork?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.need-for('1'[#id], [plastic], action.print('1'[#id], [fork])))");
NLParseTestUnifyingListener("do I need plastic to print forks?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.need-for('1'[#id], [plastic], action.print('1'[#id], [fork])))");
NLParseTestUnifyingListener("is plastic needed to print a fork?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.need-for(X, [plastic], action.print(X, [fork])))");
NLParseTestUnifyingListener("does the crate need plastic?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.need('5'[#id], [plastic]))");
NLParseTestUnifyingListener("does the crate have iron?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.have('5'[#id], [iron]))");
NLParseTestUnifyingListener("who is a human in the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], V1:[any], V2:#and(V3:character(V1), V4:#and(V5:human(V1), V6:space.at(V1, V7:'room1'[#id]))))");
NLParseTestUnifyingListener("what other human is in the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], V, #and(!=(V, V6:'1'[#id]), #and(human(V), space.at(V,'room1'[#id]))))");
NLParseTestUnifyingListener("what other human was in the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], V, #and(!=(V, V6:'1'[#id]), #and(human(V), #and(V2:space.at(V,'room1'[#id]), time.past(V2)))))");
NLParseTestUnifyingListener("what other human was here?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], V, #and(!=(V, V6:'1'[#id]), #and(human(V), #and(V2:space.at(V,'room1'[#id]), time.past(V2)))))");
NLParseTestUnifyingListener("is etaoin a dead human?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(human(E:'etaoin'[#id]), dead(E)))");
NLParseTestUnifyingListener("have the crate get in the ship", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.talk(V0, perf.request.action(TARGET:'5'[#id], verb.enter(TARGET, '2'[#id]))))"); 
NLParseTestUnifyingListener("why can you not give me the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id],#not(verb.can(E:'etaoin'[#id], action.give('etaoin'[#id], '1'[#id], '4'[#id]))))");
NLParseTestUnifyingListener("do i need a space suit?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.need('1'[#id], [spacesuit]))");
NLParseTestUnifyingListener("do i need to eat", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.need('1'[#id], verb.eat('1'[#id])))");
NLParseTestUnifyingListener("who is in stasis?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], Q, #and(character(Q), in-stasis(Q)))");
NLParseTestUnifyingListener("is there more crates?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(!=(X, '5'[#id]), crate(X)))");
NLParseTestUnifyingListener("is there another crate?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(!=(X, '5'[#id]), crate(X)))");
NLParseTestUnifyingListener("does etaoin work here?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.works-at('etaoin'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("does etaoin work in the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.works-at('etaoin'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("who works here?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), verb.works-at(X, 'room1'[#id])))");
NLParseTestUnifyingListener("who works in the kitchen?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), verb.works-at(X, 'room1'[#id])))");
NLParseTestUnifyingListener("i need permission to go to the kitchen", o.getSort("performative"), context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], V1:action.give(V0, V2:'1'[#id], V3:permission-to(V2, V4:verb.go-to(V2, V5:'room1'[#id]))))");
NLParseTestUnifyingListener("etaoin is not useful", o.getSort("performative"), context, 'etaoin', "perf.inform(V0:'etaoin'[#id], #not(useful('etaoin'[#id])))");
NLParseTestUnifyingListener("etaoin isn't very useful", o.getSort("performative"), context, 'etaoin', "perf.inform(V0:'etaoin'[#id], #not(useful('etaoin'[#id])))");
NLParseTestUnifyingListener("what is the other room's name?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, name('room2'[#id],X))");
NLParseTestUnifyingListener("what rooms are there?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, room(X))");
NLParseTestUnifyingListener("what other rooms are there?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, #and(room(X), #and(!=(X,'room1'[#id]), !=(X,'room2'[#id]))))");
NLParseTestUnifyingListener("who is the other ai?", o.getSort("performative"), context, "etaoin", "perf.q.whois.noname('etaoin'[#id], 'qwerty'[#id])");
NLParseTestUnifyingListener("what is the other ai's name?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, name('qwerty'[#id],X))");
NLParseTestUnifyingListener("which rooms are there?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, room(X))");
NLParseTestUnifyingListener("instruct the crate to enter the ship", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.talk(V0, perf.request.action(TARGET:'5'[#id], verb.enter(TARGET, '2'[#id]))))"); 
NLParseTestUnifyingListener("have the crate board the ship", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.talk(V0, perf.request.action(TARGET:'5'[#id], verb.enter(TARGET, '2'[#id]))))"); 
NLParseTestUnifyingListener("which room is mine?", o.getSort("performative"), context, "etaoin", "perf.q.query(S:'etaoin'[#id],X,#and(room(X), verb.own('1'[#id],X)))");
NLParseTestUnifyingListener("will the crate fly?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(S:'etaoin'[#id],#and(X:verb.fly('5'[#id]), time.future(X)))");
NLParseTestUnifyingListener("how many rooms in the ship", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(room(X),space.at(X, '2'[#id])))");
NLParseTestUnifyingListener("move west", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.move(V0, [west]))");
NLParseTestUnifyingListener("move west far", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.move(V0, [west], [space.far]))"); 
NLParseTestUnifyingListener("walk southwest", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.walk(V0, [southwest]))");
NLParseTestUnifyingListener("move west twice", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.move(V0, [west], '2'[number.2]))");
NLParseTestUnifyingListener("move west three times", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.move(V0, [west], '3'[number.3]))");
NLParseTestUnifyingListener("move the crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.move(V0, '5'[#id]))");
NLParseTestUnifyingListener("move to the crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.move-to(V0, '5'[#id]))");
NLParseTestUnifyingListener("how many humans?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, human(X))");
NLParseTestUnifyingListener("how many dead humans?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(human(X),dead(X)))");
NLParseTestUnifyingListener("please join me in the ship", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.go-to(V0, '2'[#id]))");
NLParseTestUnifyingListener("can you join me in the ship?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], verb.go-to(V0, '2'[#id]))");
NLParseTestUnifyingListener("who lives in the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, #and(character(X), verb.lives(X, 'room1'[#id])))");
NLParseTestUnifyingListener("is qwerty your friend?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], relation.friend('etaoin'[#id], 'qwerty'[#id]))");
NLParseTestUnifyingListener("do you have any friend?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], relation.friend('etaoin'[#id], X))");
NLParseTestUnifyingListener("who is your friend?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, #and(character(X), relation.friend('etaoin'[#id], X)))");
NLParseTestUnifyingListener("are you and qwerty friends?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], relation.friend('etaoin'[#id], 'qwerty'[#id]))");
NLParseTestUnifyingListener("are you qwerty's friend?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], relation.friend('qwerty'[#id], 'etaoin'[#id]))");
NLParseTestUnifyingListener("you are my friend", o.getSort("performative"), context, "etaoin", "perf.inform('etaoin'[#id], relation.friend('1'[#id], 'etaoin'[#id]))");
NLParseTestUnifyingListener("you are qwerty's friend", o.getSort("performative"), context, "etaoin", "perf.inform('etaoin'[#id], relation.friend('qwerty'[#id], 'etaoin'[#id]))");
NLParseTestUnifyingListener("you and I are friends", o.getSort("performative"), context, "etaoin", "perf.inform('etaoin'[#id], relation.friend('etaoin'[#id], '1'[#id]))");
NLParseTestUnifyingListener("move toward me", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.move-to(V0, direction.towards('1'[#id])))");
NLParseTestUnifyingListener("walk this way", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.move-to(V0, direction.towards('1'[#id])))");
NLParseTestUnifyingListener("walk in my direction", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.move-to(V0, direction.towards('1'[#id])))");
NLParseTestUnifyingListener("walk this direction", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.move-to(V0, direction.towards('1'[#id])))");
NLParseTestUnifyingListener("can you walk toward me?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], verb.move-to(V0, direction.towards('1'[#id])))");
NLParseTestUnifyingListener("how do i get inside the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.enter('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("how do i feed the crate?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.feed('1'[#id],'5'[#id]))");
NLParseTestUnifyingListener("how do i get more aluminum?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.get('1'[#id],[aluminium]))");
NLParseTestUnifyingListener("please stay here", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], action.stay('etaoin'[#id],[space.here]))");
NLParseTestUnifyingListener("please stay in this room", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], action.stay('etaoin'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("can you stay in this room?", o.getSort("performative"), context, "etaoin", "perf.q.action('etaoin'[#id], action.stay('etaoin'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("can you lift this crate?", o.getSort("performative"), context, "etaoin", "perf.q.action('etaoin'[#id], verb.lift('etaoin'[#id], '5'[#id]))");
NLParseTestUnifyingListener("what does qwerty maintain?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], Q, verb.maintain('qwerty'[#id], Q))");
NLParseTestUnifyingListener("what is my mission?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], Q, goal('1'[#id], Q))"); 
NLParseTestUnifyingListener("what is your mission?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], Q, goal('etaoin'[#id], Q))");
NLParseTestUnifyingListener("what is our mission?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], Q, #and(goal('etaoin'[#id], Q), goal('1'[#id], Q)))");
NLParseTestUnifyingListener("what is qwerty's mission?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], Q, goal('qwerty'[#id], Q))");
NLParseTestUnifyingListener("what is the mission of qwerty?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], Q, goal('qwerty'[#id], Q))");
NLParseTestUnifyingListener("what is the gravity on aurora station?", o.getSort("performative"), context, "etaoin", "perf.q.query(X:'etaoin'[#id], QUERY, gravity('location-aurora-station'[#id], QUERY))");
NLParseTestUnifyingListener("what is the mass of aurora station?", o.getSort("performative"), context, "etaoin", "perf.q.query(X:'etaoin'[#id], QUERY, mass('location-aurora-station'[#id], QUERY))");
NLParseTestUnifyingListener("please turn on all lights", o.getSort("performative"), context, "etaoin", "perf.request.action(S:'etaoin'[#id], verb.switch-on(S,X), light(X), [all])");
NLParseTestUnifyingListener("please turn on lights in all rooms", o.getSort("performative"), context, "etaoin", "perf.request.action(S:'etaoin'[#id], verb.switch-on(S,X), #and(light(X),#and(space.at(X,R),room(R))), [all])");  
NLParseTestUnifyingListener("can you turn on all lights?", o.getSort("performative"), context, "etaoin", "perf.q.action(S:'etaoin'[#id], verb.switch-on(S,X), light(X), [all])");
NLParseTestUnifyingListener("can you turn on lights in all rooms?", o.getSort("performative"), context, "etaoin", "perf.q.action(S:'etaoin'[#id], verb.switch-on(S,X), #and(light(X),#and(space.at(X,R),room(R))), [all])");  
NLParseTestUnifyingListener("please turn on all the lights", o.getSort("performative"), context, "etaoin", "perf.request.action(S:'etaoin'[#id], verb.switch-on(S,X), light(X), [all])");
NLParseTestUnifyingListener("can you turn on the lights in all rooms?", o.getSort("performative"), context, "etaoin", "perf.q.action(S:'etaoin'[#id], verb.switch-on(S,X), #and(light(X),#and(space.at(X,R),room(R))), [all])");  
NLParseTestUnifyingListener("can you turn the lights in all rooms on?", o.getSort("performative"), context, "etaoin", "perf.q.action(S:'etaoin'[#id], verb.switch-on(S,X), #and(light(X),#and(space.at(X,R),room(R))), [all])");  
NLParseTestUnifyingListener("open all the crates", o.getSort("performative"), context, "etaoin", "perf.request.action(S:'etaoin'[#id], action.open(S,X), crate(X), [all])");
NLParseTestUnifyingListener("can you open all the crates?", o.getSort("performative"), context, "etaoin", "perf.q.action(S:'etaoin'[#id], action.open(S,X), crate(X), [all])");
NLParseTestUnifyingListener("can you open all the crates in the station?", o.getSort("performative"), context, "etaoin", "perf.q.action(S:'etaoin'[#id], action.open(S,X), #and(space.at(X,'location-aurora-station'[#id]), crate(X)), [all])");
NLParseTestUnifyingListener("open all the crates in the station", o.getSort("performative"), context, "etaoin", "perf.request.action(S:'etaoin'[#id], action.open(S,X), #and(space.at(X,'location-aurora-station'[#id]), crate(X)), [all])");
NLParseTestUnifyingListener("hold on", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], verb.wait('etaoin'[#id]))");
NLParseTestUnifyingListener("hold on, i'll be right back", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], verb.wait('etaoin'[#id]))");
NLParseTestUnifyingListener("I need qwerty in the ship", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.talk(V0, perf.request.action(TARGET:'qwerty'[#id], verb.enter(TARGET, '2'[#id]))))"); 
NLParseTestUnifyingListener("will qwerty give me the white key?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(P:action.give('qwerty'[#id], '4'[#id], '1'[#id]), time.future(P)))");
NLParseTestUnifyingListener("drop what you have", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.drop(V0, X:[#id]), verb.have(V0, X), [all])");
NLParseTestUnifyingListener("drop everything you have", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.drop(V0, X:[#id]), verb.have(V0, X), [all])");
NLParseTestUnifyingListener("drop all the keys you have", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.drop(V0, X:[#id]), #and(verb.have(V0, X), key(X)), [all])");
NLParseTestUnifyingListener("drop all the keys in the kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.drop-in(V0, X, 'room1'[#id]), key(X), [all])");
NLParseTestUnifyingListener("drop all the keys you have in the kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.drop-in(V0, X:[#id], 'room1'[#id]), #and(verb.have(V0, X), key(X)), [all])");
NLParseTestUnifyingListener("drop all you have in the kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.drop-in(V0, X:[#id], 'room1'[#id]), verb.have(V0, X), [all])");
NLParseTestUnifyingListener("put all you have in the kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in(V0, X:[#id], 'room1'[#id]), verb.have(V0, X), [all])");
NLParseTestUnifyingListener("how do i get white key from qwerty?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.get-from('1'[#id], '4'[#id], 'qwerty'[#id]))");
NLParseTestUnifyingListener("when did i wake up?", o.getSort("performative"), context, "etaoin", "perf.q.when('etaoin'[#id],verb.wake-up('1'[#id]))");
NLParseTestUnifyingListener("what day did i leave the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.when('etaoin'[#id],verb.leave('1'[#id], 'room1'[#id]),'time.day'[time.day])"); 
NLParseTestUnifyingListener("what are you looking for?", o.getSort("performative"), context, "etaoin", "perf.q.query(E:'etaoin'[#id], Q, verb.search(E, Q))");
NLParseTestUnifyingListener("please reset qwerty", o.getSort("performative"), context, "etaoin", "perf.request.action(E:'etaoin'[#id], verb.reboot(E, 'qwerty'[#id]))");
NLParseTestUnifyingListener("what do i need to go outside", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], Q, verb.need-for('1'[#id], Q, verb.go('1'[#id],[space.outside])))");
NLParseTestUnifyingListener("why are you looking for minerals?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id], verb.search(S,'mineral'[mineral]))");
NLParseTestUnifyingListener("why are you searching a mineral?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id], verb.search(S,'mineral'[mineral]))");
NLParseTestUnifyingListener("why do you search a mineral?", o.getSort("performative"), context, "etaoin", "perf.q.why(S:'etaoin'[#id], verb.search(S,'mineral'[mineral]))");
NLParseTestUnifyingListener("how far away from qwerty am i?", o.getSort("performative"), context, "etaoin", "perf.q.distance('etaoin'[#id], 'qwerty'[#id], '1'[#id])");
NLParseTestUnifyingListener("how far away is qwerty?", o.getSort("performative"), context, "etaoin", "perf.q.distance('etaoin'[#id], '1'[#id], 'qwerty'[#id])");
NLParseTestUnifyingListener("how far away is qwerty in meters?", o.getSort("performative"), context, "etaoin", "perf.q.distance('etaoin'[#id], '1'[#id], 'qwerty'[#id], [meter])");
NLParseTestUnifyingListener("what is the distance to qwerty?", o.getSort("performative"), context, "etaoin", "perf.q.distance('etaoin'[#id], '1'[#id], 'qwerty'[#id])");
NLParseTestUnifyingListener("what is the distance between me and qwerty?", o.getSort("performative"), context, "etaoin", "perf.q.distance('etaoin'[#id], '1'[#id], 'qwerty'[#id])");
NLParseTestUnifyingListener("what is the distance from me to qwerty?", o.getSort("performative"), context, "etaoin", "perf.q.distance('etaoin'[#id], '1'[#id], 'qwerty'[#id])");
NLParseTestUnifyingListener("what is the distance from me to qwerty in meters?", o.getSort("performative"), context, "etaoin", "perf.q.distance('etaoin'[#id], '1'[#id], 'qwerty'[#id], [meter])");
NLParseTestUnifyingListener("how many meters away is qwerty?", o.getSort("performative"), context, "etaoin", "perf.q.distance('etaoin'[#id], '1'[#id], 'qwerty'[#id], [meter])");
NLParseTestUnifyingListener("which other human is in the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], V, #and(!=(V, V6:'1'[#id]), #and(human(V), space.at(V,'room1'[#id]))))");
NLParseTestUnifyingListener("which other humans are in the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], V, #and(!=(V, V6:'1'[#id]), #and(human(V), space.at(V,'room1'[#id]))))");

// For version 3.6:
NLParseTestUnifyingListener("what is not supported by the crate?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], V, #not(verb.support('5'[#id], V)))"); 
NLParseTestUnifyingListener("which objects are rectangular?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], V, #and(object(V), shape(V, 'rectangular'[rectangular])))"); 
NLParseTestUnifyingListener("which objects are not rectangular?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], V, #and(object(V), #not(shape(V, 'rectangular'[rectangular]))))");
NLParseTestUnifyingListener("which objects are supported by the crate?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], V, #and(object(V), verb.support('5'[#id], V)))"); 
NLParseTestUnifyingListener("which objects are not supported by the crate?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], V, #and(object(V), #not(verb.support('5'[#id], V))))"); 
NLParseTestUnifyingListener("which blocks are small?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], V, #and(block(V), small(V)))"); 
NLParseTestUnifyingListener("which blocks are not small?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], V, #and(block(V), #not(small(V))))"); 
NLParseTestUnifyingListener("what are you holding?", o.getSort("performative"), context, "etaoin", "perf.q.query(X:'etaoin'[#id], V, verb.hold(X, V))");
NLParseTestUnifyingListener("what is the crate on?", o.getSort("performative"), context, "etaoin", "perf.q.query(X:'etaoin'[#id], V, space.directly.on.top.of('5'[#id], V))");
NLParseTestUnifyingListener("tell me what are you holding", o.getSort("performative"), context, "etaoin", "perf.q.query(X:'etaoin'[#id], V, verb.hold(X, V))");
NLParseTestUnifyingListener("tell me what you are holding", o.getSort("performative"), context, "etaoin", "perf.q.query(X:'etaoin'[#id], V, verb.hold(X, V))");
NLParseTestUnifyingListener("pick up a crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], X), crate(X), [number.1])");
NLParseTestUnifyingListener("pick a crate up", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], X), crate(X), [number.1])");
NLParseTestUnifyingListener("pick up something", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], X), object(X), [number.1])");
NLParseTestUnifyingListener("pick something up", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], X), object(X), [number.1])");
NLParseTestUnifyingListener("could you please pick something up?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], action.take('etaoin'[#id], X), object(X), [number.1])");
NLParseTestUnifyingListener("are any white keys on the crate?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(key(X), #and(color(X, 'white'[white]), space.directly.on.top.of(X, '5'[#id]))))");
NLParseTestUnifyingListener("are any white keys supported by the crate?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(key(X), #and(color(X, 'white'[white]), verb.support('5'[#id], X))))");
NLParseTestUnifyingListener("are any white keys resting on the crate?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(key(X), #and(color(X, 'white'[white]), verb.rest-on(X, '5'[#id]))))");
NLParseTestUnifyingListener("what is the crate supported by?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], V, verb.support(V, '5'[#id]))");
NLParseTestUnifyingListener("how many colors does the crate have?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, color('5'[#id], X))");
NLParseTestUnifyingListener("is the top of the white key clear?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], top-clear-status('4'[#id], 'clear-status-clear'[clear-status-clear]))");
NLParseTestUnifyingListener("the top of the white key is clear", o.getSort("performative"), context, "etaoin", "perf.inform('etaoin'[#id], top-clear-status('4'[#id], 'clear-status-clear'[clear-status-clear]))");
NLParseTestUnifyingListener("the top of the white key is not clear", o.getSort("performative"), context, "etaoin", "perf.inform('etaoin'[#id], top-clear-status('4'[#id], 'clear-status-not-clear'[clear-status-not-clear]))");
NLParseTestUnifyingListener("now put the white key in the crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], '4'[#id], '5'[#id]))");
NLParseTestUnifyingListener("can pyramids roll?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.can(HO:'hypothetical-object'[#id], verb.roll(HO)), pyramid(HO))");
NLParseTestUnifyingListener("can a cube roll off the crate?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.can(HO:'hypothetical-object'[#id], verb.roll-off(HO, '5'[#id])), cube(HO))");
NLParseTestUnifyingListener("can a table support a pyramid?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.can('hypothetical-object1'[#id],verb.support('hypothetical-object1'[#id], 'hypothetical-object2'[#id])), #and(table('hypothetical-object1'[#id]), pyramid('hypothetical-object2'[#id])))");
NLParseTestUnifyingListener("can you put a block on a pyramid?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], X, Y), #and(block(X), pyramid(Y)), [number.1])");
NLParseTestUnifyingListener("put a block on the crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], X, '5'[#id]), block(X), [number.1])");
NLParseTestUnifyingListener("put the crate on a block", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], '5'[#id], X), block(X), [number.1])");
NLParseTestUnifyingListener("put the crate on a blue block", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in(V0, '5'[#id], Y), #and(block(Y), color(Y, 'blue'[blue])), [number.1])");
NLParseTestUnifyingListener("what is the size of the crate?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, size('5'[#id], X))");
NLParseTestUnifyingListener("how big is the crate?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, size('5'[#id], X))");
NLParseTestUnifyingListener("how long is the crate?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, length('5'[#id], X))");
NLParseTestUnifyingListener("put a block on a pyramid", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], X, Y), #and(block(X), pyramid(Y)), [number.1])");
NLParseTestUnifyingListener("put a block over the crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], X, '5'[#id]), block(X), [number.1])");
NLParseTestUnifyingListener("take two blocks", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], X), block(X), '2'[number.2])");
NLParseTestUnifyingListener("can you take two blocks?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], action.take('etaoin'[#id], X), block(X), '2'[number.2])");
NLParseTestUnifyingListener("put two blocks on the crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], X, '5'[#id]), block(X), '2'[number.2])");
NLParseTestUnifyingListener("can you put two blocks on the crate?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], X, '5'[#id]), block(X), '2'[number.2])");
NLParseTestUnifyingListener("put two blocks on a pyramid", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], X, Y), #and(block(X), pyramid(Y)), '2'[number.2])");
NLParseTestUnifyingListener("can you put two blocks on a pyramid?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], X, Y), #and(block(X), pyramid(Y)), '2'[number.2])");
NLParseTestUnifyingListener("how many crates do you see?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, crate(X))"); 
NLParseTestUnifyingListener("how many computer consoles in the kitchen do you see?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(wall-computer(X), space.at(X,'room1'[#id])))"); 
NLParseTestUnifyingListener("how many blue computer consoles in the kitchen do you see?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(wall-computer(X), #and(color(X,'blue'[blue]), space.at(X,'room1'[#id]))))"); 
NLParseTestUnifyingListener("how many closed crates are there?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(crate(X), property.closed(X)))");
NLParseTestUnifyingListener("how many not closed crates do you see?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(crate(X), #not(property.closed(X))))"); 
NLParseTestUnifyingListener("how many crates that do not seem closed are there?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(crate(X), #not(property.closed(X))))"); 
NLParseTestUnifyingListener("how many hungry closed crates inside of the kitchen do you see?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(crate(X), #and(property.closed(X), #and(hungry(X), space.inside.of(X, 'room1'[#id])))))"); 
NLParseTestUnifyingListener("can you see any robot that does not have the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], verb.see(V0, X), #and(robot(X), #not(verb.have(X, 'room1'[#id]))), [number.1])");
NLParseTestUnifyingListener("delighted to make your acquaintance, you!", o.getSort("performative"), context, "etaoin", "perf.nicetomeetyou(V0:'etaoin'[#id])");
NLParseTestUnifyingListener("how many hungry not closed crates inside of the kitchen do you see?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(crate(X), #and(#not(property.closed(X)), #and(hungry(X), space.inside.of(X, 'room1'[#id])))))"); 
NLParseTestUnifyingListener("how many not hungry not closed crates inside of the kitchen do you see?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(crate(X), #and(#not(property.closed(X)), #and(#not(hungry(X)), space.inside.of(X, 'room1'[#id])))))"); 
NLParseTestUnifyingListener("how many men that have the kitchen can you see?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(man(X), verb.have(X, 'room1'[#id])))"); 
NLParseTestUnifyingListener("how many men that do not have the kitchen can you see?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(man(X), #not(verb.have(X, 'room1'[#id]))))"); 
NLParseTestUnifyingListener("how many men that does not have the kitchen can you see?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(man(X), #not(verb.have(X, 'room1'[#id]))))"); 
NLParseTestUnifyingListener("how many hungry men that does not have the kitchen can you see?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(man(X), #and(hungry(X), #not(verb.have(X, 'room1'[#id])))))"); 
NLParseTestUnifyingListener("please, hand the white key to me", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '1'[#id]))");
NLParseTestUnifyingListener("do you see a robot inside of the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], verb.see(V0,X), #and(robot(X), space.inside.of(X, 'room1'[#id])), [number.1])");
NLParseTestUnifyingListener("do you see a robot not inside of the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], verb.see(V0,X), #and(robot(X), #not(space.inside.of(X, 'room1'[#id]))), [number.1])"); 
NLParseTestUnifyingListener("where are the vitamins?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], 'vitamins'[#id])");
NLParseTestUnifyingListener("please give me a sausage!", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.give('etaoin'[#id], X, '1'[#id]), sausage(X), [number.1])");
NLParseTestUnifyingListener("please give a sausage to me!", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.give('etaoin'[#id], X, '1'[#id]), sausage(X), [number.1])");
NLParseTestUnifyingListener("can you give me a sausage?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], action.give('etaoin'[#id], X, '1'[#id]), sausage(X), [number.1])");
NLParseTestUnifyingListener("would you give a sausage to me?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], action.give('etaoin'[#id], X, '1'[#id]), sausage(X), [number.1])");
NLParseTestUnifyingListener("open any door!", o.getSort("performative"), context, 'etaoin', "perf.request.action(LISTENER_0:'etaoin'[#id], V1:action.open(LISTENER_0, X), door(X), [number.1])");
NLParseTestUnifyingListener("could you tell me what is my name?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, name('1'[#id],X))");
NLParseTestUnifyingListener("how do people call me?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, name('1'[#id],X))");
NLParseTestUnifyingListener("hey! what's my name?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, name('1'[#id],X))");
NLParseTestUnifyingListener("could you tell me what's your name?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, name('etaoin'[#id],X))");
NLParseTestUnifyingListener("how do they call me?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, name('1'[#id],X))");
NLParseTestUnifyingListener("could you tell me what is a crate?", o.getSort("performative"), context, 'etaoin', "perf.q.action(X:'etaoin'[#id], verb.define(X,[crate]))");
NLParseTestUnifyingListener("please define crate", o.getSort("performative"), context, 'etaoin', "perf.request.action(X:'etaoin'[#id], verb.define(X,[crate]))");
NLParseTestUnifyingListener("tell me the color of the crate", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, color('5'[#id], X))");
NLParseTestUnifyingListener("please tell me the color of the crate", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, color('5'[#id], X))");
NLParseTestUnifyingListener("could you tell me what is the color of the crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, color('5'[#id], X))");
NLParseTestUnifyingListener("would you tell me what is the color of the crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, color('5'[#id], X))");
NLParseTestUnifyingListener("tell me if the color of my key is white?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], color('4'[#id],'white'[white]))");
NLParseTestUnifyingListener("would you tell me if the crate is closed?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], property.closed('5'[#id]))");
NLParseTestUnifyingListener("I will call you etaoin", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('etaoin'[#id],'etaoin'[symbol]))");
NLParseTestUnifyingListener("is anyone here dead?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(L:'etaoin'[#id], #and(character(X), #and(space.at(X,'room1'[#id]), dead(X))))");
NLParseTestUnifyingListener("etaoin, is anyone here not dead?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(L:'etaoin'[#id], #and(character(X), #and(space.at(X,'room1'[#id]), #not(dead(X)))))");
NLParseTestUnifyingListener("qwerty is named eta", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('qwerty'[#id],'eta'[symbol]))");
NLParseTestUnifyingListener("etaoin qwerty is named eta", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], name('qwerty'[#id],'eta'[symbol]))");
NLParseTestUnifyingListener("what is qwerty's job", o.getSort("performative"), context, "etaoin", "perf.q.query(X:'etaoin'[#id], QUERY, profession('qwerty'[#id], QUERY))"); 
NLParseTestUnifyingListener("what is the purpose of qwerty?", o.getSort("performative"), context, "etaoin", "perf.q.query(X:'etaoin'[#id], QUERY, profession('qwerty'[#id], QUERY))"); 
NLParseTestUnifyingListener("and?", o.getSort("performative"), context, 'etaoin', "perf.moreresults('etaoin'[#id])");
NLParseTestUnifyingListener("why are you lying?", o.getSort("performative"), context, 'etaoin', "perf.q.why(S:'etaoin'[#id],verb.lie(S))");
NLParseTestUnifyingListener("who broke the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), #and(V:verb.break(X,'4'[#id]), time.past(V))))");
NLParseTestUnifyingListener("bring me crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.bring(V0, '1'[#id], '5'[#id]))");
NLParseTestUnifyingListener("tell qwerty bring me crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.talk(V0, perf.request.action(V1:'qwerty'[#id], verb.bring(V1, '1'[#id], '5'[#id]))))");
NLParseTestUnifyingListener("what is this key called?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, name('4'[#id],X))");
NLParseTestUnifyingListener("what do I have access to?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], V, permission-to('1'[#id],V))");
NLParseTestUnifyingListener("who was in this station?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), #and(PRED:space.at(X, 'location-aurora-station'[#id]), time.past(PRED))))");
NLParseTestUnifyingListener("who is in this?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X), space.at(X, '4'[#id])))");
NLParseTestUnifyingListener("what doors can I open?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(door(X), verb.can('1'[#id], action.open('1'[#id],X))))");
NLParseTestUnifyingListener("where is qwerty going?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, verb.go('qwerty'[#id], X))");
NLParseTestUnifyingListener("what is beyond this crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(object(X), space.behind(X, '5'[#id])))");  
NLParseTestUnifyingListener("what is after this crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(object(X), space.behind(X, '5'[#id])))");  
NLParseTestUnifyingListener("get the bedroom key and this crate", o.getSort("performative"), context, 'etaoin', "#list(perf.request.action(LISTENER_0:'etaoin'[#id], verb.get(LISTENER_0, '4'[#id])), perf.request.action(LISTENER_0, verb.get(LISTENER_0, '5'[#id])))");
NLParseTestUnifyingListener("could you take the bedroom key and this crate?", o.getSort("performative"), context, 'etaoin', "#list(perf.q.action(LISTENER_0:'etaoin'[#id], action.take(LISTENER_0, '4'[#id])), perf.q.action(LISTENER_0, action.take(LISTENER_0, '5'[#id])))");
NLParseTestUnifyingListener("can I have the white key and this crate?", o.getSort("performative"), context, "etaoin", "#list(perf.q.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '1'[#id])), perf.q.action(V0, action.give(V0, '5'[#id], '1'[#id])))");
NLParseTestUnifyingListener("can you give me the white key and this crate?", o.getSort("performative"), context, "etaoin", "#list(perf.q.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '1'[#id])), perf.q.action(V0, action.give(V0, '5'[#id], '1'[#id])))");
NLParseTestUnifyingListener("give me the white key and this crate", o.getSort("performative"), context, "etaoin", "#list(perf.request.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '1'[#id])), perf.request.action(V0, action.give(V0, '5'[#id], '1'[#id])))");
NLParseTestUnifyingListener("go to the kitchen and take the bedroom key", o.getSort("performative"), context, 'etaoin', "#list(perf.request.action(LISTENER_0:'etaoin'[#id], verb.go-to(LISTENER_0, 'room1'[#id])),perf.request.action(LISTENER_0, action.take(LISTENER_0, '4'[#id])))");
NLParseTestUnifyingListener("push a crate north", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.push(V0, X, [north]), crate(X), [number.1])");
NLParseTestUnifyingListener("take either a green block or a red block", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], X), #or(#and(block(X), color(X, 'green'[green])), #and(block(X), color(X, 'red'[red]))), [number.1])");
NLParseTestUnifyingListener("take either a green or red block", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], X), #and(#or(color(X, 'green'[green]), color(X, 'red'[red])), block(X)), [number.1])");
NLParseTestUnifyingListener("take the crate or the ship", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], X), #or(=(X, '5'[#id]), =(X, '2'[#id])), [number.1])");
NLParseTestUnifyingListener("take the crate or a ship", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], X), #or(=(X, '5'[#id]), ship(X)), [number.1])");
NLParseTestUnifyingListener("take the crate and put the crate on a blue block", o.getSort("performative"), context, "etaoin", "#list(perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], '5'[#id])), perf.request.action(V0, action.put-in('etaoin'[#id], '5'[#id], Y), #and(block(Y), color(Y, 'blue'[blue])), [number.1]))");
NLParseTestUnifyingListener("take the crate and put it on a blue block", o.getSort("performative"), context, "etaoin", "#list(perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], '5'[#id])), perf.request.action(V0, action.put-in('etaoin'[#id], '5'[#id], Y), #and(block(Y), color(Y, 'blue'[blue])), [number.1]))");
NLParseTestUnifyingListener("take a red block and put it on a blue block", o.getSort("performative"), context, "etaoin", "#list(perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], X), #and(block(X), color(X, 'red'[red])), [number.1]), perf.request.action(V0, action.put-in('etaoin'[#id], X, Y), #and(block(Y), color(Y, 'blue'[blue])), [number.1]))");
NLParseTestUnifyingListener("take a green or red block and put it on a blue block", o.getSort("performative"), context, "etaoin", "#list(perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], X), #and(#or(color(X,'green'[green]), color(X,'red'[red])), block(X)), [number.1]), perf.request.action(V0, action.put-in('etaoin'[#id], X, Y), #and(block(Y), color(Y,'blue'[blue])), [number.1]))");
NLParseTestUnifyingListener("take either a green block or a red one", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], X), #or(#and(block(X), color(X, 'green'[green])), #and(block(X), color(X,'red'[red]))), [number.1])");
NLParseTestUnifyingListener("take a red block and put it on a blue one", o.getSort("performative"), context, "etaoin", "#list(perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], X), #and(block(X), color(X,'red'[red])), [number.1]), perf.request.action(V0, action.put-in('etaoin'[#id], X, Y), #and(block(Y), color(Y,'blue'[blue])), [number.1]))");
NLParseTestUnifyingListener("take either a green block or a red one and put it on a blue one", o.getSort("performative"), context, "etaoin", "#list(perf.request.action(V0:'etaoin'[#id], action.take(V0, X), #or(#and(block(X), color(X,'green'[green])), #and(block(X), color(X,'red'[red]))), [number.1]), perf.request.action(V0, action.put-in(V0, X, Y), #and(block(Y), color(Y,'blue'[blue])), [number.1]))");
NLParseTestUnifyingListener("where is the nearest one?!", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], X, L, #and(block(X), space.nearest-to(X,'1'[#id])))");
NLParseTestUnifyingListener("is there any pyramid inside the crate?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(pyramid(X), space.inside.of(X,'5'[#id])))"); 
NLParseTestUnifyingListener("is there any pyramid inside of a crate?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(pyramid(X), #and(space.inside.of(X,Y), crate(Y))))");
NLParseTestUnifyingListener("put the crate on top of a blue one", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in(V0, '5'[#id], Y), #and(crate(Y), color(Y, 'blue'[blue])), [number.1])");
NLParseTestUnifyingListener("put all crates on the kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in(V0, V_0:[any], 'room1'[#id]), crate(V_0), [all])");
NLParseTestUnifyingListener("you are friends with qwerty", o.getSort("performative"), context, "etaoin", "perf.inform('etaoin'[#id], relation.friend('etaoin'[#id], 'qwerty'[#id]))");
NLParseTestUnifyingListener("the station has oxygen", o.getSort("performative"), context, "etaoin", "perf.inform(V0:'etaoin'[#id], verb.have('location-aurora-station'[#id], 'oxygen'[oxygen]))");
NLParseTestUnifyingListener("the station does not have oxygen", o.getSort("performative"), context, "etaoin", "perf.inform(V0:'etaoin'[#id], #not(verb.have('location-aurora-station'[#id], 'oxygen'[oxygen])))");

// For version 3.7:
NLParseTestUnifyingListener("leave the ship on the floor", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], action.drop('etaoin'[#id], '2'[#id]))");
NLParseTestUnifyingListener("drop the ship on the kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], action.drop-in('etaoin'[#id], '2'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("leave the ship on the kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], action.put-in('etaoin'[#id], '2'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("take everything", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.take('etaoin'[#id], X), object(X), [all])");
NLParseTestUnifyingListener("put everything into the kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], X, 'room1'[#id]), #and(object(X), !=(X, 'room1'[#id])), [all])");
NLParseTestUnifyingListener("put all keys in rooms", o.getSort("performative"), context, "etaoin", "#list(perf.request.action(V0:'etaoin'[#id], action.put-in(V0, '6'[#id], X), room(X), N:[number.1]),perf.request.action(V0, action.put-in(V0, '4'[#id], X), room(X), N))");
NLParseTestUnifyingListener("find a cube", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.find('etaoin'[#id], X), cube(X), [number.1])");
NLParseTestUnifyingListener("find an object on a cube", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.find('etaoin'[#id], X), #and(object(X), #and(space.directly.on.top.of(X, Y), cube(Y))), [number.1])");
NLParseTestUnifyingListener("find an object on a red cube", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.find('etaoin'[#id], X), #and(object(X), #and(space.directly.on.top.of(X, Y), #and(color(Y,'red'[red]), cube(Y)))), [number.1])");
NLParseTestUnifyingListener("is the crate in the kitchen", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], space.at('5'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("please tell me if the crate is in the kitchen", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], space.at('5'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("do you know if the crate is in the kitchen", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], space.at('5'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("please would you tell me if the crate is in the kitchen", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], space.at('5'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("please tell me if the crate contains the kitchen", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.contains('5'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("do you know if the crate contains the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.contains('5'[#id], 'room1'[#id]))");
NLParseTestUnifyingListener("please tell me what is northeast of me", o.getSort("performative"), context, 'etaoin', "perf.q.query(V0:'etaoin'[#id], V1:[any], V2:#and(V3:object(V1), V4:space.northeast.of(V1, V5:'1'[#id])))");
NLParseTestUnifyingListener("please tell me what does the crate contain", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, verb.contains('5'[#id], X))");
NLParseTestUnifyingListener("could you tell me what is inside of the crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(object(X), space.inside.of(X, '5'[#id])))");
NLParseTestUnifyingListener("could you tell me what is contained by me", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, verb.contains('1'[#id], X))");
NLParseTestUnifyingListener("which crate is inside a room?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(crate(X), #and(space.inside.of(X, Y), room(Y))))");
NLParseTestUnifyingListener("what is supporting the crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, verb.support(X, '5'[#id]))");
NLParseTestUnifyingListener("what supports the crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, verb.support(X, '5'[#id]))");
NLParseTestUnifyingListener("is the crate supported?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.support(X, '5'[#id]))");
NLParseTestUnifyingListener("how many keys are not in the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(key(X), #not(space.at(X,'room1'[#id]))))"); 
NLParseTestUnifyingListener("now drop a block on the crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.drop-in('etaoin'[#id], X, '5'[#id]), block(X), [number.1])");
NLParseTestUnifyingListener("go drop a block on the crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.drop-in('etaoin'[#id], X, '5'[#id]), block(X), [number.1])");
NLParseTestUnifyingListener("advance", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.move(V0, [forward]))");
NLParseTestUnifyingListener("retreat twice", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.move(V0, [backward], '2'[number.2]))");
NLParseTest("were you aware that the red key is in the kitchen?", o.getSort("performative"), context, "perf.inform([any], space.at('6'[#id], 'room1'[#id]))");
NLParseTest("did you know that the red key is in the bedroom?", o.getSort("performative"), context, "perf.inform([any], space.at('6'[#id], 'room2'[#id]))");
NLParseTestUnifyingListener("take me there", o.getSort("performative"), context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.take-to('etaoin'[#id], '1'[#id], 'room2'[#id]))"); 
NLParseTest("the pyramid that you hold", o.getSort("nounPhrase"), context, "nounPhrase(V0:'pyramid'[pyramid], V1:[singular], V2:[third-person], V3:#and(the(V0, V1), V4:#and(V5:verb.hold(LISTENER, V0), V7:noun(V0, V1))))");
NLParseTest("the pyramid that you are holding", o.getSort("nounPhrase"), context, "nounPhrase(V0:'pyramid'[pyramid], V1:[singular], V2:[third-person], V3:#and(the(V0, V1), V4:#and(V5:verb.hold(LISTENER, V0), V7:noun(V0, V1))))");
NLParseTest("the pyramid you are holding", o.getSort("nounPhrase"), context, "nounPhrase(V0:'pyramid'[pyramid], V1:[singular], V2:[third-person], V3:#and(the(V0, V1), V4:#and(V5:verb.hold(LISTENER, V0), V7:noun(V0, V1))))");
NLParseTest("the pyramid that you are not holding", o.getSort("nounPhrase"), context, "nounPhrase(V0:'pyramid'[pyramid], V1:[singular], V2:[third-person], V3:#and(the(V0, V1), V4:#and(#not(V5:verb.hold(LISTENER, V0)), V7:noun(V0, V1))))");
NLParseTestUnifyingListener("take me back to the kitchen", o.getSort("performative"), context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.take-to('etaoin'[#id], '1'[#id], 'room1'[#id]))"); 
NLParseTestUnifyingListener("take me to the kitchen again", o.getSort("performative"), context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.take-to('etaoin'[#id], '1'[#id], 'room1'[#id]))"); 
NLParseTestUnifyingListener("how far away is qwerty from the crate?", o.getSort("performative"), context, "etaoin", "perf.q.distance('etaoin'[#id], 'qwerty'[#id], '5'[#id])");
NLParseTestUnifyingListener("find a cube taller than the crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.find('etaoin'[#id], X), #and(cube(X), taller(X, '5'[#id])), [number.1])");
NLParseTestUnifyingListener("find a cube which is taller than the crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.find('etaoin'[#id], X), #and(cube(X), taller(X, '5'[#id])), [number.1])");
NLParseTestUnifyingListener("find a ship taller than the red one", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.find('etaoin'[#id], X), #and(ship(X), taller(X, '2'[#id])), [number.1])");

// For version 3.8:
NLParseTestUnifyingListener("hand the white key over", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.give(V0, '4'[#id], '1'[#id]))");
NLParseTestUnifyingListener("push the crate twice", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.push(V0, '5'[#id], '2'[number.2]))");
NLParseTestUnifyingListener("push the crate forward four times", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.push(V0, '5'[#id], [forward], '4'[number.4]))");
NLParseTestUnifyingListener("which cube is sitting on the crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], L, #and(cube(L), space.directly.on.top.of(L,'5'[#id])))");
NLParseTestUnifyingListener("are there any more?", o.getSort("performative"), context, 'etaoin', "perf.moreresults('etaoin'[#id])");
NLParseTestUnifyingListener("how many things are on top of green cubes?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(object(X), #and(space.directly.on.top.of(X,Y), #and(cube(Y), color(Y, 'green'[green])))))"); 
NLParseTestUnifyingListener("how many things are not on top of a green cube?", o.getSort("performative"), context, "etaoin", "perf.q.howmany(V0:'etaoin'[#id], X, #and(object(X), #and(#not(space.directly.on.top.of(X,Y)), #and(cube(Y), color(Y, 'green'[green])))))"); 
NLParseTestUnifyingListener("what is not on top of a green cube?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(object(X), #and(#not(space.directly.on.top.of(X,Y)), Q:#and(cube(Y), color(Y, 'green'[green])))), #forall(Y, Q))");
NLParseTestUnifyingListener("what things are on top of green cubes?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(object(X), #and(space.directly.on.top.of(X,Y), #and(cube(Y), color(Y, 'green'[green])))))");
NLParseTestUnifyingListener("what things are not on top of green cubes?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(object(X), #and(#not(space.directly.on.top.of(X,Y)), Q:#and(cube(Y), color(Y, 'green'[green])))), #forall(Y, Q))");
NLParseTestUnifyingListener("which blocks are taller than any pyramid?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(block(X), #and(Q:pyramid(Y),taller(X,Y))), #forall(Y, Q))");
NLParseTestUnifyingListener("what things are not on top of the crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(object(X), #not(space.directly.on.top.of(X,'5'[#id]))))");
NLParseTestUnifyingListener("which is taller, the crate or qwerty?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, #or(#and(=(X,'5'[#id]), taller('5'[#id],'qwerty'[#id])), #and(=(X,'qwerty'[#id]), taller('qwerty'[#id],'5'[#id]))))");
NLParseTestUnifyingListener("which is the tallest pyramid?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, #and(pyramid(X),#and(pyramid(Y),#not(taller(Y,X)))), #forall(Y,pyramid(Y)))");
NLParseTestUnifyingListener("take the tallest pyramid", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], action.take('etaoin'[#id],X), #and(pyramid(X),#and(pyramid(Y),#not(taller(Y,X)))), [number.1], #forall(Y,pyramid(Y)))");
NLParseTestUnifyingListener("call the tallest pyramid john", o.getSort("performative"), context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.call('etaoin'[#id], X, 'john'[symbol]), #and(pyramid(X),#and(pyramid(Y),#not(taller(Y,X)))), [number.1], #forall(Y,pyramid(Y)))");
NLParseTestUnifyingListener("where could I find the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.whereis('etaoin'[#id], '4'[#id])");
NLParseTestUnifyingListener("please tell me how far is the crate from qwerty?", o.getSort("performative"), context, "etaoin", "perf.q.distance('etaoin'[#id], '5'[#id], 'qwerty'[#id])");
NLParseTestUnifyingListener("please tell me how far is the crate located from qwerty", o.getSort("performative"), context, "etaoin", "perf.q.distance('etaoin'[#id], '5'[#id], 'qwerty'[#id])");
NLParseTestUnifyingListener("tell me how far is the crate from qwerty?", o.getSort("performative"), context, "etaoin", "perf.q.distance('etaoin'[#id], '5'[#id], 'qwerty'[#id])");
NLParseTestUnifyingListener("tell me what is the distance between the crate and qwerty?", o.getSort("performative"), context, "etaoin", "perf.q.distance('etaoin'[#id], '5'[#id], 'qwerty'[#id])");
NLParseTestUnifyingListener("could you tell me what is the distance between the crate and qwerty?", o.getSort("performative"), context, "etaoin", "perf.q.distance('etaoin'[#id], '5'[#id], 'qwerty'[#id])");
NLParseTestUnifyingListener("would you tell me how far away is the crate from qwerty", o.getSort("performative"), context, "etaoin", "perf.q.distance('etaoin'[#id], '5'[#id], 'qwerty'[#id])");
NLParseTestUnifyingListener("is there anything to the right of the crate?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(object(X), space.right.of(X, '5'[#id])))");
NLParseTestUnifyingListener("is there a cube to the right of the crate?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(cube(X), space.right.of(X, '5'[#id])))");
NLParseTestUnifyingListener("take the crate and the kitchen", o.getSort("performative"), context, "etaoin", "#list(perf.request.action('etaoin'[#id], action.take('etaoin'[#id], '5'[#id])), perf.request.action('etaoin'[#id], action.take('etaoin'[#id], 'room1'[#id])))");
NLParseTestUnifyingListener("put the crate and the kitchen on the crate and the kitchen respectively", o.getSort("performative"), context, "etaoin", "#list(perf.request.action('etaoin'[#id], action.put-in('etaoin'[#id], '5'[#id], '5'[#id])), perf.request.action('etaoin'[#id], action.put-in('etaoin'[#id], 'room1'[#id], 'room1'[#id])))");
NLParseTestUnifyingListener("put a small cube and a pyramid on the crate and the kitchen respectively", o.getSort("performative"), context, "etaoin", "#list(perf.request.action('etaoin'[#id], action.put-in('etaoin'[#id], V1, '5'[#id]), #and(cube(V1), small(V1)), [number.1]), perf.request.action('etaoin'[#id], action.put-in('etaoin'[#id], V3, 'room1'[#id]), pyramid(V3), [number.1]))");
NLParseTestUnifyingListener("can qwerty help me with the crate?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.can('qwerty'[#id], verb.help('qwerty'[#id], '1'[#id], '5'[#id])))");
NLParseTestUnifyingListener("i cannot get in the kitchen", o.getSort("performative"), context, "etaoin", "perf.inform('etaoin'[#id], #not(verb.can('1'[#id], verb.enter('1'[#id], 'room1'[#id]))))");
NLParseTestUnifyingListener("i cannot sleep", o.getSort("performative"), context, "etaoin", "perf.inform('etaoin'[#id], #not(verb.can('1'[#id], verb.sleep('1'[#id]))))");
NLParseTestUnifyingListener("what blocks are red and small?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(block(X), #and(color(X, 'red'[red]), small(X))))");
NLParseTestUnifyingListener("what blocks are red and next to the crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(block(X), #and(color(X, 'red'[red]), space.next-to(X, '5'[#id]))))");
NLParseTestUnifyingListener("what blocks are red and next to a crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(block(X), #and(color(X, 'red'[red]), #and(space.next-to(X, Y), crate(Y)))))");
NLParseTestUnifyingListener("does the crate have any neighbors?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(object(X), relation.neighbor('5'[#id], X)))");
NLParseTestUnifyingListener("what are the neighbors of the crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(object(X), relation.neighbor(X, '5'[#id])))");
NLParseTestUnifyingListener("which blocks are neighbors of the crate?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(block(X), relation.neighbor(X, '5'[#id])))");
NLParseTestUnifyingListener("does the crate like any cube?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(verb.like('5'[#id], X), cube(X)))");
NLParseTestUnifyingListener("does the crate like any of his neighbors?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(verb.like('5'[#id], X), #and(object(X), relation.neighbor('5'[#id], X))))");
NLParseTestUnifyingListener("does the crate like itself?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.like('5'[#id], '5'[#id]))");
NLParseTestUnifyingListener("which of his neighbors does the crate like?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(verb.like('5'[#id], X), #and(object(X), relation.neighbor('5'[#id], X))))");
NLParseTestUnifyingListener("all pyramids like crates", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], V1:#or(#not(pyramid(X:[#id])), #or(#not(crate(Y)), verb.like(X,Y))))");
NLParseTestUnifyingListener("all pyramids like red crates", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], V1:#or(#not(pyramid(X:[#id])), #or(#not(#and(crate(Y), color(Y,'red'[red]))), verb.like(X,Y))))");
NLParseTestUnifyingListener("the crate likes red cubes", o.getSort("performative"), context, 'etaoin', "perf.inform('etaoin'[#id], V1:#or(#not(#and(cube(Y), color(Y, 'red'[red]))), verb.like('5'[#id],Y)))");
NLParseTestUnifyingListener("the crate likes cubes or white keys", o.getSort("performative"), context, 'etaoin', "#list(perf.inform('etaoin'[#id], #or(#not(cube(Y)), verb.like('5'[#id],Y))),perf.inform('etaoin'[#id], #or(#not(#and(key(Z), color(Z, 'white'[white]))), verb.like('5'[#id],Z))))");
NLParseTestUnifyingListener("the crate only likes red cubes", o.getSort("performative"), context, 'etaoin', "#list(perf.inform('etaoin'[#id], #or(#not(#and(cube(Y), color(Y, 'red'[red]))), verb.like('5'[#id],Y))), perf.inform('etaoin'[#id], #or(#and(cube(Z), color(Z, 'red'[red])), #not(verb.like('5'[#id],Z)))))");
NLParseTestUnifyingListener("the crate only likes cubes and white keys", o.getSort("performative"), context, 'etaoin', "#list(perf.inform('etaoin'[#id], #or(#not(cube(Z)), verb.like('5'[#id],Z))), #list(perf.inform('etaoin'[#id], #or(#not(#and(key(Z), color(Z, 'white'[white]))), verb.like('5'[#id],Z))), perf.inform('etaoin'[#id], #or(#not(#and(#not(cube(Z)), #not(#and(key(Z), color(Z, 'white'[white]))))), #not(verb.like('5'[#id],Z))))))");
NLParseTestUnifyingListener("put the crate next to the kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], '5'[#id], space.next-to('5'[#id], 'room1'[#id])))");
NLParseTestUnifyingListener("put a block next to the crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], X, space.next-to(X, '5'[#id])), block(X), [number.1])");

// For version 3.9:
NLParseTestUnifyingListener("can I pick up crates?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], verb.can('1'[#id], action.take('1'[#id], 'hypothetical-object'[#id])), crate('hypothetical-object'[#id]))");
NLParseTestUnifyingListener("who can pick up crates?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X,  #and(character(X), #and(verb.can(X, action.take(X, Y)), crate(Y))))");
NLParseTestUnifyingListener("I can pick up crates", o.getSort("performative"), context, "etaoin", "perf.inform(V0:'etaoin'[#id], #or(#not(crate(X)), verb.can('1'[#id], action.take('1'[#id], X))))");
NLParseTestUnifyingListener("which large block is behind the crate?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, #and(block(X), #and(big(X), space.behind(X, '5'[#id]))))");
NLParseTestUnifyingListener("which large block is behind a pyramid?", o.getSort("performative"), context, "etaoin", "perf.q.query(V0:'etaoin'[#id], X, #and(block(X), #and(big(X), #and(space.behind(X, Y), pyramid(Y)))))");
NLParseTestUnifyingListener("is there a door that belongs to a kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.predicate(V0:'etaoin'[#id], #and(door(X), #and(verb.belong(X, Y), kitchen(Y))))");
NLParseTestUnifyingListener("where is the door that belongs to a kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.whereis(V0:'etaoin'[#id], X, L, #and(door(X), #and(verb.belong(X, Y), kitchen(Y))))");
NLParseTestUnifyingListener("put a small block onto the door which belongs to the kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], X, 'door1'[#id]), #and(small(X), block(X)), [number.1])");
NLParseTestUnifyingListener("put a small block onto the door which belongs to a kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], X, Y), #and(small(X), #and(block(X), #and(door(Y), #and(verb.belong(Y, Z), kitchen(Z))))), [number.1])");
NLParseTestUnifyingListener("put the crate onto the door which belongs to a kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], '5'[#id], Y), #and(door(Y), #and(verb.belong(Y, Z), kitchen(Z))), [number.1])");
NLParseTestUnifyingListener("put the littlest crate on top of the kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], action.put-in('etaoin'[#id], X, 'room1'[#id]), #and(crate(X),#and(crate(Y),#not(relation.smaller(Y,X)))), [number.1], #forall(Y,crate(Y)))");
NLParseTestUnifyingListener("put the crate on top of the largest kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], action.put-in('etaoin'[#id], '5'[#id], X), #and(kitchen(X),#and(kitchen(Y),#not(relation.larger(Y,X)))), [number.1], #forall(Y,kitchen(Y)))");
NLParseTestUnifyingListener("put the littlest crate on top of a kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], action.put-in('etaoin'[#id], X, Z), #and(crate(X),#and(crate(Y),#and(#not(relation.smaller(Y,X), kitchen(Z))))), [number.1], #forall(Y,crate(Y)))");
NLParseTestUnifyingListener("put a crate on top of the largest kitchen", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], action.put-in('etaoin'[#id], Z, X), #and(crate(Z), #and(kitchen(X),#and(kitchen(Y),#not(relation.larger(Y,X))))), [number.1], #forall(Y,kitchen(Y)))");
NLParseTestUnifyingListener("can a pyramid be supported by a block?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.can('hypothetical-object1'[#id],verb.support('hypothetical-object1'[#id], 'hypothetical-object2'[#id])), #and(block('hypothetical-object1'[#id]), pyramid('hypothetical-object2'[#id])))");
NLParseTestUnifyingListener("can a pyramid be supported by another block?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.can('hypothetical-object1'[#id],verb.support('hypothetical-object1'[#id], 'hypothetical-object2'[#id])), #and(block('hypothetical-object1'[#id]), pyramid('hypothetical-object2'[#id])))");
NLParseTestUnifyingListener("stack up the crate and the ship", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], action.stack('etaoin'[#id], '5'[#id], '2'[#id]))");
NLParseTestUnifyingListener("stack up two pyramids", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], action.stack('etaoin'[#id], X, Y), #and(pyramid(X), pyramid(Y)), [number.1])");
NLParseTestUnifyingListener("stack a cube and a crate up", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], action.stack('etaoin'[#id], X, Y), #and(cube(X), crate(Y)), [number.1])");
NLParseTestUnifyingListener("push the crate to the left", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.push(V0, '5'[#id], [direction.left]))");
NLParseTestUnifyingListener("roll the crate to the left", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.roll(V0, '5'[#id], [direction.left]))");
NLParseTestUnifyingListener("is the crate taller than the tallest ship?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(taller('5'[#id], X), #and(ship(X),#and(ship(Y),#not(taller(Y,X))))), #forall(Y,ship(Y)))");
NLParseTestUnifyingListener("what is the crate's support?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], X, verb.support(X, '5'[#id]))");
NLParseTestUnifyingListener("where is the crate's support?", o.getSort("performative"), context, "etaoin", "perf.q.whereis('etaoin'[#id], X, L, verb.support(X, '5'[#id]))");
NLParseTestUnifyingListener("take the support of the crate", o.getSort("performative"), context, "etaoin", "perf.request.action('etaoin'[#id], action.take('etaoin'[#id], X), verb.support(X, '5'[#id]), [number.1])");
NLParseTestUnifyingListener("what does the crate's support support?", o.getSort("performative"), context, "etaoin", "perf.q.query('etaoin'[#id], Y, #and(verb.support(X, '5'[#id]), verb.support(X, Y)))");
NLParseTestUnifyingListener("does the crate's support support anything green?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], #and(verb.support(X, '5'[#id]), #and(verb.support(X, Y), color(Y, 'green'[green]))))");
NLParseTestUnifyingListener("how many blocks can you pick up?", o.getSort("performative"), context, "etaoin", "perf.q.howmany('etaoin'[#id], X, #and(verb.can('etaoin'[#id], action.take('etaoin'[#id], X)), block(X)))");
NLParseTestUnifyingListener("would a cube roll off a pyramid?", o.getSort("performative"), context, "etaoin", "perf.q.predicate('etaoin'[#id], verb.roll-off(H1:'hypothetical-object1'[#id], H2:'hypothetical-object2'[#id]), #and(cube(H1), pyramid(H2)))");
NLParseTestUnifyingListener("would you tell me if me is closed?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], property.closed('1'[#id]))");
NLParseTestUnifyingListener("would you tell me how do I go to the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.go-to('1'[#id],'room1'[#id]))");
NLParseTestUnifyingListener("could you tell me how do I fix a battery?", o.getSort("performative"), context, "etaoin", "perf.q.how('etaoin'[#id], verb.repair('1'[#id], [battery]))");
NLParseTestUnifyingListener("could you please put the ship on the floor", o.getSort("performative"), context, "etaoin", "perf.q.action('etaoin'[#id], action.drop('etaoin'[#id], '2'[#id]))");
NLParseTestUnifyingListener("can you put any ship in the floor?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], action.drop('etaoin'[#id], X), ship(X), [number.1])");
NLParseTestUnifyingListener("please put any ship in the floor", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.drop('etaoin'[#id], X), ship(X), [number.1])");
NLParseTestUnifyingListener("could you please, go to the kitchen?", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], verb.go-to(V0, 'room1'[#id]))"); 
NLParseTestUnifyingListener("can you go to kitchen", o.getSort("performative"), context, "etaoin", "perf.q.action(V0:'etaoin'[#id], verb.go-to(V0, 'room1'[#id]))"); 
NLParseTestUnifyingListener("turn around", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.rotate(V0, [backward]))");
NLParseTestUnifyingListener("leave the white key into the crate", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], '4'[#id], '5'[#id]))");
NLParseTestUnifyingListener("leave the white key into yourself", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], action.put-in('etaoin'[#id], '4'[#id], 'etaoin'[#id]))");
NLParseTestUnifyingListener("go into the ship", o.getSort("performative"), context, "etaoin", "perf.request.action(V0:'etaoin'[#id], verb.enter(V0, '2'[#id]))");
NLClarificationParseTestUnifyingListener("take the key", "The white one", o.getSort("performative"), context, 'etaoin', "perf.rephrase.entity('etaoin'[#id], '4'[#id])");
NLClarificationParseTestUnifyingListener("take the key", "I mean the white one", o.getSort("performative"), context, 'etaoin', "perf.rephrase.entity('etaoin'[#id], '4'[#id])");
NLClarificationParseTestUnifyingListener("take the key", "I mean the white key", o.getSort("performative"), context, 'etaoin', "perf.rephrase.entity('etaoin'[#id], '4'[#id])");
NLClarificationParseTestUnifyingListener("take the key", "the one that belongs to me", o.getSort("performative"), context, 'etaoin', "perf.rephrase.entity('etaoin'[#id], '4'[#id])");
NLClarificationParseTestUnifyingListener("take the key", "I mean the tallest one", o.getSort("performative"), context, 'etaoin', "perf.rephrase.entity('etaoin'[#id], X, #and(key(X),#and(key(Y),#not(taller(Y,X)))), #forall(Y,key(Y)))");
NLClarificationParseTestUnifyingListener("take the key", "the eastmost one", o.getSort("performative"), context, 'etaoin', "perf.rephrase.entity('etaoin'[#id], X, #and(key(X),#and(key(Y),#not(space.east.of(Y,X)))), #forall(Y,key(Y)))");
NLClarificationParseTestUnifyingListener("take the key", "I mean the one more to the east", o.getSort("performative"), context, 'etaoin', "perf.rephrase.entity('etaoin'[#id], X, #and(key(X),#and(key(Y),#not(space.east.of(Y,X)))), #forall(Y,key(Y)))");
NLClarificationParseTestUnifyingListener("take the key", "the one more to the east", o.getSort("performative"), context, 'etaoin', "perf.rephrase.entity('etaoin'[#id], X, #and(key(X),#and(key(Y),#not(space.east.of(Y,X)))), #forall(Y,key(Y)))");
NLClarificationParseTestUnifyingListener("take the key", "the one left of you", o.getSort("performative"), context, 'etaoin', "perf.rephrase.entity('etaoin'[#id], '4'[#id])");
NLClarificationParseTestUnifyingListener("take the key", "the one to your left", o.getSort("performative"), context, 'etaoin', "perf.rephrase.entity('etaoin'[#id], '4'[#id])");
NLClarificationParseTestUnifyingListener("take the key", "I mean the closest one to you", o.getSort("performative"), context, 'etaoin', "perf.rephrase.entity('etaoin'[#id], X, #and(key(X), space.nearest-to(X,'etaoin'[#id])))");
NLClarificationParseTestUnifyingListener("take the key", "I mean the one closest to me", o.getSort("performative"), context, 'etaoin', "perf.rephrase.entity('etaoin'[#id], X, #and(key(X), space.nearest-to(X,'1'[#id])))");
NLClarificationParseTestUnifyingListener("take the key", "I mean the closest one", o.getSort("performative"), context, 'etaoin', "perf.rephrase.entity('etaoin'[#id], X, #and(key(X), space.nearest-to(X,'1'[#id])))");
NLClarificationParseTestUnifyingListener("take the key", "the closest one", o.getSort("performative"), context, 'etaoin', "perf.rephrase.entity('etaoin'[#id], X, #and(key(X), space.nearest-to(X,'1'[#id])))");
NLClarificationParseTestUnifyingListener("take the key", "the one closest to you", o.getSort("performative"), context, 'etaoin', "perf.rephrase.entity('etaoin'[#id], X, #and(key(X), space.nearest-to(X,'etaoin'[#id])))");
NLClarificationParseTestUnifyingListener("take the key", "the closest to me", o.getSort("performative"), context, 'etaoin', "perf.rephrase.entity('etaoin'[#id], X, #and(key(X), space.nearest-to(X,'1'[#id])))");
NLParseTestUnifyingListener("etaoin salvaged some entries", o.getSort("performative"), context, "etaoin", "perf.inform('etaoin'[#id], #and(verb.salvage('etaoin'[#id],X:'entry'[entry]), entry(X)))");

// For version 4.0:
NLParseTestUnifyingListener("are you holding the crate?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], verb.hold('etaoin'[#id],'5'[#id]))");
NLParseTestUnifyingListener("are you holding a crate?", o.getSort("performative"), context, 'etaoin', "perf.q.predicate('etaoin'[#id], #and(verb.hold('etaoin'[#id],X), crate(X)))");
NLParseTestUnifyingListener("what is the thing you are holding?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(verb.hold('etaoin'[#id],X), object(X)))");
NLParseTestUnifyingListener("which color is the white key?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, color('4'[#id], X))");
NLParseTestUnifyingListener("which key is more to the east?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(key(X),#and(key(Y),#not(space.east.of(Y,X)))), #forall(Y,key(Y)))");
NLParseTestUnifyingListener("who is more to the east?", o.getSort("performative"), context, 'etaoin', "perf.q.query('etaoin'[#id], X, #and(character(X),#and(character(Y),#not(space.east.of(Y,X)))), #forall(Y,character(Y)))");
NLParseTestUnifyingListener("bring me the non red key", o.getSort("performative"), context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], verb.bring(V0, '1'[#id], X), #and(#not(color(X,'red'[red])),key(X)), [number.1])");
NLParseTestUnifyingListener("hand over the non red key", o.getSort("performative"), context, 'etaoin', "perf.request.action(V0:'etaoin'[#id], action.give(V0, X, '1'[#id]), #and(#not(color(X,'red'[red])),key(X)), [number.1])");
NLParseTestUnifyingListener("bring me the crate and the white key", o.getSort("performative"), context, 'etaoin', "#list(perf.request.action(V0:'etaoin'[#id], verb.bring(V0, '1'[#id], '5'[#id])), perf.request.action(V0, verb.bring(V0, '1'[#id], '4'[#id])))");
NLParseTestUnifyingListener("bring me the crate and the non white key", o.getSort("performative"), context, 'etaoin', "#list(perf.request.action(V0:'etaoin'[#id], verb.bring(V0, '1'[#id], '5'[#id])), perf.request.action(V0, verb.bring(V0, '1'[#id], X), #and(#not(color(X,'white'[white])),key(X)), [number.1]))");
NLParseTestUnifyingListener("bring me the non white key and the crate", o.getSort("performative"), context, 'etaoin', "#list(perf.request.action(V0:'etaoin'[#id], verb.bring(V0, '1'[#id], X), #and(#not(color(X,'white'[white])),key(X)), [number.1]), perf.request.action(V0, verb.bring(V0, '1'[#id], '5'[#id])))");
NLParseTestUnifyingListener("could you please, put the white key and the red key in a crate?", o.getSort("performative"), context, 'etaoin', "#list(perf.q.action(V0:'etaoin'[#id], action.put-in(V0, '4'[#id], X), crate(X), N:[number.1]), perf.q.action(V0, action.put-in(V0, '6'[#id], X), crate(X), N))");
NLParseTestUnifyingListener("could you please, put the white key and the red key in the crate?", o.getSort("performative"), context, 'etaoin', "#list(perf.q.action(V0:'etaoin'[#id], action.put-in(V0, '4'[#id], '5'[#id])), perf.q.action(V0, action.put-in(V0, '6'[#id], '5'[#id])))");
NLParseTestUnifyingListener("put the crate and the white key in the floor!", o.getSort("performative"), context, "etaoin", "#list(perf.request.action('etaoin'[#id], action.drop('etaoin'[#id], '5'[#id])), perf.request.action('etaoin'[#id], action.drop('etaoin'[#id], '4'[#id])))");



console.log(successfulTests + "/" + totalTests + " successtul parses");
console.log(nParametersPerPerformative);

