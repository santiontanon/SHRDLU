/*

Note (santi):
- This is the core AI class for SHRDLU. It implements all the different elements of the NPC AI. 
- This class is generic, however, and not tied to this specific project, nor to the A4Engine, so it can be separated from the 
  game. Everything that is specific to the game engine is implemented in A4RuleBasedAI, which extends from this class. Then,
  two other classes (EtaoinAI and RobotAI) implement additional functionality used by the two types of NPCs in the game 
  (EtaoinAI is used for ETAOIN which is a disembodied AI, and RobotAI is used for the two robots, QWERTY and SHRDLU).
- These classes implement all the AI functionalities except for pathfinding. For that, I reused all the pathfinding code
  originally implemented in the A4Engine, which is still in the A4AI class inside of the A4Engine code.

*/

var ONTOLOGY_PROVENANCE:string = "ontology";
var BACKGROUND_PROVENANCE:string = "background";
var BACKGROUND_ADDITIONAL_PROVENANCE:string = "background-additional";	// this is additional background knowledge that is loaded after 
																		// some events, and thus needs to be saved in savegames.
var PERCEPTION_PROVENANCE:string = "perception";
var REACTION_PROVENANCE:string = "reaction";
var MEMORIZE_PROVENANCE:string = "memorize";
var LOCATIONS_PROVENANCE:string = "locations";

var ACTION_REQUEST_CANNOT_BE_SATISFIED:number = 0;
var ACTION_REQUEST_CAN_BE_SATISFIED:number = 1;
var ACTION_REQUEST_WILL_BE_HANDLED_EXTERNALLY:number = 2;

var MENTION_MEMORY_SIZE:number = 10;

var DEFAULT_QUESTION_PATIENCE_TIMER:number = 1200;

var CONVERSATION_TIMEOUT:number = 120*60;	// 2 minute of real time, which is 2 hour of in-game time

var OCCURS_CHECK:boolean = false;

class InferenceRecord {
	constructor(ai:RuleBasedAI, additionalSentences_arg:Sentence[], targets:Sentence[][], p:number, a:number, findAllAnswers:boolean, timeTerm:Term, e:InferenceEffect, o:Ontology)
	{
		// Knowledge base is all the long term knowledge, plus the perception:
		let additionalSentences:Sentence[] = [];
		for(let s of additionalSentences_arg) additionalSentences.push(s);
		for(let te of ai.shortTermMemory.plainTermList) {
			additionalSentences.push(new Sentence([te.term],[true]));
		}

		let ltm:SentenceContainer = ai.longTermMemory;

		if (timeTerm != null) {
			// edit the long term memory to match the time of the query:
			if (timeTerm.functor.name == "time.past") {
				ltm = TimeInference.applyTimePast(ai.longTermMemory)
			} else if (timeTerm.functor.is_a(o.getSort("time.now"))) {
				// do nothing
			} else {
				console.error("InferenceRecord timeTerm not supported: " + timeTerm);
			}
		}

		this.targets = targets;
		for(let target of this.targets) {
			this.inferences.push(new InterruptibleResolution(ltm, additionalSentences, target, true, true, timeTerm == null, ai));
		}
		this.priority = p;
		this.anxiety = a;
		this.additionalSentences = additionalSentences_arg;
		this.findAllAnswers = findAllAnswers;
		this.timeTerm = timeTerm;
		this.effect = e;

		//console.log("InferenceRecord: findAllAnswers = " + this.findAllAnswers);
	}


	static fromXML(xml:Element, o:Ontology, ai:RuleBasedAI) : InferenceRecord
	{
		let variables:TermAttribute[] = [];
		let variableNames:string[] = [];
		let p:number = Number(xml.getAttribute("priority"));
		let a:number = Number(xml.getAttribute("anxiety"));
		let findAllAnswers:boolean = xml.getAttribute("findAllAnswers") == "true";
		let e:InferenceEffect = null;
		let tt:Term = null;
		let tb:Term = null;
		let tbs:string = null;
		if (xml.getAttribute("timeTerm") != null) tt = Term.fromStringInternal(xml.getAttribute("timeTerm"), o, variableNames, variables).term;
		if (xml.getAttribute("triggeredBy") != null) tb = Term.fromStringInternal(xml.getAttribute("triggeredBy"), o, variableNames, variables).term;
		if (xml.getAttribute("triggeredBySpeaker") != null) tbs = xml.getAttribute("triggeredBySpeaker");

		let effect_xml:Element = getFirstElementChildByTag(xml ,"InferenceEffect");
		if (effect_xml != null) e = ai.inferenceEffectFactory.loadFromXML(effect_xml, ai, o, variables, variableNames);

		let additionalSentences:Sentence[] = [];
		let additionalSentences_xml:Element = getFirstElementChildByTag(xml ,"additionalSentences");
		if (additionalSentences_xml != null) {
			for(let s_xml of getElementChildrenByTag(additionalSentences_xml, "sentence")) {
				let s:Sentence = Sentence.fromStringInternal(s_xml.firstChild.nodeValue, o, variableNames, variables);
				if (s!=null) additionalSentences.push(s);
			}
		}
		let targets:Sentence[][] = [];
		for(let s_l_xml of getElementChildrenByTag(xml, "target")) {
			let t:Sentence[] = [];
			for(let s_xml of getElementChildrenByTag(s_l_xml, "sentence")) {
				let s:Sentence = Sentence.fromStringInternal(s_xml.firstChild.nodeValue, o, variableNames, variables);
				if (s!=null) t.push(s);
			}
			targets.push(t);
		}

		let ir:InferenceRecord = new InferenceRecord(ai, additionalSentences, targets, p, a, findAllAnswers, tt, e, o);
		ir.triggeredBy = tb;
		ir.triggeredBySpeaker = tbs;
		return ir;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		// We do not save the state of the interruptible resolution process, sicne that'd be complex. 
		// The inference will just be restarted when the AI is loaded again:
		let variables:TermAttribute[] = [];
		let variableNames:string[] = [];
		let str:string = "<InferenceRecord priority=\""+this.priority+"\" "+
										  "anxiety=\""+this.anxiety+"\" "+
										  "findAllAnswers = \""+this.findAllAnswers+"\" "+
										  (this.timeTerm != null ? "timeTerm = \""+this.timeTerm.toStringXMLInternal(variables, variableNames)+"\" ":"") +
										  (this.triggeredBy != null ? "triggeredBy = \""+this.triggeredBy.toStringXMLInternal(variables, variableNames)+"\" ":"") +
										  (this.triggeredBySpeaker != null ? "triggeredBySpeaker = \""+this.triggeredBySpeaker+"\" ":"") +
										  ">\n";

		if (this.effect != null) str += this.effect.saveToXMLInternal(ai, variables, variableNames) + "\n";

		console.error("InferenceRecord saving to XML not yet supported (figure out a way to save InferenceEffects)");

		if (this.additionalSentences.length > 0) {
			str += "<additionalSentences>\n";
			for(let s of this.additionalSentences) {
				str += "<sentence>"+s.toStringXMLInternal(variables, variableNames)+"</sentence>\n";
			}
			str += "</additionalSentences>\n";
		}
		for(let sl of this.targets) {
			str += "<target>\n";
			for(let s of sl) {
				str += "<sentence>"+s.toStringXMLInternal(variables, variableNames)+"</sentence>\n";
			}
			str += "</target>\n";
		}
		str += "</InferenceRecord>";
		return str;
	}


	targets:Sentence[][] = [];
	inferences:InterruptibleResolution[] = [];
	completedInferences:InterruptibleResolution[] = [];
	additionalSentences:Sentence[] = [];

	priority:number = 1;
	anxiety:number = 0;
	findAllAnswers:boolean = false;
	timeTerm:Term = null;

	effect:InferenceEffect = null;

	triggeredBy:Term = null;
	triggeredBySpeaker:string = null;	
}


class CauseRecord {
	constructor(t:Term, c:CauseRecord, time:number)
	{
		this.term = t;
		this.cause = c;
		this.timeStamp = time;
	}


	static fromXML(xml:Element, o:Ontology) : CauseRecord
	{
		let cause:CauseRecord = null;
		let p_xml = getFirstElementChildByTag(xml, "cause");
		if (p_xml != null) {
			cause = CauseRecord.fromXML(p_xml, o);
		}
		return new CauseRecord(Term.fromString(xml.getAttribute("term"), o),
							   cause,
							   Number(xml.getAttribute("timeStamp")));
	}


	saveToXML() : string
	{
		if (this.cause == null) {
			let tmp:string = "<CauseRecord term=\""+this.term.toStringXML() +"\" " +
										  "timeStamp=\""+this.timeStamp+"\"/>";
		    return tmp;
		} else {
			let tmp:string = "<CauseRecord term=\""+this.term.toStringXML() +"\" " +
										  "timeStamp=\""+this.timeStamp+"\">";
		    tmp += this.cause.saveToXML();
		    tmp +="</CauseRecord>"

		    return tmp;
		}
	}


	term:Term = null;
	cause:CauseRecord = null;
	timeStamp:number = null;
	causesComeFromInference:boolean = false;

}


class IntentionRecord {
	constructor(a:Term, r:TermAttribute, rp:NLContextPerformative, c:CauseRecord, time:number)
	{
		this.action = a;
		this.requester = r;
		this.requestingPerformative = rp;
		this.cause = c;
		this.timeStamp = time;
	}


	static fromXML(xml:Element, ai:RuleBasedAI, o:Ontology) : IntentionRecord
	{
		let variables:TermAttribute[] = [];
		let variableNames:string[] = [];
		let action:Term = Term.fromStringInternal(xml.getAttribute("action"), o, variableNames, variables).term;
		let requester:TermAttribute = null;
		let rps:string = xml.getAttribute("requestingPerformativeSpeaker");
		let requestingPerformative:NLContextPerformative = null;
		let cause:CauseRecord = null;
		let timeStamp:number = Number(xml.getAttribute("timeStamp"));
		if (xml.getAttribute("requester") != null) requester = Term.parseAttribute(xml.getAttribute("requester"), o, variableNames, variables);
		if (rps != null) {
			let context:NLContext = ai.contextForSpeaker(rps);
			if (context != null) {
				requestingPerformative = context.performatives[Number(xml.getAttribute("requestingPerformativeSpeaker"))];
			}
		}
		let cause_xml:Element = getFirstElementChildByTag(xml, "CauseRecord");
		if (cause_xml != null) {
			cause = CauseRecord.fromXML(cause_xml, o);
		}
		return new IntentionRecord(action, requester, requestingPerformative, cause, timeStamp);
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		let variables:TermAttribute[] = [];
		let variableNames:string[] = [];
		let context:NLContext = null;
		if (this.requestingPerformative != null) {
			context = ai.contextForSpeaker(this.requestingPerformative.speaker);
		}
		let xml:string = "<IntentionRecord action=\""+this.action.toStringXMLInternal(variables, variableNames)+"\""+
										 (this.requester == null ? "":
										 						   " requester=\""+this.requester.toStringXMLInternal(variables, variableNames)+"\"")+
										 (context == null ? "":
										 				    " requestingPerformativeSpeaker=\""+this.requestingPerformative.speaker+"\""+
										 				    " requestingPerformative=\""+context.performatives.indexOf(this.requestingPerformative)+"\"")+
										 " timeStamp=\""+this.timeStamp+"\"";										 
		if (this.cause == null) {
			xml += "/>";
		} else {
			xml += ">\n";
		    xml += this.cause.saveToXML();
		    xml +="</IntentionRecord>";
		}
		return xml;
	}


	action:Term = null;
	requester:TermAttribute = null;
	requestingPerformative:NLContextPerformative = null;
	cause:CauseRecord = null;	// if it had a cause, other than bing requested by "requester", we specify it here
	timeStamp:number = null;
}


abstract class IntentionAction {
	abstract canHandle(intention:Term, ai:RuleBasedAI) : boolean;
	abstract execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean;

	abstract saveToXML(ai:RuleBasedAI) : string;

	// This is what will be executed all the other times except the first. When it returns "true", action is over
	executeContinuous(ai:RuleBasedAI) : boolean
	{
		return true;
	}

	// Some requests require inference, however, an action  might be able to handle the inference internally.
	// If that's the case, then this function has to be redefined, and return "true" for those actions that the action handler
	// can handle inference internally.
	canHandleWithoutInference(perf:Term) : boolean
	{
		return false;
	}

	needsContinuousExecution:boolean = false;
}


abstract class InferenceEffect {
	abstract execute(inf:InferenceRecord, ai:RuleBasedAI);
	abstract saveToXMLInternal(ai:RuleBasedAI, variables:TermAttribute[], variableNames:string[]) : string;

