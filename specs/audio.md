# Carom — Audio

This file defines the sounds the game plays, when each one plays, and how muting
behaves. The events themselves are defined by `specs/balls.md` and
`specs/playfield.md`; this file names the sound each one makes.

## Cues

A cue is a short sound the game plays by name. The audio layer beneath the game
is yours, so how a cue is synthesized or loaded is your decision; what this file
fixes is the set of cues, their names, and the frame each one plays on.

Play exactly the cues below, under exactly these names:

| Cue | Played when |
| --- | --- |
| `paddle-hit` | The ball hits a paddle's left or right face. |
| `wall-bounce` | The ball reflects off the top or bottom wall, or off a paddle's end cap. |
| `obstacle-bounce` | The ball bounces off an obstacle. |
| `score` | A point is scored. |

Each cue is a distinct short blip, so the four events are told apart by ear.

Each plays on the frame its event happens, from the game's update, once on that
frame however many sub-steps raised it.

## Muting

The audio layer carries a mute bit. The `mute` action toggles it, and the toggle
is read on every screen. The game mirrors that bit every frame into the `muted`
value `specs/state.md` declares, which a snapshot reports.

While the bit is set the game starts no sound at all: a muted game plays nothing,
rather than playing at zero volume.

A browser opens an audio context on a real user gesture, so the audio layer arms
itself on the first such gesture and stays silent until then.

The game stays fully playable with sound muted: muting silences the cues and
changes nothing else.
