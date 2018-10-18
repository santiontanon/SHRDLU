# SHRDLU

<img src="https://github.com/santiontanon/SHRDLU/blob/master/misc/SHRDLU-ss1.png?raw=true" alt="title" width="512"/> 

<img src="https://github.com/santiontanon/SHRDLU/blob/master/misc/SHRDLU-ss2.png?raw=true" alt="ingame" width="512"/> 

SHRDLU is an adventure game based around natural language parsing (inspired by Winograd's <a href="https://en.wikipedia.org/wiki/SHRDLU">SHRDLU</a>). It is an experiment, so, I am not expecting the resulting game to be an amazing game, but just an exploration of the posibilities of this type of AI system in a game.

Source code and a playable demo will be uploaded soon, but a demonstration video of Demo v1.1 can be found here: https://youtu.be/8FNBTs2yv4s

*However, I am looking for betatesters, so, if anyone wants to give the game a try and give me some feedback, send me an email!*

## Notes

- The game has been coded using <a href="http://www.typescriptlang.org">TypeScript</a>, which is basically an typed version of JavaScript, which is much more natural to code in. TypeScript compiles to JavaScript, and thus the game can run in any web browser that supports JavaScript. Although in principle any modern browser should do, I usually test using Safari and Chrome. The game is built in plain TypeScript, and no additional libraries have been used. 

- Concerning the visual style, I chose a 256x192 screen resolution with a 16 color palette. These were the specs of the <a href="https://en.wikipedia.org/wiki/MSX">MSX</a> computer, which was the 8bit computer with which I learned how to code when I was a kid.

- The font used for the game is the original font used in the BIOS of 1983 MSX computers. I used this procedure to generate it: http://www.ateijelo.com/blog/2016/09/13/making-an-msx-font

- Concerning the use of time in the game: I know dates and times in a 24 hour system with Earh years doesn't make any sense in an alien planet with an undisclosed day/night or star revolution cycle. However, I decided to go with Earth time and dates, to keep the AI simple, and now having to create domain knowledge rules to handle time scale conversions, etc. So, this was a small concesion to make time-handling in the AI-side easier.

- I would like to thank all the people that helped me betatest the game so far (in chronological order): Jichen Zhu, Josep Valls-Vargas, Jordi Sureda, Sam Snodgrass, Javier Torres, Adam Summerville, Ahmed Khalifa and Sri Krishna.
	
