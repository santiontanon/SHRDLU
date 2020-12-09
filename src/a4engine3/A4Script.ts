
// game logic scripts:
var A4_SCRIPT_GAMECOMPLETE:number = 0;
var A4_SCRIPT_MESSAGE:number = 8;
var A4_SCRIPT_DELAY:number = 23;
var A4_SCRIPT_PLAYSOUND:number = 24;
var A4_SCRIPT_STOPSOUND:number = 25;
var A4_SCRIPT_IF:number = 26;

// character scripts:
var A4_SCRIPT_TELEPORT:number = 3;
var A4_SCRIPT_GOTO:number = 4;            // go to some coordinates
var A4_SCRIPT_GOTO_CHARACTER:number = 57; // go to some target object ("character" is a legacy name)
var A4_SCRIPT_GOTO_OPENING_DOORS:number = 68;
var A4_SCRIPT_USE:number = 6;
var A4_SCRIPT_OPENDOORS:number = 7;
var A4_SCRIPT_TALK:number = 9;
var A4_SCRIPT_TALKOTHER:number = 28;
var A4_SCRIPT_STEAL:number = 16;
var A4_SCRIPT_GIVE:number = 17;
var A4_SCRIPT_SELL:number = 18;
var A4_SCRIPT_DROP:number = 19;
var A4_SCRIPT_TAKE:number = 37;
var A4_SCRIPT_INTERACT:number = 40;
var A4_SCRIPT_INTERACT_WITH_OBJECT:number = 61;
var A4_SCRIPT_EMBARK:number = 41;
var A4_SCRIPT_DISEMBARK:number = 42;
var A4_SCRIPT_BUY:number = 45;
var A4_SCRIPT_CHOP:number = 46;
var A4_SCRIPT_SLEEPOTHER:number = 51;
var A4_SCRIPT_TAKE_FROM_CONTAINER:number = 64;
var A4_SCRIPT_PUT_IN_CONTAINER:number = 65;
var A4_SCRIPT_PUSH:number = 66;
var A4_SCRIPT_PULL:number = 67;

var A4_SCRIPT_EATIFHUNGRY:number = 58;
var A4_SCRIPT_DRINKIFTHIRSTY:number = 59;

// miscellanea scripts:
var A4_SCRIPT_DIE:number = 5;
var A4_SCRIPT_PENDINGTALK:number = 10;
var A4_SCRIPT_ADDTOPIC:number = 11;
var A4_SCRIPT_EVENTRULE:number = 34;
var A4_SCRIPT_STORYSTATE:number = 13;
var A4_SCRIPT_STORYSTATECHECK:number = 50;
var A4_SCRIPT_FAMILIARWITHMAP:number = 31;
var A4_SCRIPT_LOSEITEM:number = 20;
var A4_SCRIPT_GAINITEM:number = 21;
var A4_SCRIPT_GAINGOLD:number = 35;
var A4_SCRIPT_GAINGOLDOTHER:number = 27;
var A4_SCRIPT_STARTTRADING:number = 30;
var A4_SCRIPT_ADDAGENDA:number = 32;
var A4_SCRIPT_REMOVEAGENDA:number = 33;
var A4_SCRIPT_ROTATE_RIGHT:number = 47;
var A4_SCRIPT_ROTATE_LEFT:number = 48;
var A4_SCRIPT_ANIMATION:number = 49;
var A4_SCRIPT_ATTRIBUTE:number = 52;
var A4_SCRIPT_INMAPCHECK:number = 53;
var A4_SCRIPT_HASITEMCHECK:number = 54;

var A4_SCRIPT_ADDPERCEPTIONPROPERTY:number = 55;
var A4_SCRIPT_REMOVEPERCEPTIONPROPERTY:number = 56;

var A4_SCRIPT_IN_VEHICLE:number = 14;

var A4_N_SCRIPTS:number = 69;        // #12, #15 and #29 are available
var A4_MAX_N_SCRIPTS:number = 100;   // some space for custom scripts 

var SCRIPT_FINISHED:number = 0;
var SCRIPT_NOT_FINISHED:number = 1;
var SCRIPT_FAILED:number = 2;

var SOUND_DISTANCE_THRESHOLD:number = 256;


var scriptNames:string[] = new Array(A4_MAX_N_SCRIPTS);

scriptNames[A4_SCRIPT_GAMECOMPLETE] = "gameComplete";
scriptNames[A4_SCRIPT_MESSAGE] = "message";
scriptNames[A4_SCRIPT_DELAY] = "delay";
scriptNames[A4_SCRIPT_PLAYSOUND] = "playSound";
scriptNames[A4_SCRIPT_STOPSOUND] = "stopSound";
scriptNames[A4_SCRIPT_IF] = "if";

scriptNames[A4_SCRIPT_TELEPORT] = "teleport";
scriptNames[A4_SCRIPT_GOTO] = "goto";
scriptNames[A4_SCRIPT_GOTO_CHARACTER] = "gotoCharacter";
scriptNames[A4_SCRIPT_GOTO_OPENING_DOORS] = "gotoOpeningDoors";
scriptNames[A4_SCRIPT_USE] = "use";
scriptNames[A4_SCRIPT_OPENDOORS] = "openDoors";
scriptNames[A4_SCRIPT_TALK] = "talk";
scriptNames[A4_SCRIPT_TALKOTHER] = "talkOther";
scriptNames[A4_SCRIPT_STEAL] = "steal";
scriptNames[A4_SCRIPT_GIVE] = "give";
scriptNames[A4_SCRIPT_SELL] = "sell";
scriptNames[A4_SCRIPT_DROP] = "drop";
scriptNames[A4_SCRIPT_TAKE] = "take";
scriptNames[A4_SCRIPT_INTERACT] = "interact";
scriptNames[A4_SCRIPT_INTERACT_WITH_OBJECT] = "interactWithObject";
scriptNames[A4_SCRIPT_EMBARK] = "embark";
scriptNames[A4_SCRIPT_DISEMBARK] = "disembark";
scriptNames[A4_SCRIPT_BUY] = "buy";
scriptNames[A4_SCRIPT_CHOP] = "chop";
scriptNames[A4_SCRIPT_SLEEPOTHER] = "sleepOther";
scriptNames[A4_SCRIPT_TAKE_FROM_CONTAINER] = "takeFromContainer";
scriptNames[A4_SCRIPT_PUT_IN_CONTAINER] = "putInContainer";
scriptNames[A4_SCRIPT_EATIFHUNGRY] = "eatIfHungry";
scriptNames[A4_SCRIPT_DRINKIFTHIRSTY] = "drinkIfThirsty";
scriptNames[A4_SCRIPT_PUSH] = "push";
scriptNames[A4_SCRIPT_PULL] = "pull";

scriptNames[A4_SCRIPT_DIE] = "die";
scriptNames[A4_SCRIPT_PENDINGTALK] = "pendingTalk";
scriptNames[A4_SCRIPT_ADDTOPIC] = "addTopic";
scriptNames[A4_SCRIPT_EVENTRULE] = "eventRule";
scriptNames[A4_SCRIPT_STORYSTATE] = "storyState";
scriptNames[A4_SCRIPT_STORYSTATECHECK] = "storyStateCheck";
scriptNames[A4_SCRIPT_FAMILIARWITHMAP] = "familiarWithMap";
scriptNames[A4_SCRIPT_LOSEITEM] = "loseItem";
scriptNames[A4_SCRIPT_GAINITEM] = "gainItem";
scriptNames[A4_SCRIPT_GAINGOLD] = "gainGold";
scriptNames[A4_SCRIPT_GAINGOLDOTHER] = "gainGoldOther";
scriptNames[A4_SCRIPT_STARTTRADING] = "startTrading";
scriptNames[A4_SCRIPT_ADDAGENDA] = "addAgenda";
scriptNames[A4_SCRIPT_REMOVEAGENDA] = "removeAgenda";
scriptNames[A4_SCRIPT_ROTATE_RIGHT] = "rotateRight";
scriptNames[A4_SCRIPT_ROTATE_LEFT] = "rotateLeft";
scriptNames[A4_SCRIPT_ANIMATION] = "animation";
scriptNames[A4_SCRIPT_ATTRIBUTE] = "attribute";
scriptNames[A4_SCRIPT_INMAPCHECK] = "inMapCheck";
scriptNames[A4_SCRIPT_HASITEMCHECK] = "hasItemCheck";

scriptNames[A4_SCRIPT_ADDPERCEPTIONPROPERTY] = "addPerceptionProperty";
scriptNames[A4_SCRIPT_REMOVEPERCEPTIONPROPERTY] = "removePerceptionProperty";

scriptNames[A4_SCRIPT_IN_VEHICLE] = "inVehicle";

var scriptFunctions:((A4Script, A4Object, A4Map, A4Game, A4Character) => number)[] = new Array(A4_MAX_N_SCRIPTS);

scriptFunctions[A4_SCRIPT_GAMECOMPLETE] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    game.setGameComplete(true, script.ID);
    return SCRIPT_FINISHED;
};


scriptFunctions[A4_SCRIPT_MESSAGE] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    game.addMessage(script.text);
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_DELAY] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    script.state++;
    if (script.state >= script.value) {
        script.state = 0;
        return SCRIPT_FINISHED
    }
    return SCRIPT_NOT_FINISHED;
}


