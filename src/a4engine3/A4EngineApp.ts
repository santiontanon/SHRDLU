/*

Note (santi):
- SHRDLU was built on top of the A4Engine (a little game engine I wrote to test some PCG algorithms, 
  and that can be found here: https://github.com/santiontanon/A4Engine). I translated the engine to TypeScript and started
  building SHRDLU on top of that. After the game was working, I started then removing all the functionality from the
  A4Engine that SHRDLU doesn't need (such as magic, attacks, equiping items, etc.), and adding some SHRDLU-specific code.
- This class (A4EngineApp) implements the basic finite state machine for the control flow of the game (transitioning from the main
  menu, to the game, etc.). The A4Game class is the one that actually implements the game, and the one that stores the game state.

*/

var SHRDLU_VERSION:string = "Demo v2.4"

var A4ENGINE_STATE_INTRO:number = 0
var A4ENGINE_STATE_TITLESCREEN:number = 1
var A4ENGINE_STATE_QUIT:number = 2
var A4ENGINE_STATE_GAME:number = 3
var A4ENGINE_STATE_GAMECOMPLETE:number = 4
var A4ENGINE_STATE_ACT1INTRO:number = 5
var A4ENGINE_STATE_ACT2INTRO:number = 6
var A4ENGINE_STATE_ACT3INTRO:number = 7
var A4ENGINE_STATE_GAMEOVER:number = 8

var MAX_VOLUME:number = 1.0;
var DEFAULT_game_path:string = "data";
var DEFAULT_game_file:string = "shrdlu.xml";

var A4CONFIG_STORAGE_KEY:string = "SHRDLU-configuration";
var A4SAVEGAME_STORAGE_KEY:string = "SHRDLU-savegame";

var INGAME_MENU:number = 1;
var INGAME_INSTRUCTIONS:number = 1;
//var INGAME_TALK_MENU:number = 2;
//var INGAME_USE_MENU:number = 3;
//var INGAME_DROPGOLD_MENU:number = 4;
//var INGAME_TRADE_MENU:number = 5;
var INGAME_SAVE_MENU:number = 6;
var INGAME_LOAD_MENU:number = 7;
var INGAME_INSTRUCTIONS_MENU:number = 8;
var INGAME_TUTORIAL:number = 9;

var QUIT_REQUEST_ACTION_QUIT:number = 0;
var QUIT_REQUEST_ACTION_LOAD1:number = 1;
var QUIT_REQUEST_ACTION_LOAD2:number = 2;
var QUIT_REQUEST_ACTION_LOAD3:number = 3;
var QUIT_REQUEST_ACTION_LOAD4:number = 4;


class A4EngineApp {
    constructor(a_dx:number, a_dy:number) {
        this.loadConfiguration();

        this.game = null;
        this.state = A4ENGINE_STATE_INTRO;
        this.previous_state = this.state;
        this.state_cycle = 0;

        this.screen_width = a_dx;
        this.screen_height = a_dy;

        this.GLTM = new GLTManager();
        this.SFXM = new SFXManager();

        if (this.game_path!=null && this.game_filename!=null) {
            var fullPath:string = this.game_path + "/" + this.game_filename;

            var xmlhttp:XMLHttpRequest = new XMLHttpRequest();
            xmlhttp.overrideMimeType("text/xml");
            xmlhttp.open("GET", fullPath, false); 
            xmlhttp.send();
            this.gameDefinition = xmlhttp.responseXML.documentElement;
            console.log("Game definition loaded from '" + fullPath + "'");            
        } else {
            this.gameDefinition = null;
            console.log("Game definition not loaded...");            
        }

        this.ingame_menu = 0;
                
        this.trade_dialog_player = null;
        this.trade_dialog_other = null;
        this.trade_needs_update = false;

        console.log("A4EngineApp created.");

        if (this.gameDefinition!=null) {
            this.game = new A4Game(this.gameDefinition, this.game_path, this.GLTM, this.SFXM, this.SFX_volume);
        }
    }


    loadConfiguration()
    {
        var config_xml:Element = null;

        var configString:string = localStorage.getItem(A4CONFIG_STORAGE_KEY);
//        var configString:string = null;
        if (configString != null) {
            console.log("Found config stored in the browser, loading it...");
            //console.log(configString);      
            // if we can find a configuration saved in the browser, load it:
            var oParser:DOMParser = new DOMParser();
            config_xml = oParser.parseFromString(configString, "text/xml").documentElement;
        }
        
        if (config_xml!=null) {
            var defaultGame:Element[] = getElementChildrenByTag(config_xml,"defaultGame");
            var volume_xml:Element[] = getElementChildrenByTag(config_xml,"volume");
            var controls_xml:Element[] = getElementChildrenByTag(config_xml,"controls");
            //console.log(defaultGame);
            if (defaultGame != null && defaultGame.length > 0) {
                var path:string = defaultGame[0].getAttribute("path");
                var gameFile:string = defaultGame[0].getAttribute("gamefile");
                if (path != null) {
                    this.game_path = path;
                } else {
                    console.log("Cannot find 'path' tag in defaultGame in the config file!");
                    this.game_path = null;    
                }             
                if (gameFile != null) {
                    this.game_filename = gameFile;
                } else {
                    console.log("Cannot find 'gamefile' tag in defaultGame in the config file!");
                    this.game_filename = null;    
                }             
            } else {
                console.log("Cannot find 'defaultGame' tag in config file!");
                this.game_path = null;
                this.game_filename = null;
            }

            if (volume_xml != null && volume_xml.length > 0) {
                this.SFX_volume = Number(volume_xml[0].getAttribute("sfx"));
            } else {
                console.log("Cannot find 'volume' tag in config file!");
            }

            if (controls_xml != null && controls_xml.length > 0) {
                var key_xml:Element = null;
                key_xml = getFirstElementChildByTag(controls_xml[0],"messageconsole_up"); this.key_messageconsole_up = Number(key_xml.getAttribute("key"));
                key_xml = getFirstElementChildByTag(controls_xml[0],"messageconsole_down"); this.key_messageconsole_down = Number(key_xml.getAttribute("key"));
                key_xml = getFirstElementChildByTag(controls_xml[0],"inventory_toggle"); this.key_inventory_toggle = Number(key_xml.getAttribute("key"));
                key_xml = getFirstElementChildByTag(controls_xml[0],"left"); this.key_left = Number(key_xml.getAttribute("key"));
                key_xml = getFirstElementChildByTag(controls_xml[0],"right"); this.key_right = Number(key_xml.getAttribute("key"));
                key_xml = getFirstElementChildByTag(controls_xml[0],"up"); this.key_up = Number(key_xml.getAttribute("key"));
                key_xml = getFirstElementChildByTag(controls_xml[0],"down"); this.key_down = Number(key_xml.getAttribute("key"));
                key_xml = getFirstElementChildByTag(controls_xml[0],"take"); this.key_take = Number(key_xml.getAttribute("key"));
                key_xml = getFirstElementChildByTag(controls_xml[0],"talk"); this.key_talk = Number(key_xml.getAttribute("key"));
                key_xml = getFirstElementChildByTag(controls_xml[0],"use_item"); this.key_use_item = Number(key_xml.getAttribute("key"));
                key_xml = getFirstElementChildByTag(controls_xml[0],"next_item"); this.key_next_item = Number(key_xml.getAttribute("key"));
                key_xml = getFirstElementChildByTag(controls_xml[0],"fast_time"); this.key_fast_time = Number(key_xml.getAttribute("key"));
            } else {
                this.setDefaultConfiguration();
            }
        } else {
            // default configuration:
            this.game_path = DEFAULT_game_path;
            this.game_filename = DEFAULT_game_file;
            this.setDefaultConfiguration();
        }
    }


