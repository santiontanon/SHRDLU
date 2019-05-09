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


function testNLG(performative:string, speaker:string, result:string)
{
	var t:Term = Term.fromString(performative, g_o);
	var str:string = g_nlg.termToEnglish(t, speaker, null, g_context);
	if (str != result) {
		console.error("NLG output is not what was expected for "+t+"! \n" + str + "\ninstead of:\n" + result);
	} else {
		console.log(str);
	}
}

function testNLG_entity(id:ConstantTermAttribute, speaker:string, result:string)
{
	var str:string = g_nlg.termToEnglish_Entity(id, speaker, true, g_context, true, true)[0];
	if (str != result) {
		console.error("NLG output is not what was expected for "+id+"! \n" + str + "\ninstead of:\n" + result);
	} else {
		console.log(str);
	}
}

g_o.newSortStrings("blue-key", ["key-card"]);
g_o.newSortStrings("red-key", ["key-card"]);

var idSort:Sort = g_o.getSort("#id");
var ceg1:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('1', g_o.getSort("#id")), 
                                              null, 0, 
                                              [Term.fromString("human('1'[#id])",g_o), 
                                               Term.fromString("name('1'[#id], 'david'[symbol])",g_o),
                                               Term.fromString("relation.owns('1'[#id],'k1'[#id])",g_o)]);
var ceg2:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('s1', g_o.getSort("#id")),
                                              null, 100, 
                                              [Term.fromString("ship('s1'[#id])",g_o),
                                               Term.fromString("color('s1'[#id],'red'[red])",g_o),
                                               Term.fromString("relation.belongs('s1'[#id],'etaoin'[#id])",g_o)]);
var ceg3:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('etaoin', g_o.getSort("#id")),
                                              null, 10, 
                                              [Term.fromString("ai('etaoin'[#id])",g_o),
                                               Term.fromString("name('etaoin'[#id], 'etaoin'[#id])",g_o),
                                               Term.fromString("relation.owns('etaoin'[#id],'s1'[#id])",g_o)]);
var ceg4:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('qwerty', g_o.getSort("#id")),
                                              null, 10, 
                                              [Term.fromString("robot('qwerty'[#id])",g_o),
                                               Term.fromString("name('qwerty'[#id], 'qwerty'[#id])",g_o)]);
var ceg5:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('k1', g_o.getSort("#id")),
                                              null, 3, 
                                              [Term.fromString("blue-key('k1'[#id])",g_o),
                                               Term.fromString("color('k1'[#id],'blue'[blue])",g_o),
                                               Term.fromString("relation.belongs('k1'[#id],'1'[#id])",g_o)]);
var ceg6:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('c1', g_o.getSort("#id")),
                                              null, 4, 
                                              [Term.fromString("crate('c1'[#id])",g_o),
                                               Term.fromString("property.opened('c1'[#id])",g_o)]);
var ceg7:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('k2', g_o.getSort("#id")),
                                              null, 3, 
                                              [Term.fromString("red-key('k2'[#id])",g_o),
                                               Term.fromString("color('k2'[#id],'red'[red])",g_o)]);
var ceg8:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('room1', g_o.getSort("#id")),
                                              null, 0, 
                                              [Term.fromString("kitchen('room1'[#id])",g_o),
                                               Term.fromString("temperature('room1'[#id],'25'[temperature.unit.celsius])",g_o)]);
var ceg9:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('s2', g_o.getSort("#id")),
                                              null, 100, 
                                              [Term.fromString("ship('s2'[#id])",g_o),
                                               Term.fromString("color('s2'[#id],'red'[red])",g_o)]);
var ceg10:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('s3', g_o.getSort("#id")),
                                              null, 100, 
                                              [Term.fromString("ship('s3'[#id])",g_o),
                                               Term.fromString("color('s3'[#id],'blue'[blue])",g_o)]);
