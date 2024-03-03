# Obsidian Tag Links
This is a plugin for [Obsidian](https://obsidian.md) that allows tags to be opened as links using a configured keyboard
shortcut.

The way it works is that you define regular expressions to match certain tags, then define link substitutions that use
the captured values.

## Installation
Install it like any other plugin, then set a hotkey for the plugin's command in the settings.

## Example
For example, you might use tags to reference [Jira](https://www.atlassian.com/software/jira) tickets, and want to be
able to open their associated pages easily.

This is the use case that inspired this plugin in the first place.

To handle tags that look like this: `#jira/<TICKET_ID>` (i.e. `#jira/PROJ-123`)
- The tag regular expression might look like: `jira/(.+)` (note that it does not include the `#` leading character)
- And the substitution might look like: `https://jira.example.com/$1`

## Why Regular Expressions and Substitutions, Instead of Simple Prefixes?
Originally, the plugin was planned to work with simple prefixes - matching tags that started with a certain value.

This was changed to accommodate more complex cases where there are multiple pertinent values in a tag's structure, or
the substitution needs to be placed in multiple locations in the URL. This solution provides much greater flexibility.