	saveToXML(ai:RuleBasedAI) : string
	{
		return this.saveToXMLInternal(ai, [], []);
	}


	generateCauseRecord(target:Sentence[], result:InferenceNode, ai:RuleBasedAI) : CauseRecord
	{
		let baseSentences:Sentence[] = result.getBaseSentences(target);
				
		if (baseSentences.length == 0) {
			return null;
		} else {
			let cause:Term = null;
			for(let s of baseSentences) {
				let s_term:Term = Term.sentenceToTerm(s, ai.o);
	            if (cause == null) {
	                cause = s_term;
	            } else {
	                cause = new Term(ai.o.getSort("#and"), [new TermTermAttribute(cause), new TermTermAttribute(s_term)]);
	            }
			}

			let cr:CauseRecord = new CauseRecord(cause, null, ai.time_in_seconds)
			cr.causesComeFromInference = true;
			return cr;
		}
	}	
}


class RuleBasedAI {
	constructor(o:Ontology, nlp:NLParser, pf:number, pfoffset:number, qpt:number)
	{
		this.o = o;
		this.naturalLanguageParser = nlp;
		this.perceptionFrequency = pf;
		this.perceptionFrequencyOffset = pfoffset;
		this.questionPatienceTimmer = qpt;

		this.cache_sort_name = this.o.getSort("name");
		this.cache_sort_space_at = this.o.getSort("space.at");
		this.cache_sort_time_current = this.o.getSort("time.current");
		this.cache_sort_number = this.o.getSort("number");
		this.cache_sort_symbol = this.o.getSort("symbol");
		this.cache_sort_id = this.o.getSort("#id");
		this.cache_sort_map = this.o.getSort("map");
		this.cache_sort_intention = this.o.getSort("intention");
		this.cache_sort_performative = this.o.getSort("performative");
		this.cache_sort_property = this.o.getSort("property");
		this.cache_sort_property_with_value = this.o.getSort("property-with-value");
		this.cache_sort_relation_with_value = this.o.getSort("relation-with-value");
		this.cache_sort_object = this.o.getSort("object");
		this.cache_sort_space_location = this.o.getSort("space.location");
		this.cache_sort_relation = this.o.getSort("relation");
		this.cache_sort_verb_have = this.o.getSort("verb.have");
		this.cache_sort_verb_contains = this.o.getSort("verb.contains");
		this.cache_sort_stateSort = this.o.getSort("#stateSort");
		this.cache_sort_action_talk = this.o.getSort("action.talk");
		this.cache_sort_action_follow = this.o.getSort("verb.follow");

		this.inferenceEffectFactory = new InferenceEffectFactory();		

		let ontologySentences:Sentence[] = RuleBasedAI.translateOntologyToSentences(o);
		console.log("Ontology converted to " + ontologySentences.length + " sentences:");
		for(let s of ontologySentences) {
			this.longTermMemory.addSentence(s, ONTOLOGY_PROVENANCE, 1, 0);
		}
	}


	update(timeStamp:number) 
	{
		this.time_in_seconds = timeStamp;

		// 1) Attention & Perception:
		if ((timeStamp%this.perceptionFrequency) == this.perceptionFrequencyOffset) {
			this.attentionAndPerception();
		}

		// 2) Short-term memory loop:
		this.shortTermMemory.activationUpdate();

		// 3) Rule execution:
		this.inferenceUpdate();

		// 4) Conversation context update (see if we need to reask questions):
		this.conversationUpdate();

		// 5) Intention execution:
		this.executeIntentions();
	}


	addLongTermTerm(t:Term, provenance:string)
	{
		this.addLongTermTermWithTimeAndSign(t, provenance, this.time_in_seconds, true)
	}


	addLongTermTermWithTime(t:Term, provenance:string, time:number)
	{
		this.addLongTermTermWithTimeAndSign(t, provenance, time, true)
	}


	addLongTermTermWithSign(t:Term, provenance:string, sign:boolean)
	{
		this.addLongTermTermWithTimeAndSign(t, provenance, this.time_in_seconds, sign)
	}


	addLongTermTermWithTimeAndSign(t:Term, provenance:string, time:number, sign:boolean)
	{
		// intentions:
		if (t.functor == this.cache_sort_intention && sign) {
			this.intentions.push(new IntentionRecord(
									(<TermTermAttribute>t.attributes[0]).term, 
								   	t.attributes.length > 0 ? t.attributes[1]:null,
								   	null,
								   	null,
								   	time));
			return;
		}

		if (t.functor.is_a(this.cache_sort_stateSort)) {
			if (this.longTermMemory.addStateSentenceIfNew(new Sentence([t],[sign]), provenance, 1, time)) {
				// term added
				for(let context of this.contexts) {
					context.newLongTermStateTerm(t);
				}
				this.reactiveBehaviorUpdate(t);
			}
		} else {		
			if (this.longTermMemory.addSentenceIfNew(new Sentence([t],[sign]), provenance, 1, time)) {
				// term added
				for(let context of this.contexts) {
					context.newLongTermTerm(t);
				}
				this.reactiveBehaviorUpdate(t);
			}
		}
	}


	removeLongTermTermMatchingWith(t:Term) 
	{
		let se:SentenceEntry = this.longTermMemory.containsUnifyingTerm(t);
		if (se != null) this.longTermMemory.removeInternal(se);
	}


	addShortTermTerm(t:Term, provenance:string)
	{
		if (!this.shortMemoryToLongTermMemoryFilter(t, provenance)) {
			// intentions:
			if (t.functor == this.cache_sort_intention) {
				this.intentions.push(new IntentionRecord(
										(<TermTermAttribute>t.attributes[0]).term, 
									   	t.attributes.length > 0 ? t.attributes[1]:null,
									   	null, 
									   	null,
									   	this.time_in_seconds));

				return;
			}

			// we add 1 since "this.shortTermMemory.activationUpdate()" will be executed immediately
			// afterwards, decreasing it by 1 right away.
			if (t.functor.is_a(this.cache_sort_stateSort)) {
				if (this.shortTermMemory.addStateTermIfNew(t, provenance, this.perceptionMemoryTime+1, this.time_in_seconds)) {
					// new term was added:
					this.reactiveBehaviorUpdate(t);
				}
			} else {
				if (this.shortTermMemory.addTermIfNew(t, provenance, this.perceptionMemoryTime+1, this.time_in_seconds)) {
					// new term was added:
					this.reactiveBehaviorUpdate(t);
				}
			}
		}
	}


	addLongTermRuleNow(s:Sentence, provenance:string)
	{
		this.longTermMemory.addSentence(s, provenance, 1, this.time_in_seconds);
	}


	addLongTermRule(s:Sentence, provenance:string, time:number)
	{
		this.longTermMemory.addSentence(s, provenance, 1, time);
	}


	removeLongTermRule(s:Sentence)
	{
		this.longTermMemory.removeSentence(s);
	}


	addEpisodeTerm(t:string, provenance:string)
	{
		this.currentEpisodeTerms.push(t);
		let term:Term = Term.fromString(t, this.o);
		this.longTermMemory.addSentence(new Sentence([term],[true]), provenance, 1, this.time_in_seconds);
	}


	clearEpisodeTerms()
	{
		for(let t of this.currentEpisodeTerms) {
			let term:Term = Term.fromString(t, this.o);
			this.longTermMemory.removeSentence(new Sentence([term],[true]));
		}
		this.currentEpisodeTerms = [];
	}


	loadLongTermRulesFromFile(rulesFileName:string)
	{
		let xmlhttp:XMLHttpRequest = new XMLHttpRequest();
		xmlhttp.overrideMimeType("text/xml");
		xmlhttp.open("GET", rulesFileName, false); 
		xmlhttp.send();
		this.loadLongTermRulesFromXML(xmlhttp.responseXML.documentElement);
	}


	loadLongTermRulesFromXML(xml:Element)
	{
		for(let sentence_xml of getElementChildrenByTag(xml,"sentence")) {
			let rule:Sentence = Sentence.fromString(sentence_xml.getAttribute("sentence"), this.o);

			if (rule.terms.length == 1 &&
				rule.terms[0].functor.name == "name" &&
				rule.terms[0].attributes.length == 2 &&
				(rule.terms[0].attributes[1] instanceof ConstantTermAttribute)) {
				let name:string = (<ConstantTermAttribute>rule.terms[0].attributes[1]).value;
				if (name.indexOf(" ") != -1 && 
					this.naturalLanguageParser.posParser.multitokens_plainlist.indexOf(name) == -1) {
					console.error("Missing multitoken: " + name);
				}
			}

			let provenance:string = sentence_xml.getAttribute("provenance");
			let time:number = this.time_in_seconds;
			if (sentence_xml.getAttribute("time") != null) time = Number(sentence_xml.getAttribute("time"));
			let history:Sentence[] = [rule]
			let hasPrevious:boolean = false;
			sentence_xml = getFirstElementChildByTag(sentence_xml,"previousSentence");
			while(sentence_xml != null) {
				let rule2:Sentence = Sentence.fromString(sentence_xml.getAttribute("sentence"), this.o);
				let provenance:string = sentence_xml.getAttribute("provenance");
				//let timeEnd:number = this.time_in_seconds;
				hasPrevious = true;
				if (sentence_xml.getAttribute("time") != null) time = Number(sentence_xml.getAttribute("time"));
				//if (sentence_xml.getAttribute("timeEnd") != null) timeEnd = Number(sentence_xml.getAttribute("timeEnd"));
				if (provenance == BACKGROUND_PROVENANCE ||
					provenance == ONTOLOGY_PROVENANCE) {
					// this was a sentence that already was in the BK, so no need to add it
					sentence_xml = null;	// end of recursion
				} else {
					history.push(rule2)
					sentence_xml = getFirstElementChildByTag(sentence_xml,"previousSentence");
				}
			}
			history.reverse()
			// we add the sentences in reverse order, to reconstruct the "previousSentence" structure:
			for(let s of history) {
				if (hasPrevious) {
					this.longTermMemory.addStateSentenceIfNew(s, provenance, 1, time);
				} else {
					this.longTermMemory.addSentence(s, provenance, 1, time);
				}
			}
		}
		for(let sentence_xml of getElementChildrenByTag(xml,"previousSentence")) {
			let rule:Sentence = Sentence.fromString(sentence_xml.getAttribute("sentence"), this.o);
			let provenance:string = sentence_xml.getAttribute("provenance");
			let time:number = this.time_in_seconds;
			let timeEnd:number = this.time_in_seconds;
			if (sentence_xml.getAttribute("time") != null) time = Number(sentence_xml.getAttribute("time"));
			if (sentence_xml.getAttribute("timeEnd") != null) timeEnd = Number(sentence_xml.getAttribute("timeEnd"));
			this.longTermMemory.addPreviousSentence(rule, provenance, 1, time, timeEnd, null);			
		}
	}


	attentionAndPerception()
	{

	}


	clearPerception()
	{
		this.perceptionBuffer = [];
	}


	addTermToPerception(term:Term)
	{
		// console.log("addTermToPerception: " + term.toString());
		this.perceptionBuffer.push(term);
		this.perceptionToShortMemoryFilter(term);
	}


	perceptionToShortMemoryFilter(term:Term) : boolean
	{
		/*
		let action:Sort = this.o.getSort("actionverb");
		if (action.subsumes(term.functor)) {
			this.addShortTermTerm(term);
			return true;
		}
		return false;
		*/

		// only filter time:
		if (term.functor == this.cache_sort_time_current) return false;
		this.addShortTermTerm(term, PERCEPTION_PROVENANCE);
		return true;
	}


	shortMemoryToLongTermMemoryFilter(term:Term, provenance:string) : boolean
	{
		let storeInLongTerm:boolean = false;
		for(let sort of this.predicatesToStoreInLongTermMemory) {
			if (sort.subsumes(term.functor)) {
				storeInLongTerm = true;
				break;
			}
		}
		if (storeInLongTerm) {
			this.addLongTermTerm(term, provenance);
			return true;
		} else if (term.functor.is_a(this.cache_sort_stateSort)) {
			let s:Sentence = this.longTermMemory.previousStateSentenceToReplace(term, true);
			if (s != null) {
				if (term.equalsNoBindings(s.terms[0]) != 1) {
					// only if the new term is different from the previous one, we need to do any update:
					this.addLongTermTerm(term, provenance);
					//console.log("state short term replaces long term: " + term);
				}
				return true;
			}
		}

		return false;
	}


