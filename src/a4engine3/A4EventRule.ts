var A4_EVENT_USE :number = 0
var A4_EVENT_PICKUP	:number = 1
var A4_EVENT_ACTIVATE :number = 2
var A4_EVENT_DEACTIVATE :number = 3
var A4_EVENT_DROP :number = 4
var A4_EVENT_EQUIP :number = 5
var A4_EVENT_UNEQUIP :number = 6
var A4_EVENT_OPEN :number = 7
var A4_EVENT_CLOSE :number = 8
var A4_EVENT_PUSH :number = 9
var A4_EVENT_TIMER :number = 10
var A4_EVENT_RECEIVE :number = 11
var A4_EVENT_INTERACT :number = 12
var A4_EVENT_START :number = 13
var A4_EVENT_END :number = 14
var A4_EVENT_STORYSTATE :number = 15

var A4_EVENT_ACTION_TAKE :number = 16
var A4_EVENT_ACTION_DROP :number = 17
var A4_EVENT_ACTION_DROP_GOLD :number = 18
var A4_EVENT_ACTION_USE :number = 19
var A4_EVENT_ACTION_EQUIP :number = 20
var A4_EVENT_ACTION_UNEQUIP :number = 21
var A4_EVENT_ACTION_INTERACT :number = 22
var A4_EVENT_ACTION_TALK :number = 23
var A4_EVENT_ACTION_GIVE :number = 24
var A4_EVENT_ACTION_SELL :number = 25
var A4_EVENT_ACTION_BUY :number = 26
var A4_EVENT_ACTION_CHOP :number = 27
var	A4_NEVENTS :number = 28

var A4_STORYSTATE_GAME :number = 0
var A4_STORYSTATE_MAP :number = 1
var A4_STORYSTATE_OBJECT :number = 2

class A4EventRule {
    constructor(event:number, script:A4Script, once:boolean, time:number, period:number)
    {
        this.event = event;
        this.time = time;
        this.period = period;
        this.once = once;
        if (script != null) this.effects.push(script);
    }

