# Kodi Skin Tools

A set of tools to help in the development of [Kodi](http://kodi.tv/) skins.

# Features

## Skin reloading

Reload Kodi's skin to view the latest changes when ever a file is saved in the editor. A comma seperated list of extensions can be set to control which files type trigger a reload.

Requires [script.vscode.reload](http://) for Kodi to be installed.

Requires remote http control to be active in Kodi with both a username and password set.

Kodi Settings -> Service -> Control
 - Allow remote control via HTTP -> ON
 - Allow remote control from applications on this system -> ON
 - Allow remote control from applications on other systems -> ON (if Kodi is accessed over a network)

## Localization

Generate localization strings for any text in your skin.

![Localize](images/localize.gif)

Quickly switch between ID and $LOCALIZE[ID].

![Swap](images/swap.gif)

### Generate translation file

All Kodi string are generated in the en_gb language file by default. The `Generate translation file` command
can then be used to generate a new translation file in a different language ready to be externally translated. If the new translation file already exists then only new entries will be written into it to prevent overwriting already translated stings.

![GenerateTranslationFile](images/generate_translation.gif)

## Definition provider

Quickly jump to or Peek the definition of Expressions, Variables, Includes, Constants and Localized strings.

![Definition](images/definition.gif)

## Reference provider

Quickly find or Peek all references of Expressions, Variables, Includes, Constants and Localized strings.

![Reference](images/reference.gif)

## Color selection
Edit colors directly in the editor window.

![Color](images/color.gif)

# Requirements

Skin reloading requires [script.vscode.reload](http://) for Kodi to be installed.

# Extension Settings

| Setting | Value | Description |
| --- | --- | --- |
| kodi-skin-tools.ipAddress | 127.0.0.1 | IP Address of you Kodi instance |
| kodi-skin-tools.port | 8080 | HTTP port of you Kodi instance |
| kodi-skin-tools.userName | string | UserName to control your Kodi instance |
| kodi-skin-tools.password | string | Password to control your Kodi instance |
| kodi-skin-tools.decoratorColor | AARRGGBB | Color of decorated localization text in the hex AARRGGBB format |
| kodi-skin-tools.operation | ID or $LOCALIZE[ID] | Initial localization will generate ID or $LOCALIZE[ID] |
| kodi-skin-tools.reloadExtensions | .xml, .po | Comma seperated list of file extension that will be reloaded |
