# Introduction

This is a simulation of cellular automaton, [Conway's Game of Life](https://anvilproject.org/guides/content/creating-links).

The simulation begins by loading an image and using it as a starting point. All pixels which are at least 50% red will be considered alive.

Simulation settings, including the starting image can be changed from the hambruger menu at the top right corner of the window. New images can be added to the simulation by copying them into the [/images](/images) directory under project files. Do not remove christmas.jpg from the directory, it is necessary for launching the application for now.

# Getting Started

To start the application, open a terminal or console and navigate to the shader_test directory.

**run the following command**

    python3 -m http.server 8000 -d .
    
or

    python -m http.server 8000 -d .

then navigate to the following address in your browser http://127.0.0.1:8000/
