# Sending no speaker choice when the user never picked one

## TLDR

When someone has never chosen a speaker, the app stops telling the media
server's browser library to route sound to a device named `default`. Firefox
has no device by that name, so every incoming voice raised an error that
reached error tracking.

## What it is for

The app saves the speaker choice in the browser and starts at the value
`default` until the user picks one. Chrome lists a real device called
`default` that follows the system's output; Firefox lists only real devices,
each under an opaque id. Telling a Firefox audio element to play through
`default` is refused with a "not found" error.

## How it works today

Before the change, the meeting is created with the saved speaker id. The media
server's browser library then asks every incoming audio stream to play through
that id. On Firefox that request fails each time someone else's audio arrives,
the library logs the failure, and the error tracking tool turns the log line
into an exception. Sound still plays on the system output, since a refused
request leaves the output unchanged.

## What the change does

After the change, `default` and an empty id are dropped before the meeting is
created, so the library never asks for a specific output and the browser keeps
the system one. A real device id the user picked is still passed on. The
error tracking filter also ignores this one log line, so a speaker that was
unplugged since it was saved no longer floods it.

## Concepts

| Word | Meaning |
| --- | --- |
| media server | the service carrying audio and video between participants |
| speaker, audio output | the device sound plays through |
| `setSinkId` | the browser call choosing which speaker an audio element plays through |
| error tracking | the analytics tool that records errors from users' browsers |