scriptFunctions[A4_SCRIPT_PLAYSOUND] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    // only play if it's in the same map as the current player:
    if (map==game.currentPlayer.map) {
        if (o != null && game != null) {
            if (o.pixelDistance(game.currentPlayer) < SOUND_DISTANCE_THRESHOLD)
            game.playSound(script.ID);
        } else {
            game.playSound(script.ID);
        }
    }
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_STOPSOUND] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    console.error("stopSound not supported iyet!");
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_IF] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    switch(script.if_state) {
        case 0: // condition:
            {
                if (script.state>=script.subScripts.length) {
                    // reaching the end, assume everything went fine, swith to "then":
                    script.if_state = 1;
                    script.state = 0;
                    return SCRIPT_NOT_FINISHED;
                } else {
                    switch(script.subScripts[script.state].execute(o, map, game, otherCharacter)) {
                    case SCRIPT_FAILED:
                        script.if_state = 2;
                        script.state = 0;
                        return SCRIPT_NOT_FINISHED;
                    case SCRIPT_NOT_FINISHED:
                        return SCRIPT_NOT_FINISHED;
                    case SCRIPT_FINISHED:
                        script.state++;
                        return SCRIPT_NOT_FINISHED;
                    }
                }
            }
            break;
        case 1: // then:
            {
                if (script.state>=script.thenSubScripts.length) {
                    return SCRIPT_FINISHED;
                } else {
                    switch(script.thenSubScripts[script.state].execute(o, map, game, otherCharacter)) {
                        case SCRIPT_FAILED:
                            return SCRIPT_FAILED;
                        case SCRIPT_NOT_FINISHED:
                            return SCRIPT_NOT_FINISHED;
                        case SCRIPT_FINISHED:
                            script.state++;
                            return SCRIPT_NOT_FINISHED;
                    }
                }
            }
            break;
        case 2: // else:
            {
                if (script.state>=script.elseSubScripts.length) {
                    return SCRIPT_FINISHED;
                } else {
                    switch(script.elseSubScripts[script.state].execute(o, map, game, otherCharacter)) {
                        case SCRIPT_FAILED:
                            return SCRIPT_FAILED;
                        case SCRIPT_NOT_FINISHED:
                            return SCRIPT_NOT_FINISHED;
                        case SCRIPT_FINISHED:
                            script.state++;
                            return SCRIPT_NOT_FINISHED;
                    }
                }
            }
            break;
    }
    return SCRIPT_FAILED;
}


scriptFunctions[A4_SCRIPT_TELEPORT] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (script.ID!=null) {
        map = game.getMap(script.ID);
    }
    game.requestWarp(o, map, script.x, script.y);//, o.layer);
    return SCRIPT_FINISHED;
}



scriptFunctions[A4_SCRIPT_GOTO] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (script.timeOut != null) {
        script.timeOut--;
        if (script.timeOut <= 0) return SCRIPT_FAILED;
    }
    if (o.isAICharacter()) {
        let priority:number = 10;
        let aic:A4AICharacter = <A4AICharacter>o;
        let ai:A4PathFinding = aic.AI;
        if (script.ID!=null) {
            map = game.getMap(script.ID);
        }
        if (o.x==script.x && o.y==script.y && o.map==map) {
            return SCRIPT_FINISHED;
        } else {
            if (o.map != map && script.stopAfterGoingThroughABridge) {
                // we went through a bridge, stop!
                return SCRIPT_FINISHED;
            }
            ai.addPFTarget(script.x, script.y, script.x, script.y, map, game, A4CHARACTER_COMMAND_IDLE, priority, false, null);
            return SCRIPT_NOT_FINISHED;
        }
    } else {
        return SCRIPT_FAILED;
    }
}

scriptFunctions[A4_SCRIPT_GOTO_OPENING_DOORS] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (script.timeOut != null) {
        script.timeOut--;
        if (script.timeOut <= 0) return SCRIPT_FAILED;
    }    
    if (o.isAICharacter()) {
        let priority:number = 10;
        let aic:A4AICharacter = <A4AICharacter>o;
        let ai:A4PathFinding = aic.AI;
        if (script.ID!=null) {
            map = game.getMap(script.ID);
        }
        if (o.x==script.x && o.y==script.y && o.map==map) {
            return SCRIPT_FINISHED;
        } else {
            if (o.map != map && script.stopAfterGoingThroughABridge) {
                // we went through a bridge, stop!
                return SCRIPT_FINISHED;
            }
            ai.addPFTarget(script.x, script.y, script.x, script.y, map, game, A4CHARACTER_COMMAND_IDLE, priority, false, null);

            let collisions:A4Object[] = o.map.getAllObjectCollisionsWithOffset(o, direction_x_inc[o.direction], direction_y_inc[o.direction]);
            for(let o2 of collisions) {
                if ((o2 instanceof A4Door) &&
                    (<A4Door>o2).closed &&
                    (<A4Door>o2).canOpen(aic, game) &&
                    ai.doorsNotToOpenWhileWalking.indexOf((<A4Door>o2).doorID) == -1) {
                    // try to open it!
                    let cmd:A4CharacterCommand = new A4CharacterCommand(A4CHARACTER_COMMAND_INTERACT, 0, o.direction, null, null, 10);
                    (<A4Character>o).issueCommand(cmd, game);
                } else if ((o2 instanceof ShrdluAirlockDoor)) {
                    if (script.ID != aic.map.name) {
                    // if (o2.targetMap == script.ID) {
                        // if we are going outside, then use it:
                        let door:ShrdluAirlockDoor = <ShrdluAirlockDoor>o2;
                        // close the corresponding airlock door if it is not closed:
                        let otherdoor:A4Door = <A4Door>game.findObjectByIDJustObject(door.otherDoorID);
                        if (otherdoor == null || otherdoor.closed) {
                            // if it is closed, then teleport to the other side:
                            game.requestWarp(o, game.getMap(o2.targetMap), door.targetX, door.targetY);
                        } else {
                            otherdoor.event(A4_EVENT_INTERACT, aic, o.map, game);
                        }
                    }
                }
            }

            // if we are going to a different map, check for potential airlocks left/right:
            if (script.ID != o.map.name) {
                collisions = o.map.getAllObjectCollisionsWithOffset(o, direction_x_inc[(o.direction+1)%A4_NDIRECTIONS], direction_y_inc[(o.direction+1)%A4_NDIRECTIONS]);
                collisions = collisions.concat(o.map.getAllObjectCollisionsWithOffset(o, direction_x_inc[(o.direction+3)%A4_NDIRECTIONS], direction_y_inc[(o.direction+3)%A4_NDIRECTIONS]));
                for(let o2 of collisions) {
                    if ((o2 instanceof ShrdluAirlockDoor)) {
                        if (o2.targetMap == script.ID) {
                            // if we are going outside, then use it:
                            let door:ShrdluAirlockDoor = <ShrdluAirlockDoor>o2;
                            // close the corresponding airlock door if it is not closed:
                            let otherdoor:A4Door = <A4Door>game.findObjectByIDJustObject(door.otherDoorID);
                            if (otherdoor == null || otherdoor.closed) {
                                // if it is closed, then teleport to the other side:
                                game.requestWarp(o, map, door.targetX, door.targetY);
                            } else {
                                otherdoor.event(A4_EVENT_INTERACT, aic, o.map, game);
                            }
                        }
                    }
                }
            }

            return SCRIPT_NOT_FINISHED;
        }
    } else {
        return SCRIPT_FAILED;
    }
}


scriptFunctions[A4_SCRIPT_GOTO_CHARACTER] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (script.timeOut != null) {
        script.timeOut--;
        if (script.timeOut <= 0) return SCRIPT_FAILED;
    }    
    if (o.isAICharacter()) {
        let aic:A4AICharacter = <A4AICharacter>o;
        let ai:A4PathFinding = aic.AI;
        let priority:number = 10;

        let targetObject:A4Object = game.findObjectByIDJustObject(script.ID);
        if (targetObject == null) return SCRIPT_FAILED;
        let distance_x:number = 0;
        let distance_y:number = 0;
        if (o.x + o.getPixelWidth() < targetObject.x) {
            distance_x = targetObject.x - (o.x + o.getPixelWidth());
        } else if (o.x > targetObject.x + targetObject.getPixelWidth()) {
            distance_x = o.x - (targetObject.x + targetObject.getPixelWidth());
        }
        if (o.y + o.getPixelHeight() < targetObject.y) {
            distance_y = (targetObject.y) - (o.y + o.getPixelHeight());
        } else if (targetObject.y + targetObject.getPixelHeight() < o.y) {
            distance_y = (o.y) - (targetObject.y + targetObject.getPixelHeight());
        }
        let distance:number = distance_x + distance_y;
        if (distance <= 0) return SCRIPT_FINISHED;
        
        if (ai.canSeeObject(targetObject, game)) {
            ai.addPFTargetObject(A4CHARACTER_COMMAND_IDLE, priority, false, targetObject, game);
            return SCRIPT_NOT_FINISHED;
        } else {
            if (script.wait) return SCRIPT_FAILED;   // when we don't see the target anymore, we are done
            return SCRIPT_FAILED;
        }
    } else {
        return SCRIPT_FAILED;
    }
}