    static fromXML(xml:Element) : A4EventRule
    {
        var r:A4EventRule = new A4EventRule(0, null, true, 0, 0);
        var event_name:string = xml.getAttribute("event");
        if (event_name == null) {
            console.error("A4EventRule: no event in rule!");
            return null;
        } else {
            if (event_name == "use") {
                r.event = A4_EVENT_USE;
            } else if (event_name == "pickup") {
                r.event = A4_EVENT_PICKUP;
            } else if (event_name == "activate") {
                r.event = A4_EVENT_ACTIVATE;
            } else if (event_name == "deactivate") {
                r.event = A4_EVENT_DEACTIVATE;
            } else if (event_name == "drop") {
                r.event = A4_EVENT_DROP;
            } else if (event_name == "open") {
                r.event = A4_EVENT_OPEN;
            } else if (event_name == "close") {
                r.event = A4_EVENT_CLOSE;
            } else if (event_name == "push") {
                r.event = A4_EVENT_PUSH;
            } else if (event_name == "timer") {
                r.event = A4_EVENT_TIMER;
                r.time = Number(xml.getAttribute("time"));
                if (xml.getAttribute("period")!=null) {
                    r.period = Number(xml.getAttribute("period"));
                } else {
                    r.period = 0;
                }
            } else if (event_name == "receive") {
                r.event = A4_EVENT_RECEIVE;
                r.item = xml.getAttribute("item");
            } else if (event_name == "interact") {
                r.event = A4_EVENT_INTERACT;
            } else if (event_name == "start") {
                r.event = A4_EVENT_START;
            } else if (event_name == "end") {
                r.event = A4_EVENT_END;
            } else if (event_name == "story_state") {
                var scope_name:string = xml.getAttribute("scope");
                if (scope_name!=null) {
                    // it's a story state rule:
                    r.event = A4_EVENT_STORYSTATE;
                    if (scope_name == "game") r.ss_scope = A4_STORYSTATE_GAME;
                    else if (scope_name == "map") r.ss_scope = A4_STORYSTATE_MAP;
                    else if (scope_name == "character") r.ss_scope = A4_STORYSTATE_OBJECT;
                    else if (scope_name == "object") r.ss_scope = A4_STORYSTATE_OBJECT;
                    else {
                        console.error("A4EventRule: unrecognized scope '%s" + scope_name + "'");
                        return null;
                    }
                    r.variable = xml.getAttribute("variable");
                    r.value = xml.getAttribute("value");
                } else {
                    console.error("A4EventRule: no scope in story state rule!");
                    return null;
                }
            } else if (event_name == "action_take") {
                r.event = A4_EVENT_ACTION_TAKE;
                r.item = xml.getAttribute("item");
            } else if (event_name == "action_drop") {
                r.event = A4_EVENT_ACTION_DROP;
                r.item = xml.getAttribute("item");
            } else if (event_name == "action_drop_gold") {
                r.event = A4_EVENT_ACTION_DROP_GOLD;
            } else if (event_name == "action_use") {
                r.event = A4_EVENT_ACTION_USE;
                r.item = xml.getAttribute("item");
            } else if (event_name == "action_equip") {
                r.event = A4_EVENT_ACTION_EQUIP;
                r.item = xml.getAttribute("item");
            } else if (event_name == "action_unequip") {
                r.event = A4_EVENT_ACTION_UNEQUIP;
                r.item = xml.getAttribute("item");
            } else if (event_name == "action_interact") {
                r.event = A4_EVENT_ACTION_INTERACT;
                r.item = xml.getAttribute("item");
                /*
            } else if (event_name == "action_talk") {
                r.event = A4_EVENT_ACTION_TALK;
                var tmp:string = xml.getAttribute("performative");
                var found:boolean = false;
                for(let i:number = 0;i<talkPerformativeNames.length;i++) {
                    if (tmp == talkPerformativeNames[i]) {
                        r.performative = i;
                        found = true;
                        break;
                    }
                }
                if (!found) console.error("Talk performative "+tmp+" not found when creating event rule for event action_talk!");
                if (xml.getAttribute("angry") == "true") {
                    r.angry = 1;
                } else {
                    r.angry = 0;
                }
                */
            } else if (event_name == "action_give") {
                r.event = A4_EVENT_ACTION_GIVE;
                r.item = xml.getAttribute("item");
                r.character = xml.getAttribute("character");
            } else if (event_name == "action_sell") {
                r.event = A4_EVENT_ACTION_SELL;
                r.item = xml.getAttribute("item");
                r.character = xml.getAttribute("character");
            } else if (event_name == "action_buy") {
                r.event = A4_EVENT_ACTION_BUY;
                r.item = xml.getAttribute("item");
                r.character = xml.getAttribute("character");
            } else if (event_name == "action_chop") {
                r.event = A4_EVENT_ACTION_CHOP;
                r.item = xml.getAttribute("item");
            } else {
                console.error("A4EventRule: event not recognized '" + event_name + "'");
                return null;
            }
        }

        r.once = false;
        if (xml.getAttribute("once") == "true") r.once = true;

//        var script_xml_l:NodeListOf<Element> = xml.children;
        var script_xml_l:HTMLCollection = xml.children;
        for(let i:number = 0;i<script_xml_l.length;i++) {
            r.effects.push(A4Script.fromXML(script_xml_l[i]));
        }
        
        return r;
    }

    
    static fromA4EventRule(rule:A4EventRule) : A4EventRule
    {
        var r:A4EventRule = new A4EventRule(rule.event, null, rule.once, rule.time, rule.period);
        r.startTime = rule.startTime;
        r.executed = rule.executed;
        r.variable = rule.variable;
        r.value = rule.value;
        r.item = rule.item;
        r.character = rule.character;
        r.hit = rule.hit;
        r.angry = rule.angry;
        r.performative = rule.performative;
        for(let s of rule.effects) {
            r.effects.push(A4Script.fromA4Script(s));
        }
        return r;
    }
    