var ceg11:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('c2', g_o.getSort("#id")),
                                              null, 4, 
                                              [Term.fromString("crate('c2'[#id])",g_o),
                                               Term.fromString("property.opened('c2'[#id])",g_o),
                                               Term.fromString("relation.belongs('c2'[#id],'qwerty'[#id])",g_o)]);
var ceg12:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('room2', g_o.getSort("#id")),
                                              null, 0, 
                                              [Term.fromString("bedroom('room2'[#id])",g_o)]);

var ceg13:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('ch1', g_o.getSort("#id")),
                                              null, 10, 
                                              [Term.fromString("chair('ch1'[#id])",g_o),
                                               Term.fromString("space.at('ch1'[#id],'room1'[#id])",g_o)]);

var ceg14:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('ch2', g_o.getSort("#id")),
                                              null, 50, 
                                              [Term.fromString("chair('ch2'[#id])",g_o),
                                               Term.fromString("space.at('ch2'[#id],'room2'[#id])",g_o)]);

var ceg15:NLContextEntity = new NLContextEntity(new ConstantTermAttribute('cave-in', g_o.getSort("#id")),
                                              null, 50, 
                                              [Term.fromString("cave-in('cave-in'[#id])",g_o),
                                               Term.fromString("space.at('cave-in'[#id],'room2'[#id])",g_o)]);

var ceg_l:NLContextEntity[] = [ceg1, ceg2, ceg3, ceg4, ceg5, ceg6, ceg7, ceg8, ceg9, ceg10, ceg11, ceg12, ceg13, ceg14, ceg15];
for(let ceg of ceg_l) {
	g_context.shortTermMemory.push(ceg);
	for(let t of ceg.terms) {
		g_ai.addShortTermTerm(t, "perception");
	}
}


// simple performatives
testNLG("perf.greet('1'[#id])", "etaoin", "Hello david!");
testNLG("perf.greet(X:[#id])", "etaoin", "Hello!");

// Tests without any context:
testNLG_entity(new ConstantTermAttribute('1',idSort), "etaoin", "you");
testNLG_entity(new ConstantTermAttribute('etaoin',idSort), "etaoin", "I");
testNLG_entity(new ConstantTermAttribute('qwerty',idSort), "etaoin", "qwerty");
testNLG_entity(new ConstantTermAttribute('c1',idSort), "etaoin", "a crate");
testNLG_entity(new ConstantTermAttribute('k1',idSort), "etaoin", "your key card");
testNLG_entity(new ConstantTermAttribute('k2',idSort), "etaoin", "the red key card");
testNLG_entity(new ConstantTermAttribute('s1',idSort), "etaoin", "my ship");
testNLG_entity(new ConstantTermAttribute('s2',idSort), "etaoin", "a red ship");
testNLG_entity(new ConstantTermAttribute('s3',idSort), "etaoin", "the blue ship");
testNLG_entity(new ConstantTermAttribute('c2',idSort), "etaoin", "the crate of qwerty");
testNLG_entity(new ConstantTermAttribute('ch1',idSort), "etaoin", "the chair in the kitchen");
testNLG_entity(new ConstantTermAttribute('ch2',idSort), "etaoin", "the chair in the bedroom");

// Tests with NL context:

// Tests with inform performatives:
testNLG("perf.inform('1'[#id], crate('s1'[#id]))", "etaoin", "my ship is a crate");
testNLG("perf.inform('1'[#id], color('s1'[#id],'red'[red]))", "etaoin", "my ship's color is red");
testNLG("perf.inform('1'[#id], space.at('s1'[#id],'room1'[#id]))", "etaoin", "my ship is in the kitchen");
testNLG("perf.inform('1'[#id], #not(space.at('s1'[#id],'room1'[#id])))", "etaoin", "my ship is not in the kitchen");
testNLG("perf.inform('1'[#id], relation.belongs('s1'[#id],'etaoin'[#id]))", "etaoin", "my ship is mine");
testNLG("perf.inform('1'[#id], relation.owns('etaoin'[#id],'s1'[#id]))", "etaoin", "my ship is mine");