scriptFunctions[A4_SCRIPT_USE] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (o.isCharacter()) {
        let c:A4Character = <A4Character>o;
        let priority:number = 10;
        
        if (script.x==-1 && script.y==-1 && script.ID==null) {
            // use an object in the current position:
            if (c.isIdle()) {
                // activte lever:
                if (!c.useAction(game)) return SCRIPT_FAILED;
                return SCRIPT_FINISHED;
            } else {
                return SCRIPT_NOT_FINISHED;
            }
        } else if (script.x>=0 && script.y>=0) {
            // x,y,map version:
            if (o.isAICharacter()) {
                let aic:A4AICharacter = <A4AICharacter>o;
                let ai:A4PathFinding = aic.AI;
                if (script.ID!=null) map = game.getMap(script.ID);
                if (o.x==script.x && o.y==script.y && o.map==map) {
                    if (aic.isIdle()) {
                        // activte lever:
                        if (!aic.useAction(game)) return SCRIPT_FAILED;
                        return SCRIPT_FINISHED;
                    } else {
                        return SCRIPT_NOT_FINISHED;
                    }
                } else {
                    ai.addPFTarget(script.x, script.y, 
                                   script.x + o.getPixelWidth(),
                                   script.y + o.getPixelHeight(),
                                   map, game,
                                   A4CHARACTER_COMMAND_IDLE, priority, false, null);

                    return SCRIPT_NOT_FINISHED;
                }
            } else {
                return SCRIPT_FAILED;
            }
        } else {
            // use an item in the inventory:
            if (c.isIdle()) {
                for(let o2 of (<A4Character>o).inventory) {
                    if (o2.name == script.ID) {
                        // match!
                        if (o2.usable) {
                            o2.event(A4_EVENT_USE, c, map, game);
                            c.eventWithObject(A4_EVENT_ACTION_USE, null, o, map, game);
                        } else {
                            return SCRIPT_FAILED;
                        }
                        return SCRIPT_FINISHED;
                    }
                }
                return SCRIPT_FAILED;
            }
        }
        
    } else {
        return SCRIPT_FAILED;
    }
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_OPENDOORS] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    map.triggerObjectsEventWithID(A4_EVENT_OPEN, script.ID, otherCharacter, map, game);
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_TALK] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if ((<A4Character>o).state==A4CHARACTER_STATE_IDLE) {
        if (script.state==0) {
            if (script.thought) {
                (<A4Character>o).issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, script.text, A4_DIRECTION_NONE, game);
            } else {
                (<A4Character>o).issueCommandWithString(A4CHARACTER_COMMAND_TALK, script.text, A4_DIRECTION_NONE, game);
            }
            script.state = 1;
            if (!script.wait) return SCRIPT_FINISHED;
            return SCRIPT_NOT_FINISHED;
        } else {
            return SCRIPT_FINISHED;
        }
    } else {
        return SCRIPT_NOT_FINISHED;
    }
}


scriptFunctions[A4_SCRIPT_TALKOTHER] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (otherCharacter == null) return SCRIPT_FAILED;
    if (otherCharacter.state == A4CHARACTER_STATE_IDLE) {
        if (script.state==0) {
            if (script.thought) {
                otherCharacter.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, script.text, A4_DIRECTION_NONE, game);
            } else {
                otherCharacter.issueCommandWithString(A4CHARACTER_COMMAND_TALK, script.text, A4_DIRECTION_NONE, game);
            }
            script.state = 1;
            if (!script.wait) return SCRIPT_FINISHED;
            return SCRIPT_NOT_FINISHED;
        } else {
            return SCRIPT_FINISHED;
        }
    } else {
        return SCRIPT_NOT_FINISHED;
    }
}


scriptFunctions[A4_SCRIPT_STEAL] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (script.ID!=null && otherCharacter!=null) {
        // it's from the inventory:
        for(let o2 of otherCharacter.inventory) {
            if (o2.name == script.ID ||
                o2.ID == script.ID) {
                // match!
                otherCharacter.removeFromInventory(o2);
                (<A4Character>o).addObjectToInventory(o2, game);
                game.playSound("data/sfx/itemPickup.wav");
                return SCRIPT_FINISHED;
            }
        }
    }    
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_GIVE] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (otherCharacter==null) return SCRIPT_FAILED;
    let item:A4Object = null;
    if (script.ID!=null) {
        // it's from the inventory:
        for(let o2 of (<A4Character>o).inventory) {
            if (o2.name == script.ID ||
                o2.ID == script.ID) {
                // match!
                item = o2;
                break;
            }
        }
    } else if (script.objectDefinition!=null) {
        // it's a new item:
        item = game.objectFactory.createObject(script.objectDefinition.getAttribute("class"), game, false, false);
        item.loadObjectAdditionalContent(script.objectDefinition, game, game.objectFactory, null, null);
    }
    if (item==null) {
        return SCRIPT_FAILED;
    } else {
        let weight:number = 1;
        if (item instanceof A4Item) {
            weight = (<A4Item>item).weight;
        }
        if (weight >= otherCharacter.strength) {
            return SCRIPT_FAILED;
        }
        (<A4Character>o).removeFromInventory(item);
        otherCharacter.addObjectToInventory(item, game);
        o.map.addPerceptionBufferRecord(new PerceptionBufferRecord("give", o.ID, o.sort,
                otherCharacter.ID, otherCharacter.sort, null,
                item.ID, item.sort,
                o.x, o.y, o.x+o.getPixelWidth(), o.y+o.getPixelHeight()));
        otherCharacter.eventWithObject(A4_EVENT_RECEIVE, <A4Character>o, item, this.map, game);
        o.eventWithObject(A4_EVENT_ACTION_GIVE, otherCharacter, item, this.map, game);
        game.playSound("data/sfx/itemPickup.wav");
        game.inGameActionsForLog.push(["give("+o.ID+","+item.ID+","+otherCharacter.ID+")",""+game.in_game_seconds]);
        return SCRIPT_FINISHED;
    }
}


scriptFunctions[A4_SCRIPT_SELL] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (otherCharacter==null) return SCRIPT_FAILED;
    let item:A4Object = null;
    if (script.ID!=null) {
        // it's from the inventory:
        for(let o2 of (<A4Character>o).inventory) {
            if (o2.name == script.ID ||
                o2.ID == script.ID) {
                // match!
                item = o2;
                break;
            }
        }
    } else if (script.objectDefinition!=null) {
        // it's a new item:
        item = game.objectFactory.createObject(script.objectDefinition.getAttribute("class"), game, false, false);
        item.loadObjectAdditionalContent(script.objectDefinition, game, game.objectFactory, null, null);
    }
    if (item==null) {
        return SCRIPT_FAILED;
    } else {
        if (otherCharacter.gold>=item.gold) {
            otherCharacter.gold -= item.gold;
            o.gold += item.gold;
            (<A4Character>o).removeFromInventory(item);
            otherCharacter.addObjectToInventory(item, game);
            game.playSound("data/sfx/itemPickup.wav");
            return SCRIPT_FINISHED;
        } else {
            return SCRIPT_FAILED;
        }
    }
}


scriptFunctions[A4_SCRIPT_DROP] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    let item:A4Object = null;
    if (script.ID!=null) {
        // it's from the inventory:
        for(let o2 of (<A4Character>o).inventory) {
            if (o2.name == script.ID ||
                o2.ID == script.ID) {
                // match!
                item = o2;
                break;
            }
        }
    } else if (script.objectDefinition!=null) {
        // it's a new item:
        item = game.objectFactory.createObject(script.objectDefinition.getAttribute("class"), game, false, false);
        item.loadObjectAdditionalContent(script.objectDefinition, game, game.objectFactory, null, null);
    }
    if (item==null) {
        return SCRIPT_FAILED;
    } else {
        (<A4Character>o).removeFromInventory(item);
        game.requestWarp(item, map, o.x, o.y);//, A4_LAYER_FG);
        game.playSound("data/sfx/itemPickup.wav");
        return SCRIPT_FINISHED;
    }
}


scriptFunctions[A4_SCRIPT_TAKE] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (o.isAICharacter()) {
        let priority:number = 10;
        let aic:A4AICharacter = <A4AICharacter>o;
        let ai:A4PathFinding = aic.AI;
        if (script.ID!=null) map = game.getMap(script.ID);
        if (o.x==script.x && o.y==script.y && o.map==map) {
            if (aic.isIdle()) {
                // take:
                if (!aic.takeAction(game)) return SCRIPT_FAILED;
                return SCRIPT_FINISHED;
            } else {
                return SCRIPT_NOT_FINISHED;
            }
        } else {
            ai.addPFTarget(script.x, script.y, 
                           script.x + o.getPixelWidth(),
                           script.y + o.getPixelHeight(),
                           map, game,
                           A4CHARACTER_COMMAND_IDLE, priority, false, null);
            return SCRIPT_NOT_FINISHED;
        }
    } else {
        return SCRIPT_FAILED;
    }
}


