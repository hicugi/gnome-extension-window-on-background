import GObject from "gi://GObject";
import St from "gi://St";
import Meta from "gi://Meta";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as AltTab from "resource:///org/gnome/shell/ui/altTab.js";

const DELAY = 70;

const hiddneApps = new Set();
let settings;
let prevWorkspace;

function getWorkspace() {
  if (!settings || !settings.get_boolean("current-workspace-only")) {
    return null;
  }

  const workspaceManager = global.workspace_manager;
  return workspaceManager.get_active_workspace();
}

function getWindows() {
  if (this?._settings !== undefined) {
    settings = this._settings;
  }

  const workspace = getWorkspace();

  setTimeout(() => {
    prevWorkspace = workspace;
  }, DELAY * 2);

  const windows = global.display.get_tab_list(
    Meta.TabList.NORMAL_ALL,
    workspace,
  );
  return windows.filter((w) => !hiddneApps.has(w));
}

global.display.connect("notify::focus-window", () => {
  setTimeout(() => {
    const windows = getWindows();

    if (!windows.length) return;
    if (prevWorkspace == getWorkspace()) return;

    windows[0].activate(global.get_current_time());
  }, DELAY);
});

const functionsToPatch = [
  ["WindowSwitcherPopup", "_getWindowList", null],
  ["WindowCyclerPopup", "_getWindows", null],
];

for (const item of functionsToPatch) {
  const [className, fnName] = item;
  item[2] = AltTab[className].prototype[fnName];

  AltTab[className].prototype[fnName] = getWindows;
}

function reset() {
  for (const app of hiddneApps) {
    hiddneApps.delete(app);
  }

  BackgroundLauncherExtension.reset();
}
function exit() {
  reset();
  indicator.destroy();
  indicator = null;

  for (const item of functionsToPatch) {
    const [className, fnName] = item;
    AltTab[className].prototype[fnName] = item[2];
  }
}

function toggleApp(win) {
  if (hiddneApps.has(win)) {
    hiddneApps.delete(win);
    return;
  }

  hiddneApps.add(win);
}

const WindowMenu = GObject.registerClass(
  class WindowMenu extends PanelMenu.Button {
    _init() {
      super._init(0.0, "Window Manager");

      this.icon = new St.Icon({
        icon_name: "view-list-symbolic",
        style_class: "system-status-icon",
      });

      this.add_child(this.icon);
      this.refresh();
    }

    refresh() {
      this.menu.removeAll();

      const workspace = global.workspace_manager.get_active_workspace();

      const windows = global.display.get_tab_list(
        Meta.TabList.NORMAL_ALL,
        workspace,
      );

      if (windows.length === 0) {
        this.menu.addMenuItem(new PopupMenu.PopupMenuItem("No windows"));
        return;
      }

      for (const win of windows) {
        const title = win.get_title() || "(untitled)";
        const wmClass = win.get_wm_class() || "(unknown)";

        let menuTitle = `${wmClass}: ${title}`;
        if (hiddneApps.has(win)) {
          menuTitle = "H " + menuTitle;
        }

        const item = new PopupMenu.PopupMenuItem(menuTitle);

        item.connect("activate", () => {
          toggleApp(win);
        });

        this.menu.addMenuItem(item);
      }

      // reset
      (() => {
        const item = new PopupMenu.PopupMenuItem("Reset Alt+Tab");
        item.connect("activate", reset);
        this.menu.addMenuItem(item);
      })();

      // exit
      (() => {
        const item = new PopupMenu.PopupMenuItem("Exit");
        item.connect("activate", exit);
        this.menu.addMenuItem(item);
      })();
    }
  },
);

let indicator;

export default class BackgroundLauncherExtension {
  enable() {
    indicator = new WindowMenu();

    Main.panel.addToStatusArea("window-menu", indicator);

    // Refresh whenever the menu is opened
    indicator.menu.connect("open-state-changed", (_, open) => {
      if (open) indicator.refresh();
    });
  }
  reset() {
    Main.panel.delete(indicator);
    this.enable();
  }

  disable() {
    exit();
  }
}
