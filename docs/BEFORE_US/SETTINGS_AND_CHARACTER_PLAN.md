# Settings and Character Plan

Written 2026-11-11. **Built the same day (Esc in the game):** settings for sharpness, grass, shadows, frame-rate counter, full screen, volume, mouse sensitivity and inverted look; character screen with hair style, hair colour, clothes on/off and height for the man and Asha. **Not built yet:** quality presets, view distance, separate ambience/effects volume, key list, game settings (day length, difficulty, wolves, hints), save tools in the settings screen, names, Peasant outfit, outfit colour, hood and shoulder pieces, build, skin tone, and name editing. The live preview was added afterwards: the Characters tab moves to the left and the camera faces the character being edited.

Original plan follows. A plan only: nothing in this document is built yet unless the "Today" column says so. No new web research was done for it; it uses what is already in the downloaded packs and the earlier research.

## 1. What exists today

| Thing | Today |
|---|---|
| Clothes on/off | Keys O (man) and P (Asha) |
| Hair and beard | Keys H (man, 4 styles) and J (Asha, 3 styles) |
| Camera zoom | Mouse wheel |
| Render sharpness | Adjusts itself to hold the frame rate |
| Save | Automatic, with export and import on the start screen |
| Settings screen | None |
| Character screen | None |

Everything is on scattered keys. The plan is to replace them with two proper screens.

## 2. Settings screen (Esc)

| Group | Setting | Options | Notes |
|---|---|---|---|
| Graphics | Quality preset | Low, Medium, High, Auto | Auto is today's behaviour |
| | Render sharpness | 50–100% | Biggest effect on frame rate |
| | Grass amount | Off, Low, Medium, High | Second biggest effect |
| | Shadows | Off, Low, High | |
| | View distance and fog | Near, Normal, Far | |
| | Frame rate counter | On, Off | |
| | Full screen | On, Off | |
| Sound | Master, ambience, effects volume | 0–100% | Sound has still not been checked by ear |
| | Mute | On, Off | |
| Controls | Mouse sensitivity | Slider | |
| | Invert up/down look | On, Off | |
| | Key list | Read-only first; rebinding later | |
| Game | Length of a day | 6, 12, 24 minutes | Host only |
| | Hunger and thirst speed | Gentle, Normal, Harsh | Host only |
| | Wolves | On, Off | Host only |
| | Story hints | On, Off | |
| World | Save now, export, import, new world | | Moves here from the start screen |

Settings are stored in the browser per player. "Game" settings are stored in the world save so both players share them.

## 3. Character screen (from the start screen and from settings)

One screen with a turning preview of the character, a tab for the man and a tab for Asha.

| Option | Man | Asha | Possible with what we have? |
|---|---|---|---|
| Name | Yes | Yes | Yes |
| Hair style | 4 | 3 | Yes |
| Beard | On, Off | — | Yes |
| Hair colour | Any | Any | Yes: hair is tinted in code |
| Eyebrow colour | Follows hair | Follows hair | Yes |
| Outfit | Ranger, Peasant, none | Ranger, Peasant, none | Yes: Peasant is in the free pack but not yet wired in |
| Outfit colour | Any | Any | Yes: recolour the texture as done for the tunic |
| Hood and shoulder pieces | On, Off | On, Off | Yes: they are hidden today |
| Height | Slider | Slider | Yes: scale the whole model |
| Build | Slim to broad | Slim to broad | Partly: bone scaling works on the undressed body; on the outfit it needs testing |
| Skin tone | Dark, Light | Dark, Light | **Only undressed.** The free outfit models include dark skin only, so hands and neck would not match |
| Eye colour | — | — | No: one brown eye texture in the free pack |
| Different face | — | — | No: one face per sex in the free pack |

## 4. What the free packs cannot do

| Wanted | What it needs |
|---|---|
| Different faces, regular or younger body shapes, 20 hairstyles, eye and skin colour choices | Quaternius Universal Base Characters, Source version, about $20 |
| Ten more outfits | Quaternius Modular Character Outfits, Source version, about $20 |
| Prehistoric clothing | No pack found; would have to be made in Blender |
| 130+ animations (carrying, more work actions) | Universal Animation Library 2; its free tier has not been checked |

Nothing has been bought. Both paid packs are CC0, so they could be used commercially.

## 5. Other things still to research or check

| Item | Why |
|---|---|
| Animal models with animation | Deer, rabbits and wolves are still simple shapes; Quaternius publishes CC0 animal packs |
| Universal Animation Library 2 free tier | May add carrying, sitting by a fire and tool actions |
| Sound by ear | Never listened to |
| Humans in motion | Clothing and hair only checked standing still |
| Asha's bun and buzzed hair | Not checked on screen |
| Two players over the internet | Written, never tested |

## 6. Suggested order

1. Settings screen with graphics, sound and controls.
2. Character screen with hair, colour, outfit and height for both.
3. Wire in the Peasant outfit and outfit colours.
4. Check humans in motion and fix what clips.
5. Animal models.
6. Game settings (day length, difficulty) in the world save.
