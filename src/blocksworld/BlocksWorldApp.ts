/*

Note (santi):
- This is a recreation of the original SHRDLU system by Terry Winograd using the NLP engine used for my game SHRDLU

- todo:
    ***- Be able to pass on all the results of inference to the action handler, and not just the first. In case the first cannot be taken, but some of the others can!
    ***- If I say "pick up a pyramid", and then "put it on the table". It does not know how to disambiguate "it", since the specific pyramid was never on any performative! Add it!
    - planning for requests that require more than one action (I need a planner that can return a causal representation of the plan, to answer questions about it)
    - collect SHRDLU transcripts (one here: http://hci.stanford.edu/~winograd/shrdlu/). Are there more somewhere else?
        - here there are test sentences (some of them quite complex!): http://boole.stanford.edu/lingol/trysh.test
    - go through the collected SHRDLU transcripts, and make sure I can recreate all the conversations SHRDLU had
    - integrate it with the game as a bonus
*/

var STATE_ACCEPTING_INPUT:number = 0
var STATE_SHRDLU_ACTING:number = 1

var N_MESSAGES_IN_HUD:number = 15
var MAX_MESSAGE_LENGTH:number = 84

var DEFAULT_game_path:string = "data";


class BlocksWorldApp {
    constructor(a_dx:number, a_dy:number) {
        this.state = STATE_SHRDLU_ACTING;    // let SHRDLU update its perception at the start
        this.previous_state = this.state;
        this.state_cycle = 0;

        this.screen_width = a_dx;
        this.screen_height = a_dy;

        this.ontology = new Ontology();
        Sort.clear();
        let xmlhttp:XMLHttpRequest = new XMLHttpRequest();
        xmlhttp.overrideMimeType("text/xml");
        xmlhttp.open("GET", "data/shrdluontology.xml", false); 
        xmlhttp.send();
        this.ontology.loadSortsFromXML(xmlhttp.responseXML.documentElement);

        // create the natural language parser:
        xmlhttp = new XMLHttpRequest();
        xmlhttp.overrideMimeType("text/xml");
        xmlhttp.open("GET", "data/nlpatternrules.xml", false); 
        xmlhttp.send();
        this.naturalLanguageParser = NLParser.fromXML(xmlhttp.responseXML.documentElement, this.ontology);
        this.naturalLanguageGenerator = new NLGenerator(this.ontology, this.naturalLanguageParser.posParser);

        this.world = new ShrdluBlocksWorld();
        this.shrdlu = new BlocksWorldRuleBasedAI(this.ontology, this.naturalLanguageParser, this.naturalLanguageGenerator,
                                                 this.world, this, 1, 0, DEFAULT_QUESTION_PATIENCE_TIMER,
                                                 ["data/blocksworld-kb.xml"]);

        this.addMessageWithColorTime("Welcome to SHRDLU!", MSX_COLOR_GREY, this.time);
        this.addMessageWithColorTime("This is a recreation of the original SHRDLU system by Terry Winograd using the NLP", MSX_COLOR_GREY, this.time);
        this.addMessageWithColorTime("engine used by the SHRDLU game.", MSX_COLOR_GREY, this.time);
        this.addMessageWithColorTime("(Check https://github.com/santiontanon/SHRDLU for more info about the game)", MSX_COLOR_GREY, this.time);
        this.addMessageWithColorTime("(Check http://hci.stanford.edu/~winograd/shrdlu/ for more info about the original system)", MSX_COLOR_GREY, this.time);

        console.log("ClassicShrdluApp created.");
    }


    cycle(mouse_x:number, mouse_y:number, k:KeyboardState) : boolean
    {
        try{
            let old_state:number = this.state;
          
            if (this.state_cycle == 0) console.log("First Cycle started for state " + this.state + "...");

            switch(this.state) {
            case STATE_ACCEPTING_INPUT: this.state = this.input_cycle(k);
                                        break;
            case STATE_SHRDLU_ACTING:   this.state = this.acting_cycle(k);
                                        break;
            default:
                    return false;
            }

            if (old_state == this.state) {
                this.state_cycle++;
            } else {
                this.state_cycle=0;
                console.log("State change: " + old_state + " -> " + this.state);
            } 

            this.previous_state = old_state;
        } catch(e) {
            console.error(e);
        }

        this.time++;

        return true;
    }