testNLG("perf.inform('1'[#id], awake('1'[#id]))", "etaoin", "you are awake");

testNLG("perf.inform('1'[#id], verb.do('etaoin'[#id],[analysis]))", "etaoin", "I do an analysis");
testNLG("perf.inform('1'[#id], verb.need('etaoin'[#id], verb.do('etaoin'[#id],[analysis])))", "etaoin", "I need to do an analysis");
testNLG("perf.inform('1'[#id], #and(X:verb.remember('1'[#id]), time.later(X)))", "etaoin", "you will remember later");
testNLG("perf.inform('1'[#id], name('etaoin'[#id],'etaoin'[symbol]))", "etaoin", "my name is etaoin");
testNLG("perf.inform('1'[#id], name('qwerty'[#id],'qwerty'[symbol]))", "etaoin", "the robot's name is qwerty");
testNLG("perf.inform('1'[#id], role('etaoin'[#id], 's1'[#id], 'medic'[medic]))", "etaoin", "I am a medic in my ship");
testNLG("perf.inform('1'[#id], #and(X:verb.tell('qwerty'[#id], '1'[#id]), time.later(X)))", "etaoin", "qwerty will tell you later");
testNLG("perf.inform('1'[#id], verb.want('etaoin'[#id], verb.test('etaoin'[#id], #and(C:[coordination], relation.belongs(C, '1'[#id])))))", "etaoin", "I want to test your coordination");

// Tests with questions:
testNLG("perf.q.predicate('1'[#id],#and(X:verb.hear('1'[#id],'etaoin'[#id]), time.present(X)))", "etaoin", "do you hear me?");
testNLG("perf.q.predicate('1'[#id],#and(X:verb.remember('1'[#id],'etaoin'[#id]), time.present(X)))", "etaoin", "do you remember me?");
testNLG("perf.q.predicate('1'[#id],#and(X:verb.remember('1'[#id],verb.do('1'[#id],[analysis])), time.past(X)))", "etaoin", "did you remember to do an analysis?");
testNLG("perf.q.predicate('1'[#id],#and(X:verb.remember('1'[#id],'s1'[#id]), time.present(X)))", "etaoin", "do you remember my ship?");

testNLG("perf.q.query('1'[#id], Y, name('1'[#id],Y))", "etaoin", "what is your name?");
testNLG("perf.q.query('1'[#id], Y, space.at('1'[#id],Y))", "etaoin", "what are you in?");
testNLG("perf.q.predicate('1'[#id],#and(X:verb.remember('1'[#id],#and(#query(Y), name('1'[#id],Y))), time.present(X)))", "etaoin", "do you remember what is your name?");

testNLG("perf.q.whereis('1'[#id], 'etaoin'[#id])", "etaoin", "where am I?");
testNLG("perf.q.whereis('1'[#id], '1'[#id])", "etaoin", "where are you?");
testNLG("perf.q.whereis('1'[#id], 'qwerty'[#id])", "etaoin", "where is qwerty?");

testNLG("perf.inform.answer('1'[#id], '3'[number])", "etaoin", "3");
testNLG("perf.inform.answer('1'[#id], 'unknown'[symbol])", "etaoin", "I don't know");
testNLG("perf.inform.answer('1'[#id], 'unknown'[symbol], perf.q.whereis('1'[#id], 'etaoin'[#id]))", "etaoin", "I don't know where am I");