scriptFunctions[A4_SCRIPT_INTERACT] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (o.isCharacter()) {
        let c:A4Character = <A4Character>o;
        let priority:number = 10;
        
        if (script.x==-1 && script.y==-1 && script.ID==null) {
            // you need to specify a target position to interact, since interacting requires a direction
            return SCRIPT_FAILED;
        } else if (script.x>=0 && script.y>=0) {
            // x,y,map version:
            if (o.isAICharacter()) {
                let aic:A4AICharacter = <A4AICharacter>o;
                let ai:A4PathFinding = aic.AI;
                if (script.ID!=null) map = game.getMap(script.ID);
                
                let interactDirection:number = A4_DIRECTION_NONE;
                if (o.map==map) {
                    if (o.x+o.getPixelWidth() == script.x && o.y == script.y) interactDirection = A4_DIRECTION_RIGHT;
                    if (o.x-o.getPixelWidth() == script.x && o.y == script.y) interactDirection = A4_DIRECTION_LEFT;
                    if (o.x == script.x && o.y+o.getPixelHeight() == script.y) interactDirection = A4_DIRECTION_DOWN;
                    if (o.x == script.x && o.y-o.getPixelHeight() == script.y) interactDirection = A4_DIRECTION_UP;
                }
                
                if (interactDirection != A4_DIRECTION_NONE) {
                    if (aic.isIdle()) {
                        // character is on position:
                        c.issueCommandWithArguments(A4CHARACTER_COMMAND_INTERACT,0,interactDirection, null, game);
                        return SCRIPT_FINISHED;
                    } else {
                        return SCRIPT_NOT_FINISHED;
                    }
                } else {
                    ai.addPFTarget(script.x, script.y, 
                                   script.x + o.getPixelWidth(),
                                   script.y + o.getPixelHeight(),
                                   map, game,
                                   A4CHARACTER_COMMAND_IDLE, priority, false, null);
                    return SCRIPT_NOT_FINISHED;
                }
            } else {
                return SCRIPT_FAILED;
            }
        }
    } else {
        return SCRIPT_FAILED;
    }
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_INTERACT_WITH_OBJECT] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (o.isAICharacter()) {
        let aic:A4AICharacter = <A4AICharacter>o;
        let ai:A4PathFinding = aic.AI;
        let priority:number = 10;

        let targetObject:A4Object = game.findObjectByIDJustObject(script.ID);
        if (targetObject == null) return SCRIPT_FAILED;
        let distance_x:number = 0;
        let distance_y:number = 0;
        let interactDirection:number = A4_DIRECTION_NONE;
        if (o.x + o.getPixelWidth() <= targetObject.x) {
            distance_x = targetObject.x - (o.x + o.getPixelWidth());
            interactDirection = A4_DIRECTION_RIGHT;
        } else if (o.x >= targetObject.x + targetObject.getPixelWidth()) {
            distance_x = o.x - (targetObject.x + targetObject.getPixelWidth());
            interactDirection = A4_DIRECTION_LEFT;
        }
        if (o.y + o.getPixelHeight() <= targetObject.y) {
            distance_y = targetObject.y - (o.y + o.getPixelHeight());
            interactDirection = A4_DIRECTION_DOWN;
        } else if (targetObject.y + targetObject.getPixelHeight() <= o.y) {
            distance_y = o.y - (targetObject.y + targetObject.getPixelHeight());
            interactDirection = A4_DIRECTION_UP;
        }
        let distance:number = distance_x + distance_y;
        // special case of the corners:
        if (o.x + o.getPixelWidth() == targetObject.x && o.y + o.getPixelHeight() == targetObject.y) distance = 1;
        if (o.x + o.getPixelWidth() == targetObject.x && targetObject.y + targetObject.getPixelHeight() == o.y) distance = 1;
        if (targetObject.x + targetObject.getPixelWidth() == o.x && o.y + o.getPixelHeight() == targetObject.y) distance = 1;
        if (targetObject.x + targetObject.getPixelWidth() == o.x && targetObject.y + targetObject.getPixelHeight() == o.y) distance = 1;

        if (distance <= 0) {
            // we have arrived, interact!            
            if (interactDirection != A4_DIRECTION_NONE) {
                if (aic.isIdle()) {
                    // character is on position:
                    aic.issueCommandWithArguments(A4CHARACTER_COMMAND_INTERACT,0,interactDirection, null, game);
                    return SCRIPT_FINISHED;
                } else {
                    return SCRIPT_NOT_FINISHED;
                }
            } else {
                return SCRIPT_FAILED;
            }
        }
        
        if (ai.canSeeObject(targetObject, game)) {
            ai.addPFTargetObject(A4CHARACTER_COMMAND_IDLE, priority, false, targetObject, game);
            return SCRIPT_NOT_FINISHED;
        } else {
            if (script.wait) return SCRIPT_FAILED;   // if we don't see the target anymore, we are done
            return SCRIPT_FAILED;
        }
    } else {
        return SCRIPT_FAILED;
    }
}


scriptFunctions[A4_SCRIPT_EMBARK] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (o.isCharacter()) {
        let c:A4Character = <A4Character>o;
        let priority:number = 10;
        
        if (script.x==-1 && script.y==-1 && script.ID==null) {
            // embark on the transport in the current position
            let v:A4Object = c.map.getVehicleObject(c.x + Math.floor(c.getPixelWidth()/2) - 1, c.y + Math.floor(c.getPixelHeight()/2)- 1, 2, 2);
            if (v!=null) {
                c.embark(<A4Vehicle>v);
                c.map.addPerceptionBufferRecord(new PerceptionBufferRecord("embark", c.ID, c.sort, 
                                                                           v.ID, v.sort, null,
                                                                           null, null,
                                                                           c.x, c.y, c.x+c.getPixelWidth(), c.y+c.getPixelHeight()));
                return SCRIPT_FINISHED;
            }
            return SCRIPT_FAILED;
        } else if (script.x>=0 && script.y>=0) {
            // x,y,map version:
            if (o.isAICharacter()) {
                let aic:A4AICharacter = <A4AICharacter>o;
                let ai:A4PathFinding = aic.AI;
                if (script.ID!=null) map = game.getMap(script.ID);
                if (o.x==script.x && o.y==script.y && o.map==map) {
                    if (aic.isIdle()) {
                        // character is on position:
                        let v:A4Object = c.map.getVehicleObject(c.x + Math.floor(c.getPixelWidth()/2) - 1, c.y + Math.floor(c.getPixelHeight()/2) - 1, 2, 2);
                        if (v!=null) {
                            c.embark(<A4Vehicle>v);
                            c.map.addPerceptionBufferRecord(new PerceptionBufferRecord("embark", c.ID, c.sort, 
                                                                                       v.ID, v.sort, null,
                                                                                       null, null,
                                                                                       c.x, c.y, c.x+c.getPixelWidth(), c.y+c.getPixelHeight()));
                            return SCRIPT_FINISHED;
                        }
                        return SCRIPT_FAILED;
                    } else {
                        return SCRIPT_NOT_FINISHED;
                    }
                } else {
                    ai.addPFTarget(script.x, script.y, 
                                   script.x + o.getPixelWidth(),
                                   script.y + o.getPixelHeight(),
                                   map, game,
                                   A4CHARACTER_COMMAND_IDLE, priority, false, null);
                    return SCRIPT_NOT_FINISHED;
                }
            } else {
                return SCRIPT_FAILED;
            }
        }
    } else if (o.isVehicle() && otherCharacter != null) {
        let c:A4Character = otherCharacter;
        otherCharacter.embark(<A4Vehicle>o);
        otherCharacter.map.addPerceptionBufferRecord(new PerceptionBufferRecord("embark", c.ID, c.sort, 
                                                                   o.ID, o.sort, null,
                                                                   null, null,
                                                                   c.x, c.y, c.x+c.getPixelWidth(), c.y+c.getPixelHeight()));
        return SCRIPT_FINISHED;
    } else {
        return SCRIPT_FAILED;
    }
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_DISEMBARK] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (o.isCharacter()) {
        let c:A4Character = <A4Character>o;
        let priority:number = 10;
        
        if (!c.isInVehicle()) return SCRIPT_FAILED;
        
        if (script.x==-1 && script.y==-1 && script.ID==null) {
            // disembark on the transport in the current position
            c.disembark();
            c.map.addPerceptionBufferRecord(new PerceptionBufferRecord("disembark", c.ID, c.sort, 
                                                                       c.vehicle.ID, c.vehicle.sort, null, 
                                                                       null, null,
                                                                       c.x, c.y, c.x+c.getPixelWidth(), c.y+c.getPixelHeight()));
            return SCRIPT_FINISHED;
        } else if (script.x>=0 && script.y>=0) {
            // x,y,map version:
            if (o.isAICharacter()) {
                let aic:A4AICharacter = <A4AICharacter>o;
                let ai:A4PathFinding = aic.AI;
                if (script.ID!=null) map = game.getMap(script.ID);
                if (o.x==script.x && o.y==script.y && o.map==map) {
                    // character is on position:
                    c.map.addPerceptionBufferRecord(new PerceptionBufferRecord("disembark", c.ID, c.sort, 
                                                                               c.vehicle.ID, c.vehicle.sort, null, 
                                                                               null, null,
                                                                               c.x, c.y, c.x+c.getPixelWidth(), c.y+c.getPixelHeight()));
                    c.disembark();
                    return SCRIPT_FINISHED;
                } else {
                    ai.addPFTarget(script.x, script.y, 
                                   script.x + o.getPixelWidth(),
                                   script.y + o.getPixelHeight(),
                                   map, game,
                                   A4CHARACTER_COMMAND_IDLE, priority, false, null);
                    return SCRIPT_NOT_FINISHED;
                }
            } else {
                return SCRIPT_FAILED;
            }
        }
    } else {
        return SCRIPT_FAILED;
    }
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_BUY] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (o.isCharacter()) {
        let c:A4Character = <A4Character>o;
        if (script.ID!=null && otherCharacter!=null) {
            for(let o2 of otherCharacter.inventory) {
                if (o2.name == script.ID) {
                    // match!
                    if (c.gold>=o2.gold) {
                        otherCharacter.removeFromInventory(o2);
                        c.addObjectToInventory(o2, game);
                        c.gold -= o2.gold;
                        otherCharacter.gold += o2.gold;
                        return SCRIPT_FINISHED;
                    } else {
                        return SCRIPT_FAILED;
                    }
                }
            }
        }
    }
    return SCRIPT_FAILED;
}


