# Window on Background

## Idea

On two monitor setup I want to keep 1 window in second screen in "background" mode, so I won't be able to focus by keyboard.

## Problem

While switching workplaces, I keep focusing on the window.

## Quick Start

1. Clone the repo `git clone https://github.com/hicugi/gnome-extension-window-on-background.git ~/.local/share/gnome-shell/extensions/window-on-background`
2. Press `Alt+Tab`, type `r` and press Enter
3. New icon should appear on panel. If not, check logs `journalctl --user -f /usr/bin/gnome-shell`
4. Click on icon and select window

## Solution

1. Create extension for GNOME
2. Add panel menu, where we can select certain window
3. Selected window will be hidden whenever we are switching by Alt+Tab
4. Add custome event listener `notify::focus-window` when switching workplaces and focus on different window