testNLG("perf.inform('1'[#id], verb.understand('etaoin'[#id], '1'[#id]))", "etaoin", "I understand you");
testNLG("perf.inform('1'[#id], #not(verb.understand('etaoin'[#id], '1'[#id])))", "etaoin", "I do not understand you");
testNLG("perf.inform('1'[#id], verb.understand('etaoin'[#id], 'thinguie'[symbol]))", "etaoin", "I understand thinguie");
testNLG("perf.inform('1'[#id], #not(verb.understand('etaoin'[#id], 'thinguie'[symbol])))", "etaoin", "I do not understand thinguie");
testNLG("perf.inform('1'[#id], #not(verb.understand('etaoin'[#id], #and(S:[sentence],the(S, [singular])))))", "etaoin", "I do not understand the sentence");
testNLG("perf.inform('1'[#id], #not(verb.can('etaoin'[#id], verb.parse('etaoin'[#id], #and(S:[sentence],the(S, [singular]))))))", "etaoin", "I can not parse the sentence");
testNLG("perf.inform('1'[#id], #not(verb.can('etaoin'[#id], verb.disambiguate('etaoin'[#id], #and(the(S:[sentence], [singular]), S)))))", "etaoin", "I can not disambiguate the sentence");

testNLG("perf.inform('1'[#id],#and(V:verb.find(E:'etaoin'[#id], X:[anomaly]), #and(time.past(V), space.at(V, #and(M:[memory-bank], #and(relation.owns(E, M), plural(M) )) ))))", "etaoin", "I found an anomaly in my memory banks");
testNLG("perf.inform(D:'1'[#id],#and(V:verb.run('etaoin'[#id], [analysis]), #and(relation.effect(V, #and(Q:[perf.question], #and(relation.owns(D, Q), plural(Q)))), time.past(V))))", "etaoin", "I ran an analysis because of your questions");
testNLG("perf.inform('1'[#id], #and(V:verb.find(E:'etaoin'[#id], #and(P1:erased(#and(M:[memory-bank], #and(relation.owns(E, M), plural(M)))), time.past(P1))), time.past(V)))", "etaoin", "I found that my memory banks were erased");
testNLG("perf.inform('1'[#id], #and(V:verb.go-to(E:'qwerty'[#id], 'room1'[#id]), #and(relation.purpose(V, verb.gather(E, #and(M:[mineral], plural(M)))), time.past(V))))", "etaoin", "qwerty went to the kitchen to gather minerals");
testNLG("perf.inform('1'[#id], #and(#not(V:verb.come-back(E:'qwerty'[#id])), time.past(V)))", "etaoin", "qwerty did not come back");

testNLG("perf.request.action('1'[#id], #and(V1:action.take('1'[#id], 's1'[#id]), relation.purpose(V1, verb.find('1'[#id],'qwerty'[#id]))))", "etaoin", "please, take my ship to find qwerty");

testNLG("perf.inform('1'[#id], verb.have('qwerty'[#id],'k2'[#id]))", "etaoin", "qwerty has the red key card");

testNLG("perf.inform('1'[#id], verb.can('1'[#id], #and(F:verb.find('1'[#id], 'ch1'[#id]), space.at(F,'room2'[#id]) )))", "etaoin", "you can find the chair in the kitchen in the bedroom");

testNLG("perf.inform.answer('1'[#id], time.date('0'[number], [time.minute]))", "etaoin", "8:00am");
testNLG("perf.inform.answer('1'[#id], time.date('0'[number], [time.hour]))", "etaoin", "8am");
testNLG("perf.inform.answer('1'[#id], time.date('0'[number], [time.day]))", "etaoin", "Monday, January 1st, year 1000");
testNLG("perf.inform.answer('1'[#id], time.date('0'[number], [time.week]))", "etaoin", "week 1, year 1000");
testNLG("perf.inform.answer('1'[#id], time.date('0'[number], [time.month]))", "etaoin", "January, year 1000");
testNLG("perf.inform.answer('1'[#id], time.date('0'[number], [time.year]))", "etaoin", "year 1000");
testNLG("perf.inform.answer('1'[#id], time.date('0'[number], [time.century]))", "etaoin", "11th century");
testNLG("perf.inform.answer('1'[#id], time.date('0'[number], [time.millenium]))", "etaoin", "2nd millenium");

testNLG("perf.request.action(V0:'1'[#id], verb.come(V0, [space.here]))", "etaoin", "please, come here");