    draw(SCREEN_WIDTH:number, SCREEEN_HEIGHT:number)
    {
        this.screen_width = SCREEN_WIDTH;
        this.screen_height = SCREEEN_HEIGHT;

        // If no CYCLE has been executed for this state, do not redraw:
        if (this.state_cycle==0) return;

        try {
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, this.screen_width, this.screen_height);

            let tileSize:number = (this.screen_height/48);
            let split:number = Math.floor(tileSize*32);

            this.world.draw(0, 0,  this.screen_width, split);

            this.draw_messages(split, true);

            // when any of the AIs is thinking:
            if (this.state == STATE_SHRDLU_ACTING && (this.time%32) < 16) {
                if (this.shrdlu.inferenceProcesses.length > 0) {
                    // etaoin is thinking:
                    ctx.fillStyle = MSX_COLOR_BLACK;
                    ctx.fillRect(0, 0, 130*PIXEL_SIZE, 10*PIXEL_SIZE);
                    ctx.fillStyle = MSX_COLOR_WHITE;
                    ctx.fillText("Shrdlu is thinking...", 0, 0);
                }
            }            
        } catch(e) {
            console.error(e);
        }
    }


    input_cycle(k:KeyboardState) : number
    {   
        for(let ke of k.keyevents) this.textInputEvent(ke);

        if (k.key_press(KEY_CODE_RETURN)) {
            if (this.textInputSubmit()) {
                return STATE_SHRDLU_ACTING;
            }
        }

        return STATE_ACCEPTING_INPUT;
    }


    acting_cycle(k:KeyboardState) : number
    {   
        for(let ke of k.keyevents) this.textInputEvent(ke);

        this.shrdlu.update(this.time);

        if (this.shrdlu.isIdle()) {
            return STATE_ACCEPTING_INPUT;
        } else {
            return STATE_SHRDLU_ACTING;
        }
    }


    draw_messages(split:number, inputState:boolean) 
    {
        ctx.fillStyle = "black";
        ctx.fillRect(0,split+PIXEL_SIZE,this.screen_width,(this.screen_height-split));

        // messages:
        let x:number = 0;
        let y:number = split;

        let start:number = 0;
        if (this.console_first_message==-1) {
            start = this.messages.length - N_MESSAGES_IN_HUD;
        } else {
            start = this.console_first_message;
        }
        if (start<0) start = 0;

        ctx.fillStyle = "white";
        ctx.font = fontFamily16px;
        ctx.textBaseline = "top"; 
        ctx.textAlign = "left";
        for(let i:number = 0;i<N_MESSAGES_IN_HUD && start+i<this.messages.length;i++) {
            ctx.fillStyle = this.messages[start+i][1];
            ctx.fillText(this.messages[start+i][0], x, y);
            y+=8*PIXEL_SIZE;
        }            

        if (inputState) {
            // draw cursor:
            if ((this.time%30)<15) {
                if (this.state == STATE_ACCEPTING_INPUT) {
                    ctx.fillStyle = MSX_COLOR_DARK_GREEN;
                } else {
                    ctx.fillStyle = MSX_COLOR_DARK_RED;
                }
                ctx.fillRect((this.text_input_cursor+2)*6*PIXEL_SIZE,y,
                             6*PIXEL_SIZE,8*PIXEL_SIZE);
            }
            ctx.fillStyle = MSX_COLOR_LIGHT_GREEN;
            ctx.fillText("> " + this.text_input_buffer,0,y);
        }
    }



    textInputSubmit()
    {
        if (this.text_input_buffer != "") {

            this.shrdlu.perceiveTextInput("user", this.text_input_buffer, this.time);

            this.addMessageWithColorTime("> " + this.text_input_buffer, MSX_COLOR_DARK_GREEN, this.time);

            this.input_buffer_history.push(this.text_input_buffer);
            this.last_input_buffer_before_browsing_history = null;
            this.input_buffer_history_position = -1;
            this.text_input_buffer = "";
            this.text_input_cursor = 0;
            return true;
        }
        return false;
    }


    textInputEvent(e:KeyboardEvent)
    {
        let textInputLimit:number = 83;

//        console.log("key: " + e.key + ", keyCode:" + e.keyCode + ", modifiers: " + e.getModifierState("Shift") + " | " + e.getModifierState("CapsLock"));
        if (e.key.length == 1 && this.text_input_buffer.length <= textInputLimit) {
            if ((e.key >= 'a' && e.key <= 'z') ||
                (e.key >= 'A' && e.key <= 'Z') ||
                (e.key >= '0' && e.key <= '9') ||
                e.key == ' ' ||
                e.key == ',' ||
                e.key == '.' ||
                e.key == '\'' ||
                e.key == '?' ||
                e.key == '!' ||
                e.key == '-' ||
                // just for entering logic:
                e.key == '#' ||
                e.key == ':' ||
                e.key == '(' ||
                e.key == ')' ||
                e.key == '[' ||
                e.key == ']'
                ) {
                if (this.text_input_cursor == this.text_input_buffer.length) {
                    this.text_input_buffer += e.key;
                    this.text_input_cursor ++;
                } else {
                    this.text_input_buffer = this.text_input_buffer.substring(0,this.text_input_cursor) +
                                                  e.key +
                                                  this.text_input_buffer.substring(this.text_input_cursor);
                    this.text_input_cursor ++;
                }
            }
        } else if (e.key == "ArrowRight") {
            if (this.text_input_cursor<this.text_input_buffer.length) this.text_input_cursor++;
        } else if (e.key == "ArrowLeft") {
            if (this.text_input_cursor>0) this.text_input_cursor--;
        } else if (e.key == "ArrowUp") {
            if (this.input_buffer_history_position == -1) {
                this.last_input_buffer_before_browsing_history = this.text_input_buffer;
                if (this.input_buffer_history.length > 0) {
                    this.input_buffer_history_position = this.input_buffer_history.length-1;
                    this.text_input_buffer = this.input_buffer_history[this.input_buffer_history_position];
                    this.text_input_cursor = this.text_input_buffer.length;
                }
            } else {
                if (this.input_buffer_history_position>0) {
                    this.input_buffer_history_position--;
                    this.text_input_buffer = this.input_buffer_history[this.input_buffer_history_position];
                    this.text_input_cursor = this.text_input_buffer.length;
                }
            }
        } else if (e.key == "ArrowDown") {
            if (this.input_buffer_history_position>=0 && this.input_buffer_history_position<this.input_buffer_history.length-1) {
                this.input_buffer_history_position++;
                this.text_input_buffer = this.input_buffer_history[this.input_buffer_history_position];
                this.text_input_cursor = this.text_input_buffer.length;
            } else {
                if (this.input_buffer_history_position>=0 && this.input_buffer_history_position == this.input_buffer_history.length-1) {
                    this.text_input_buffer = this.last_input_buffer_before_browsing_history;
                    this.last_input_buffer_before_browsing_history = null;
                    this.input_buffer_history_position = -1;
                    this.text_input_cursor = this.text_input_buffer.length;
                }
            }
        } else if (e.key == "Backspace") {
            if (this.text_input_cursor>0) {
                if (this.text_input_cursor == this.text_input_buffer.length) {
                    this.text_input_cursor--;
                    this.text_input_buffer = this.text_input_buffer.substring(0,this.text_input_cursor);
                } else {
                    this.text_input_cursor--;
                    this.text_input_buffer = this.text_input_buffer.substring(0,this.text_input_cursor) +
                                                  this.text_input_buffer.substring(this.text_input_cursor+1);
                }                
            }
        } else if (e.key == "Delete") {
            if (this.text_input_cursor < this.text_input_buffer.length) {
                this.text_input_buffer = this.text_input_buffer.substring(0,this.text_input_cursor) +
                                              this.text_input_buffer.substring(this.text_input_cursor+1);
            }                
        }
        if (this.text_input_cursor > textInputLimit) {
            this.text_input_cursor = textInputLimit;
        }
    }


    addMessageWithColorTime(text:string, color:string, timeStamp:number)
    {
        // split longer messages into different lines:
        let buffer:string = "";
        let last_space:number = 0;

        for(let i:number=0;i<text.length;i++) {
            buffer += text.charAt(i);
            if (text.charAt(i)==' ') last_space = i;
            if (buffer.length>=MAX_MESSAGE_LENGTH) {
                if (last_space==0) {
                    // a single word doesn't fit, just split it!
                    this.messages.push([buffer,color,""+timeStamp]);
                    buffer = "";
                } else {
                    let backspaces:number = i - last_space;
                    let tmp:string = buffer.substring(0, buffer.length-backspaces);
                    this.messages.push([tmp,color,""+timeStamp]);
                    buffer = "  " + buffer.substring((buffer.length-backspaces));
                }
            }
        }
        if (buffer != "") this.messages.push([buffer,color,""+timeStamp]);
    }


    // general variables:
    time:number = 0;           // real time in frames
    world:ShrdluBlocksWorld = null;

    ontology:Ontology = null;
    naturalLanguageParser:NLParser = null;
    naturalLanguageGenerator:NLGenerator = null;
    shrdlu:BlocksWorldRuleBasedAI = null;

    // configuration:
    key_messageconsole_up:number;
    key_messageconsole_down:number;

    screen_width:number;
    screen_height:number;
    state:number;
    previous_state:number;
    state_cycle:number;

    // console:
    messages:string[][] = [];    // [text, color, timestamp]
    console_first_message:number = -1;
    text_input_buffer:string = "";
    text_input_cursor:number = 0;
    input_buffer_history:string[] = [];    // messages typed by the player, so that she can browse it quickly ussing up/down
    input_buffer_history_position:number = -1;
    last_input_buffer_before_browsing_history:string = null;

}