    saveToXML() : string
    {
        var xmlString:string = "";
        if (this.once && this.executed) return xmlString;   // it has already been executed, so, no need to save it!
        
        // event rules:
        xmlString += "<eventRule";
        if (this.event==A4_EVENT_USE) xmlString += " event=\"use\"";
        if (this.event==A4_EVENT_PICKUP) xmlString += " event=\"pickup\"";

        if (this.event==A4_EVENT_ACTIVATE) xmlString += " event=\"activate\"";
        if (this.event==A4_EVENT_DEACTIVATE) xmlString += " event=\"deactivate\"";
        if (this.event==A4_EVENT_DROP) xmlString += " event=\"drop\"";
        if (this.event==A4_EVENT_EQUIP) xmlString += " event=\"equip\"";
        if (this.event==A4_EVENT_UNEQUIP) xmlString += " event=\"unequip\"";
        if (this.event==A4_EVENT_OPEN) xmlString += " event=\"open\"";
        if (this.event==A4_EVENT_CLOSE) xmlString += " event=\"close\"";
        if (this.event==A4_EVENT_PUSH) xmlString += " event=\"push\"";
        if (this.event==A4_EVENT_TIMER) {
            xmlString += " event=\"timer\"";
            xmlString += " time=\""+this.time+"\"";
            if (this.period!=0) xmlString += " period=\""+this.period+"\"";
        }
        if (this.event==A4_EVENT_INTERACT) xmlString += " event=\"interact\"";
        if (this.event==A4_EVENT_RECEIVE) {
            xmlString += " event=\"receive\"";
            if (this.item!=null) xmlString += " item=\""+this.item+"\"";
        }
        if (this.event==A4_EVENT_START) xmlString += " event=\"start\"";
        if (this.event==A4_EVENT_END) xmlString += " event=\"end\"";

        if (this.event==A4_EVENT_STORYSTATE) {
            // story state rule:
            xmlString += " event=\"story_state\"";
            if (this.ss_scope==A4_STORYSTATE_GAME) xmlString += " scope=\"game\"";
            if (this.ss_scope==A4_STORYSTATE_MAP) xmlString += " scope=\"map\"";
            if (this.ss_scope==A4_STORYSTATE_OBJECT) xmlString += " scope=\"object\"";
            xmlString += " variable=\""+this.variable+"\"";
            xmlString += " value=\""+this.value+"\"";
        }

        if (this.event==A4_EVENT_ACTION_TAKE) {
            xmlString += " event=\"action_take\"";
            if (this.item!=null) xmlString += " item=\""+this.item+"\"";
        }
        if (this.event==A4_EVENT_ACTION_DROP) {
            xmlString += " event=\"action_drop\"";
            if (this.item!=null) xmlString += " item=\""+this.item+"\"";
        }
        if (this.event==A4_EVENT_ACTION_DROP_GOLD) xmlString += " event=\"action_drop_gold\"";
        if (this.event==A4_EVENT_ACTION_USE) {
            xmlString += " event=\"action_use\"";
            if (this.item!=null) xmlString += " item=\""+this.item+"\"";
        }
        if (this.event==A4_EVENT_ACTION_EQUIP) {
            xmlString += " event=\"action_equip\"";
            if (this.item!=null) xmlString += " item=\""+this.item+"\"";
        }
        if (this.event==A4_EVENT_ACTION_UNEQUIP) {
            xmlString += " event=\"action_unequip\"";
            if (this.item!=null) xmlString += " item=\""+this.item+"\"";
        }
        if (this.event==A4_EVENT_ACTION_INTERACT) {
            xmlString += " event=\"action_interact\"";
            if (this.item!=null) xmlString += " item=\""+this.item+"\"";
        }                
        /*
        if (this.event==A4_EVENT_ACTION_TALK) {
            xmlString += " event=\"action_talk\"";
            if (this.performative==A4_TALK_PERFORMATIVE_HI) xmlString += " performative=\"hi\"";
            if (this.performative==A4_TALK_PERFORMATIVE_BYE) xmlString += " performative=\"bye\"";
            if (this.performative==A4_TALK_PERFORMATIVE_ASK) xmlString += " performative=\"ask\"";
            if (this.performative==A4_TALK_PERFORMATIVE_INFORM) xmlString += " performative=\"inform\"";
            if (this.performative==A4_TALK_PERFORMATIVE_TRADE) xmlString += " performative=\"trade\"";
            if (this.performative==A4_TALK_PERFORMATIVE_END_TRADE) xmlString += " performative=\"endtrade\"";
            if (this.angry==0) xmlString += " angry=\"false\"";
            if (this.angry==1) xmlString += " angry=\"true\"";
        }
        */
        if (this.event==A4_EVENT_ACTION_GIVE) {
            xmlString += " event=\"action_give\"";
            if (this.item!=null) xmlString += " item=\""+this.item+"\"";
            if (this.character!=null) xmlString += " character=\""+this.character+"\"";
        }
        if (this.event==A4_EVENT_ACTION_SELL) {
            xmlString += " event=\"action_sell\"";
            if (this.item!=null) xmlString += " item=\""+this.item+"\"";
            if (this.character!=null) xmlString += " character=\""+this.character+"\"";
        }
        if (this.event==A4_EVENT_ACTION_BUY) {
            xmlString += " event=\"action_buy\"";
            if (this.item!=null) xmlString += " item=\""+this.item+"\"";
            if (this.character!=null) xmlString += " character=\""+this.character+"\"";
        }
        if (this.event==A4_EVENT_ACTION_CHOP) {
            xmlString += " event=\"action_chop\"";
            if (this.item!=null) xmlString += " item=\""+this.item+"\"";
        }
        if (this.once) xmlString += " once=\"true\"";
        xmlString += ">\n";

        for(let s of this.effects) {
            xmlString += s.saveToXML() + "\n";
        }        
        xmlString += "</eventRule>";
        return xmlString;
    }    