scriptFunctions[A4_SCRIPT_CHOP] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (o.isCharacter()) {
        let c:A4Character = <A4Character>o;
        let priority:number = 10;
        
        if (script.x==-1 && script.y==-1 && script.ID==null) {
            // you need to specify a target position to interact, since interacting requires a direction
            return SCRIPT_FAILED;
        } else if (script.x>=0 && script.y>=0) {
            // x,y,map version:
            if (o.isAICharacter()) {
                let aic:A4AICharacter = <A4AICharacter>o;
                let ai:A4PathFinding = aic.AI;
                if (script.ID!=null) map = game.getMap(script.ID);
                
                let interactDirection:number = A4_DIRECTION_NONE;
                if (o.map==map) {
                    if (o.x+o.getPixelWidth() == script.x && o.y == script.y) interactDirection = A4_DIRECTION_RIGHT;
                    if (o.x-o.getPixelWidth() == script.x && o.y == script.y) interactDirection = A4_DIRECTION_LEFT;
                    if (o.x == script.x && o.y+o.getPixelHeight() == script.y) interactDirection = A4_DIRECTION_DOWN;
                    if (o.x == script.x && o.y-o.getPixelHeight() == script.y) interactDirection = A4_DIRECTION_UP;
                }
                
                if (interactDirection != A4_DIRECTION_NONE) {
                    if (aic.isIdle()) {
                        // character is on position:
                        c.issueCommandWithArguments(A4CHARACTER_COMMAND_INTERACT,0,interactDirection, null, game);
                        return SCRIPT_FINISHED;
                    } else {
                        return SCRIPT_NOT_FINISHED;
                    }
                } else {
                    ai.addPFTarget(script.x, script.y, 
                                   script.x + o.getPixelWidth(),
                                   script.y + o.getPixelHeight(),
                                   map, game,
                                   A4CHARACTER_COMMAND_IDLE, priority, false, null);
                    return SCRIPT_NOT_FINISHED;
                }
            } else {
                return SCRIPT_FAILED;
            }
        }
    } else {
        return SCRIPT_FAILED;
    }
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_SLEEPOTHER] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    otherCharacter.getInBed(o, game);
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_TAKE_FROM_CONTAINER] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (!o.isAICharacter()) return SCRIPT_FAILED;
    let ret:number = scriptFunctions[A4_SCRIPT_GOTO_CHARACTER](script, o, map, game, otherCharacter);
    if (ret == SCRIPT_FAILED ||
        ret == SCRIPT_NOT_FINISHED) return ret;

    let target:A4Object = game.findObjectByIDJustObject(script.ID);
    if (target == null) return SCRIPT_FAILED;
    if (!(target instanceof A4ObstacleContainer)) return SCRIPT_FAILED;
    let containerObject:A4ObstacleContainer = <A4ObstacleContainer>target;

    // take the object:
    for(let i:number = 0;i<containerObject.content.length;i++) {
        let item:A4Object = containerObject.content[i];
        if (item.ID == script.ID2) {
            // found it!
            containerObject.content.splice(i, 1);
            (<A4Character>o).inventory.push(item);
            game.playSound("data/sfx/itemPickup.wav");
            return SCRIPT_FINISHED;
        }
    }

    return SCRIPT_FAILED;
}


scriptFunctions[A4_SCRIPT_PUT_IN_CONTAINER] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (!o.isAICharacter()) return SCRIPT_FAILED;
    let ret:number = scriptFunctions[A4_SCRIPT_GOTO_CHARACTER](script, o, map, game, otherCharacter);
    if (ret == SCRIPT_FAILED ||
        ret == SCRIPT_NOT_FINISHED) return ret;

    let target:A4Object = game.findObjectByIDJustObject(script.ID);
    if (target == null) return SCRIPT_FAILED;
    if (!(target instanceof A4ObstacleContainer)) return SCRIPT_FAILED;
    let containerObject:A4ObstacleContainer = <A4ObstacleContainer>target;

    // if the container is closed, open it:
    if (containerObject.closeable && containerObject.closed) {
        containerObject.event(A4_EVENT_INTERACT, <A4Character>o, o.map, game);
        if (containerObject.closed) {
            // if didn't open!
            return SCRIPT_FAILED;
        }
    }

    // put the object:
    let character:A4Character = <A4Character>o;
    for(let i:number = 0;i<character.inventory.length;i++) {
        let item:A4Object = character.inventory[i];
        if (item.ID == script.ID2) {
            // found it!
            character.inventory.splice(i, 1);
            containerObject.content.push(item);
            game.playSound("data/sfx/itemPickup.wav");
            return SCRIPT_FINISHED;
        }
    }

    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_PUSH] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (!o.isAICharacter()) return SCRIPT_FAILED;
    let ret:number = scriptFunctions[A4_SCRIPT_GOTO_CHARACTER](script, o, map, game, otherCharacter);
    if (ret == SCRIPT_FAILED ||
        ret == SCRIPT_NOT_FINISHED) return ret;

    // Push the target!
    if ((<A4Character>o).isIdle()) {
        let target:A4Object = game.findObjectByIDJustObject(script.ID);
        let direction:number = script.value;
        if (direction == -1) direction = o.direction;
        if (target == null) return SCRIPT_FAILED;
        if (!target.isPushable()) return SCRIPT_FAILED;
        if ((<A4Character>o).pushAction(target, direction, game)) {
            return SCRIPT_FINISHED;
        } else {
            return SCRIPT_FAILED;
        }    
    } else {
        return SCRIPT_NOT_FINISHED;
    }
}


scriptFunctions[A4_SCRIPT_PULL] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (!o.isAICharacter()) return SCRIPT_FAILED;
    let ret:number = scriptFunctions[A4_SCRIPT_GOTO_CHARACTER](script, o, map, game, otherCharacter);
    if (ret == SCRIPT_FAILED ||
        ret == SCRIPT_NOT_FINISHED) return ret;

    // Pull the target!
    if ((<A4Character>o).isIdle()) {
        let target:A4Object = game.findObjectByIDJustObject(script.ID);
        let direction:number = script.value;
        if (direction == -1) direction = (o.direction+2)%A4_NDIRECTIONS;
        if (target == null) return SCRIPT_FAILED;
        if (!target.isPushable()) return SCRIPT_FAILED;
        if ((<A4Character>o).pushAction(target, direction, game)) {
            return SCRIPT_FINISHED;
        } else {
            return SCRIPT_FAILED;
        }    
    } else {
        return SCRIPT_NOT_FINISHED;
    }
}


scriptFunctions[A4_SCRIPT_EATIFHUNGRY] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (otherCharacter.hungerTimer >= script.value) {
        app.achievement_interact_eat_drink[0] = true;
        app.trigger_achievement_complete_alert();
        otherCharacter.hungerTimer = 0;
        return SCRIPT_FINISHED;
    } else {
        return SCRIPT_FAILED;
    }
}


scriptFunctions[A4_SCRIPT_DRINKIFTHIRSTY] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (otherCharacter.thirstTimer >= script.value) {
        app.achievement_interact_eat_drink[1] = true;
        app.trigger_achievement_complete_alert();
        otherCharacter.thirstTimer = 0;
        return SCRIPT_FINISHED;
    } else {
        return SCRIPT_FAILED;
    }
}


scriptFunctions[A4_SCRIPT_DIE] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    o.die();
    return SCRIPT_FINISHED;
}



scriptFunctions[A4_SCRIPT_EVENTRULE] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    o.addEventRule(script.rule.event, A4EventRule.fromA4EventRule(script.rule));
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_STORYSTATE] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    switch(script.value) {
        case A4_STORYSTATE_GAME:
            game.setStoryStateVariable(script.ID, script.text);
            break;
        case A4_STORYSTATE_MAP:
            map.setStoryStateVariable(script.ID, script.text, game);
            break;
        case A4_STORYSTATE_OBJECT:
            o.setStoryStateVariable(script.ID, script.text, game);
            break;
    }
    return SCRIPT_FINISHED;    
}


scriptFunctions[A4_SCRIPT_STORYSTATECHECK] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    switch(script.value) {
        case A4_STORYSTATE_GAME:
            if (game.getStoryStateVariable(script.ID) == script.text) return SCRIPT_FINISHED;
            break;
        case A4_STORYSTATE_MAP:
            if (map.getStoryStateVariable(script.ID) == script.text) return SCRIPT_FINISHED;
            break;
        case A4_STORYSTATE_OBJECT:
            if (o.getStoryStateVariable(script.ID) == script.text) return SCRIPT_FINISHED;
            break;
    }
    return SCRIPT_FAILED;
}


scriptFunctions[A4_SCRIPT_FAMILIARWITHMAP] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (!o.isAICharacter()) return SCRIPT_FAILED;
    //let m:AIMemory = (<A4AICharacter>o).AI.memory;
    let map_tf:A4Map = game.getMap(script.ID);
    
    if (map_tf==null) {
        return SCRIPT_FAILED;
    } else {
        for(let b of map_tf.bridges) {
            // perceived a bridge:
            if (b.linkedTo != null) {
                (<A4AICharacter>o).AI.addBridgeToLongTermMemory(b);
            }
        }
        for(let o2 of map_tf.objects) {
            // perceived a bridge:
            if (o2 instanceof ShrdluAirlockDoor) {
                (<A4AICharacter>o).AI.addBridgeToLongTermMemory(o2);
            }
        }
        if ((<A4AICharacter>o).AI.maps_familiar_with.indexOf(script.ID) == -1) {
            (<A4AICharacter>o).AI.maps_familiar_with.push(script.ID);
        }

        return SCRIPT_FINISHED;
    }    
};


scriptFunctions[A4_SCRIPT_LOSEITEM] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (o.isCharacter()) {
        for(let o2 of (<A4Character>o).inventory) {
            if ((script.ID != null && o2.name == script.ID) || 
                (script.text != null && o2.sort.name == script.text)) {
                // match!
                (<A4Character>o).removeFromInventory(o2);
                game.requestDeletion(o2);
                return SCRIPT_FINISHED;
            }
        }
    } else if (otherCharacter!=null && otherCharacter.isCharacter()) {
        for(let o2 of (<A4Character>otherCharacter).inventory) {
            if ((script.ID != null && o2.name == script.ID) || 
                (script.text != null && o2.sort.name == script.text)) {
                // match!
                (<A4Character>otherCharacter).removeFromInventory(o2);
                game.requestDeletion(o2);
                return SCRIPT_FINISHED;
            }
        }
    }
    return SCRIPT_FAILED;
}


