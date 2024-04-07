# Coriolis: The Great Dark for FoundryVTT

Unofficial Foundry VTT system for Coriolis: The Great Dark by Free League.

**This system is not official, an official C:TGD system will probably be developed by Free League.**

![Screenshot of the system](https://i.imgur.com/eHvMjPT.png)

### Install

You can install it manually with this URL.

```
https://github.com/erizocosmico/foundry-coriolistgd/releases/latest/download/system.json
```

This system requires the `yze-combat` module, which will be installed with it.

### Features

-   Character sheet.
-   Item sheets.
-   Rolls from character sheet.
-   NPC sheet.
-   Crew sheet.
-   Creature sheet.

### System development

**Note**: only Foundry 11 or later is be supported.

If this is the first time doing it, copy the `system` folder to your Foundry `systems` folder renamed to `coriolistgd`.

Run `npm start` from this repository.

Open a browser to http://localhost:8080.

JavaScript and CSS is refreshed by Vite automatically, any changes inside the `system` folder need to be synced manually.

```
cp -R system/* <PATH TO YOUR FOUNDRY FOLDER>/Data/systems/coriolistgd/
```

### Credits

This work is based on [Coriolis: The Great Dark](https://www.kickstarter.com/projects/1192053011/coriolis-the-great-dark-rpg-explore-a-lost-horizon) quickstart rules created by [Free League](https://freeleaguepublishing.com/).

Dice icons by [Jonathan Pay](https://jonathanpay.itch.io/).

Icons made by [Lorc](https://lorcblog.blogspot.com) and [Delapouite](https://delapouite.com). Available on [https://game-icons.net](https://game-icons.net).

### License

See [LICENSE](/LICENSE)
