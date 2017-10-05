# multi-platformer
Experimenting with creating a multiplayer platformer

# setup
You will need Node installed to run the server. I suggest following the instructions for installing Homebrew and Node here:
http://blog.teamtreehouse.com/install-node-js-npm-mac

Note that to check if you already have node installed you can run `which node`, which will do nothing
if you do not have it installed, and should display where node is located on your machine if it is installed.
The same thing will also work for Homebrew, just run `which brew` instead.

Once you have `node` installed, you should clone this repository if you haven't already done so:

`git clone git@github.com:lancehalberd/multi-platformer.git`


Then move to the new directory and install node packages (this may take a few minutes):
```
cd multi-platformer
npm install
```
For anyone who may not know, `npm` is "Node Package Manager".
It comes with `node` and you can use it to track 3rd party libraries.
It reads from a file called `package.json` which has details about the 3rd party code it should fetch.


Now you should be able to run the server using:

`node server`

If it works it should say something like:

`App listening on PORT 3000`

Then you should be able to view the game by visiting `http://localhost:3000` in a browser.