testNLG("perf.inform('1'[#id], space.outside.of('s1'[#id],'room1'[#id]))", "etaoin", "my ship is outside of the kitchen");
testNLG("perf.inform('1'[#id], #and(space.at(S:'s1'[#id],'room1'[#id]), space.outside.of(S,'room2'[#id]) ))", "etaoin", "my ship is in the kitchen outside of the bedroom");
testNLG("perf.inform.answer('1'[#id], #and(space.at(S:'s1'[#id],'room1'[#id]), space.outside.of(S,'room2'[#id]) ))", "etaoin", "my ship is in the kitchen and outside of the bedroom");
testNLG("perf.inform.answer('1'[#id], #and(space.at(S:'s1'[#id],'room1'[#id]), space.at(S,'room2'[#id]) ))", "etaoin", "my ship is in the kitchen and the bedroom");

testNLG("perf.inform('1'[#id], verb.be([robot], [ai]) )", "etaoin", "a robot is an artificial intelligence");
testNLG("perf.inform('1'[#id], verb.be([robot], #and([ai],[character])) )", "etaoin", "a robot is an artificial intelligence and a character");

testNLG("perf.inform.answer('1'[#id], #and('k1'[#id], 'k2'[#id]))", "etaoin", "your key card and the red key card");
testNLG("perf.inform.answer('1'[#id], #and('k1'[#id], #and('k2'[#id],'etcetera'[etcetera])))", "etaoin", "your key card, the red key card, ...");
testNLG("perf.inform.answer('1'[#id], #and('k1'[#id], #and('k2'[#id], 'c2'[#id])))", "etaoin", "your key card, the red key card and the crate of qwerty");
testNLG("perf.inform.answer(V0:'1'[#id], V1:'yellow'[yellow])", "etaoin", "yellow");

testNLG("perf.inform(V0:'1'[#id], verb.be([corpse],[human]))", "etaoin", "a corpse is a human");
testNLG("perf.inform(V0:'1'[#id], verb.be([corpse],#and([human],[dead])))", "etaoin", "a corpse is a human and something that is dead");
testNLG("perf.inform(V0:'1'[#id], verb.want(S:'etaoin'[#id], verb.test(S, #and(C:[strength], relation.belongs(C, V0)))))", "etaoin", "I want to test your strength");

testNLG("perf.inform(V0:'1'[#id], V1:permission-to-access(V3:'etaoin'[#id]))", "etaoin", "I have permission to enter");
testNLG("perf.inform(V0:'1'[#id], V1:#not(permission-to-access(V3:'etaoin'[#id])))", "etaoin", "I do not have permission to enter");
testNLG("perf.inform(V0:'1'[#id], V1:permission-to-access(V3:'etaoin'[#id], V8:'room1'[#id]))", "etaoin", "I have permission to enter the kitchen");
testNLG("perf.q.predicate(V0:'1'[#id], V1:permission-to-access(V3:'etaoin'[#id], V8:'room1'[#id]))", "etaoin", "do I have permission to enter the kitchen?");
testNLG("perf.q.predicate('1'[#id], permitted-in('etaoin'[#id], 'room1'[#id]))", "etaoin", "am I allowed to enter the kitchen?");

testNLG("perf.inform.answer(V0:'1'[#id], '100'[kilogram])", "etaoin", "100 kilograms");
testNLG("perf.inform.answer(V0:'1'[#id], '1.5'[meter])", "etaoin", "1.5 meters");
testNLG("perf.inform.answer(V0:'1'[#id], '1'[meter])", "etaoin", "1 meter");
testNLG("perf.inform(V0:'1'[#id], height('1'[#id],'1.8'[meter]))", "etaoin", "your height is 1.8 meters"); 
testNLG("perf.inform(V0:'1'[#id], distance('1'[#id],'etaoin'[#id],'1.8'[meter]))", "etaoin", "the distance between you and me is 1.8 meters"); 

