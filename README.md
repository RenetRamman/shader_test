# Introduction

This is a simulation of cellular automaton, [Conway's Game of Life](https://en.wikipedia.org/wiki/Conway's_Game_of_Life).

The simulation begins by loading an image and using it as a starting point. All pixels which are at least 50% red will be considered alive.

Simulation settings, including the starting image can be changed from the hambruger menu at the top right corner of the window.
The simulation can be paused from the graphical UI or by pressing the 'space' key and advanced by a single frame by pressing the 'n' key.

# Getting Started

To start the application, open a terminal or console and navigate to the shader_test directory.

**run the following command**

    python3 -m http.server 8000 -d .
    
or

    python -m http.server 8000 -d .

then navigate to the following address in your browser http://127.0.0.1:8000/

# Hosting w firebase
update the cli tool:
    curl -sL https://firebase.tools | upgrade=true bash

Login to firebase:
    firebase login
  
List existing projects:
    firebase projects:list

Update project:
    firebase deploy