scriptFunctions[A4_SCRIPT_GAINITEM] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    let o2:A4Object = game.objectFactory.createObject(script.objectDefinition.getAttribute("class"), game, false, false);
    o2.loadObjectAdditionalContent(script.objectDefinition, game, game.objectFactory, null, null);
    
    if (o2==null) console.error("Cannot generate object '"+script.objectDefinition.getAttribute("class")+"' in execute_gainItem");
    if (script.ID != null) o2.ID = script.ID;
    if (otherCharacter.inventory.length<A4_INVENTORY_SIZE) {
        otherCharacter.addObjectToInventory(o2, game);
    } else {
        game.requestWarp(o2, otherCharacter.map, otherCharacter.x, otherCharacter.y);//, A4_LAYER_FG);
    }
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_GAINGOLD] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    o.gold += script.value;
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_GAINGOLDOTHER] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    otherCharacter.gold += script.value;
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_STARTTRADING] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    // if any of the players involved in the trade is the player, then pull-up the trade dialog:
    if (game.currentPlayer == o) {
        game.trade_requested = otherCharacter;
    } else if (game.currentPlayer == otherCharacter) {
        game.trade_requested = <A4Character>o;
    }
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_ADDAGENDA] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    o.addAgenda(Agenda.fromAgenda(script.agenda));
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_REMOVEAGENDA] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    o.removeAgenda(script.ID);
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_ROTATE_RIGHT] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (o.direction == A4_DIRECTION_NONE) return SCRIPT_FAILED;
    o.direction++;
    if (o.direction>=A4_NDIRECTIONS) o.direction -= A4_NDIRECTIONS;
    o.currentAnimation = A4_ANIMATION_IDLE_LEFT + o.direction;
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_ROTATE_LEFT] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (o.direction == A4_DIRECTION_NONE) return SCRIPT_FAILED;
    o.direction--;
    if (o.direction < 0) o.direction += A4_NDIRECTIONS;
    o.currentAnimation = A4_ANIMATION_IDLE_LEFT + o.direction;
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_ANIMATION] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    let a:A4Animation = A4Animation.fromXML(script.objectDefinition, game);
    for(let idx:number = 0;idx<A4_N_ANIMATIONS;idx++) {
        if (animationNames[idx] == script.objectDefinition.getAttribute("name")) {
            o.setAnimation(idx, a);
            a = null;
            break;
        }
    }
    if (a != null) return SCRIPT_FAILED;
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_ATTRIBUTE] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    o.loadObjectAttribute(script.objectDefinition);
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_INMAPCHECK] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (map.name == script.ID) return SCRIPT_FINISHED;
    return SCRIPT_FAILED;
}


scriptFunctions[A4_SCRIPT_HASITEMCHECK] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (o.isCharacter()) {
        for(let o2 of (<A4Character>o).inventory) {
            if (script.ID != null && o2.name == script.ID) return SCRIPT_FINISHED;
            if (script.text != null && o2.sort.name == script.text) return SCRIPT_FINISHED;
        }
    } else if (otherCharacter!=null && otherCharacter.isCharacter()) {
        for(let o2 of (<A4Character>otherCharacter).inventory) {
            if (script.ID != null && o2.name == script.ID) return SCRIPT_FINISHED;
            if (script.text != null && o2.sort.name == script.text) return SCRIPT_FINISHED;
        }
    }
    return SCRIPT_FAILED;
}


scriptFunctions[A4_SCRIPT_ADDPERCEPTIONPROPERTY] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (script.ID != null) {
        if (o.perceptionProperties.indexOf(script.ID) == -1) {
            o.perceptionProperties.push(script.ID);
        }
    }
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_REMOVEPERCEPTIONPROPERTY] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    if (script.ID != null) {
        let idx:number = o.perceptionProperties.indexOf(script.ID);
        if (idx >= 0) {
            o.perceptionProperties.splice(idx, 1);
        }
    }
    return SCRIPT_FINISHED;
}


scriptFunctions[A4_SCRIPT_IN_VEHICLE] = function(script:A4Script, o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character) : number
{
    let vehicle:A4Object = game.findObjectByIDJustObject(script.text);
    if (vehicle == null) return SCRIPT_FAILED;
    if (vehicle.findObjectByID(script.ID) == null) return SCRIPT_FAILED;
    return SCRIPT_FINISHED;
}


class A4Script {

    constructor(type:number, ID:string, text:string, value:number, thought:boolean, wait:boolean)
    {
        this.ID = ID;
        this.type = type;
        this.text = text;
        this.value = value;
        this.thought = thought;
        this.wait = wait;
    }


    static fromA4Script(s: A4Script) : A4Script
    {
        let s2:A4Script = new A4Script(s.type, s.ID, null, 0, false, false);
        s2.ID2 = s.ID2;
        s2.value = s.value;
        s2.x = s.x;
        s2.y = s.y;
        s2.state = s.state;
        s2.if_state = s.if_state;
        s2.thought = s.thought;
        s2.wait = s.wait;
        s2.consume = s.consume;
        s2.text = s.text;
        s2.text2 = s.text2;
        s2.agenda = s.agenda;
        s2.rule = s.rule;
        s2.subScripts = [];
        for(let ss of s.subScripts) {
            s2.subScripts.push(ss);
        }
        s2.thenSubScripts = [];
        for(let ss of s.thenSubScripts) {
            s2.thenSubScripts.push(ss);
        }
        s2.elseSubScripts = [];
        for(let ss of s.elseSubScripts) {
            s2.elseSubScripts.push(ss);
        }
        s2.objectDefinition = s.objectDefinition;

        return s2;
    }