testNLG("perf.inform(V0:'1'[#id], oxygen-level('1'[#id],'low'[low]))", "etaoin", "your oxygen level is low"); 
testNLG("perf.request.action('1'[#id], verb.come-back(E:'1'[#id]))", "etaoin", "please, come back");

// Parse errors:
testNLG("perf.inform.parseerror(V0:'1'[#id], V1:#not(V2:verb.can(V3:'etaoin'[#id], V4:verb.disambiguate(V5:'etaoin'[#id], V6:#and(V7:the(V8:'key'[symbol], V14:[singular]), V10:#and(V11:adjective(V8, V12:'white'[symbol]), V13:noun(V8, V14)))))))", "etaoin", "I can not disambiguate the white key");
testNLG("perf.inform.parseerror(V0:'1'[#id], V1:#not(V2:verb.understand(V3:'etaoin'[#id], V4:#and(V5:determiner.your(V6:'height'[symbol], V2A:[singular]), V8:noun(V6, V2A)))))", "etaoin", "I do not understand your height")
testNLG("perf.inform.parseerror(V0:'1'[#id], V1:#not(V2:verb.understand(V3:'etaoin'[#id], V4:#and(V5:#and(V6:the(V7:'door'[door], V3A:[singular]), V9:noun(V7, V3A)), V10:space.west.of(V7, V11:'1'[#id])))))", "etaoin", "I do not understand the door west of you");
testNLG("perf.inform.parseerror(V0:'1'[#id], #not(verb.understand('etaoin'[#id],#and(the(NOUN:'perf.question'[perf.question],S:[singular]),noun(NOUN,S)))))", "etaoin", "I do not understand the question");
testNLG("perf.inform.parseerror(V0:'1'[#id], V1:#not(V2:verb.can(V3:'etaoin'[#id], V4:verb.disambiguate(V5:'etaoin'[#id], V6:object-personal-pronoun(V7:'object-personal-pronoun.it'[symbol], V1A:[singular], V2A:[gender-neutral], V3A:[third-person])))))","etaoin","I can not disambiguate it");

