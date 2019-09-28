# Playable demo v2.8

https://www.cs.drexel.edu/~santi/games/SHRDLU-demo28/shrdlu.html


# SHRDLU

<img src="https://github.com/santiontanon/SHRDLU/blob/master/misc/SHRDLU-ss1.png?raw=true" alt="title" width="512"/> 

<img src="https://github.com/santiontanon/SHRDLU/blob/master/misc/SHRDLU-ss2.png?raw=true" alt="ingame" width="512"/> 

SHRDLU is an adventure game based around natural language parsing (inspired by Winograd's <a href="https://en.wikipedia.org/wiki/SHRDLU">SHRDLU</a>). It is an experiment, so, I am not expecting the resulting game to be an amazing game, but just an exploration of the posibilities of this type of AI system in a game.

You can play an early demo here (only Acts 1 and 2 of the game is activated in this demo, I'm still working on Act 3, I'll activate it in this demo once they are fully playable): https://www.cs.drexel.edu/~santi/games/SHRDLU-demo28/shrdlu.html

Alternatively, you can view demo videos here:
- https://youtu.be/8FNBTs2yv4s (version 1.1)
- https://www.youtube.com/watch?v=dPKfS9DsLmM (version 2.5)

## Other NLP-based games:

SHRDLU is by no means the first game to use NLP techniques. Besides the classic parser-based interactive fiction games like Zork, or The Hobbit, or those that have keyword based conversations (like many (MANY) RPG games), several games attempt to use natural language parsing to allow players to interact in open-ended natural language. For example (this is not an exhaustive list):
- <a href="https://en.wikipedia.org/wiki/Façade_(video_game)">Façade</a>
- <a href="https://www.aaai.org/ocs/index.php/AIIDE/AIIDE15/paper/view/11549">MKUltra</a>
- The <a href="https://www.lablablab.net/?page_id=9">LabLabLab</a> games (like SimHamlet)
- <a href="https://en.wikipedia.org/wiki/Event_0">Event[0]</a>
- <a href="https://en.wikipedia.org/wiki/Bot_Colony">Bot Colony</a>


## Notes

- If you are interested on how the AI in the game works, there is a PDF explaining it inside of the misc folder: https://github.com/santiontanon/SHRDLU/blob/master/misc/SHRDLU.pdf

- The game has been coded using <a href="http://www.typescriptlang.org">TypeScript</a>; basically a typed version of JavaScript, which is much more natural to code in if you are used to object oriented languages. TypeScript compiles to JavaScript, and thus the game can run in any web browser that supports JavaScript. Although in principle any modern browser should do, I usually test using Safari and Chrome. The game is built in plain TypeScript, and no additional libraries have been used. 

- Concerning the visual style, I chose a 256x192 screen resolution with a 16 color palette. These were the specs of the <a href="https://en.wikipedia.org/wiki/MSX">MSX</a> computer, which was the 8bit computer with which I learned how to code when I was a kid.

- The font used for the game is the original font used in the BIOS of 1983 MSX computers. I used this procedure to generate it: http://www.ateijelo.com/blog/2016/09/13/making-an-msx-font

- Concerning the use of time in the game: I know dates and times in a 24 hour system with Earh years doesn't make any sense in an alien planet with an undisclosed day/night or star revolution cycle. However, I decided to go with Earth time and dates, to keep the AI simple, and not having to create domain knowledge rules to handle time scale conversions, etc. So, this was a small concesion to make time-handling in the AI-side easier.

- I would like to thank all the people that helped me betatest the game so far (in chronological order): Jichen Zhu, Josep Valls-Vargas, Jordi Sureda, Sam Snodgrass, Javier Torres, Adam Summerville, Ahmed Khalifa, Sri Krishna, Bayan Mashat, Pavan Kantharaju, Chris Martens and every one who played my demo at AIIDE 2018! Thank you one more time! :D
	