    static fromXML(xml:Element) : A4Script
    {
        for(let i:number = 0;i<scriptNames.length;i++) {
            if (xml.tagName == scriptNames[i]) {
                let s:A4Script = new A4Script(i, null, null, 0, false, false);
                switch(s.type) {
                    case A4_SCRIPT_GAMECOMPLETE:
                        s.ID = xml.getAttribute("id");
                        break;

                    case A4_SCRIPT_TELEPORT:
                        s.x = Number(xml.getAttribute("x"));
                        s.y = Number(xml.getAttribute("y"));
                        s.ID = xml.getAttribute("map");
                        break;
                    case A4_SCRIPT_GOTO:
                    case A4_SCRIPT_GOTO_OPENING_DOORS:
                        s.x = Number(xml.getAttribute("x"));
                        s.y = Number(xml.getAttribute("y"));
                        s.ID = xml.getAttribute("map");
                        if (xml.getAttribute("timeOut") != null) {
                            s.timeOut = Number(xml.getAttribute("timeOut"));
                        }
                        if (xml.getAttribute("stopAfterGoingThroughABridge") == "true") s.stopAfterGoingThroughABridge = true;
                        //console.log("goto XML: " + xml);
                        //console.log("goto XML.ID: " + s.ID);
                        break;
                    case A4_SCRIPT_GOTO_CHARACTER:
                    case A4_SCRIPT_INTERACT_WITH_OBJECT:
                        s.ID = xml.getAttribute("id");
                        if (xml.getAttribute("timeOut") != null) {
                            s.timeOut = Number(xml.getAttribute("timeOut"));
                        }
                        //console.log("goto XML: " + xml);
                        //console.log("goto XML.ID: " + s.ID);
                        break;

                    case A4_SCRIPT_PUSH:
                    case A4_SCRIPT_PULL:
                        s.ID = xml.getAttribute("id");
                        s.value = Number(xml.getAttribute("direction"));
                        break;

                    case A4_SCRIPT_DIE:
                    case A4_SCRIPT_ROTATE_RIGHT:
                    case A4_SCRIPT_ROTATE_LEFT:
                    case A4_SCRIPT_SLEEPOTHER:
                        break;

                    case A4_SCRIPT_TAKE_FROM_CONTAINER:
                    case A4_SCRIPT_PUT_IN_CONTAINER:
                        s.ID = xml.getAttribute("containerid");
                        s.ID2 = xml.getAttribute("itemid");
                        break;

                    case A4_SCRIPT_EATIFHUNGRY:
                        s.value = Number(xml.getAttribute("timer"));
                        break;

                    case A4_SCRIPT_DRINKIFTHIRSTY:
                        s.value = Number(xml.getAttribute("timer"));
                        break;

                    case A4_SCRIPT_USE:
                        if (xml.getAttribute("x")!=null) {
                            s.x = Number(xml.getAttribute("x"));
                            s.y = Number(xml.getAttribute("y"));
                        } else {
                            s.x = -1;
                            s.y = -1;
                        }
                        s.ID = xml.getAttribute("map");
                        if (xml.getAttribute("inventory")!=null) {
                            s.ID = xml.getAttribute("inventory");
                            s.x = -1;
                            s.y = -1;
                            if (xml.getAttribute("map")!=null) {
                                console.error("'map' and 'inventory' cannot be both specified in the same 'use' script!\n");
                                return null;
                            }
                            if (s.x!=-1 || s.y!=-1) {
                                console.error("'x/y' and 'inventory' cannot be both specified in the same 'use' script!\n");
                                return null;
                            }
                        }
                        break;

                    case A4_SCRIPT_OPENDOORS:
                        s.ID = xml.getAttribute("door");
                        break;

                    case A4_SCRIPT_MESSAGE:
                        s.text = xml.getAttribute("text");
                        break;


                    case A4_SCRIPT_TALK:
                        s.text = xml.getAttribute("text");

                        s.thought = false;
                        if (xml.getAttribute("thought") == "true") s.thought = true;
                        s.wait = false;
                        if (xml.getAttribute("wait") == "true") s.wait = true;
                        break;
              
                    case A4_SCRIPT_STORYSTATE:
                    case A4_SCRIPT_STORYSTATECHECK:
                        if (xml.getAttribute("scope") == "game") s.value = A4_STORYSTATE_GAME;
                        else if (xml.getAttribute("scope") == "map") s.value = A4_STORYSTATE_MAP;
                        else if (xml.getAttribute("scope") == "object") s.value = A4_STORYSTATE_OBJECT;
                        else if (xml.getAttribute("scope") == "character") s.value = A4_STORYSTATE_OBJECT;
                        else {
                            console.error("unrecognized scope in storyState/storyStateCheck " + xml.getAttribute("scope"));
                            return null;
                        }
                        s.ID = xml.getAttribute("variable");
                        s.text = xml.getAttribute("value");
                        break;
                    case A4_SCRIPT_STEAL:
                        s.ID = xml.getAttribute("name");
                        break;
                    
                    case A4_SCRIPT_GIVE:
                    case A4_SCRIPT_SELL:
                    case A4_SCRIPT_DROP:
                        s.ID = xml.getAttribute("inventory");
                        s.objectDefinition = getFirstElementChildByTag(xml, "object");
                        break;

                    case A4_SCRIPT_LOSEITEM:
                        s.ID = xml.getAttribute("inventory");
                        s.text = xml.getAttribute("type");
                        break;

                    case A4_SCRIPT_GAINITEM:
                        s.ID = xml.getAttribute("id");
                        s.objectDefinition = getFirstElementChildByTag(xml, "object");
                        break;

                    case A4_SCRIPT_DELAY:
                        s.value = Number(xml.getAttribute("cycles"));

                    case A4_SCRIPT_PLAYSOUND:
                        s.ID = xml.getAttribute("sound");
                        break;                    

                    case A4_SCRIPT_STOPSOUND:
                        s.ID = xml.getAttribute("sound");
                        break;

                    case A4_SCRIPT_IF:
                        let if_condition_node:Element = s.objectDefinition = getFirstElementChildByTag(xml, "condition");
                        let if_then_node:Element = s.objectDefinition = getFirstElementChildByTag(xml, "then");
                        let if_else_node:Element = s.objectDefinition = getFirstElementChildByTag(xml, "else");

                        if (if_condition_node != null) {
                            for(let i:number = 0;i<if_condition_node.children.length;i++) {
                                let subscript:A4Script = A4Script.fromXML(if_condition_node.children[i]);
                                s.subScripts.push(subscript);
                            }
                        }

                        if (if_then_node != null) {
                            for(let i:number = 0;i<if_then_node.children.length;i++) {
                                let subscript:A4Script = A4Script.fromXML(if_then_node.children[i]);
                                s.thenSubScripts.push(subscript);
                            }
                        }

                        if (if_else_node != null) {
                            for(let i:number = 0;i<if_else_node.children.length;i++) {
                                let subscript:A4Script = A4Script.fromXML(if_else_node.children[i]);
                                s.elseSubScripts.push(subscript);
                            }
                        }
                        break;

                    case A4_SCRIPT_GAINGOLDOTHER:
                        s.value = Number(xml.getAttribute("gold"));
                        break;

                    case A4_SCRIPT_TALKOTHER:
                        s.text = xml.getAttribute("text");
                        s.thought = false;
                        if (xml.getAttribute("thought") == "true") s.thought = true;
                        s.wait = false;
                        if (xml.getAttribute("wait") == "true") s.wait = true;
                        break;
                    
                    case A4_SCRIPT_STARTTRADING:
                        break;

                    case A4_SCRIPT_FAMILIARWITHMAP:
                        s.ID = xml.getAttribute("map");
                        break;

                    case A4_SCRIPT_ADDAGENDA:
                        s.agenda = Agenda.fromXML(xml);
                        break;

                    case A4_SCRIPT_REMOVEAGENDA:
                        s.ID = xml.getAttribute("agenda");
                        break;

                    case A4_SCRIPT_EVENTRULE:
                        s.rule = A4EventRule.fromXML(xml);
                        break;

                    case A4_SCRIPT_GAINGOLD:
                        s.value = Number(xml.getAttribute("gold"));
                        break;

                    case A4_SCRIPT_TAKE:
                    case A4_SCRIPT_INTERACT:
                    case A4_SCRIPT_EMBARK:
                    case A4_SCRIPT_DISEMBARK:
                    case A4_SCRIPT_CHOP:
                        if (xml.getAttribute("x") != null) {
                            s.x = Number(xml.getAttribute("x"));
                            s.y = Number(xml.getAttribute("y"));
                        } else {
                            s.x = -1;
                            s.y = -1;
                        }
                        s.ID = xml.getAttribute("map");
                        break;
                                                
                    case A4_SCRIPT_BUY:
                        s.ID = xml.getAttribute("seller");
                        s.text = xml.getAttribute("object");
                        break;

                    case A4_SCRIPT_ANIMATION:
                        // we just store the whole XML, since the animation script is basically the animation xml block
                        s.objectDefinition = getFirstElementChildByTag(xml,"animation");
                        break;

                    case A4_SCRIPT_ATTRIBUTE:
                        // we just store the whole XML, since the animation script is basically the animation xml block
                        s.objectDefinition = getFirstElementChildByTag(xml,"attribute");
                        break;

                    case A4_SCRIPT_INMAPCHECK:
                        s.ID = xml.getAttribute("map");
                        break;

                    case A4_SCRIPT_HASITEMCHECK:
                        s.ID = xml.getAttribute("inventory");
                        s.text = xml.getAttribute("type");
                        break;

                    case A4_SCRIPT_ADDPERCEPTIONPROPERTY:
                    case A4_SCRIPT_REMOVEPERCEPTIONPROPERTY:
                        s.ID = xml.getAttribute("property");
                        break;

                    case A4_SCRIPT_IN_VEHICLE:
                        s.ID = xml.getAttribute("object");
                        s.text = xml.getAttribute("vehicle");
                        break;

                    default:
                        if (xml.tagName in A4Script.customScriptLoadFns) {
                            let loadfn:(xml:Element, id:number) => A4Script = A4Script.customScriptLoadFns[xml.tagName];
                            return loadfn(xml, A4Script.customScriptIDs[xml.tagName]);
                        }
                        console.error("No loading code for script type: " + xml.tagName);
                }
                return s;
            }
        }

        console.error("Unknown script type: " + xml.tagName);
        return null;
    }


