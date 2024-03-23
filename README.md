# Obsidian Tag Links
A plugin for [Obsidian](https://obsidian.md) that allows tags to be opened as links using a hotkey.

You define regular expressions to match certain tags, then define link substitutions that use the captured values to
build a URL, which is then opened automatically.

This is intended to tie into Obsidian's [nested tag](https://help.obsidian.md/Editing+and+formatting/Tags#Nested+tags)
functionality. Personally, I use them for any kind of value where I have more than one entry that belongs to the same
system: ticketing system IDs, pull requests, etc.

**This allows you to use nested tags (making your notes more traceable) while still enabling easy access to their
referenced data.**

## Installation
1. Install it like any other plugin.
2. Set a hotkey for the plugin's command in the settings
   (`Settings -> Community plugins -> Tag Links -> Hotkeys (looks like a plus sign)`).
   - If you're unsure what keyboard shortcut to use, I'd recommend <kbd>Ctrl</kbd>+<kbd>Space</kbd>.
3. Configure some tag link substitutions in the settings
   (`Settings -> Community plugins -> Tag Links -> Options (looks like a gear)`).
   - If you're new to using regular expressions, you can use https://regex101.com/ with the `ECMAScript` flavour to
   build your regular expressions and substitutions.

## Usage
To use it, after configuring the substitutions in the settings, simply press your configured keyboard shortcut while
your text cursor is on a tag.

## Example
You might want to use tags to reference [Jira](https://www.atlassian.com/software/jira) tickets, and need to be able to
open them easily. This is the use case that inspired this plugin in the first place.

My Jira tags look like this: `#jira/<TICKET_ID>` (i.e. `#jira/PROJ-1234`)
- The tag regular expression looks like: `jira/(.+)` (note that it does not include the leading `#` character)
- And the substitution looks like: `https://jira.example.com/browse/$1`

When I use my configured hotkey on `#jira/PROJ-1234`, the plugin opens `https://jira.example.com/browse/PROJ-1234` in my
browser.

## Why Regular Expressions, Instead of Simple Prefixes?
Originally, the plugin was planned to work with simple prefixes - matching tags that started with a certain value.

This was changed to accommodate more complex cases where there are multiple pertinent values in a tag's structure, or
the substitution needs to be placed in multiple locations in the URL. This solution provides much greater flexibility.