    setDefaultConfiguration()
    {
        console.log("Setting default config!");
        this.SFX_volume = MAX_VOLUME;
        this.key_messageconsole_up = KEY_CODE_PAGEUP;
        this.key_messageconsole_down = KEY_CODE_PAGEDOWN;
        this.key_inventory_toggle = KEY_CODE_TAB;
        this.key_left = KEY_CODE_LEFT;
        this.key_right = KEY_CODE_RIGHT;
        this.key_up = KEY_CODE_UP;
        this.key_down = KEY_CODE_DOWN;
        this.key_take = KEY_CODE_SPACE;
        this.key_talk = KEY_CODE_RETURN;
        this.key_use_item = KEY_CODE_U;
        this.key_next_item = KEY_CODE_O;
        this.key_fast_time = KEY_CODE_LSHIFT;
    }


    saveConfiguration()
    {
        var configString:string = "<A4Configuration>";

        configString += "<volume sfx=\""+this.SFX_volume+"\"/>"

        configString += "<defaultGame path=\""+this.game_path+"\" gamefile=\""+this.game_filename+"\"/>"

        configString += "<controls>"
        configString += "<messageconsole_up key=\""+this.key_messageconsole_up+"\"/>"
        configString += "<messageconsole_down key=\""+this.key_messageconsole_down+"\"/>"
        configString += "<inventory_toggle key=\""+this.key_inventory_toggle+"\"/>"

        configString += "<left key=\""+this.key_left+"\"/>"
        configString += "<right key=\""+this.key_right+"\"/>"
        configString += "<up key=\""+this.key_up+"\"/>"
        configString += "<down key=\""+this.key_down+"\"/>"
        configString += "<take key=\""+this.key_take+"\"/>"
        configString += "<talk key=\""+this.key_talk+"\"/>"
        configString += "<use_item key=\""+this.key_use_item+"\"/>"
        configString += "<next_item key=\""+this.key_next_item+"\"/>"
        configString += "<fast_time key=\""+this.key_fast_time+"\"/>"

        configString += "</controls>"
        configString += "</A4Configuration>"
        localStorage.setItem(A4CONFIG_STORAGE_KEY, configString);
        console.log("Config saved to the browser ... (key: " + A4CONFIG_STORAGE_KEY + ")");  
        //console.log(configString);      
    }