testNLG("perf.inform(V0:'1'[#id], relation.cause(verb.come-to(S:'etaoin'[#id], 'room1'[#id]) , verb.want(S, 'food'[food])))", "etaoin", "I come to the kitchen because I want food");
testNLG("perf.inform(V0:'1'[#id], relation.cause(verb.come-to(S:'qwerty'[#id], 'room1'[#id]) , verb.want(S, 'food'[food])))", "etaoin", "qwerty comes to the kitchen because qwerty wants food");
testNLG("perf.inform.answer(V0:'1'[#id], relation.cause([any] , verb.want('qwerty'[#id], 'food'[food])))", "etaoin", "because qwerty wants food");
testNLG("perf.inform.answer(V0:'1'[#id], relation.cause([any] , #not(verb.want('qwerty'[#id], 'food'[food]))))", "etaoin", "because qwerty does not want food");
testNLG("perf.inform.answer(V0:'1'[#id], relation.cause([any] , #not(verb.know('etaoin'[#id], #and(the(P:'path'[path], N:[singular]), noun(P, N))))))", "etaoin", "because I do not know the path");
testNLG("perf.inform.answer(V0:'1'[#id], relation.cause([any] , #not(door('1'[#id]))))", "etaoin", "because you are not a door");
testNLG("perf.inform.answer('1'[#id], relation.cause([any] , verb.can('1'[#id], #and(F:verb.find('1'[#id], 'ch1'[#id]), space.at(F,'room2'[#id]) ))))", "etaoin", "because you can find the chair in the kitchen in the bedroom");
testNLG("perf.request.action(V0:'1'[#id], V1:action.give(V0, V3:'k1'[#id], V2:'qwerty'[#id]))", "etaoin", "please, give your key card to qwerty");
testNLG("perf.request.action(V0:'1'[#id], V1:action.talk(V0, V2:perf.request.action(V3:'qwerty'[#id], V4:verb.follow(V3, V5:'etaoin'[#id]))))", "etaoin", "please, tell qwerty to follow me");
testNLG("perf.inform(V0:'1'[#id], V1:verb.tell(V0, V2:perf.request.action(V3:'qwerty'[#id], V4:verb.follow(V3, V5:'etaoin'[#id])), V3))", "etaoin", "you tell qwerty to follow me");
testNLG("perf.inform.answer(V0:'1'[#id], V1:verb.tell(V2:'1'[#id], V3:perf.request.action(V4:'qwerty'[#id], V5:verb.repair(V4, V6:'s2'[#id])), V4))", "etaoin", "you tell qwerty to repair a red ship");
testNLG("perf.inform(V0:'1'[#id], role('qwerty'[#id],'scifi-writer'[scifi-writer]))", "etaoin", "qwerty is a science fiction writer");
testNLG("perf.request.action(V0:'1'[#id], verb.go-to(V0,'room1'[#id]))", "etaoin", "please, go to the kitchen");
testNLG("perf.request.action(V0:'1'[#id], verb.go(V0,'northeast'[northeast]))", "etaoin", "please, go northeast");
testNLG("perf.request.action(V0:'1'[#id], verb.go(V0,'northeast'[northeast],'room1'[#id]))", "etaoin", "please, go northeast to the kitchen");
testNLG("perf.request.action(V0:'1'[#id], time.subsequently(verb.go(V0,'northeast'[northeast],'room1'[#id]), verb.go(V0,'south'[south],'room2'[#id])))", "etaoin", "please, go northeast to the kitchen, then go south to the bedroom");
testNLG("perf.inform(V0:'1'[#id], time.subsequently(verb.go(V0,'northeast'[northeast],'room1'[#id]), verb.go(V0,'south'[south],'room2'[#id])))", "etaoin", "go northeast to the kitchen, then go south to the bedroom");
testNLG("perf.inform(V0:'1'[#id], verb.find(X, 'qwerty'[#id]))", "etaoin", "find qwerty");
testNLG("perf.inform(V0:'1'[#id], verb.go-to(X, 'verb.sleep'[verb.sleep]))", "etaoin", "go to sleep");
testNLG("perf.inform(V0:'1'[#id], verb.take-to('etaoin'[#id], '1'[#id], 'room1'[#id]))", "etaoin", "I guide you to the kitchen");
testNLG("perf.q.how('1'[#id], verb.help('etaoin'[#id],'1'[#id]))", "etaoin", "How can I help you?");
testNLG("perf.inform('1'[#id], #and(X:verb.can('1'[#id], #and(Y:action.talk('1'[#id]), relation.target(Y, 'qwerty'[#id]))), time.now(X)))", "etaoin", "you can talk to qwerty now");
testNLG("perf.inform('1'[#id], #and(#and(X:verb.can('1'[#id], #and(Y:action.talk('1'[#id]), relation.target(Y, 'qwerty'[#id]))), relation.tool(X, 'k1'[#id]), time.now(X))))", "etaoin", "you can talk to qwerty with your key card now");
testNLG("perf.inform.answer('1'[#id], #and(verb.walk(V3:'qwerty'[#id]), V4:action.talk(V3)))", "etaoin", "qwerty walks and talks");
testNLG("perf.inform.answer('1'[#id], #and(verb.walk(V3:'1'[#id]), V4:action.talk(V3)))", "etaoin", "you walk and talk");
testNLG("perf.inform.answer(V0:'1'[#id], V1:relation.cause(V2:gravity(V3:'room1'[#id], V4:'gravity.low'[gravity.low]), V5:radius(V6:'room2'[#id], V7:'length.large'[length.large])))", "etaoin", "the kitchen's gravity is low because of the bedroom's radius is large");
testNLG("perf.inform.answer(V0:'1'[#id], V1:relation.cause(V2:light-weight(V3:'1'[#id], V4:'light-weight'[light-weight]), V5:gravity(V6:'room2'[#id], V7:'gravity.low'[gravity.low])))", "etaoin", "your weight is light because of the bedroom's gravity is low");
testNLG("perf.inform.parseerror(V0:'1'[#id], V1:#not(V2:verb.understand(V3:'etaoin'[#id], V4:#and(V5:the(V6:'temperature'[temperature], V2_0:[singular]), V8:noun(V6, V2_0)))))", "etaoin", "I do not understand the temperature");
testNLG("perf.inform.answer(V0:'1'[#id], name(V2:'room1'[#id], V3:'aurora station'[symbol]))", "etaoin", "the kitchen's name is aurora station");
testNLG("perf.inform(V0:'1'[#id], verb.be([temperature], [property-with-value]))", "etaoin", "a temperature is a property"); 
testNLG("perf.inform.answer(V0:'1'[#id], V1:#and(V2:name(V3:'1'[#id], V4:'david'[symbol]), V5:#and(V6:name(V7:'qwerty'[#id], V8:'qwerty'[symbol]), V9:#and(V10:name(V11:'etaoin'[#id], V12:'etaoin'[symbol]), V13:'etcetera'[etcetera]))))", "etaoin", "your name is david, the robot's name is qwerty, my name is etaoin, ...");
testNLG("perf.inform.answer(V0:'1'[#id], V1:relation.cause(V2:#not(V3:verb.remember(V4:'1'[#id], V5:'pronoun.anything'[pronoun.anything])), V6:#and(V7:in-stasis(V8:'1'[#id]), V9:time.past(V7))))", "etaoin", "you do not remember anything because of that you were in stasis");