	reactiveBehaviorUpdate(t:Term)
	{
		let toAdd:Term[] = [];

		if (t.functor.is_a(this.cache_sort_action_talk) &&
			t.attributes[3] instanceof TermTermAttribute &&
			t.attributes[2] instanceof ConstantTermAttribute &&
			t.attributes[1] instanceof ConstantTermAttribute) {
			// perceived someone talking:
			let performative:Term = (<TermTermAttribute>t.attributes[3]).term;
			let text:string = <string>(<ConstantTermAttribute>t.attributes[2]).value;
			let speaker:string = (<ConstantTermAttribute>t.attributes[1]).value;

			if (speaker != this.selfID) {
				// is it talking to us?
				let context:NLContext = this.contextForSpeaker(speaker);

				if (this.talkingToUs(context, speaker, performative)) {
	    			// Since now we know they are talking to us, we can unify the LISTENER with ourselves:
	    			this.terminateConversationAfterThisPerformative = false;
					let perf2:Term = this.naturalLanguageParser.unifyListener(performative, this.selfID);
					if (perf2 == null) perf2 = performative;
					let nIntentions:number = this.intentions.length;
					let tmp:Term[] = this.reactToPerformative(perf2, t.attributes[1], context);
					if (tmp!=null) toAdd = toAdd.concat(tmp);
					let nlcp:NLContextPerformative[] = context.newPerformative(speaker, text, perf2, null, this.o, this.time_in_seconds);
					// add this performative to all the new intentions:
					if (nlcp.length > 0) {
						for(let i:number = nIntentions;i<this.intentions.length;i++) {
							if (this.intentions[i].requestingPerformative == null) {
								this.intentions[i].requestingPerformative = nlcp[0];
							}
						}
					}
					if (this.terminateConversationAfterThisPerformative) context.endConversation();
				}
			}
		}
		for(let t2 of toAdd) {
			console.log("reactiveBehaviorUpdate.toAdd: " + t2);
			this.addShortTermTerm(t2, REACTION_PROVENANCE);
		}
	}