    addScript(s:A4Script)
    {
        this.effects.push(s);
    }
    

	executeEffects(o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
    {
        if (this.once && this.executed) return SCRIPT_FINISHED;
        this.executed = true;
        var retValue:number = SCRIPT_FINISHED;
        var seq:A4ScriptExecutionQueue = null;
        for(let s of this.effects) {
            if (seq == null) {
                s.reset();
                retValue = s.execute(o, map, game, otherCharacter);
                if (retValue == SCRIPT_FINISHED) {
                    // good, do nothing
                } else if (retValue == SCRIPT_NOT_FINISHED) {
                    // script needs more time, create an script queue
                    seq = new A4ScriptExecutionQueue(o, map, game, otherCharacter);
                    seq.scripts.push(A4Script.fromA4Script(s));
                    if (o!=null) {
                        o.addScriptQueue(seq);
                    } else if (map!=null) {
                        map.addScriptQueue(seq);
                    } else {
                        game.addScriptQueue(seq);
                    }
                } else {
                    // failed, stop the script
                    break;
                }
            } else {
                s.reset();
                seq.scripts.push(A4Script.fromA4Script(s));
            }
        }
        return retValue;
    }


	execute(o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
    {
        if (this.once && this.executed) return SCRIPT_FINISHED;
        
        // check if the condition is met first:
        switch(this.event) {
            case A4_EVENT_TIMER:
                {
                    if (this.startTime<0) this.startTime = game.cycle;
                    var t:number = game.cycle - this.startTime;
                    if (this.period!=0) {
                        if ((t%this.period) == this.time) return this.executeEffects(o, map, game, otherCharacter);
                    } else {
                        if (t == this.time) return this.executeEffects(o, map, game, otherCharacter);
                    }
                }
                break;
            case A4_EVENT_STORYSTATE:
                switch(this.ss_scope) {
                    case A4_STORYSTATE_GAME:
                        if (game.lastTimeStoryStateChanged>this.lastTimeGameStoryStateChanged) {
                            this.lastTimeGameStoryStateChanged = game.cycle;
                            if (game.getStoryStateVariable(this.variable) == this.value) {
//                                console.log("Executing effect for game story state " + this.variable + " == " + this.value + "...");
                                return this.executeEffects(o, map, game, otherCharacter);
                            }
                        }
                        break;
                    case A4_STORYSTATE_MAP:
                        if (map.lastTimeStoryStateChanged>this.lastTimeMapStoryStateChanged) {
                            this.lastTimeMapStoryStateChanged = game.cycle;
                            if (map.getStoryStateVariable(this.variable) == this.value) {
                                return this.executeEffects(o, map, game, otherCharacter);
                            }
                        }
                        break;
                    case A4_STORYSTATE_OBJECT:
                        if (o.lastTimeStoryStateChanged>this.lastTimeObjectStoryStateChecked) {
//                            console.log("object story state check 1 ("+o.ID+"): " + o.lastTimeStoryStateChanged + " > " + this.lastTimeObjectStoryStateChecked);
//                            console.log("object story state check 1 ("+o.ID+"): " + this.variable + " == " + this.value + " (" + o.getStoryStateVariable(this.variable) + ")");
                            this.lastTimeObjectStoryStateChecked = game.cycle;
                            if (o.getStoryStateVariable(this.variable) == this.value) {
//                                console.log("object story state rule triggered: " + o.lastTimeStoryStateChanged + " > " + this.lastTimeObjectStoryStateChecked);
                                return this.executeEffects(o, map, game, otherCharacter);
                            }
                        }
                        break;
                }
                break;
        }
        return SCRIPT_FINISHED;
    }
    

    event:number;
    time:number;
    period:number;
    startTime = -1;
    ss_scope:number;
    variable:string = null;
    value:string = null;
    once:boolean;
    executed:boolean = false;
    effects:A4Script[] = [];
    item:string = null;
    character:string = null;
    hit:number = -1;
    angry:number = -1;
    performative:number = -1;

    lastTimeGameStoryStateChanged:number = -1;
    lastTimeMapStoryStateChanged:number = -1;
    lastTimeObjectStoryStateChecked:number = -1;
}