    cycle(mouse_x:number, mouse_y:number, k:KeyboardState) : boolean
    {
        try{
            var old_state:number = this.state;
          
            if (this.state_cycle == 0) console.log("First Cycle started for state " + this.state + "...");

            switch(this.state) {
            case A4ENGINE_STATE_INTRO:  this.state = this.intro_cycle(k);
                                        break;
            case A4ENGINE_STATE_TITLESCREEN:    this.state = this.titlescreen_cycle(k);
                                                break;
            case A4ENGINE_STATE_GAME:   this.state = this.game_cycle(k);
                                        break;
            case A4ENGINE_STATE_GAMECOMPLETE:   this.state = this.gamecomplete_cycle(k);
                                                break;
            case A4ENGINE_STATE_ACT1INTRO:   this.state = this.actintro_cycle(k, 1);
                                        break;
            case A4ENGINE_STATE_ACT2INTRO:   this.state = this.actintro_cycle(k, 2);
                                        break;
            case A4ENGINE_STATE_ACT3INTRO:   this.state = this.actintro_cycle(k, 3);
                                        break;
            case A4ENGINE_STATE_GAMEOVER:   this.state = this.gameover_cycle(k);
                                        break;
            default:// A4ENGINE_STATE_QUIT:
                    return false;
            }

            if (old_state == this.state) {
                this.state_cycle++;
            } else {
                this.state_cycle=0;
                console.log("State change: " + old_state + " -> " + this.state);
            } 

            this.SFXM.next_cycle();
            this.previous_state = old_state;

            BInterface.update(global_mouse_x, global_mouse_y, k, app);

        } catch(e) {
            console.error(e);
            this.game.error_messages_for_log.push(["" + e + "%0a    " + e.stack.split("\n").join("%0a    "),""+this.game.in_game_seconds]);
            this.game.addMessageWithColor("[ERROR: an internal game error occurred, please press ESC and send a debug log to the developer]", "red");
            this.game.etaoinAI.intentions = [];    // clear the intentions to prevent the error from happening again and again
            this.game.qwertyAI.intentions = [];
            this.game.shrdluAI.intentions = [];
        }

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

            switch(this.state) {
            case A4ENGINE_STATE_INTRO:          this.intro_draw();
                                                break;
            case A4ENGINE_STATE_TITLESCREEN:    this.titlescreen_draw();
                                                break;
            case A4ENGINE_STATE_GAME:           this.game_draw();
                                                break;
            case A4ENGINE_STATE_GAMECOMPLETE:   this.gamecomplete_draw();
                                                break;
            case A4ENGINE_STATE_ACT1INTRO:      this.actintro_draw(1);
                                                break;
            case A4ENGINE_STATE_ACT2INTRO:      this.actintro_draw(2);
                                                break;
            case A4ENGINE_STATE_ACT3INTRO:      this.actintro_draw(3);
                                                break;
            case A4ENGINE_STATE_GAMEOVER:      this.gameover_draw();
                                                break;
            }
        } catch(e) {
            console.error(e);
            this.game.error_messages_for_log.push(["" + e + "%0a    " + e.stack.split("\n").join("%0a    "),""+this.game.in_game_seconds]);
            this.game.addMessageWithColor("[ERROR: an internal game error occurred, please press ESC and send a debug log to the developer]", "red");
            this.game.etaoinAI.intentions = [];    // clear the intentions to prevent the error from happening again and again
            this.game.qwertyAI.intentions = [];
            this.game.shrdluAI.intentions = [];
        }
    }


    mouseClick(mouse_x: number, mouse_y: number, button: number, event:MouseEvent) 
    {
        if (this.state == A4ENGINE_STATE_GAME) {
            if (this.ingame_menu != INGAME_MENU && 
                this.ingame_menu != INGAME_LOAD_MENU && 
                this.ingame_menu != INGAME_SAVE_MENU) {

                if (this.SHRDLU_AI_debugger.AI != null) {
                    this.SHRDLU_AI_debugger.mouseClick(mouse_x, mouse_y, button);
                }
                this.game.mouseClick(mouse_x, mouse_y, button);
            }
        }
    }


    clearEvents()
    {
    }


    getGame() : A4Game
    {
        return this.game;
    }


    intro_cycle(k:KeyboardState) : number
    {    
        var textShowTime:number = 600;
        var sceneDuration:number = SHRDLU_FADEIN_TIME*2+textShowTime;
        var currentScene:number = Math.floor(this.state_cycle / sceneDuration);


        if (k.key_press(KEY_CODE_ESCAPE)) {
            if (this.state_cycle < 350) {
                this.state_cycle = 350;
            } else {
                return A4ENGINE_STATE_TITLESCREEN;
            }
        } 
        if (k.key_press(KEY_CODE_SPACE) ||
            k.key_press(KEY_CODE_RETURN)) {
            if (this.state_cycle < 11*sceneDuration) {
                this.state_cycle = (currentScene+1)*sceneDuration;
            } else {
                return A4ENGINE_STATE_TITLESCREEN;
            }
        } 
        // the title appearing scene takes 800 cycles
        if (this.state_cycle > 11*sceneDuration + 800) return A4ENGINE_STATE_TITLESCREEN;

        return A4ENGINE_STATE_INTRO;
    }


    intro_draw()
    {
        // each of these parts is in screen for SHRDLU_FADEIN_TIME*2+300 cycles
        var images:string[] = ["data/braingames.png",
                               "data/cutscene-intro1.png",
                               "data/cutscene-intro1.png",
                               "data/cutscene-intro1.png",
                               "data/cutscene-intro2.png",
                               "data/cutscene-intro2.png",
                               "data/cutscene-intro2.png",
                               "data/cutscene-intro3.png",
                               "data/cutscene-intro3.png",
                               "data/cutscene-intro3.png",
                               null];
        var text:string[] = [null,
                             "Planet Earth, Sol system, year 2304.",
                             "Despite significant technological\nadvancements, planet Earth was still\nhumanity's only home.",
                             "But that was about to change...",
                             "Due to unknown reasons, the amount of\nradiation coming from Earth's star,\nthe Sun, increased to lethal levels.",
                             "Earth was becoming sterile, and very few\nregions of the planet remained habitable.",
                             "It was time to find a new home...",
                             "Large colony ships were built, holding\nmost of humanity's remaining population.",
                             "The fleet consisted of 16 ships, each\nheaded for a different nearby star,\nwith the hope of finding a new home...",
                             "One of them was sent on a 48 year\njourney to nearby Tau Ceti, where a\nplanet called Aurora was one of the\nmost promising alternatives.",
                             "However, not everything unfolded\naccording to plan..."];        
        var textShowTime:number = 600;
        var sceneDuration:number = SHRDLU_FADEIN_TIME*2+textShowTime;
        var currentScene:number = Math.floor(this.state_cycle / sceneDuration);
        var sceneTime:number = this.state_cycle - currentScene*sceneDuration;
        var f1:number = 1.0;

        if (currentScene < 11) {            
            ctx.save();
            ctx.scale(PIXEL_SIZE, PIXEL_SIZE);
            if (images[currentScene] != null) {
                var img_bg:GLTile = this.game.GLTM.get(images[currentScene]);
                if (img_bg != null) {
                    if (currentScene == 0) img_bg.draw(40,72);
                                      else img_bg.draw(0,0);
                }
            }
            if (text[currentScene] != null) {
                var lines:string[] = text[currentScene].split("\n");
                var y:number = 192-lines.length*10;
                for(let line of lines) {
                    fillTextTopLeft(line, 8, y, fontFamily8px, MSX_COLOR_WHITE);
                    y+=10;
                }
            }
            ctx.restore();
            if (images[currentScene] != null ) {
                f1 = 1;
                if (sceneTime<SHRDLU_FADEIN_TIME) {
                    if (currentScene>0 && images[currentScene-1] == images[currentScene]) {
                        f1 = 1;
                    } else {
                        f1 = sceneTime/SHRDLU_FADEIN_TIME;
                    }
                }
                if (sceneTime>textShowTime+SHRDLU_FADEIN_TIME) {
                    if (currentScene<10 && images[currentScene+1] == images[currentScene]) {
                        f1 = 1;
                    } else {
                        f1 = 1-((sceneTime-(textShowTime+SHRDLU_FADEIN_TIME))/SHRDLU_FADEIN_TIME);
                    }
                }
                drawFadeInOverlay(1-f1);
            }
        } else {
            // Game Title:
//        if (this.state_cycle>=350) {
            ctx.save();
            ctx.scale(PIXEL_SIZE, PIXEL_SIZE);
            sceneTime = this.state_cycle-11*sceneDuration;

            // background:
            f1 = sceneTime/800.0;
            if (f1>1) f1 = 1;
            var img_bg:GLTile = this.game.GLTM.get("data/shrdlu-title-bg.png");
            if (img_bg != null) img_bg.draw(0,Math.floor((1-f1)*64));

            // title:
            if (sceneTime>=250) {
                if (sceneTime == 250) {
                    this.intro_logoaux = document.createElement('canvas');
                    this.intro_logoaux.width = 192;
                    this.intro_logoaux.height = 60;
                    this.intro_logofader = new FizzleFade(192,60);
                }

                var img_logo:GLTile = this.game.GLTM.get("data/shrdlu-title-logo.png");
                if (img_logo != null) {
                    for(let i:number = 0;i<25;i++) {
                        var xy:[number,number] = this.intro_logofader.nextPixelToFizzle();
                        if (xy != null) {
                            this.intro_logoaux.getContext("2d").drawImage(img_logo.src, xy[0],xy[1],1,1,xy[0],xy[1],1,1);
                        }
                    }
                }
                ctx.drawImage(this.intro_logoaux, 32, 32);
            }

            // title:
            if (sceneTime>=550) {
                var img_credits:GLTile = this.game.GLTM.get("data/shrdlu-title-credits.png");
                if (img_credits != null) img_credits.draw(32,176);
            }
            ctx.restore();
        }
    }


    titlescreen_cycle(k:KeyboardState) : number
    {
        if (this.state_cycle==0) {
            // create the menus:
            this.titlescreen_state = 0;
            this.titlescreen_timer = 0;
            BInterface.reset();
            var menuItems:string[] = [];
            var menuCallbacks:((any, number) => void)[] = [];

            menuItems.push("Play");
            menuCallbacks.push(
                function(arg:any, ID:number) {
                        var app = <A4EngineApp>arg;
                        if (app.titlescreen_state == 2) return;
                        app.titlescreen_state = 2;
                        app.titlescreen_timer = 0;
                        app.ingame_menu = 0;
                        app.quit_request = false;
                   });
            if (this.game.allowSaveGames) {
                menuItems.push("load");
                menuCallbacks.push(
                    function(arg:any, ID:number) {
                        var app = <A4EngineApp>arg;
                        if (app.titlescreen_state == 2) return;

                        var menuItems:string[] = [];
                        var menuCallbacks:((any, number) => void)[] = [];

                        for(let i:number = 0;i<4;i++) {
                            var saveName:string = app.game.checkSaveGame("slot" + (i+1));
                            if (saveName!=null) {
                                menuItems.push("slot" + (i+1) + ": " + saveName);
                                menuCallbacks.push(
                                    function(arg:any, ID:number) {
                                            ID -= 9;    // convert from menu item ID to slot ID
                                            var app = <A4EngineApp>arg;
                                            var xmlString = LZString.decompressFromUTF16(localStorage.getItem(A4SAVEGAME_STORAGE_KEY + "-slot" + ID));
                                            console.log("Decompresed string is: " + xmlString.length);        
//                                            console.log(xmlString);
                                            var dp:DOMParser = new DOMParser();
                                            var xml:Document = dp.parseFromString(xmlString, "text/xml");
                                            var gamexml:Element = getFirstElementChildByTag(xml.documentElement, "A4Game");

//                                            console.log(xml);
                                            app.titlescreen_state = 3;
                                            app.titlescreen_timer = 0;
                                            app.ingame_menu = 0;
                                            app.quit_request = false;
                                            app.game = new A4Game(gamexml, app.game_path, app.GLTM, app.SFXM, app.SFX_volume);
                                            app.game.finishLoadingGame(xml.documentElement, app);
                                       });
                            } else {
                                menuItems.push("slot" + (i+1));
                                menuCallbacks.push(null);
                            }
                        }
                        menuItems.push("back");
                        menuCallbacks.push(
                            function(arg:any, ID:number) {
                                     var app = <A4EngineApp>arg;
                                     BInterface.pop();
                               });
                        BInterface.push();
                        createShrdluMenu(menuItems,menuCallbacks,  
                                         fontFamily32px,32,app.screen_width/2-10*8*PIXEL_SIZE,app.screen_height/2-4*8*PIXEL_SIZE,20*8*PIXEL_SIZE,7*8*PIXEL_SIZE,0,10,app.GLTM);
                        for(let i:number = 0;i<4;i++) {
                            var saveName:string = app.game.checkSaveGame("slot" + (i+1));
                            if (saveName == null) {
                                BInterface.disable(i+10);
                            }
                        }
                     });
            }
            menuItems.push("Instructions");
            menuCallbacks.push(
                function(arg:any, ID:number) {    
                       var app = <A4EngineApp>arg;
                       if (app.titlescreen_state == 2) return;

                       BInterface.push();
                       BInterface.addElement(
                           new BShrdluTextFrame(getShrdluInstructionsString(), 
                                          false, fontFamily32px, 32, 8*PIXEL_SIZE, 8*PIXEL_SIZE, 240*PIXEL_SIZE, 164*PIXEL_SIZE, app.GLTM));

                       BInterface.addElement(new BShrdluButton("Back", fontFamily32px, app.screen_width/2-80, app.screen_height-206, 160, 64, 30, 
                                                         "white",
                                                         function(arg:any, ID:number) {
                                                            BInterface.pop();
                                                         }));
                   });
//            menuItems.push("configuration");
//            menuCallbacks.push(createConfigurationMenu);

            createShrdluMenu(menuItems,menuCallbacks,  
                             fontFamily32px,32,this.screen_width/2-7*8*PIXEL_SIZE,this.screen_height/2+3*8*PIXEL_SIZE,
                             14*8*PIXEL_SIZE,(5*8)*PIXEL_SIZE,PIXEL_SIZE,1,this.GLTM);

            // if there are no savegames, load is disabled:
            let anySaveGame:boolean = false;
            for(let i:number = 0;i<4;i++) {
                var saveName:string = app.game.checkSaveGame("slot" + (i+1));
                if (saveName != null) {
                    anySaveGame = true;
                    break;
                }
            }
            if (!anySaveGame) BInterface.disable(2);
            this.titlescreen_angle = 0;
            this.titlescreen_zoom = 1;
            this.titlescreen_x = 0;
            this.titlescreen_y = 0;
        }

        if (this.titlescreen_state==0) {
            this.titlescreen_timer++;
            if (this.titlescreen_timer>SHRDLU_FADEIN_TIME) this.titlescreen_state = 1;
        } else if (this.titlescreen_state==2) {
            this.titlescreen_timer++;
            if (this.titlescreen_timer>SHRDLU_FADEIN_TIME) {
                BInterface.reset();

                app.game = new A4Game(app.gameDefinition, app.game_path, app.GLTM, app.SFXM, app.SFX_volume);
                app.game.finishLoadingGame(null, this);

                return A4ENGINE_STATE_ACT1INTRO;
            }
        } else if (this.titlescreen_state==3) {
            this.titlescreen_timer++;
            if (this.titlescreen_timer>SHRDLU_FADEIN_TIME) {
                BInterface.reset();

                return A4ENGINE_STATE_GAME;
            }
        }

        return A4ENGINE_STATE_TITLESCREEN;
    }


    titlescreen_draw()
    {
        var f1:number = 1;
//        var f2:number = 1;
        if (this.titlescreen_state == 0) {
//            f2 = this.titlescreen_timer/SHRDLU_FADEIN_TIME;
//            if (f2<0) f2 = 0;
//            if (f2>1) f2 = 1;
        } else if (this.titlescreen_state == 2 || this.titlescreen_state == 3) {
            f1 = 1 - this.titlescreen_timer/SHRDLU_FADEIN_TIME;
            if (f1<0) f1 = 0;
            if (f1>1) f1 = 1;
//            f2 = f1;
        }
        
        ctx.save();
        ctx.scale(PIXEL_SIZE, PIXEL_SIZE);

        var img_bg:GLTile = this.game.GLTM.get("data/shrdlu-title-bg.png");
        if (img_bg != null) img_bg.draw(0,0);
        var img_logo:GLTile = this.game.GLTM.get("data/shrdlu-title-logo.png");
        if (img_logo != null) img_logo.draw(32,32);
        var img_credits:GLTile = this.game.GLTM.get("data/shrdlu-title-credits.png");
        if (img_credits != null) img_credits.draw(32,176);

        fillTextTopLeft(SHRDLU_VERSION, 1, 1, fontFamily8px, MSX_COLOR_WHITE);

        ctx.restore();

        BInterface.drawAlpha(1);

        drawFadeInOverlay(1-f1);
    }


    createInGameMenu(menu:number, target:A4Character)
    {
        this.ingame_menu = menu;
        if (menu == INGAME_MENU) {
            let menuItems:string[] = [];
            let menuCallbacks:((any, number) => void)[] = [];

            menuItems.push("Play");
            menuCallbacks.push(
                function(arg:any, ID:number) {
                         let app = <A4EngineApp>arg;
                         BInterface.pop();
                         app.ingame_menu = 0;
                   });
            if (this.game.allowSaveGames) {
                menuItems.push("Save");
                menuCallbacks.push(
                    function(arg:any, ID:number) {
                             let app = <A4EngineApp>arg;
                             app.createInGameMenu(INGAME_SAVE_MENU, null);
                       });

                menuItems.push("Load");
                menuCallbacks.push(
                    function(arg:any, ID:number) {
                             let app = <A4EngineApp>arg;
                             app.createInGameMenu(INGAME_LOAD_MENU, null);
                       });
            }
            menuItems.push("Instructions");
            menuCallbacks.push(
                function(arg:any, ID:number) {    
                       let app = <A4EngineApp>arg;
                       BInterface.push();
                       BInterface.addElement(
                           new BShrdluTextFrame(getShrdluInstructionsString(), 
                                          false, fontFamily32px, 32, 8*PIXEL_SIZE, 8*PIXEL_SIZE, 240*PIXEL_SIZE, 144*PIXEL_SIZE, app.GLTM));
//                       BInterface.addElement(new BButton("Back", fontFamily16px, app.screen_width/2-40, app.screen_height-48, 80, 32, 30, 
//                                                         function(arg:any, ID:number) {
//                                                            BInterface.pop();
//                                                         }));
                       app.ingame_menu = INGAME_INSTRUCTIONS_MENU;
                   });

//            menuItems.push("Send Debug Log");
            menuItems.push("Generate Debug Log");
            menuCallbacks.push(
                function(arg:any, ID:number) {    
                    generateDebugLogForDownload(<A4EngineApp>arg);
                   });

            if (this.game.allowSaveGames) {
                menuItems.push("Quit");
                menuCallbacks.push(
                    function(arg:any, ID:number) {
                             let app = <A4EngineApp>arg;
                             app.quit_request = true;
                             app.quit_request_cycle = app.state_cycle;
                             app.quit_request_action = QUIT_REQUEST_ACTION_QUIT;
                       });
            } else {
                menuItems.push("Save & Quit");
                menuCallbacks.push(
                    function(arg:any, ID:number) {
                             let app = <A4EngineApp>arg;
                             app.game.saveGame("slot1");
                             app.quit_request = true;
                       });
            }

            BInterface.push();
//            createShrdluMenu(menuItems,menuCallbacks,  
//                             fontFamily32px,32,this.screen_width/2-8*8*PIXEL_SIZE,this.screen_height/2-4*8*PIXEL_SIZE,16*8*PIXEL_SIZE,7*8*PIXEL_SIZE,0,1,this.GLTM);
            createShrdluMenu(menuItems,menuCallbacks,  
                             fontFamily32px,32,this.screen_width/2-8*8*PIXEL_SIZE,this.screen_height/2-4*8*PIXEL_SIZE,16*8*PIXEL_SIZE,8*8*PIXEL_SIZE,0,1,this.GLTM);
            // if there are no savegames, load is disabled:
            let anySaveGame:boolean = false;
            for(let i:number = 0;i<4;i++) {
                let saveName:string = app.game.checkSaveGame("slot" + (i+1));
                if (saveName != null) {
                    anySaveGame = true;
                    break;
                }
            }
            if (!anySaveGame) BInterface.disable(3);
//            BInterface.getElementByID(2).setEnabled(false);
//            BInterface.getElementByID(3).setEnabled(false);
        } else if (menu == INGAME_SAVE_MENU) {
            let menuItems:string[] = [];
            let menuCallbacks:((any, number) => void)[] = [];

            for(let i:number = 1;i<=4;i++) {
                let saveName:string = app.game.checkSaveGame("slot" + i);
                if (saveName!=null) {
                    menuItems.push("Slot" + i + ": " + saveName);
                } else {
                    menuItems.push("Slot"+i);
                }
                menuCallbacks.push(
                    function(arg:any, ID:number) {
                             let app = <A4EngineApp>arg;
                             app.game.saveGame("slot"+ID)
                             BInterface.pop();
                             app.ingame_menu = INGAME_MENU;
                       });
            }
            menuItems.push("Back");
            menuCallbacks.push(
                function(arg:any, ID:number) {
                         let app = <A4EngineApp>arg;
                         BInterface.pop();
                         app.ingame_menu = INGAME_MENU;
                   });
            BInterface.push();
            createShrdluMenu(menuItems,menuCallbacks,  
                             fontFamily32px,32,this.screen_width/2-10*8*PIXEL_SIZE,this.screen_height/2-4*8*PIXEL_SIZE,20*8*PIXEL_SIZE,7*8*PIXEL_SIZE,0,1,this.GLTM);


        } else if (menu == INGAME_LOAD_MENU) {
            let menuItems:string[] = [];
            let menuCallbacks:((any, number) => void)[] = [];

            for(let i:number = 1;i<=4;i++) {
                let saveName:string = app.game.checkSaveGame("slot" + i);
                if (saveName!=null) {
                    menuItems.push("Slot" + i + ": " + saveName);
                    menuCallbacks.push(
                        function(arg:any, ID:number) {
                                let app = <A4EngineApp>arg;
                                app.quit_request = true;
                                app.quit_request_cycle = app.state_cycle;
                                app.quit_request_action = QUIT_REQUEST_ACTION_LOAD1 + (ID-1);
                           });
                } else {
                    menuItems.push("Slot"+i);
                    menuCallbacks.push(null);
                }
            }
            menuItems.push("Back");
            menuCallbacks.push(
                function(arg:any, ID:number) {
                         let app = <A4EngineApp>arg;
                         BInterface.pop();
                         app.ingame_menu = INGAME_MENU;
                   });
            BInterface.push();
            createShrdluMenu(menuItems,menuCallbacks,  
                             fontFamily32px,32,this.screen_width/2-10*8*PIXEL_SIZE,this.screen_height/2-4*8*PIXEL_SIZE,20*8*PIXEL_SIZE,7*8*PIXEL_SIZE,0,1,this.GLTM);
            for(let i:number = 1;i<=4;i++) {
                let saveName:string = app.game.checkSaveGame("slot" + i);
                if (saveName == null) {
                    BInterface.disable(i);
                }
            }
        } 

    }


    game_cycle(k:KeyboardState) : number
    {
        let fast_time:boolean = false;

        if (this.game.introact_request == 1) {
            this.game.introact_request = 0;
            return A4ENGINE_STATE_ACT1INTRO;
        }
        if (this.game.introact_request == 2) {
            this.game.introact_request = 0;
            return A4ENGINE_STATE_ACT2INTRO;
        }

        if (this.game.gameover_request != 0) {
            this.gameover_type = this.game.gameover_request;
            this.game.gameover_request = 0;
            return A4ENGINE_STATE_GAMEOVER;
        }

        if (this.ingame_menu == 0) {
            if (this.game.HUD_state == SHRDLU_HUD_STATE_MESSAGES_INPUT) { 
                //<SHRDLU-specific>
                // currently in text input state:
                // look for text input:
                for(let ke of k.keyevents) this.game.textInputEvent(ke, this.SFXM);

                if (k.key_press(KEY_CODE_RETURN)) {
                    if (!this.game.skipSpeechBubble()) {
                        this.game.textInputSubmit(this.SFXM);
                    }
                }
                if (k.key_press(KEY_CODE_ESCAPE)) this.game.textInputExit();
                //</SHRDLU-specific>
            } else if (this.game.cutSceneActivated >= 0) {
                if (k.key_press(KEY_CODE_ESCAPE)) this.game.skipSpeechBubble();
                if (k.key_press(KEY_CODE_SPACE)) this.game.skipSpeechBubble();
                if (k.key_press(KEY_CODE_RETURN)) this.game.skipSpeechBubble();
            } else {
                // playing:
                //<SHRDLU-specific>
                // Note: in the SHRDLU game, I reuse the "next item" key as the "drop item" key:
                if (k.key_press(this.key_next_item)) this.game.playerInput_DropItem();
                if (k.key_press(this.key_use_item)) this.game.playerInput_UseItem();
                if (k.key_press(KEY_CODE_RETURN)) {
                    if (!this.game.skipSpeechBubble()) {
                        //this.game.playerInput_RequestMessageMode();
                        this.game.textInputRequest();
                    }
                }
                // start text entering mode with any letter key:
                if (this.game.HUD_state != SHRDLU_HUD_STATE_INVENTORY &&
                    this.game.HUD_state != SHRDLU_HUD_STATE_SPLIT_INVENTORY) {
                    for(let i:number = KEY_CODE_A;i<KEY_CODE_Z;i++) {
                        if (k.key_press(i)) {
                            this.game.textInputRequest();
                            for(let ke of k.keyevents) this.game.textInputEvent(ke, this.SFXM);
                            break;
                        }
                    }
                }
                //</SHRDLU-specific>

                if (k.key_press(KEY_CODE_ESCAPE)) {
                    if (!this.game.skipSpeechBubble()) this.createInGameMenu(INGAME_MENU, null);
                }

                // HUD:
                if (k.key_press(this.key_inventory_toggle)) this.game.playerInput_ToogleInventory();

                // console control:
                if (k.key_press(this.key_messageconsole_up)) this.game.messageConsoleUp();
                if (k.key_press(this.key_messageconsole_down)) this.game.messageConsoleDown();

                // issuing player commands:
                if (k.keyboard[this.key_take]) {
                    //if (this.game.currentPlayer.isIdle()) {
                        if (k.key_press(this.key_left)) {
                            this.game.playerInput_issueCommand(A4CHARACTER_COMMAND_PUSH,A4_DIRECTION_LEFT,this.game.currentPlayer.direction);
                            this.take_press_used_for_push = true;
                        }
                        if (k.key_press(this.key_up)) {
                            this.game.playerInput_issueCommand(A4CHARACTER_COMMAND_PUSH,A4_DIRECTION_UP,this.game.currentPlayer.direction);
                            this.take_press_used_for_push = true;
                        }
                        if (k.key_press(this.key_right)) {
                            this.game.playerInput_issueCommand(A4CHARACTER_COMMAND_PUSH,A4_DIRECTION_RIGHT,this.game.currentPlayer.direction);
                            this.take_press_used_for_push = true;
                        }
                        if (k.key_press(this.key_down)) {
                            this.game.playerInput_issueCommand(A4CHARACTER_COMMAND_PUSH,A4_DIRECTION_DOWN,this.game.currentPlayer.direction);
                            this.take_press_used_for_push = true;
                        }
                    //}
                } else {
                    var command:number = -1;
                    var direction:number = A4_DIRECTION_NONE;
                    if (k.keyboard[this.key_left]) direction = A4_DIRECTION_LEFT;
                    if (k.keyboard[this.key_up]) direction = A4_DIRECTION_UP;
                    if (k.keyboard[this.key_right]) direction = A4_DIRECTION_RIGHT;
                    if (k.keyboard[this.key_down]) direction = A4_DIRECTION_DOWN;
                    if (direction != A4_DIRECTION_NONE) {
                        if (k.keyboard[this.key_fast_time]) fast_time = true;
                        command = this.game.playerInput_issueCommand(A4CHARACTER_COMMAND_WALK,0,direction);
                    }
                }
                
//                if (k.key_press(this.key_take)) this.game.playerInput_issueCommand(A4CHARACTER_COMMAND_TAKE,0,A4_DIRECTION_NONE);
                if (k.key_first_press(this.key_take)) {
                    this.take_press_used_for_push = false;
                }
                if (k.key_release(this.key_take) && !this.take_press_used_for_push) {
                    this.game.playerInput_issueCommand(A4CHARACTER_COMMAND_TAKE,A4_DIRECTION_NONE,this.game.currentPlayer.direction);
                }

                if (this.game.currentPlayer.inventory[this.game.currentPlayer.selectedItem] == null) {
                    this.game.currentPlayer.selectedItem = -1;
                }

                // check if the AI debugger has to be activated or removed:
                if (k.key_press(KEY_CODE_RETURN) &&
                    k.keyboard[KEY_CODE_ALT]) {
                    if (this.SHRDLU_AI_debugger.AI == null) {
                        this.SHRDLU_AI_debugger.AI = this.game.etaoinAI;
                    } else if (this.SHRDLU_AI_debugger.AI == this.game.etaoinAI) {
                        this.SHRDLU_AI_debugger.AI = this.game.qwertyAI;
                    } else if (this.SHRDLU_AI_debugger.AI == this.game.qwertyAI) {
                        this.SHRDLU_AI_debugger.AI = this.game.shrdluAI;
                    } else {
                        this.SHRDLU_AI_debugger.AI = null;
                    }
                }
            }

        } else if (this.ingame_menu == INGAME_MENU) {
            if (k.key_press(KEY_CODE_ESCAPE)) {
                BInterface.pop();
                app.ingame_menu = 0;
            }

        } else if (this.ingame_menu == INGAME_INSTRUCTIONS_MENU ||
                   this.ingame_menu == INGAME_LOAD_MENU ||
                   this.ingame_menu == INGAME_SAVE_MENU) {
            if (k.key_press(KEY_CODE_ESCAPE)) {
                BInterface.pop();
                app.ingame_menu = INGAME_MENU;
            }

        } else if (this.ingame_menu == INGAME_TUTORIAL) {
            if (k.key_press(KEY_CODE_ESCAPE)) {
                BInterface.pop();
                app.ingame_menu = 0;

                this.tutorialMessages.splice(0,1);
            }
        }

        if (this.ingame_menu != INGAME_MENU && this.ingame_menu != INGAME_LOAD_MENU && this.ingame_menu != INGAME_SAVE_MENU &&
            this.ingame_menu != INGAME_INSTRUCTIONS_MENU && this.ingame_menu != INGAME_TUTORIAL) {
            let cycles_to_execute:number = 1;
            if (fast_time) cycles_to_execute = 2;
            for(let cycle:number = 0;cycle<cycles_to_execute;cycle++) {
                if (!this.game.update()) {
                    if (!this.game.allowSaveGames) this.game.deleteSaveGame("slot1");
                    return A4ENGINE_STATE_INTRO;
                }
                if (this.game.gameComplete) {
                    if (!this.game.allowSaveGames) this.game.deleteSaveGame("slot1");
                    return A4ENGINE_STATE_GAMECOMPLETE;
                }

                if (this.tutorialMessages.length > 0) {
                    // there is a new tutorial message to display!
                   BInterface.push();
                   BInterface.addElement(
                       new BShrdluTextFrame(this.tutorialMessages[0], 
                                      false, fontFamily32px, 32, 8*PIXEL_SIZE, 8*PIXEL_SIZE, 240*PIXEL_SIZE, 96*PIXEL_SIZE, this.GLTM));
                   this.ingame_menu = INGAME_TUTORIAL;
                   break;    // if there is a tutorial message, we stop executing cycles
                }
            }
        }

        if (this.quit_request && this.state_cycle > this.quit_request_cycle + SHRDLU_FADEIN_TIME) {
            this.quit_request = false;
            if (this.quit_request_action == QUIT_REQUEST_ACTION_QUIT) {
                return A4ENGINE_STATE_INTRO;
            } else {
                var ID:number = (this.quit_request_action - QUIT_REQUEST_ACTION_LOAD1) + 1;
                var xmlString = LZString.decompressFromUTF16(localStorage.getItem(A4SAVEGAME_STORAGE_KEY + "-slot" + ID));
                console.log("Decompresed string is: " + xmlString.length);        

                var dp:DOMParser = new DOMParser();
                var xml:Document = dp.parseFromString(xmlString, "text/xml");
//                            console.log(xml);
                var gamexml:Element = getFirstElementChildByTag(xml.documentElement, "A4Game");
                this.game = new A4Game(gamexml, this.game_path, this.GLTM, this.SFXM, this.SFX_volume);
                this.game.finishLoadingGame(xml.documentElement, this);
                BInterface.reset();
                this.ingame_menu = 0;
                this.state_cycle = 0;
            }
        }
        return A4ENGINE_STATE_GAME;
    }


    game_draw()
    {
        this.game.draw(this.screen_width, this.screen_height);

        if (this.SHRDLU_AI_debugger.AI != null) this.SHRDLU_AI_debugger.draw();

        BInterface.draw();

        if (this.state_cycle<16) {
            // some delay to prevent the player from seeing the door close/open animation at the beginning
            drawFadeInOverlay(1);
        } else if (this.state_cycle<16+SHRDLU_FADEIN_TIME) {
            drawFadeInOverlay(1-((this.state_cycle-16)/SHRDLU_FADEIN_TIME));
        }
        if (this.quit_request) {
            drawFadeInOverlay((this.quit_request_cycle-this.state_cycle)/SHRDLU_FADEIN_TIME);   
        }
    }


    gamecomplete_cycle(k:KeyboardState) : number
    {
        /*
        if (this.state_cycle==0) {
            this.gamecomplete_state = 0;
            BInterface.reset();
            // create game complete screen
            BInterface.push();
            var tmp:string[] = this.game.getGameEnding(this.game.gameComplete_ending_ID);
            if (tmp==null) {
                console.error("Cannot find text for game ending with id '" + this.game.gameComplete_ending_ID + "'!!");
                return A4ENGINE_STATE_GAMECOMPLETE;
            }

            BInterface.addElement(new BTextFrame(tmp, false, fontFamily8px, 8, 80, 40, app.screen_width-160, app.screen_height-100));
            BInterface.addElement(new BButton("Keep Playing", fontFamily16px, app.screen_width/2-120, app.screen_height-120, 240, 30, 1, 
                                         function(arg:any, ID:number) {
                                            var app = <A4EngineApp>arg;
                                            BInterface.reset();
                                            app.game.setGameComplete(false, null);
                                            app.ingame_menu = 0;
                                            app.gamecomplete_state = 1;
                                         }));
            BInterface.addElement(new BButton("Quit", fontFamily16px, app.screen_width/2-120, app.screen_height-80, 240, 30, 2, 
                                         function(arg:any, ID:number) {
                                            var app = <A4EngineApp>arg;
                                            BInterface.reset();
                                            app.game.setGameComplete(false, null);
                                            app.ingame_menu = 0;
                                            app.gamecomplete_state = 2;
                                         }));
        }

        if (this.gamecomplete_state == 1) return A4ENGINE_STATE_GAME;
        if (this.gamecomplete_state == 2) return A4ENGINE_STATE_INTRO;
        return A4ENGINE_STATE_GAMECOMPLETE;
        */
        return A4ENGINE_STATE_INTRO;
    }


    gamecomplete_draw()
    {
        /*
        this.game.draw(this.screen_width, this.screen_height);

        BInterface.draw();
        */
    }


    actintro_cycle(k:KeyboardState, act:number) : number
    {

        switch(this.introact_state) {
            case 0:
                if (this.introact_state_timer == 0) console.log("actintro_cycle: cycle 0");
                this.introact_state_timer++;
                if (this.introact_state_timer >= SHRDLU_FADEIN_TIME && 
                    (k.key_press(KEY_CODE_ESCAPE) || k.key_press(KEY_CODE_SPACE) || k.key_press(KEY_CODE_RETURN) ||
                    this.introact_state_timer >= 600)) {
                    this.introact_state_timer = 0;
                    this.introact_state = 1;
                }
                break;
            case 1:
                this.introact_state_timer++;
                if (this.introact_state_timer>SHRDLU_FADEIN_TIME) {
                    this.game.cutSceneActivated = 0;
                    this.introact_state = 0;
                    this.introact_state_timer = 0;
                    if (act >= 2) this.game.gameScript.act = "" + act;

                    //if (act == 2) {
                    if (act == 3) {
                        this.introact_state = 2;
                        var menuItems:string[] = [];
                        var menuCallbacks:((any, number) => void)[] = [];

                        menuItems.push("You have reached the");
                        menuCallbacks.push(null);
                        menuItems.push("end of this Demo!");
                        menuCallbacks.push(null);
//                        menuItems.push("Send Debug Log");
                        menuItems.push("Generate Debug Log");
                        menuCallbacks.push(
                            function(arg:any, ID:number) {    
                                generateDebugLogForDownload(<A4EngineApp>arg);
                               });
                        menuItems.push("No thanks");
                        menuCallbacks.push(
                            function(arg:any, ID:number) {
                                     var app = <A4EngineApp>arg;
                                     app.introact_state = 3;
                               });
                        BInterface.push();
            //            createShrdluMenu(menuItems,menuCallbacks,  
            //                             fontFamily32px,32,this.screen_width/2-8*8*PIXEL_SIZE,this.screen_height/2-4*8*PIXEL_SIZE,16*8*PIXEL_SIZE,7*8*PIXEL_SIZE,0,1,this.GLTM);
                        createShrdluMenu(menuItems,menuCallbacks,  
                                         fontFamily32px,32,this.screen_width/2-10*8*PIXEL_SIZE,this.screen_height/2-4*8*PIXEL_SIZE,20*8*PIXEL_SIZE,6*8*PIXEL_SIZE,0,1,this.GLTM);
                        BInterface.getElementByID(1).setEnabled(false);
                        BInterface.getElementByID(2).setEnabled(false);

                        return this.state;
                    }
                    return A4ENGINE_STATE_GAME;
                }
                break;

            case 2:
                // showing menu
                break;

            case 3:
                // request quit
                BInterface.reset();
                this.introact_state = 0;
                this.introact_state_timer = 0;
                return A4ENGINE_STATE_INTRO;

        }        
        return this.state;
    }


    actintro_draw(act:number)
    {
        ctx.save();
        ctx.scale(PIXEL_SIZE, PIXEL_SIZE);
        var img:GLTile;
        if (act == 1) img = this.game.GLTM.get("data/act1.png");
        if (act == 2) img = this.game.GLTM.get("data/act2.png");
        if (img != null) img.draw(0,0);
        ctx.restore();
        if (this.introact_state == 0 && this.introact_state_timer<SHRDLU_FADEIN_TIME) {
            drawFadeInOverlay(1-((this.introact_state_timer)/SHRDLU_FADEIN_TIME));
        }
        if (this.introact_state == 1) {
            if (this.introact_state_timer<SHRDLU_FADEIN_TIME) {
                drawFadeInOverlay(((this.introact_state_timer)/SHRDLU_FADEIN_TIME));
            } else {
                drawFadeInOverlay(1);
            }
        }    
        if (this.introact_state == 2) BInterface.draw();    
    }


    gameover_cycle(k:KeyboardState) : number
    {

        switch(this.gameover_state) {
            case 0:
                if (this.gameover_state_timer == 0) console.log("gameover_cycle: cycle 0");
                this.gameover_state_timer++;
                if (this.gameover_state_timer >= SHRDLU_FADEIN_TIME && 
                    (k.key_press(KEY_CODE_ESCAPE) || k.key_press(KEY_CODE_SPACE) || k.key_press(KEY_CODE_RETURN) ||
                    this.gameover_state_timer >= 600)) {
                    this.gameover_state_timer = 0;
                    this.gameover_state = 1;

                    var menuItems:string[] = [];
                    var menuCallbacks:((any, number) => void)[] = [];

                    menuItems.push("Generate Debug Log");
                    menuCallbacks.push(
                        function(arg:any, ID:number) {    
                            generateDebugLogForDownload(<A4EngineApp>arg);
                           });
                    menuItems.push("Title Screen");
                    menuCallbacks.push(
                        function(arg:any, ID:number) {
                                 var app = <A4EngineApp>arg;
                                 app.gameover_state = 2;
                           });
                    BInterface.push();
        //            createShrdluMenu(menuItems,menuCallbacks,  
        //                             fontFamily32px,32,this.screen_width/2-8*8*PIXEL_SIZE,this.screen_height/2-4*8*PIXEL_SIZE,16*8*PIXEL_SIZE,7*8*PIXEL_SIZE,0,1,this.GLTM);
                    createShrdluMenu(menuItems,menuCallbacks,  
                                     fontFamily32px,32,this.screen_width/2-10*8*PIXEL_SIZE,this.screen_height/2-4*8*PIXEL_SIZE,20*8*PIXEL_SIZE,4*8*PIXEL_SIZE,0,1,this.GLTM);
                }
                break;
            case 1:
                // showing menu
                break;

            case 2:
                // request quit
                BInterface.reset();
                this.gameover_state = 0;
                this.gameover_state_timer = 0;
                return A4ENGINE_STATE_INTRO;

        }        
        return this.state;
    }


    gameover_draw()
    {
        ctx.save();
        ctx.scale(PIXEL_SIZE, PIXEL_SIZE);
        var img:GLTile;
        if (this.gameover_type == 1) img = this.game.GLTM.get("data/cutscene-death-oxygen.png");
        if (img != null) img.draw(0,0);
        ctx.restore();
        if (this.gameover_state == 0 && this.gameover_state_timer<SHRDLU_FADEIN_TIME) {
            drawFadeInOverlay(1-((this.gameover_state_timer)/SHRDLU_FADEIN_TIME));
        }
        if (this.gameover_state == 1) BInterface.draw();    
    }


    GLTM:GLTManager;
    SFXM:SFXManager;

    // game configuration:
    SFX_volume:number;
    key_messageconsole_up:number;
    key_messageconsole_down:number;
    key_inventory_toggle:number;

    key_left:number;
    key_right:number;
    key_up:number;
    key_down:number;
    key_take:number;
    key_talk:number;
    key_use_item:number;
    key_next_item:number;
    key_fast_time:number;

    // game:
//    configFilePath:string;
    game_path:string;
    game_filename:string;
    gameDefinition:Element;
    game:A4Game;

    //BitmapFont *m_font32,*m_font16,*m_font8;

    mouse_x:number;
    mouse_y:number;
    mouse_button:number;

    screen_width:number;
    screen_height:number;
    state:number;
    previous_state:number;
    state_cycle:number;

    // intro:
    intro_logoaux:HTMLCanvasElement = null;
    intro_logofader:FizzleFade = null;

    // titlescreen:
    titlescreen_state:number;    // 0: appearing, 1: normal, 2: disappearing
    titlescreen_timer:number;
    titlescreen_angle:number;
    titlescreen_zoom:number;
    titlescreen_x:number;
    titlescreen_y:number;

    // state game:
    ingame_menu:number;
    quit_request:boolean = false;
    quit_request_cycle:number = 0;
    quit_request_action:number = 0;
    take_press_used_for_push:boolean = false;

    trade_dialog_player:A4Character;
    trade_dialog_other:A4Character;
    trade_needs_update:boolean;

    tutorialMessages:string[][] = [];    // if this list is non-empty, the game will be paused, to display a tutorial message

    // state introact:
    introact_state:number = 0;
    introact_state_timer:number = 0;

    gameover_type:number = 0;
    gameover_state:number = 0;
    gameover_state_timer:number = 0;

    // state game complete:
    gamecomplete_state:number;

    // AI debugger:
    //AI_debugger_focus:A4AICharacter = null;
    SHRDLU_AI_debugger:RuleBasedAIDebugger = new RuleBasedAIDebugger();
}
