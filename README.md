# Core Keeper Cooking Simulator

A web-based tool designed to simulate cooking results for the game **Core Keeper**. This simulator allows users to select ingredients, view potential stat buffs, and calculate results based on item rarity and the "Master Chef" skill.

## 🌟 Key Features

* **Accurate Stat Calculation**:
    * Implements the "Max Value" logic (highest stat takes precedence).
    * Correctly calculates multipliers for **Rare (1.25x)** and **Epic (1.5x)** dishes.
    * **Note**: Buff durations do not scale with rarity, only stat values do.
* **Master Chef Skill Simulation**:
    * **Toggle Switch**: Simulates the chance of upgrading food rarity.
    * **Dynamic Logic**:
        * **Normal Ingredients**: Toggles between Common (1.0x) and Rare (1.25x).
        * **Golden/Legendary Ingredients**: Toggles between Rare (1.25x) and Epic (1.5x).
* **Smart Cooking Pot**:
    * **Single Ingredient Mode**: Selecting only one ingredient automatically calculates the result as if two of the same ingredient were used.
    * **Toggle Selection**: Click an ingredient to add it; click it again (in the pot or list) to remove it.
* **Internationalization (i18n)**:
    * Supports **English (EN)**, **Korean (KO)**, and **Japanese (JA)**.
    * **Auto-Detection**: Automatically detects browser language on first load.
    * **Persistence**: Saves your language preference to the browser's Local Storage.
* **Visual Rarity Indicators**:
    * Ingredient names are color-coded based on their in-game rarity (Common, Uncommon, Rare, Epic, Legendary).
* **Category Filtering**:
    * Filter ingredients by stats (Survival, Defense, Attack, Utility) or by Source Location (Biomes).
    * Collapsible category menus for a cleaner UI.

## 📂 Project Structure

The project has been refactored for better maintainability:

```text
Root/
├── index.html          # Main structure
├── style.css           # Styling and visual effects
├── script.js           # Core logic, DOM manipulation, and calculation
├── data.json           # Ingredient database (Stats, IDs, Image paths)
└── locales/            # Translation files
    ├── en.json
    ├── ko.json
    └── ja.json
