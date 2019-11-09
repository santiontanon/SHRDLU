class AgendaEntry {
    time: number;
    scripts: A4Script[] = [];

    static fromXML(xml: Element): AgendaEntry
    {
        let ae:AgendaEntry = new AgendaEntry();
        
        ae.time = Number(xml.getAttribute("time"));
        for(let i:number = 0;i<xml.children.length;i++) {
            let script_xml:Element = xml.children[i];
            ae.scripts.push(A4Script.fromXML(script_xml));
        }         

        return ae;
    }


    static fromAgendaEntry(ae: AgendaEntry): AgendaEntry
    {
        let ae2:AgendaEntry = new AgendaEntry();

        ae2.time = ae.time;
        for(let s of ae.scripts) {
            ae2.scripts.push(A4Script.fromA4Script(s));
        }

        return ae2;
    }
    

    execute(o: A4Object, map: A4Map, game: A4Game, otherCharacter: A4Character):number
    {
        let retValue:number = SCRIPT_FINISHED;
        let seq : A4ScriptExecutionQueue = null;
        for(let s of this.scripts) {
            if (seq == null) {
                s.reset();
                retValue = s.execute(o, map, game, otherCharacter);
                if (retValue == SCRIPT_FINISHED) {
                    // good, do nothing
                } else if (retValue == SCRIPT_NOT_FINISHED) {
                    // script needs more time, create an script queue
                    seq = new A4ScriptExecutionQueue(o, map, game, otherCharacter);
                    seq.scripts.push(A4Script.fromA4Script(s));
                    if (o != null ) {
                        o.addScriptQueue(seq);
                    } else if (map != null) {
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
}


class Agenda {
    constructor()
    {

    }


    static fromXML(xml:Element) : Agenda
    {
        let a:Agenda = new Agenda();
        a.name = xml.getAttribute("agenda");
        a.duration = Number(xml.getAttribute("duration"));
        a.cycle = 0;
        if (xml.getAttribute("cycle")!=null)
            a.cycle = Number(xml.getAttribute("cycle"));

        a.loop = false;
        if (xml.getAttribute("loop") == "true") a.loop = true;

        a.absoluteTime = false;
        if (xml.getAttribute("absoluteTime") == "true") a.absoluteTime = true;
        
        for(let i:number = 0;i<xml.children.length;i++) {
            a.entries.push(AgendaEntry.fromXML(xml.children[i]));
        }
        a.absoluteStartCycle = -1;

        return a;
    }


    static fromAgenda(a:Agenda) : Agenda
    {
        let a2:Agenda = new Agenda();

        a2.name = a.name;
        a2.duration = a.duration;
        a2.loop = a.loop;
        a2.absoluteTime = a.absoluteTime;
        a2.cycle = 0;
        for(let e of a.entries) {
            a2.entries.push(AgendaEntry.fromAgendaEntry(e));
        }
        a2.absoluteStartCycle = -1;
        return a2;
    }


    execute(o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : boolean
    {
        if (this.absoluteTime) {
            if (this.absoluteStartCycle<0) this.absoluteStartCycle = game.cycle;
            this.cycle = game.cycle - this.absoluteStartCycle;
        }
        for(let ae of this.entries) {
            if (ae.time == (this.cycle%this.duration)) {
                // execute entry!
                ae.execute(o,map,game,otherCharacter);
            }
        }
        if (!this.absoluteTime) this.cycle++;
        if (this.cycle>=this.duration && !this.loop) {
            if (!this.loop) return true;
        }
        return false;
    }

    name:string;
    duration:number;
    loop:boolean;
    absoluteTime:boolean;
    absoluteStartCycle:number;
    cycle:number;
    entries:AgendaEntry[] = [];    
}