	reactiveBehaviorUpdateToParseError(speakerID:string)
	{
    	let context:NLContext = this.contextForSpeakerWithoutCreatingANewOne(speakerID);
    	if (context != null) {
    		if (this.talkingToUs(context, speakerID, null)) {
	    		// respond!
	    		if (this.naturalLanguageParser.error_semantic.length > 0) {
	    			console.log(this.selfID + ": semantic error when parsing a performative from " + speakerID);
	    			this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.inform.parseerror('"+context.speaker+"'[#id], #not(verb.understand('"+this.selfID+"'[#id], #and(S:[sentence],the(S, [singular]))))))", this.o), null, null, null, this.time_in_seconds));
	    		} else if (this.naturalLanguageParser.error_deref.length > 0) {
	    			let tmp:TermAttribute = null;
	    			let errorType:number = 0;
	    			let tokensLeftToParse:number = null;
	    			for(let e of this.naturalLanguageParser.error_deref) {
		    			if (e.derefFromContextErrors.length>0) {
		    				if (tokensLeftToParse == null || e.tokensLeftToParse < tokensLeftToParse) {
		    					tmp = e.derefFromContextErrors[0];
		    					errorType = e.derefErrorType;
		    					tokensLeftToParse = e.tokensLeftToParse;
			    				console.log("reporting derefFromContextErrors:"  + tmp);
			    			}
		    			} else if (e.derefUniversalErrors.length>0) {
		    				if (tokensLeftToParse == null || e.tokensLeftToParse < tokensLeftToParse) {
		    					tmp = e.derefUniversalErrors[0];
		    					errorType = e.derefErrorType;
		    					tokensLeftToParse = e.tokensLeftToParse;
			    				console.log("reporting derefUniversalErrors: " + tmp);
			    			}
		    			} else if (e.derefHypotheticalErrors.length>0) {
		    				if (tokensLeftToParse == null || e.tokensLeftToParse < tokensLeftToParse) {
			    				tmp = e.derefHypotheticalErrors[0];
			    				errorType = e.derefErrorType;
			    				tokensLeftToParse = e.tokensLeftToParse;
				    			console.log("reporting derefHypotheticalErrors: " + tmp);
				    		}
		    			} else if (e.derefQueryErrors.length>0) {
		    				if (tokensLeftToParse == null || e.tokensLeftToParse < tokensLeftToParse) {
			    				tmp = e.derefQueryErrors[0];
			    				errorType = e.derefErrorType;
				    			console.log("reporting derefQueryErrors: " + tmp);
				    			tokensLeftToParse = e.tokensLeftToParse;
				    		}
		    			}
		    			// some times there are many entries with error of type "DEREF_ERROR_CANNOT_PROCESS_EXPRESSION",
		    			// if there are entries with another type of error, prioritize those:
		    			//if (errorType == DEREF_ERROR_NO_REFERENTS ||
		    			//	errorType == DEREF_ERROR_CANNOT_DISAMBIGUATE) break;
	    			}

	    			if (errorType == DEREF_ERROR_NO_REFERENTS) {
		    			this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.inform.parseerror('"+context.speaker+"'[#id], #not(verb.see('"+this.selfID+"'[#id], "+tmp+"))))", this.o), null, null, null, this.time_in_seconds));
	    			} else if (errorType == DEREF_ERROR_CANNOT_DISAMBIGUATE) {
		    			this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.inform.parseerror('"+context.speaker+"'[#id], #not(verb.can('"+this.selfID+"'[#id], verb.disambiguate('"+this.selfID+"'[#id], "+tmp+")))))", this.o), null, null, null, this.time_in_seconds));
	    			} else {
//		    			this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.inform.parseerror('"+context.speaker+"'[#id], #not(verb.understand('"+this.selfID+"'[#id], "+tmp+"))))", this.o), null, null, null, this.time_in_seconds));
		    			this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.inform.parseerror('"+context.speaker+"'[#id], #not(verb.can('"+this.selfID+"'[#id], verb.parse('"+this.selfID+"'[#id], #and(S:[sentence],the(S, [singular])))))))", this.o), null, null, null, this.time_in_seconds));
	    			}
	    		} else if (this.naturalLanguageParser.error_unrecognizedTokens.length > 0) {
	    			this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.inform.parseerror('"+context.speaker+"'[#id], #not(verb.understand('"+this.selfID+"'[#id], '"+this.naturalLanguageParser.error_unrecognizedTokens[0]+"'[symbol]))))", this.o), null, null, null, this.time_in_seconds));
	    		} else if (this.naturalLanguageParser.error_grammatical) {
	    			this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.inform.parseerror('"+context.speaker+"'[#id], #not(verb.can('"+this.selfID+"'[#id], verb.parse('"+this.selfID+"'[#id], #and(S:[sentence],the(S, [singular])))))))", this.o), null, null, null, this.time_in_seconds));
	    		}
	    	} else {
	    		console.log("reactiveBehaviorUpdateToParseError("+this.selfID+"): no need to react, since we are not currently talking to " + speakerID);
	    	}
    	} else {
    		console.log("reactiveBehaviorUpdateToParseError("+this.selfID+"): no need to react, since we don't have a context for " + speakerID);
    	}
	}


	reactToPerformative(perf2:Term, speaker:TermAttribute, context:NLContext) : Term[]
	{
		let reaction:Term[] = [];
		let performativeHandled:boolean = false;
		let newExpectingThankyou:boolean = false;

		if (context.expectingAnswerToQuestion_stack.length > 0) {
			if (perf2.functor.name == "perf.inform") {
				// determine if it's a proper answer:
				reaction = this.reactToAnswerPerformative(perf2, speaker, context);
				if (reaction == null) {
					let t2:Term = Term.fromString("action.memorize('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
					t2.addAttribute(perf2.attributes[1]);
					this.intentions.push(new IntentionRecord(t2,null,context.getNLContextPerformative(perf2), null, this.time_in_seconds));
					this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.ack.invalidanswer('"+context.speaker+"'[#id]))", this.o), speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
					this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], "+context.expectingAnswerToQuestion_stack[context.expectingAnswerToQuestion_stack.length-1].performative+")", this.o), speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
					context.popLastQuestion();	// remove the question, since we will ask it again
				}
				performativeHandled = true;
			} else if (perf2.functor.is_a(this.o.getSort("perf.inform.answer")) ||
					   perf2.functor.is_a(this.o.getSort("perf.ack.ok"))) {
				// determine if it's a proper answer:
				reaction = this.reactToAnswerPerformative(perf2, speaker, context);
				if (reaction == null) {
					this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.ack.invalidanswer('"+context.speaker+"'[#id]))", this.o), speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
					this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], "+context.expectingAnswerToQuestion_stack[context.expectingAnswerToQuestion_stack.length-1].performative+")", this.o), speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
					context.popLastQuestion();	// remove the question, since we will ask it again
				}
				performativeHandled = true;
			} else if (perf2.functor.is_a(this.o.getSort("perf.question"))) {
				// in this case, we accept the performative. It will be handled below
			} else if (perf2.functor.is_a(this.o.getSort("perf.request.action")) ||
				       perf2.functor.is_a(this.o.getSort("perf.request.stopaction"))) {
				// in this case, we accept the performative. It will be handled below
			} else {
				this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.ack.invalidanswer('"+context.speaker+"'[#id]))", this.o), speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
				this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], "+context.expectingAnswerToQuestion_stack[context.expectingAnswerToQuestion_stack.length-1].performative+")", this.o), speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
				context.popLastQuestion();	// remove the question, since we will ask it again
				performativeHandled = true;
			}

		} else if (context.expectingConfirmationToRequest_stack.length > 0) {
		    if (perf2.functor.is_a(this.o.getSort("perf.ack.ok"))) {
		    	// ok, clear requests:
		    	context.expectingConfirmationToRequest_stack = [];
		    	context.expectingConfirmationToRequestTimeStamp_stack = [];
		    	performativeHandled = true;
		    } else if (perf2.functor.is_a(this.o.getSort("perf.ack.denyrequest"))) {
		    	context.expectingConfirmationToRequest_stack = [];
		    	context.expectingConfirmationToRequestTimeStamp_stack = [];
		    	performativeHandled = true;

				let term:Term = Term.fromString("action.talk('"+this.selfID+"'[#id], perf.ack.ok('"+context.speaker+"'[#id]))", this.o);
				this.intentions.push(new IntentionRecord(term, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			} if (perf2.functor.is_a(this.o.getSort("perf.inform.answer"))) {
				// TODO: we should probably check if it's a valid answer, but for now just clear the queues
		    	context.expectingConfirmationToRequest_stack = [];
		    	context.expectingConfirmationToRequestTimeStamp_stack = [];
		    	performativeHandled = true;

		    	if (perf2.attributes.length>=2 &&
		    		perf2.attributes[1] instanceof ConstantTermAttribute) {
		    		let answer:string = (<ConstantTermAttribute>perf2.attributes[1]).value;
		    		if (answer == "no") {
						let term:Term = Term.fromString("action.talk('"+this.selfID+"'[#id], perf.ack.ok('"+context.speaker+"'[#id]))", this.o);
						this.intentions.push(new IntentionRecord(term, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
		    		}
		    	}
			}
		}

		if (!performativeHandled) {
			if (perf2.functor.name == "perf.callattention") {
				if (context.speaker != "qwerty" && context.speaker != "shrdlu" && context.speaker != "etaoin") {
					// we only confirm to the player, since otherwise, the AIs get all confused in loops some times
					this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.inform.answer('"+context.speaker+"'[#id],'yes'[symbol]))", this.o), speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
				}
			} else if (perf2.functor.name == "perf.greet") {
				if (!context.expectingGreet) {
					this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.greet('"+context.speaker+"'[#id]))", this.o), speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
				}
			} else if (perf2.functor.name == "perf.farewell") {
				if (!context.expectingFarewell) {
					this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.farewell('"+context.speaker+"'[#id]))", this.o), speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
				}
				context.inConversation = false;
			} else if (perf2.functor.name == "perf.nicetomeetyou") {
				this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.nicetomeetyoutoo('"+context.speaker+"'[#id]))", this.o), speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			} else if (perf2.functor.name == "perf.nicetomeetyoutoo") {
				// just ignore ...
			} else if (perf2.functor.name == "perf.thankyou") {
				// If the "thank you" was necessary, then respond with a "you are welcome":
				if (context.expectingThankYou) {
					newExpectingThankyou = false;
					this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.youarewelcome('"+context.speaker+"'[#id]))", this.o), speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
				}
			} else if (perf2.functor.name == "perf.youarewelcome") {
				// Do nothing
			} else if (perf2.functor.name == "perf.q.howareyou") {
				this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.inform.answer('"+context.speaker+"'[#id],'fine'[symbol]))", this.o), speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			} else if (perf2.functor.name == "perf.ack.ok") {
				// Do nothing
			} else if (perf2.functor.name == "perf.ackresponse") {
				// Do nothing
			} else if (perf2.functor.name == "perf.ack.contradict") {
				console.error("RuleBasedAI.reactToPerformative: not sure how to react to " + perf2);
			} else if (perf2.functor.name == "perf.inform") {
				let t2:Term = Term.fromString("action.memorize('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
				t2.addAttribute(perf2.attributes[1]);
				this.intentions.push(new IntentionRecord(t2, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			} else if (perf2.functor.name == "perf.inform.answer") {
				let term:Term = Term.fromString("action.talk('"+this.selfID+"'[#id], perf.inform('"+context.speaker+"'[#id], #and(#not(X:verb.ask('"+this.selfID+"'[#id], 'pronoun.anything'[pronoun.anything])), time.past(X))))", this.o);
				this.intentions.push(new IntentionRecord(term, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			} else if (perf2.functor.name == "perf.q.predicate") {
				let t2:Term = Term.fromString("action.answer.predicate('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
				for(let i:number = 1;i<perf2.attributes.length;i++) {
					t2.addAttribute(perf2.attributes[i]);
				}
				this.intentions.push(new IntentionRecord(t2, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			} else if (perf2.functor.name == "perf.q.predicate-negated") {
				let t2:Term = Term.fromString("action.answer.predicate-negated('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
				for(let i:number = 1;i<perf2.attributes.length;i++) {
					t2.addAttribute(perf2.attributes[i]);
				}
				this.intentions.push(new IntentionRecord(t2, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			} else if (perf2.functor.name == "perf.q.whereis") {
				let t2:Term = Term.fromString("action.answer.whereis('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
				for(let i:number = 1;i<perf2.attributes.length;i++) {
					t2.addAttribute(perf2.attributes[i]);
				}
				this.intentions.push(new IntentionRecord(t2, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			} else if (perf2.functor.name == "perf.q.whereto") {
				let t2:Term = Term.fromString("action.answer.whereto('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
				for(let i:number = 1;i<perf2.attributes.length;i++) {
					t2.addAttribute(perf2.attributes[i]);
				}
				this.intentions.push(new IntentionRecord(t2, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			} else if (perf2.functor.name == "perf.q.whois.name") {
				let t2:Term = Term.fromString("action.answer.whois.name('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
				for(let i:number = 1;i<perf2.attributes.length;i++) {
					t2.addAttribute(perf2.attributes[i]);
				}
				this.intentions.push(new IntentionRecord(t2, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			} else if (perf2.functor.name == "perf.q.whois.noname") {
				let t2:Term = Term.fromString("action.answer.whois.noname('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
				for(let i:number = 1;i<perf2.attributes.length;i++) {
					t2.addAttribute(perf2.attributes[i]);
				}
				this.intentions.push(new IntentionRecord(t2, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			} else if (perf2.functor.name == "perf.q.whatis.name") {
				let t2:Term = Term.fromString("action.answer.whatis.name('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
				t2.addAttribute(perf2.attributes[1]);
				this.intentions.push(new IntentionRecord(t2, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			} else if (perf2.functor.name == "perf.q.whatis.noname") {
				let t2:Term = Term.fromString("action.answer.whatis.noname('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
				t2.addAttribute(perf2.attributes[1]);
				this.intentions.push(new IntentionRecord(t2, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			} else if (perf2.functor.name == "perf.q.query") {
				let t2:Term = Term.fromString("action.answer.query('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
//				(<TermTermAttribute>t2.attributes[0]).term.addAttribute(perf2.attributes[1]);
//				(<TermTermAttribute>t2.attributes[0]).term.addAttribute(perf2.attributes[2]);
				t2.addAttribute(new TermTermAttribute(perf2));
				this.intentions.push(new IntentionRecord(t2, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			} else if (perf2.functor.name == "perf.q.query-followup") {
				let t2:Term = Term.fromString("action.answer.query-followup('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
				t2.addAttribute(perf2.attributes[1]);
				this.intentions.push(new IntentionRecord(t2, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			} else if (perf2.functor.name == "perf.q.howmany") {
				let t2:Term = Term.fromString("action.answer.howmany('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
//				(<TermTermAttribute>t2.attributes[0]).term.addAttribute(perf2.attributes[1]);
//				(<TermTermAttribute>t2.attributes[0]).term.addAttribute(perf2.attributes[2]);
				t2.addAttribute(new TermTermAttribute(perf2));
				this.intentions.push(new IntentionRecord(t2, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			} else if (perf2.functor.name == "perf.q.when") {
				let t2:Term = Term.fromString("action.answer.when('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
				for(let i:number = 1;i<perf2.attributes.length;i++) {
					t2.addAttribute(perf2.attributes[i]);
				}
				this.intentions.push(new IntentionRecord(t2, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			} else if (perf2.functor.name == "perf.q.why") {
				let t2:Term = Term.fromString("action.answer.why('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
				for(let i:number = 1;i<perf2.attributes.length;i++) {
					t2.addAttribute(perf2.attributes[i]);
				}
				this.intentions.push(new IntentionRecord(t2, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			} else if (perf2.functor.name == "perf.q.how") {
				let t2:Term = Term.fromString("action.answer.how('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
				for(let i:number = 1;i<perf2.attributes.length;i++) {
					t2.addAttribute(perf2.attributes[i]);
				}
				this.intentions.push(new IntentionRecord(t2, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			} else if (perf2.functor.name == "perf.request.action" || 
					   perf2.functor.name == "perf.q.action") {
				this.reactToRequestActionPerformative(perf2, speaker, context);
			} else if (perf2.functor.name == "perf.request.stopaction") {
				if (perf2.attributes[1] instanceof TermTermAttribute) {
					let action:Term = (<TermTermAttribute>(perf2.attributes[1])).term;
					if (perf2.attributes.length>=3 &&
						perf2.attributes[2] instanceof TermTermAttribute) {
						// this means that the action request has a variable and we need to start an inference process:
						let intention_l:Term[] = NLParser.termsInList((<TermTermAttribute>perf2.attributes[2]).term, "#and");;
						let target1Terms:Term[] = [];
						let target1Signs:boolean[] = [];
						for(let i:number = 0;i<intention_l.length;i++) {
							if (intention_l[i].functor.name == "#not") {
								target1Terms.push((<TermTermAttribute>(intention_l[i].attributes[0])).term);
								target1Signs.push(true);
							} else {
								target1Terms.push(intention_l[i]);
								target1Signs.push(false);
							}
						}

						// 2) start the inference process:
						let target1:Sentence[] = [];
						target1.push(new Sentence(target1Terms, target1Signs));
						let ir:InferenceRecord = new InferenceRecord(this, [], [target1], 1, 0, false, null, new StopAction_InferenceEffect(action), this.o);
						ir.triggeredBy = perf2;
						ir.triggeredBySpeaker = context.speaker;
						this.inferenceProcesses.push(ir);
					} else {
						if (this.stopAction(action, context.speaker)) {
							// account for the fact that maybe the request was to stop talking
							if (!this.terminateConversationAfterThisPerformative) {
								let term:Term = Term.fromString("action.talk('"+this.selfID+"'[#id], perf.ack.ok('"+context.speaker+"'[#id]))", this.o);
								this.intentions.push(new IntentionRecord(term, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
							}
						} else {
							let tmp:string = "action.talk('"+this.selfID+"'[#id], perf.ack.denyrequest('"+context.speaker+"'[#id]))";
							let term:Term = Term.fromString(tmp, this.o);
							let cause:Term = Term.fromString("#not("+action+")", this.o);
							this.intentions.push(new IntentionRecord(term, speaker, context.getNLContextPerformative(perf2), new CauseRecord(cause, null, this.time_in_seconds), this.time_in_seconds));
						}
					}
				} else {
					let tmp:string = "action.talk('"+this.selfID+"'[#id], perf.ack.denyrequest('"+context.speaker+"'[#id]))";
					let term:Term = Term.fromString(tmp, this.o);
					this.intentions.push(new IntentionRecord(term, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
				}
			} else if (perf2.functor.name == "perf.moreresults") {
				if (context.lastEnumeratedQuestion_answered != null) {
					this.reactToMoreResultsPerformative(perf2, speaker, context);
					newExpectingThankyou = true;
				} else {
					// we don't understand this question:
					let term:Term = Term.fromString("action.talk('"+this.selfID+"'[#id], perf.inform('"+context.speaker+"'[#id],#not(verb.understand('"+this.selfID+"'[#id]))))", this.o);
					this.intentions.push(new IntentionRecord(term, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
				}

			} else if (perf2.functor.name == "perf.request.repeataction") {
				if (context.lastEnumeratedQuestion_answered != null) {
					this.reactToMoreResultsPerformative(perf2, speaker, context);
					newExpectingThankyou = true;
				} else {
					if (!this.reactToRepeatActionPerformative(perf2, speaker, context)) {
						let tmp:string = "action.talk('"+this.selfID+"'[#id], perf.ack.denyrequest('"+context.speaker+"'[#id]))";
						let term:Term = Term.fromString(tmp, this.o);
						this.intentions.push(new IntentionRecord(term, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
					}
				}

			} else if (perf2.functor.name == "perf.ack.denyrequest") {
				let term:Term = Term.fromString("action.talk('"+this.selfID+"'[#id], perf.ack.ok('"+context.speaker+"'[#id]))", this.o);
				this.intentions.push(new IntentionRecord(term, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));

			} else if (perf2.functor.name == "perf.rephrase.entity" &&
					   perf2.attributes.length == 2) {
				// Find the previous performative:
				let previous:NLContextPerformative = context.lastPerformativeByExcept(context.speaker, perf2);
				if (previous == null) {
					// do not understand:
					this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.inform.parseerror('"+context.speaker+"'[#id], #not(verb.can('"+this.selfID+"'[#id], verb.understand('"+this.selfID+"'[#id], #and(S:[sentence],the(S, [singular])))))))", this.o), null, null, null, this.time_in_seconds));
				} else {
					// see if it has a single mention to an entity (other than attribute 0, which is the listener):
					let previousPerf:Term = previous.performative;
					let IDs:ConstantTermAttribute[] = [];
					for(let i:number = 1;i<previousPerf.attributes.length;i++) {
						if (previousPerf.attributes[i] instanceof ConstantTermAttribute) {
							IDs.push(<ConstantTermAttribute>(previousPerf.attributes[i]));
						} else if (previousPerf.attributes[i] instanceof TermTermAttribute) {
							NLContext.searchForIDsInClause((<TermTermAttribute>previousPerf.attributes[i]).term, IDs, this.o);
						}
					}
					console.log("IDs: " + IDs);
					if (IDs.length == 1) {
						// repeat the previous performative, but replacing the previous ID by the new ID:
						let newPerf:Term = previousPerf.clone([]);
						this.replaceID(newPerf, IDs[0], perf2.attributes[1]);
						return this.reactToPerformative(newPerf, speaker, context);
					} else {
						// do not understand:
						this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.inform.parseerror('"+context.speaker+"'[#id], #not(verb.can('"+this.selfID+"'[#id], verb.understand('"+this.selfID+"'[#id], #and(S:[sentence],the(S, [singular])))))))", this.o), null, null, null, this.time_in_seconds));
					}
				}
			} else if (perf2.functor.name == "perf.changemind") {
				console.log("RuleBasedAI.reactToPerformative: nothing to do for " + perf2);
			} else {
				console.error("RuleBasedAI.reactToPerformative: unknown performative " + perf2);
			}
		}

		// update conversation state:
		context.expectingThankYou = newExpectingThankyou;
		context.expectingYouAreWelcome = false;
		context.expectingGreet = false;
		context.expectingFarewell = false;		

		return reaction;
	}


	replaceID(t:Term, id:ConstantTermAttribute, replacement:TermAttribute)
	{
		for(let i:number = 0;i<t.attributes.length;i++) {
			if (t.attributes[i] instanceof ConstantTermAttribute) {
				if (t.attributes[i] == id) {
					t.attributes[i] = replacement;
				}
			} else if (t.attributes[i] instanceof TermTermAttribute) {
				this.replaceID((<TermTermAttribute>t.attributes[i]).term, id, replacement);
			}
		}
	}


	reactToRequestActionPerformative(perf2:Term, speaker:TermAttribute, context:NLContext) 
	{
		this.clearEpisodeTerms();

		if (perf2.attributes[1] instanceof TermTermAttribute) {
			let action:Term = (<TermTermAttribute>(perf2.attributes[1])).term;
			let needsInference:boolean = false;
			if (perf2.attributes.length == 3 &&
				perf2.attributes[2] instanceof TermTermAttribute) {
				needsInference = true;
				for(let ih of this.intentionHandlers) {
					if (ih.canHandle(action, this)) {
						if (ih.canHandleWithoutInference(perf2)) {
							needsInference = false;
							break;
						}
					}
				}

				if (needsInference) {
					// this means that the action request has a variable and we need to start an inference process:
					let intention_l:Term[] = NLParser.termsInList((<TermTermAttribute>perf2.attributes[2]).term, "#and");;
					let target1Terms:Term[] = [];
					let target1Signs:boolean[] = [];
					for(let i:number = 0;i<intention_l.length;i++) {
						if (intention_l[i].functor.name == "#not") {
							target1Terms.push((<TermTermAttribute>(intention_l[i].attributes[0])).term);
							target1Signs.push(true);
						} else {
							target1Terms.push(intention_l[i]);
							target1Signs.push(false);
						}
					}

					// 2) start the inference process:
					let target1:Sentence[] = [];
					target1.push(new Sentence(target1Terms, target1Signs));
					let ir:InferenceRecord = new InferenceRecord(this, [], [target1], 1, 0, false, null, new ExecuteAction_InferenceEffect(action), this.o);
					ir.triggeredBy = perf2;
					ir.triggeredBySpeaker = context.speaker;
					this.inferenceProcesses.push(ir);
					return;
				}
			}
			if (perf2.attributes.length == 2 ||
				(perf2.attributes.length == 3 && !needsInference)) {
				// First check if the actor is us:
				let ir:IntentionRecord = new IntentionRecord(action, new ConstantTermAttribute(context.speaker, this.cache_sort_id), context.getNLContextPerformative(perf2), null, this.time_in_seconds)
				let tmp:number = this.canSatisfyActionRequest(ir);
				if (tmp == ACTION_REQUEST_CAN_BE_SATISFIED) {
					this.intentions.push(ir);
				} else if (tmp == ACTION_REQUEST_CANNOT_BE_SATISFIED) {
					if (action.attributes.length>=1 &&
						(action.attributes[0] instanceof ConstantTermAttribute) &&
						(<ConstantTermAttribute>action.attributes[0]).value == this.selfID) {					
						let tmp:string = "action.talk('"+this.selfID+"'[#id], perf.ack.denyrequest('"+context.speaker+"'[#id]))";
						let term:Term = Term.fromString(tmp, this.o);
						this.intentions.push(new IntentionRecord(term, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
					} else {
						// The action is not for us, just say "ok" :)
						let term:Term = Term.fromString("action.talk('"+this.selfID+"'[#id], perf.ack.ok('"+context.speaker+"'[#id]))", this.o);
						this.intentions.push(new IntentionRecord(term, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));

						// If the speaker is requesting an action for herself, then record it in the memory as a "verb.want":
						let speakerID:string = null;
						if (speaker instanceof ConstantTermAttribute) speakerID = (<ConstantTermAttribute>speaker).value;
						if (action.attributes.length>=1 &&
							(action.attributes[0] instanceof ConstantTermAttribute) &&
							(<ConstantTermAttribute>action.attributes[0]).value == speakerID) {
							let term2:Term = new Term(this.o.getSort("verb.want"), [speaker, new TermTermAttribute(action)]);
							let term3:Term = Term.fromString("action.memorize('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
							term3.attributes.push(new TermTermAttribute(term2));
							this.intentions.push(new IntentionRecord(term3, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
						}						
					}
				}
			} else {
				let tmp:string = "action.talk('"+this.selfID+"'[#id], perf.ack.denyrequest('"+context.speaker+"'[#id]))";
				let term:Term = Term.fromString(tmp, this.o);
				this.intentions.push(new IntentionRecord(term, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
			}
		} else {
			let tmp:string = "action.talk('"+this.selfID+"'[#id], perf.ack.denyrequest('"+context.speaker+"'[#id]))";
			let term:Term = Term.fromString(tmp, this.o);
			this.intentions.push(new IntentionRecord(term, speaker, context.getNLContextPerformative(perf2), null, this.time_in_seconds));
		}
	}


	reactToRepeatActionPerformative(perf:Term, speaker:TermAttribute, context:NLContext) : boolean
	{
		this.clearEpisodeTerms();

		// to be handled by the classes that inherit from this one
		return false;
	}


	reactToMoreResultsPerformative(perf:Term, speaker:TermAttribute, context:NLContext)
	{		
		if (context.lastEnumeratedQuestion_next_answer_index < context.lastEnumeratedQuestion_answers.length) {
			let resultsTA:TermAttribute = null;
			if (context.lastEnumeratedQuestion_answers.length > 
				context.lastEnumeratedQuestion_next_answer_index + this.maximum_answers_to_give_at_once_for_a_query) {
				resultsTA = new ConstantTermAttribute("etcetera",this.o.getSort("etcetera"));
				for(let i:number = 0;i<this.maximum_answers_to_give_at_once_for_a_query;i++) {
					resultsTA = new TermTermAttribute(new Term(this.o.getSort("#and"),[context.lastEnumeratedQuestion_answers[context.lastEnumeratedQuestion_next_answer_index], resultsTA]));
					context.lastEnumeratedQuestion_next_answer_index++;
				}
			} else {
				for(;context.lastEnumeratedQuestion_next_answer_index<context.lastEnumeratedQuestion_answers.length ; context.lastEnumeratedQuestion_next_answer_index++) {
					if (resultsTA == null) {
						resultsTA = context.lastEnumeratedQuestion_answers[context.lastEnumeratedQuestion_next_answer_index];
					} else {
						resultsTA = new TermTermAttribute(new Term(this.o.getSort("#and"),[context.lastEnumeratedQuestion_answers[context.lastEnumeratedQuestion_next_answer_index], resultsTA]));
					}
				}
			}
			let term:Term = Term.fromString("action.talk('"+this.selfID+"'[#id], perf.inform.answer('"+context.speaker+"'[#id],"+resultsTA+"))", this.o);
			// give more answers:
			this.intentions.push(new IntentionRecord(term, speaker, context.getNLContextPerformative(perf), null, this.time_in_seconds));
//						context.lastEnumeratedQuestion_next_answer_index++;
		} else {
			// no more answers to be given:
			let term:Term = Term.fromString("action.talk('"+this.selfID+"'[#id], perf.inform.answer('"+context.speaker+"'[#id],'no-matches-found'[symbol]))", this.o);
			this.intentions.push(new IntentionRecord(term, speaker, context.getNLContextPerformative(perf), null, this.time_in_seconds));
		}
	}


	canSatisfyActionRequest(ir:IntentionRecord) : number
	{
		let actionRequest:Term = ir.action;
		let functor:Sort = actionRequest.functor;
		if (functor.name == "#and") {
			let actionRequest_l:Term[] = NLParser.termsInList(actionRequest, "#and");
			actionRequest = actionRequest_l[0];
		}

		for(let ih of this.intentionHandlers) {
			if (ih.canHandle(actionRequest, this)) return ACTION_REQUEST_CAN_BE_SATISFIED;
		}
		return ACTION_REQUEST_CANNOT_BE_SATISFIED;
	}


	stopAction(actionRequest:Term, requester:string) : boolean
	{
		if (actionRequest.functor.is_a(this.cache_sort_action_talk)) {
			if (actionRequest.attributes.length == 3 &&
				(actionRequest.attributes[1] instanceof VariableTermAttribute) &&
				(actionRequest.attributes[2] instanceof ConstantTermAttribute)) {
				let target:string = (<ConstantTermAttribute>actionRequest.attributes[2]).value;
				let context:NLContext = this.contextForSpeaker(target);
				if (context != null) this.terminateConversationAfterThisPerformative = true;
				return true;
			} else if (actionRequest.attributes.length == 1) {
				let context:NLContext = this.contextForSpeaker(requester);
				if (context != null) this.terminateConversationAfterThisPerformative = true;
				return true;
			}
		}
		return false;
	}


	reactToAnswerPerformative(perf:Term, speaker:TermAttribute, context:NLContext) : Term[]
	{
		let reaction:Term[] = [];
		let lastQuestion:NLContextPerformative = context.expectingAnswerToQuestion_stack[context.expectingAnswerToQuestion_stack.length-1];

		if (lastQuestion == null) {
			let term:Term = Term.fromString("action.talk('"+this.selfID+"'[#id], perf.inform('"+context.speaker+"'[#id], #and(#not(X:verb.ask('"+this.selfID+"'[#id], 'pronoun.anything'[pronoun.anything])), time.past(X))))", this.o);
			this.intentions.push(new IntentionRecord(term, speaker, context.getNLContextPerformative(perf), null, this.time_in_seconds));
			return reaction;						
		}

		console.log("Checking if " + perf + " is a proper answer to " + lastQuestion.performative);
		if (lastQuestion.performative.functor.is_a(this.o.getSort("perf.q.predicate"))) {
			// perf.inform.answer(LISTENER, 'yes'[#id])
			if ((perf.functor.is_a(this.o.getSort("perf.inform")) && perf.attributes.length == 2)) {
				if ((perf.attributes[1] instanceof ConstantTermAttribute)) {
					if ((<ConstantTermAttribute>(perf.attributes[1])).value == "yes") {
						let toMemorize:Term[] = this.sentenceToMemorizeFromPredicateQuestion(lastQuestion.performative, true);
						if (toMemorize == null) {
							// not a proper answer to the question
							this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.ack.invalidanswer('"+context.speaker+"'[#id]))", this.o), speaker, context.getNLContextPerformative(perf), null, this.time_in_seconds));
							context.popLastQuestion();	// remove the question, since we will ask it again
							this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], "+lastQuestion.performative+")", this.o), speaker, context.getNLContextPerformative(perf), null, this.time_in_seconds));
							return reaction;
						} else {
							for(let t of toMemorize) {
								let t2:Term = Term.fromString("action.memorize('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
								t2.addAttribute(new TermTermAttribute(t));
								this.intentions.push(new IntentionRecord(t2, speaker, context.getNLContextPerformative(perf), null, this.time_in_seconds));
							}
							context.popLastQuestion();	// remove the question, it's been answered
							return reaction;
						}
					} else if ((<ConstantTermAttribute>(perf.attributes[1])).value == "no") {
						let toMemorize:Term[] = this.sentenceToMemorizeFromPredicateQuestion(lastQuestion.performative, false);
						if (toMemorize == null) {
							this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.ack.invalidanswer('"+context.speaker+"'[#id]))", this.o), speaker, context.getNLContextPerformative(perf), null, this.time_in_seconds));
							context.popLastQuestion();	// remove the question, since we will ask it again
							this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], "+lastQuestion.performative+")", this.o), speaker, context.getNLContextPerformative(perf), null, this.time_in_seconds));
							return reaction;
						} else {
							for(let t of toMemorize) {
								let t2:Term = Term.fromString("action.memorize('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
								t2.addAttribute(new TermTermAttribute(t));
								this.intentions.push(new IntentionRecord(t2, speaker, context.getNLContextPerformative(perf), null, this.time_in_seconds));
							}							
							context.popLastQuestion();	// remove the question, it's been answered
							return reaction;
						}
					} else if ((<ConstantTermAttribute>(perf.attributes[1])).value == "unknown") {
						// nothing to do
						context.popLastQuestion();	// remove the question, it's been answered
						return [];
					} else {
						console.error("unsuported answer to perf.q.predicate " + perf);
						return null;
					}
				} else {
					let toMemorize:Term[] = this.sentenceToMemorizeFromPredicateQuestionWithInformAnswer(lastQuestion.performative, perf);
					if (toMemorize == null) {
						this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.ack.invalidanswer('"+context.speaker+"'[#id]))", this.o), speaker, context.getNLContextPerformative(perf), null, this.time_in_seconds));
						context.popLastQuestion();	// remove the question, since we will ask it again
						this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], "+lastQuestion.performative+")", this.o), speaker, context.getNLContextPerformative(perf), null, this.time_in_seconds));
						return reaction;
					} else {
						for(let t of toMemorize) {
							let t2:Term = Term.fromString("action.memorize('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
							t2.addAttribute(new TermTermAttribute(t));
							this.intentions.push(new IntentionRecord(t2, speaker, context.getNLContextPerformative(perf), null, this.time_in_seconds));
						}
						context.popLastQuestion();	// remove the question, it's been answered
						return reaction;
					}
				}
			} else {
				console.error("unsuported answer to perf.q.predicate " + perf);
				return null;
			}

		} else if (lastQuestion.performative.functor.is_a(this.o.getSort("perf.q.query"))) {
			if (perf.functor.is_a(this.o.getSort("perf.inform"))) {
				let toMemorize:Term[] = this.sentenceToMemorizeFromQueryQuestion(lastQuestion.performative, perf);
				console.log("toMemorize: " + toMemorize);
				if (toMemorize == null) {
					this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], perf.ack.invalidanswer('"+context.speaker+"'[#id]))", this.o), speaker, context.getNLContextPerformative(perf), null, this.time_in_seconds));
					context.popLastQuestion();	// remove the question, since we will ask it again
					this.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+this.selfID+"'[#id], "+lastQuestion.performative+")", this.o), speaker, context.getNLContextPerformative(perf), null, this.time_in_seconds));
					return reaction;
				} else {
					for(let t of toMemorize) {
						let t2:Term = Term.fromString("action.memorize('"+this.selfID+"'[#id], '"+context.speaker+"'[#id])", this.o);
						t2.addAttribute(new TermTermAttribute(t));
						this.intentions.push(new IntentionRecord(t2, speaker, context.getNLContextPerformative(perf), null, this.time_in_seconds));
					}
					context.popLastQuestion();	// remove the question, it's been answered
					return reaction;
				}
			} else {
				console.error("unsuported answer to perf.q.query " + perf);
				return null;
			}

		} else if (lastQuestion.performative.functor.is_a(this.o.getSort("perf.q.action"))) {
			if ((perf.functor.is_a(this.o.getSort("perf.inform")) && perf.attributes.length == 2) ||
				(perf.functor.is_a(this.o.getSort("perf.inform.answer")) && perf.attributes.length == 3)) {

				if (perf.attributes.length == 3) {
					let answerPredicate:TermAttribute = perf.attributes[2];
					let questionPredicate:TermAttribute = lastQuestion.performative.attributes[1];

					console.log("  - answerPredicate: " + answerPredicate);
					console.log("  - questionPredicate: " + questionPredicate);

					if (!(answerPredicate instanceof TermTermAttribute) ||
						!(questionPredicate instanceof TermTermAttribute)) {
						console.log("predicates are not terms!!");
						return null;
					}

					let ap_term:Term = (<TermTermAttribute>answerPredicate).term;
					let qp_term:Term = (<TermTermAttribute>questionPredicate).term;
					if (ap_term.equalsNoBindings(qp_term) != 1) {
						console.log("predicates do not match!!");
						return null;
					}
				}

				if ((perf.attributes[1] instanceof ConstantTermAttribute)) {
					if ((<ConstantTermAttribute>(perf.attributes[1])).value == "yes") {
						// ...
						context.popLastQuestion();	// remove the question, it's been answered
						return [];
					} else if ((<ConstantTermAttribute>(perf.attributes[1])).value == "no") {
						// ...
						context.popLastQuestion();	// remove the question, it's been answered
						return [];
					} else if ((<ConstantTermAttribute>(perf.attributes[1])).value == "unknown") {
						// ...
						context.popLastQuestion();	// remove the question, it's been answered
						return [];
					} else {
						console.error("unsuported answer to perf.q.action " + perf);
						return null;
					}
				} else {
					console.error("unsuported answer to perf.q.action " + perf);
					return null;
				}
			} else if (perf.functor.is_a(this.o.getSort("perf.ack.ok"))) {
				// ...
				context.popLastQuestion();	// remove the question, it's been answered
				return [];
			} else {
				console.error("unsuported answer to perf.q.action " + perf);
				return null;
			}

		} else {
			console.error("answers to questions of type " + lastQuestion.performative.functor + " not yet supported...");
			return null;
		}
	}


	sentenceToMemorizeFromPredicateQuestion(predicateQuestion:Term, answer:boolean) : Term[]
	{
//		console.log("sentenceToMemorizeFromPredicateQuestion.predicateQuestion: " + predicateQuestion);
//		console.log("sentenceToMemorizeFromPredicateQuestion.answer: " + answer);
		if (!(predicateQuestion.attributes[1] instanceof TermTermAttribute)) return [];
		let queryTerm:Term = (<TermTermAttribute>(predicateQuestion.attributes[1])).term;
		// if there are variables, that means there was a query involved, so, we don't know how to do it:
		if (queryTerm.getAllVariables().length != 0) return [];

		let queryTerms:TermAttribute[] = NLParser.elementsInList(queryTerm,"#and");

		if (answer) {
			// we need to memorize each term:
			let toMemorize_l:Term[] = [];
			for(let qt of queryTerms) {
				if (qt instanceof TermTermAttribute) {
					toMemorize_l.push((<TermTermAttribute>qt).term);
				}
			}
			return toMemorize_l;
		} else {
			// one of them is wrong!
			let toMemorize:Term = new Term(this.o.getSort("#not"), [queryTerms[0]]);
			for(let i:number = 1;i<queryTerms.length;i++) {
				toMemorize = new Term(this.o.getSort("#and"), 
										[new TermTermAttribute(toMemorize),
										 new TermTermAttribute(new Term(this.o.getSort("#not"), 
										 								[queryTerms[i]]))]);
			}
			return [toMemorize];
		}

		return [];
	}


	sentenceToMemorizeFromPredicateQuestionWithInformAnswer(predicateQuestion:Term, answerPerformative:Term) : Term[]
	{
		let answerTerm:TermAttribute = answerPerformative.attributes[1];
		if ((answerTerm instanceof TermTermAttribute) &&
			(<TermTermAttribute>answerTerm).term.functor.name == "proper-noun") {
			answerTerm = (<TermTermAttribute>answerTerm).term.attributes[0];
		}

		if (!(predicateQuestion.attributes[1] instanceof TermTermAttribute)) return [];
		let queryTerm:TermAttribute = predicateQuestion.attributes[1];
		let queryTerms:TermAttribute[] = NLParser.elementsInList((<TermTermAttribute>queryTerm).term,"#and");	
		if (!(queryTerms[0] instanceof TermTermAttribute)) return [];
		let mainQueryTerm:Term = (<TermTermAttribute>(queryTerms[0])).term;
		if (mainQueryTerm.functor.name == "verb.remember" ||
			mainQueryTerm.functor.name == "verb.know") {
			// in this case, it's basically a query in disguise:
//			console.error("sentenceToMemorizeFromPredicateQuestionWithInformAnswer: predicateQuestion = " + predicateQuestion);
//			console.error("sentenceToMemorizeFromPredicateQuestionWithInformAnswer: answerPerformative = " + answerPerformative);

			// replace the query term by the hidden one inside:
			if (!(mainQueryTerm.attributes[1] instanceof TermTermAttribute)) return null;
			queryTerm = mainQueryTerm.attributes[1];
			queryTerms = NLParser.elementsInList((<TermTermAttribute>queryTerm).term,"#and");
			if (!(queryTerms[0] instanceof TermTermAttribute)) return null;
			if (!(queryTerms[1] instanceof TermTermAttribute)) return null;
			if (queryTerms.length != 2) return null;
			let queryVariable:TermAttribute = queryTerms[0];
			if (!(queryVariable instanceof TermTermAttribute) ||
				(<TermTermAttribute>queryVariable).term.functor.name != "#query") return null;
			queryVariable = (<TermTermAttribute>queryVariable).term.attributes[0];
			queryTerm = queryTerms[1];

			if (answerTerm instanceof VariableTermAttribute) {
				if (answerTerm.sort.name == "unknown") return [];
				return null;
			} else if (answerTerm instanceof ConstantTermAttribute) {
				// direct answer:
//				console.log("sentenceToMemorizeFromPredicateQuestionWithInformAnswer: direct answer!");
//				console.log("sentenceToMemorizeFromPredicateQuestionWithInformAnswer: unify term 1: " + queryVariable);
//				console.log("sentenceToMemorizeFromPredicateQuestionWithInformAnswer: unify term 2: " + answerTerm);
				let bindings2:Bindings = new Bindings();
				if (Term.unifyAttribute(queryVariable, answerTerm, true, bindings2)) {
					let tmp:TermAttribute = queryTerm.applyBindings(bindings2);
					if (!(tmp instanceof TermTermAttribute)) return null;
					return [(<TermTermAttribute>tmp).term];
				}
				return null;
			} else {
				// indirect answer:
//				console.log("sentenceToMemorizeFromPredicateQuestionWithInformAnswer: indirect answer!");
//				console.log("sentenceToMemorizeFromPredicateQuestionWithInformAnswer: unify term 1: " + queryTerm);
//				console.log("sentenceToMemorizeFromPredicateQuestionWithInformAnswer: unify term 2: " + answerTerm);
				let bindings2:Bindings = new Bindings();
				if (Term.unifyAttribute(queryTerm, answerTerm, true, bindings2)) {
					let tmp:TermAttribute = queryTerm.applyBindings(bindings2);
					if (!(tmp instanceof TermTermAttribute)) return null;
					return [(<TermTermAttribute>tmp).term];
				}
				return null;
			}
		} else {
			return null;
		}
	}


	sentenceToMemorizeFromQueryQuestion(queryPerformative:Term, answerPerformative:Term) : Term[]
	{
		let queryVariable:TermAttribute = queryPerformative.attributes[1];
		let queryTerm:TermAttribute = queryPerformative.attributes[2];
		let answerTerm:TermAttribute = answerPerformative.attributes[1];

		if ((answerTerm instanceof TermTermAttribute) &&
			(<TermTermAttribute>answerTerm).term.functor.name == "proper-noun") {
			answerTerm = (<TermTermAttribute>answerTerm).term.attributes[0];
		}

		if (answerTerm instanceof VariableTermAttribute) {
			if (answerTerm.sort.name == "unknown") return [];
			return null;
		} else if (answerTerm instanceof ConstantTermAttribute) {
			// direct answer:
//			console.log("sentenceToMemorizeFromQueryQuestion: direct answer!");
//			console.log("sentenceToMemorizeFromQueryQuestion: unify term 1: " + queryVariable);
//			console.log("sentenceToMemorizeFromQueryQuestion: unify term 2: " + answerTerm);
			let bindings2:Bindings = new Bindings();
			if (Term.unifyAttribute(queryVariable, answerTerm, true, bindings2)) {
				let tmp:TermAttribute = queryTerm.applyBindings(bindings2);
				if (!(tmp instanceof TermTermAttribute)) return null;
				return [(<TermTermAttribute>tmp).term];
			}
			return null;
		} else {
			// indirect answer:
//			console.log("sentenceToMemorizeFromQueryQuestion: indirect answer!");
//			console.log("sentenceToMemorizeFromQueryQuestion: unify term 1: " + queryTerm);
//			console.log("sentenceToMemorizeFromQueryQuestion: unify term 2: " + answerTerm);
			let bindings2:Bindings = new Bindings();
			if (Term.unifyAttribute(queryTerm, answerTerm, true, bindings2)) {
				let tmp:TermAttribute = queryTerm.applyBindings(bindings2);
				if (!(tmp instanceof TermTermAttribute)) return null;
				return [(<TermTermAttribute>tmp).term];
			}
			return null;
		}
	}


	talkingToUs(context:NLContext, speaker:string, performative:Term) : boolean
	{
		// the "targetList" is a structure of the form #and(T1, #and(t2, ... #and(Tn-1,Tn)...) if there is more than one target
		let targetList:TermAttribute = null;
		let targetIDList:string[] = [];
		if (performative != null) {
			targetList = performative.attributes[0];
			while(targetList instanceof TermTermAttribute) {
				if (targetList.term.functor.name == "#and" &&
					targetList.term.attributes[0] instanceof ConstantTermAttribute) {
					targetIDList.push((<ConstantTermAttribute>targetList.term.attributes[0]).value);
					targetList = targetList.term.attributes[1];
				} else {
					break;
				}
			}
			if (targetList instanceof ConstantTermAttribute) targetIDList.push((<ConstantTermAttribute>targetList).value);

			for(let targetID of targetIDList) {
				if (targetID == this.selfID) {
					context.lastPerformativeInvolvingThisCharacterWasToUs = true;
					return true;
				} else {
					// talking to someone else, so we are now not talking to that someone else:
					let context2:NLContext = this.contextForSpeakerWithoutCreatingANewOne(targetID);
					if (context2 != null) {
						context2.lastPerformativeInvolvingThisCharacterWasToUs = false;
						context2.inConversation = false;
					}
				}
			}

			if (targetIDList.length > 0) {
				// not talking to us!
				context.lastPerformativeInvolvingThisCharacterWasToUs = false;
				context.inConversation = false;
				for(let targetID of targetIDList) {
					let context2:NLContext = this.contextForSpeakerWithoutCreatingANewOne(targetID);
					if (context2 != null) {
						context2.inConversation = false;
						context2.lastPerformativeInvolvingThisCharacterWasToUs = false;
					}
				}
				return false;
			}
		}

		if (context.performatives.length>0 &&
			(this.time_in_seconds - context.performatives[0].timeStamp) >= CONVERSATION_TIMEOUT) return false;
		if (context.lastPerformativeInvolvingThisCharacterWasToUs) return true;
		if (context.inConversation) return true;

		return false;
	}


	inferenceUpdate()
	{
//	    DEBUG_resolution = true;

		// select which inference process to continue in this cycle:
		// pick the inference that generates the maximum anxiety:
		let max_anxiety_inference:InferenceRecord = null;
		for(let i:number = 0;i<this.inferenceProcesses.length;i++) {
			// increment anxiety of inferences:
			this.inferenceProcesses[i].anxiety += this.inferenceProcesses[i].priority;

			if (max_anxiety_inference == null ||
				this.inferenceProcesses[i].anxiety > max_anxiety_inference.anxiety) {
				max_anxiety_inference = this.inferenceProcesses[i];
			}
		}

		if (max_anxiety_inference != null) {
			let idx:number = max_anxiety_inference.completedInferences.length;
			if (idx >= max_anxiety_inference.inferences.length) {
				// inference is over!
				this.inferenceProcesses.splice(this.inferenceProcesses.indexOf(max_anxiety_inference),1);
				if (max_anxiety_inference.effect != null) {
					max_anxiety_inference.effect.execute(max_anxiety_inference, this);
				}

				// after we have answered everything the player wanted, check to see if we had any questions in the stack:
				if (this.inferenceProcesses.length == 0) {
					for(let context of this.contexts) {
						if (context.expectingAnswerToQuestionTimeStamp_stack.length > 0) {
							let idx:number = context.expectingAnswerToQuestionTimeStamp_stack.length - 1;
							if (this.time_in_seconds - context.expectingAnswerToQuestionTimeStamp_stack[idx] > this.questionPatienceTimmer) {
								// We have waited for an answer too long, ask the question again:
								if (this.canHear(context.speaker)) this.reaskTheLastQuestion(context);
							}
						}
					}
				}

			} else {
				if (max_anxiety_inference.findAllAnswers) {
					if (max_anxiety_inference.inferences[idx].stepAccumulatingResults()) {
						max_anxiety_inference.completedInferences.push(max_anxiety_inference.inferences[idx]);
					}
				} else {
					if (max_anxiety_inference.inferences[idx].step()) {
						max_anxiety_inference.completedInferences.push(max_anxiety_inference.inferences[idx]);
					}
				}
			}
		}
	}


	contextForSpeaker(speaker:string) : NLContext
	{
		if (this.selfID == speaker) console.error("trying to get a context to talk to self!!");

		for(let c of this.contexts) {
			if (c.speaker == speaker) return c;
		}
		let context:NLContext = new NLContext(speaker, this, MENTION_MEMORY_SIZE);
		this.contexts.push(context);
		return context;		
	}


	contextForSpeakerWithoutCreatingANewOne(speaker:string) : NLContext
	{
		for(let c of this.contexts) {
			if (c.speaker == speaker) return c;
		}
		return null;
	}


	executeIntentions()
	{
		if (this.intentions.length == 0 &&
			this.inferenceProcesses.length == 0 &&
			this.queuedIntentions.length > 0) {
			this.intentions = this.queuedIntentions;
			this.queuedIntentions = [];
		}

		let toDelete:IntentionRecord[] = [];
		for(let intention of this.intentions) {
			let ret:boolean = this.executeIntention(intention);

			if (ret == null) {
				// this means that although we can execute the intetion, it cannot be executed right now, so, we need to wait:
				continue;
			}

			if (!ret) console.error("Unsuported intention: " + intention.action);
			toDelete.push(intention);
		}
		for(let t of toDelete) {
			this.intentions.splice(this.intentions.indexOf(t), 1);
		}
	}


	executeIntention(ir:IntentionRecord) : boolean
	{
		let intention:Term = ir.action;
		for(let ih of this.intentionHandlers) {
			if (ih.canHandle(intention, this)) {
				return ih.execute(ir, this);
			}
		}

		return false;
	}


	queueIntention(intention:Term, requester:TermAttribute, reqperformative:NLContextPerformative)
	{
		this.queuedIntentions.push(new IntentionRecord(intention, requester, reqperformative, null, this.time_in_seconds));
	}


	queueIntentionRecord(ir:IntentionRecord)
	{
		if (this.queuedIntentions.indexOf(ir) == -1) {
			this.queuedIntentions.push(ir);
		}
	}


	canSee(characterID:string)
	{
		return true;
	}
	

	canHear(characterID:string)
	{
		return true;
	}


	conversationUpdate()
	{
		for(let context of this.contexts) {
			if (context.expectingAnswerToQuestionTimeStamp_stack.length > 0) {
//				console.log("context.expectingAnswerToQuestion_stack.length: " + context.expectingAnswerToQuestion_stack.length + 
//						    "\ncontext.expectingAnswerToQuestionTimeStamp_stack: " + context.expectingAnswerToQuestionTimeStamp_stack);
				let idx:number = context.expectingAnswerToQuestionTimeStamp_stack.length - 1;
				if (this.time_in_seconds - context.expectingAnswerToQuestionTimeStamp_stack[idx] > this.questionPatienceTimmer) {
					// We have waited for an answer too long, ask the question again:
					if (this.canHear(context.speaker)) this.reaskTheLastQuestion(context);
				}
			}
		}
	}


	reaskTheLastQuestion(context:NLContext)
	{
		let idx:number = context.expectingAnswerToQuestionTimeStamp_stack.length - 1;
		let performative:NLContextPerformative = context.expectingAnswerToQuestion_stack[idx];
//		console.log("context.expectingAnswerToQuestionTimeStamp_stack (before): " + context.expectingAnswerToQuestionTimeStamp_stack);
		context.popLastQuestion();
//		console.log("context.expectingAnswerToQuestionTimeStamp_stack (after): " + context.expectingAnswerToQuestionTimeStamp_stack);

		// re-add the intention:
		if (!context.inConversation) {
			// we are not having a conversation at this point, so, we need to restart it:
			let term:Term = Term.fromString("action.talk('"+this.selfID+"'[#id], perf.callattention('"+context.speaker+"'[#id]))",this.o);
			this.intentions.push(new IntentionRecord(term, null, null, null, this.time_in_seconds));
		}

		let term2:Term = new Term(this.o.getSort("action.talk"), 
								 [new ConstantTermAttribute(this.selfID, this.o.getSort("#id")), 
								  new TermTermAttribute(performative.performative)]);
		this.intentions.push(new IntentionRecord(term2, null, null, null, this.time_in_seconds));
	}


	/*
	- checks if "q" unifies with any term in the short or long term memory, and returns the bindings
	*/
	noInferenceQuery(q:Term, o:Ontology) : Bindings
	{
		// short term memory:
		let tmp:[Term, Bindings] = this.shortTermMemory.firstMatch(q);
//		console.log("noInferenceQuery, stm: " + q + " -> " + tmp);
		if (tmp!=null) return tmp[1];

		// long term memory:
		let s:Sentence = this.longTermMemory.firstSingleTermMatch(q.functor, q.attributes.length, o);
		while(s != null) {
			let b:Bindings = new Bindings();
			if (q.unify(s.terms[0], OCCURS_CHECK, b)) {
				return b;
			}
			s = this.longTermMemory.nextSingleTermMatch();
		}

		return null;
	}


	noInferenceQueryValue(q:Term, o:Ontology, variableName:string) : TermAttribute
	{
		let b:Bindings = this.noInferenceQuery(q, o);
//		console.log("noInferenceQueryValue b = " + b);
		if (b == null) return null;
		for(let tmp of b.l) {
			if (tmp[0].name == variableName) return tmp[1];
		}
		return null;
	}


	/*
	sentenceContainsSpatialRelations(s:Sentence) : boolean
	{
		for(let t of s.terms) {
			if (this.termContainsSpatialRelations(t)) return true;
		}
		return false;
	}


	termContainsSpatialRelations(t:Term) : boolean
	{
		if (t.functor.is_a(this.o.getSort("spatial-relation"))) return true;
		for(let att of t.attributes) {
			if (att instanceof TermTermAttribute) {
				if (this.termContainsSpatialRelations((<TermTermAttribute>att).term)) return true;
			}
		}
		return false;
	}
	*/


	checkSpatialRelation(relation:Sort, o1ID:string, o2ID:string, referenceObject:string) : boolean
	{
		return null;
	}


	processSuperlatives(results:InferenceNode[], superlative:Sentence)
	{
		return results;
	}


	spatialRelations(o1ID:string, o2ID:string) : Sort[]
	{
		/*
		// just return what we know (this function will never be used in SHRDLU anyway, it's only for testing):
		let relations:Sort[] = [];
		let sr_sort:Sort = this.o.getSort("spatial-relation");
		for(let te of this.shortTermMemory.plainTermList) {
			let t:Term = te.term;
			if (t.functor.is_a(sr_sort) && t.attributes.length == 2 &&
				(t.attributes[0] instanceof ConstantTermAttribute) &&
				(t.attributes[1] instanceof ConstantTermAttribute) &&
				(<ConstantTermAttribute>t.attributes[0]).value == o1ID &&
				(<ConstantTermAttribute>t.attributes[1]).value == o2ID) {
				relations.push(t.functor);
			}
		}
		return relations;
		*/
		return null;
	}


	recalculateCharacterAges()
	{
		for(let se of this.longTermMemory.plainSentenceList) {
			let s:Sentence = se.sentence;
			if (s.terms.length == 1 && s.sign[0] &&
				s.terms[0].functor.name == "property.born" &&
				s.terms[0].attributes[0] instanceof ConstantTermAttribute) {
				let birthday:number = se.time;
				let bd_year:number = getCurrentYear(birthday);
				let bd_month:number = getCurrentMonth(birthday);
				let bd_day:number = getCurrentDayOfTheMonth(birthday);
				let current_year:number = getCurrentYear(this.time_in_seconds);
				let current_month:number = getCurrentMonth(this.time_in_seconds);
				let current_day:number = getCurrentDayOfTheMonth(this.time_in_seconds);
				let age_in_years:number = current_year - bd_year;
				if (current_month < bd_month ||
					(current_month == bd_month && current_day < bd_day)) age_in_years--;
				this.longTermMemory.addStateSentenceIfNew(new Sentence([Term.fromString("property.age("+s.terms[0].attributes[0]+",'"+age_in_years+"'[time.year])",this.o)],
																	   [true]), 
														  se.provenance, 1, se.time);
			}
		}
	}


	mostSpecificMatchesFromShortOrLongTermMemoryThatCanBeRendered(query:Term) : Term[]
	{
		let mostSpecificTypes:Term[] = [];
		
		for(let match_bindings of this.shortTermMemory.allMatches(query)) {
			let t:Term = match_bindings[0];
			// if we don't know how to render this, then ignore:
			let msType:Sort = this.mostSpecificTypeThatCanBeRendered(t.functor);
			if (msType == null) continue;
			t = t.clone([]);
			t.functor = msType;

			let isMoreSpecific:boolean = true;
			let toDelete:Term[] = [];
			for(let previous of mostSpecificTypes) {
				if (t.functor.subsumes(previous.functor)) {
					isMoreSpecific = false;
				} else if (previous.functor.subsumes(t.functor)) {
					toDelete.push(previous);
				}
			}
			for(let previous of toDelete) {
				mostSpecificTypes.splice(mostSpecificTypes.indexOf(previous),1);
			}
			if (isMoreSpecific) mostSpecificTypes.push(t);
		}

		for(let match of this.longTermMemory.allSingleTermMatches(query.functor, query.attributes.length, this.o)) {
			let t:Term = match.terms[0];
			if (query.unify(t, OCCURS_CHECK, new Bindings())) {
				// if we don't know how to render this, then ignore:
				let msType:Sort = this.mostSpecificTypeThatCanBeRendered(t.functor);
				if (msType == null) continue;
				t = t.clone([]);
				t.functor = msType;

				let isMoreSpecific:boolean = true;
				let toDelete:Term[] = [];
				for(let previous of mostSpecificTypes) {
					if (t.functor.subsumes(previous.functor)) {
						isMoreSpecific = false;
					} else if (previous.functor.subsumes(t.functor)) {
						toDelete.push(previous);
					}
				}
				for(let previous of toDelete) {
					mostSpecificTypes.splice(mostSpecificTypes.indexOf(previous),1);
				}
				if (isMoreSpecific) mostSpecificTypes.push(t);
			}
		}
		return mostSpecificTypes;
	}


	mostSpecificTypeThatCanBeRendered(typeSort:Sort) 
	{
		let typeString:string = this.naturalLanguageParser.posParser.getTypeString(typeSort, 0);
		if (typeString == null) {
			let typeSort_l:Sort[] = typeSort.getAncestors();
			for(let ts of typeSort_l) {
				typeString = this.naturalLanguageParser.posParser.getTypeString(ts, 0);
				if (typeString != null) {
					typeSort = ts;
					break;
				}
			}
		}
		return typeSort;
	}	


	restoreFromXML(xml:Element)
	{
		this.time_in_seconds = Number(xml.getAttribute("timeInSeconds"));
		this.questionPatienceTimmer = Number(xml.getAttribute("questionPatienceTimmer"));

		let stm_xml = getFirstElementChildByTag(xml, "shortTermMemory");
		if (stm_xml != null) {
			this.shortTermMemory = new TermContainer();
			for(let term_xml of getElementChildrenByTag(stm_xml, "term")) {
				let a:number = Number(term_xml.getAttribute("activation"));
				let p:string = term_xml.getAttribute("provenance");
				let t:Term = Term.fromString(term_xml.getAttribute("term"), this.o);
				let time:number = Number(term_xml.getAttribute("time"));
				if (a != null && t != null) this.shortTermMemory.addTerm(t, p, a, time);
			}
			for(let term_xml of getElementChildrenByTag(stm_xml, "previousTerm")) {
				let a:number = Number(term_xml.getAttribute("activation"));
				let p:string = term_xml.getAttribute("provenance");
				let t:Term = Term.fromString(term_xml.getAttribute("term"), this.o);
				let time:number = Number(term_xml.getAttribute("time"));
				if (a != null && t != null) this.shortTermMemory.plainPreviousTermList.push(new TermEntry(t, p, a, time));
			}
		}

		let ltm_xml = getFirstElementChildByTag(xml, "longTermMemory");
		if (ltm_xml != null) {
//			this.longTermMemory = new SentenceContainer();
			this.loadLongTermRulesFromXML(ltm_xml);
		}

		this.currentEpisodeTerms = [];
		let currentEpisodeTerm_xmls:Element[] = getElementChildrenByTag(xml, "currentEpisodeTerm");
		for(let currentEpisodeTerm_xml of currentEpisodeTerm_xmls) {
			this.currentEpisodeTerms.push(currentEpisodeTerm_xml.getAttribute("text"));
		}

		// context:
		let context_xmls:Element[] = getElementChildrenByTag(xml, "context");
		for(let context_xml of context_xmls) {
			this.contexts.push(NLContext.fromXML(context_xml, this.o, this, MENTION_MEMORY_SIZE));
		}

		// intentions:
		this.intentions = [];
		for(let intention_xml of getElementChildrenByTag(xml, "IntentionRecord")) {
			let intention:IntentionRecord = IntentionRecord.fromXML(intention_xml, this, this.o);
			this.intentions.push(intention);
		}
		this.queuedIntentions = [];
		let queuedIntentions_xml:Element = getFirstElementChildByTag(xml, "queuedIntentions");
		if (queuedIntentions_xml != null) {
			for(let intention_xml of getElementChildrenByTag(queuedIntentions_xml, "IntentionRecord")) {
				let intention:IntentionRecord = IntentionRecord.fromXML(intention_xml, this, this.o);
				this.queueIntentionRecord(intention);
			}
		}
		this.intentionsCausedByRequest = [];
		let intentionsCausedByRequest_xml:Element = getFirstElementChildByTag(xml, "intentionsCausedByRequest");
		if (intentionsCausedByRequest_xml != null) {
			for(let intention_xml of getElementChildrenByTag(intentionsCausedByRequest_xml, "IntentionRecord")) {
				let intention:IntentionRecord = IntentionRecord.fromXML(intention_xml, this, this.o);
				this.intentionsCausedByRequest.push(intention);
			}
		}

		// inference:
		let inference_xml:Element = getFirstElementChildByTag(xml, "inference");
		if (inference_xml != null) {
			this.inferenceProcesses = [];
			for(let ir_xml of getElementChildrenByTag(inference_xml, "InferenceRecord")) {
				let ir:InferenceRecord = InferenceRecord.fromXML(ir_xml, this.o, this);
				if (ir != null) this.inferenceProcesses.push(ir);
			}
		}
	}


	saveToXML() : string
	{
		let str:string = "<RuleBasedAI timeInSeconds=\""+this.time_in_seconds+"\" "+
									  "questionPatienceTimmer=\""+this.questionPatienceTimmer+"\">\n";

		str += "<shortTermMemory>\n";
		for(let te of this.shortTermMemory.plainTermList) {
			str += "<term activation=\""+te.activation+"\" " + 
						 "provenance=\""+te.provenance+"\" " +
						 "term=\""+te.term.toStringXML()+"\" " +
						 "time=\""+te.time+"\"/>\n";
		}
		for(let te of this.shortTermMemory.plainPreviousTermList) {
			str += "<previousTerm activation=\""+te.activation+"\" " + 
						 "provenance=\""+te.provenance+"\" " +
						 "term=\""+te.term.toStringXML()+"\" " +
						 "time=\""+te.time+"\"/>\n";
		}
		str += "</shortTermMemory>\n";

		str += "<longTermMemory>\n";

		for(let se of this.longTermMemory.previousSentencesWithNoCurrentSentence) {
			if (se.provenance != BACKGROUND_PROVENANCE &&
				se.provenance != ONTOLOGY_PROVENANCE &&
				se.provenance != LOCATIONS_PROVENANCE) {
				str += "<previousSentence activation=\""+se.activation+"\" " +
					   "provenance=\""+se.provenance+"\" " +
					   "sentence=\""+se.sentence.toStringXML()+"\" "+
					   "time=\""+se.time+"\" "+
					   "timeEnd=\""+se.timeEnd+"\"/>\n";
			}
		}
		for(let se of this.longTermMemory.plainSentenceList) {
			if (se.provenance != BACKGROUND_PROVENANCE &&
				se.provenance != ONTOLOGY_PROVENANCE &&
				se.provenance != LOCATIONS_PROVENANCE) {
				str += this.saveSentenceEntryToXML(se, false);
			}
		}
		str += "</longTermMemory>\n";

		for(let et of this.currentEpisodeTerms) {
			str += "<currentEpisodeTerm str=\""+et+"\">\n";
		}

		for(let t of this.intentions) {
			str += t.saveToXML(this);
		}
		if (this.queuedIntentions.length > 0) {
			str += "<queuedIntentions>\n";
			for(let t of this.queuedIntentions) {
				str += t.saveToXML(this);
			}
			str += "</queuedIntentions>\n";
		}
		if (this.intentionsCausedByRequest.length > 0) {
			str += "<intentionsCausedByRequest>\n";
			for(let t of this.intentionsCausedByRequest) {
				str += t.saveToXML(this);
			}
			str += "</intentionsCausedByRequest>\n";
		}

		str += "<inference>\n";
		for(let ip of this.inferenceProcesses) {
			str += ip.saveToXML(this) + "\n";
		}
		str += "</inference>\n";

		for(let context of this.contexts) {
			str += context.saveToXML()  + "\n";
		}

        str += this.savePropertiesToXML() + "\n";

		
		str += "</RuleBasedAI>";

		return str;
	}


	saveSentenceEntryToXML(se:SentenceEntry, previous:boolean) : string
	{
		let str:string = "";
		if (se.previousInTime == null) {
			str += "<"+(previous ? "previousSentence":"sentence")+" activation=\""+se.activation+"\" " +
				   "provenance=\""+se.provenance+"\" " +
				   "sentence=\""+se.sentence.toStringXML()+"\" "+
				   "time=\""+se.time+"\"/>\n";
		} else {
			str += "<"+(previous ? "previousSentence":"sentence")+" activation=\""+se.activation+"\" " +
				   "provenance=\""+se.provenance+"\" " +
				   "sentence=\""+se.sentence.toStringXML()+"\" "+
				   "time=\""+se.time+"\">\n";
			str += this.saveSentenceEntryToXML(se.previousInTime, true);
			str += "</"+(previous ? "previousSentence":"sentence")+">\n"
		}
		return str;
	}


	// this function is the one that will be extended by the subclasses to add additional info
	savePropertiesToXML() : string
	{
		return "";
	}


	static translateOntologyToSentences(o:Ontology) : Sentence[]
	{
		let sentences:Sentence[] = []

		// In principle, all of these are needed for having a complete infernece process, but they make things very slow.
		// So, instead, I have a special case where I use functor subsumption instead of equality in case one of the two
		// sentences in resolution just has one term, and only generate a few necessary ones (those for relations):
		/*
		for(let s of o.getAllSorts()) {
			if (s.name[0] == "#" || s.name[0] == "~" || s.name[0] == "=") continue;
			if (s.is_a_string("grammar-concept")) continue;
			if (s.is_a_string("performative")) continue;
			if (!s.is_a_string("relation")) continue;
			for(let parent of s.parents) {
				// This is a hack to filter out rules that I know cause troubles, in reality, I should just use regular FOL inference...
				if (parent.name == "any") continue;	// no need to go all the way there :)
				if (parent.name == "relation") continue;	// no need to go all the way there :)
				if (parent.name == "spatial-relation") continue;	// no need to go all the way there :)
				if (parent.name == "relation-with-value") continue;	// no need to go all the way there :)
				if (parent.name == "space") continue;	// no need to go all the way there :)
				if (parent.name == "time") continue;	// no need to go all the way there :)
				if (parent.name == "distance") continue;	// no need to go all the way there :)
				if (parent.name == "abstract-entity") continue;	// no need to go all the way there :)
				if (parent.name == "#stateSort") continue;	// no need to go all the way there :)
				if (parent.name == "symmetric-relation") continue;	// no need to go all the way there :)
				if (parent.name == "measuring-unit") continue;	// no need to go all the way there :)
				
				if (s.is_a_string("relation")) {
					let sentence:Sentence = Sentence.fromString("~" + s + "(X, Y);"+parent+"(X, Y)", o);
					sentences.push(sentence);
					console.log("    ontology sentence: " + sentence);
				} else {
					let sentence:Sentence = Sentence.fromString("~" + s + "(X);"+parent+"(X)", o);
					sentences.push(sentence);
					console.log("    ontology sentence: " + sentence);
				}
			}
		}
		*/

		return sentences;
	}


	time_in_seconds:number = 0;
	questionPatienceTimmer:number = 1200;
	maximum_answers_to_give_at_once_for_a_query:number = 3;
	predicatesToStoreInLongTermMemory:Sort[] = [];

	o:Ontology = null;
	naturalLanguageParser:NLParser = null;
	inferenceEffectFactory:InferenceEffectFactory = null;

	perceptionFrequency:number = 10;
	perceptionFrequencyOffset:number = 0;
	perceptionMemoryTime:number = 120;

    selfID:string = "self";
	perceptionBuffer:Term[] = [];
	shortTermMemory:TermContainer = new TermContainer();
	longTermMemory:SentenceContainer = new SentenceContainer();

	intentionHandlers:IntentionAction[] = [];

	intentions:IntentionRecord[] = [];	// [intention, requester] (in case the action in the intention was requested by some other character)
	queuedIntentions:IntentionRecord[] = [];	// these will become intentions only when intentions == [] and inferenceProcesses == []
									// the use of this is to queue things to do after the AI has finished doing the current set of things
	intentionsCausedByRequest:IntentionRecord[] = [];	// we store the intention records for which there is a cause, for answering later "why" questions

	inferenceProcesses:InferenceRecord[] = [];	// list of the current inferences the AI is trying to perform


	contexts:NLContext[] = [];	// contexts for natural language processing (one per entity we speak to)
	terminateConversationAfterThisPerformative:boolean = false;

	currentEpisodeTerms:string[] = [];	// Terms that are to be remembered or the current "episode" (i.e., while the AI is executing an action),
										// but that will be erased when a new action is started.
										// This is a hack, but it is to avoid having to have the concept of "immediate past" and "far past",
										// since parsince those from text would be hard. 
										// To illustrate the problem, consider this interaction:
										// - Shrdlu, go north
										// - There is an obstacle here.
										// - go south.
										// - Ok.
										// - did you collide with something?
										// The expected answer is "no", but it would say "yes", as it collided with something in the first command.
										// So, we add the "collided-with" type of knowledge to the episode terms, and we clear them after each episode.

	// Sort cache for perception:
	cache_sort_name:Sort = null;
	cache_sort_space_at:Sort = null;
	cache_sort_time_current:Sort = null;
	cache_sort_number:Sort = null;
	cache_sort_symbol:Sort = null;
	cache_sort_id:Sort = null;
	cache_sort_map:Sort = null;
	cache_sort_intention:Sort = null;
	cache_sort_action_talk:Sort = null;
	cache_sort_performative:Sort = null;
	cache_sort_property:Sort = null;
	cache_sort_property_with_value:Sort = null;
	cache_sort_relation_with_value:Sort = null;
	cache_sort_object:Sort = null;
	cache_sort_space_location:Sort = null;
	cache_sort_relation:Sort = null;
	cache_sort_verb_have:Sort = null;
	cache_sort_verb_contains:Sort = null;
	cache_sort_stateSort:Sort = null;
	cache_sort_action_follow:Sort = null;
}