testNLG("perf.inform.answer(V0:'1'[#id], V1:verb.need(V2:'1'[#id], V3:permission-to-access(V2, V4:'room1'[#id])))", "etaoin", "you need to have permission to enter the kitchen");
testNLG("perf.inform.answer(V0:'1'[#id], V1:#and(V2:verb.malfunction(V3:'s1'[#id]), V4:time.past(V2)))", "etaoin", "my ship malfunctioned");

testNLG("perf.inform('1'[#id], verb.can('etaoin'[#id], verb.switch-on('etaoin'[#id], 'qwerty'[#id])))", "etaoin", "I can turn on qwerty"); 

testNLG("perf.inform.answer(V0:'1'[#id], V1:relation.cause(powered.state('s1'[#id], 'powered.off'[powered.off]), verb.switch-off('etaoin'[#id], 's1'[#id])))", "etaoin", "my ship's state is off because I turn off my ship");

testNLG("perf.inform(V0:'1'[#id], #and(V:verb.guide('etaoin'[#id], '1'[#id], 'room2'[#id]), time.future(V)))", "etaoin", "I will guide you to the bedroom"); 
testNLG("perf.inform(V0:'1'[#id], #and(V:space.outside.of('1'[#id], 'room1'[#id]), time.future(V)))", "etaoin", "you will be outside of the kitchen"); 

testNLG("perf.request.action(V0:'1'[#id], verb.bring('1'[#id], 'qwerty'[#id], 'room2'[#id]))", "etaoin", "please, bring qwerty to the bedroom"); 
testNLG("perf.request.action(V0:'1'[#id], verb.help('1'[#id], 'etaoin'[#id]))", "etaoin", "please, help me"); 

testNLG("perf.inform('1'[#id], #and(V:verb.damage('cave-in'[#id], 'etaoin'[#id]), time.past(V)))" ,"etaoin", "the cave in damaged me");
testNLG("perf.q.action('1'[#id], verb.help('1'[#id], 'etaoin'[#id], verb.go-to('etaoin'[#id], 'room1'[#id])))", "etaoin", "would you please help me to go to the kitchen?");
testNLG("perf.request.action(V0:'1'[#id], action.give('1'[#id], #and(V:[instruction], plural(V)), 'etaoin'[#id]))", "etaoin", "please, give instructions to me");