    saveToXML() : string
    {
        let xmlString:string = "";
        let tagClosed:boolean = false;
        xmlString+= "<" + scriptNames[this.type];

        switch(this.type) {
            case A4_SCRIPT_GAMECOMPLETE:
            {
                if (this.ID!=null) xmlString += " id=\"" + this.ID + "\"";
                break;
            }
            case A4_SCRIPT_TELEPORT:
            {
                xmlString += " x=\"" + this.x + "\"";
                xmlString += " y=\"" + this.y + "\"";
                if (this.ID!=null) xmlString += " map=\"" + this.ID + "\"";
                break;                
            }
            case A4_SCRIPT_GOTO:
            case A4_SCRIPT_GOTO_OPENING_DOORS:
            {
                xmlString += " x=\"" + this.x + "\"";
                xmlString += " y=\"" + this.y + "\"";
                if (this.ID!=null) xmlString += " map=\"" + this.ID + "\"";
                if (this.timeOut!=null) xmlString += " timeOut=\"" + this.timeOut + "\"";
                if (this.stopAfterGoingThroughABridge) xmlString += " stopAfterGoingThroughABridge=\"" + this.stopAfterGoingThroughABridge + "\"";
                break;
            }
            case A4_SCRIPT_GOTO_CHARACTER:
            case A4_SCRIPT_INTERACT_WITH_OBJECT:
            {
                if (this.timeOut!=null) xmlString += " timeOut=\"" + this.timeOut + "\"";
                xmlString += " id=\"" + this.ID + "\"";
                break;
            }
            case A4_SCRIPT_PUSH:
            case A4_SCRIPT_PULL:
            {
                xmlString += " id=\"" + this.ID + "\"";
                xmlString += " direction=\"" + this.value + "\"";
                break;
            }

            case A4_SCRIPT_DIE:
            case A4_SCRIPT_ROTATE_RIGHT:
            case A4_SCRIPT_ROTATE_LEFT:
            case A4_SCRIPT_SLEEPOTHER:
                break;

            case A4_SCRIPT_TAKE_FROM_CONTAINER:
            case A4_SCRIPT_PUT_IN_CONTAINER:
                xmlString += " containerid=\"" + this.ID + "\"";
                xmlString += " itemid=\"" + this.ID2 + "\"";
                break;

            case A4_SCRIPT_EATIFHUNGRY:
            case A4_SCRIPT_DRINKIFTHIRSTY:
                xmlString += " timer=\"" + this.value + "\"";
                break;
            case A4_SCRIPT_USE:
            {
                if (this.x>=0) {
                    xmlString += " x=\"" + this.x + "\"";
                    xmlString += " y=\"" + this.y + "\"";
                    if (this.ID!=null) xmlString += " map=\"" + this.ID + "\"";
                } else {
                    if (this.ID!=null) xmlString += " inventory=\"" + this.ID + "\"";
                }
                break;
            }
            case A4_SCRIPT_OPENDOORS:
            {
                xmlString += " door=\"" + this.ID + "\"";
                break;
            }
            case A4_SCRIPT_MESSAGE:
            {
                xmlString += " text=\"" + stringToHTMLString(this.text) + "\"";
                break;
            }
            case A4_SCRIPT_TALK:
            {
                xmlString += " text=\"" + stringToHTMLString(this.text) + "\"";
                if (this.thought) xmlString += " thought=\"true\"";
                if (this.wait) xmlString += " wait=\"true\"";
                break;
            }
            
            case A4_SCRIPT_STORYSTATE:
            case A4_SCRIPT_STORYSTATECHECK:
            {
                if (this.value==A4_STORYSTATE_GAME) xmlString += " scope=\"game\"";
                if (this.value==A4_STORYSTATE_MAP) xmlString += " scope=\"map\"";
                if (this.value==A4_STORYSTATE_OBJECT) xmlString += " scope=\"object\"";
                xmlString += " variable=\"" + this.ID + "\"";
                xmlString += " value=\"" + this.text + "\"";
                break;
            }
            case A4_SCRIPT_STEAL:
            {
                xmlString += " name=\"" + this.ID + "\"";
                break;
            }
            case A4_SCRIPT_GIVE:
            case A4_SCRIPT_SELL:
            case A4_SCRIPT_DROP:
            {
                if (this.ID!=null) xmlString += " inventory=\"" + this.ID + "\"";
                if (this.objectDefinition!=null) {
                    xmlString +=">\n";
                    tagClosed = true;
                    xmlString += this.objectDefinition.outerHTML + "\n";
                }
                break;
            }
            case A4_SCRIPT_LOSEITEM:
            {
                if (this.ID!=null) xmlString += " inventory=\"" + this.ID + "\"";
                if (this.text!=null) xmlString += " type=\"" + this.text + "\"";
                break;
            }
            case A4_SCRIPT_GAINITEM:
            {
                if (this.ID != null) xmlString += " id=\"" + this.ID + "\"";
                if (this.objectDefinition!=null) {
                    xmlString +=">\n";
                    tagClosed = true;
                    xmlString += this.objectDefinition.outerHTML + "\n";
                }
                break;
            }
            case A4_SCRIPT_DELAY:
            {
                xmlString += " delay=\"" + this.value + "\"";
                break;
            }
            case A4_SCRIPT_PLAYSOUND:
            {
                xmlString += " sound=\"" + this.ID + "\"";
                break;
            }
            case A4_SCRIPT_STOPSOUND:
            {
                xmlString += " sound=\"" + this.ID + "\"";
                break;
            }
            case A4_SCRIPT_IF:
            {
                xmlString +=">\n";
                tagClosed = true;
                xmlString +="<condition>\n";
                for(let s of this.subScripts) {
                    xmlString += s.saveToXML() + "\n";
                }
                xmlString +="</condition>\n";
                if (this.thenSubScripts.length>0) {
                    xmlString +="<then>\n";
                    for(let s of this.thenSubScripts) {
                        xmlString += s.saveToXML() + "\n";
                    }
                    xmlString +="</then>\n";
                }
                if (this.elseSubScripts.length>0) {
                    xmlString +="<else>\n";
                    for(let s of this.elseSubScripts) {
                        xmlString += s.saveToXML() + "\n";
                    }
                    xmlString +="</else>\n";
                }
                break;
            }
            case A4_SCRIPT_GAINGOLDOTHER:
            {
                xmlString += " gold=\"" + this.value + "\"";
                break;
            }
            
            case A4_SCRIPT_TALKOTHER:
            {
                xmlString += " text=\"" + stringToHTMLString(this.text) + "\"";
                if (this.thought) xmlString += " thought=\"true\"";
                if (this.wait) xmlString += " wait=\"true\"";
                break;
            }

            case A4_SCRIPT_STARTTRADING:
                break;
            case A4_SCRIPT_FAMILIARWITHMAP:
            {
                xmlString += " map=\"" + this.ID + "\"";
                break;
            }
            case A4_SCRIPT_ADDAGENDA:
            {
                xmlString += " agenda=\"" + this.agenda.name + "\"";
                xmlString += " duration=\"" + this.agenda.duration + "\"";
                xmlString += " loop=\"" + this.agenda.loop + "\"";
                xmlString += " absoluteTime=\"" + this.agenda.absoluteTime + "\"";
                xmlString += " cycle=\"" + this.agenda.cycle + "\"";
                xmlString +=">\n";
                tagClosed = true;

                for(let ae of this.agenda.entries) {
                    xmlString +="<entry time=\"" + ae.time + "\">\n";
                    for(let s of ae.scripts) {
                        xmlString += s.saveToXML() + "\n";
                    }
                    xmlString +="</entry>\n";
                }
                break;
            }
            case A4_SCRIPT_REMOVEAGENDA:
            {
                xmlString += " agenda=\"" + this.ID + "\"";
                break;
            }
            case A4_SCRIPT_GAINGOLD:
            {
                xmlString += " gold=\"" + this.value + "\"";
                break;
            }
            case A4_SCRIPT_TAKE:
            case A4_SCRIPT_INTERACT:
            case A4_SCRIPT_EMBARK:
            case A4_SCRIPT_DISEMBARK:
            case A4_SCRIPT_CHOP:
            {
                if (this.x>=0) {
                    xmlString += " x=\"" + this.x + "\"";
                    xmlString += " y=\"" + this.y + "\"";
                }
                if (this.ID!=null) xmlString += " map=\"" + this.ID + "\"";
                break;
            }
            case A4_SCRIPT_BUY:
            {
                xmlString += " seller=\"" + this.ID + "\"";
                xmlString += " object=\"" + this.text + "\"";
                break;
            }
            case A4_SCRIPT_ANIMATION:
            {
                xmlString +=">\n";
                tagClosed = true;
                xmlString += this.objectDefinition.outerHTML + "\n";
                break;
            }
            case A4_SCRIPT_ATTRIBUTE:
            {
                xmlString +=">\n";
                tagClosed = true;
                xmlString += this.objectDefinition.outerHTML + "\n";
                break;
            }
            case A4_SCRIPT_INMAPCHECK:
            {
                xmlString += " map=\"" + this.ID + "\"";
                break;
            }
            case A4_SCRIPT_HASITEMCHECK:
            {
                if (this.ID!=null) xmlString += " inventory=\"" + this.ID + "\"";
                if (this.text!=null) xmlString += " type=\"" + this.ID + "\"";
                break;
            }

            case A4_SCRIPT_ADDPERCEPTIONPROPERTY:
            case A4_SCRIPT_REMOVEPERCEPTIONPROPERTY:
            {
                if (this.ID!=null) xmlString += " property=\"" + this.ID + "\"";
                break;
            }

            case A4_SCRIPT_IN_VEHICLE:
                if (this.ID!=null) xmlString += " object=\"" + this.ID + "\"";
                if (this.text!=null) xmlString += " vehicle=\"" + this.text + "\"";
                break;

            default:
                {
                    if (scriptNames[this.type] in A4Script.customScriptSaveFns) {
                        let savefn:(script:A4Script) => string = A4Script.customScriptSaveFns[scriptNames[this.type]];
                        xmlString += savefn(this);
                    } else {
                        console.error("Trying to save unregistered script: " + this.type + ", " + scriptNames[this.type]);
                    }
                }
        }


        if (!tagClosed) {
            xmlString +="/>";
        } else {
            xmlString += "</" + scriptNames[this.type] + ">";
        }
        return xmlString;
    }


    reset()
    {
        this.state = 0;
        this.if_state = 0;     
        for(let s of this.subScripts) s.reset();
        for(let s of this.thenSubScripts) s.reset();
        for(let s of this.elseSubScripts) s.reset();
    }


    execute(o:A4Object, map:A4Map, game:A4Game, otherCharacter:A4Character):number
    {
        if (scriptFunctions[this.type] == null) {
            console.error("Undefined function for script " + scriptNames[this.type] + "!!!");
            return SCRIPT_FINISHED;
        }
        return scriptFunctions[this.type](this, o, map, game, otherCharacter);
    }


    static registerCustomScript(name:string, loadfn:(xml:Element, id:number) => A4Script, 
                                             savefn:(script:A4Script) => string,
                                             fn:((A4Script, A4Object, A4Map, A4Game, A4Character) => number))
    {
        let id:number = A4Script.nextID;
        A4Script.nextID++;
        A4Script.customScriptIDs[name] = id;
        A4Script.customScriptLoadFns[name] = loadfn;
        A4Script.customScriptSaveFns[name] = savefn;
        scriptNames[id] = name;
        scriptFunctions[id] = fn;
    }


    static nextID:number = A4_N_SCRIPTS;
    static customScriptIDs:{ [name: string] : number; } = {};
    static customScriptLoadFns:{ [name: string] : (xml:Element, id:number) => A4Script; } = {};
    static customScriptSaveFns:{ [name: string] : (script:A4Script) => string; } = {};

	type:number;

	// script parameters:
	value:number = 0;
    x:number;
    y:number;
	ID:string;
    ID2:string;
    text:string = null;
    text2:string = null;
    thought:boolean = false;
    wait:boolean = false;
    consume:boolean = false;
    stopAfterGoingThroughABridge:boolean = false;    // used in the GOTO script
    timeOut:number = null;    // in some scripts, after this much time, just give up

    state:number = 0;
    if_state:number = 0;

    agenda:Agenda = null;
    rule:A4EventRule = null;

    subScripts:A4Script[] = [];
    thenSubScripts:A4Script[] = [];
    elseSubScripts:A4Script[] = [];

    objectDefinition:Element = null;
};


class A4ScriptExecutionQueue {
    constructor(a_object:A4Object, a_map:A4Map, a_game:A4Game, a_otherCharacter:A4Character) {
        this.object = a_object;
        this.map = a_map;
        this.game = a_game;
        this.otherCharacter = a_otherCharacter;        
    }

    scripts:A4Script[] = [];
    object:A4Object;
    map:A4Map;
    game:A4Game;
    otherCharacter:A4Character;
}
