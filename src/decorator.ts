import * as vscode from 'vscode';
import { logger, LogLevel } from './logging';
import { config } from './configuration';
import { po } from './po-file';
import path from 'path';

class Decorator {
    private decorationType: vscode.TextEditorDecorationType;
    public activeEditor: vscode.TextEditor | undefined;
    public context: vscode.ExtensionContext | undefined;

    constructor() {
        this.decorationType = vscode.window.createTextEditorDecorationType({});
        this.activeEditor = vscode.window.activeTextEditor;
        this.context = undefined;
    }

    private decorationMessage(text: string) {
        return {
            after: {
                margin: '16px',
                contentText: text,
                color: "#ffffff60"
            }
        };
    }

    private decoration(line: number, text: string) {
        return {
            renderOptions: {
                ...this.decorationMessage(text)
            },
            range: new vscode.Range(
                new vscode.Position(line, 1024),
                new vscode.Position(line, 1024)
            )
        };
    }

    updateDecorations() {
        const editor = vscode.window.activeTextEditor;
        if (editor === undefined) {
            return;
        }
        const document = editor.document;
        if (!document) {
            return;
        }

        if (document.fileName.toLowerCase().includes('colors/defualt.xml')) { return; }

        if (!po.skinPO) {
            logger.log('No skin po, attempting to reload po.', LogLevel.Warning);
            po.loadSkinPO();
        }

        const endDecoratorArray: vscode.DecorationOptions[] = [];
        const lineCount = editor.document.lineCount;
        const ranges: vscode.DecorationOptions[] = [];

        editor.setDecorations(this.decorationType, []);

        for (let i = 0; i < document.lineCount; ++i) {
            const line = document.lineAt(i);
            var decObj = this.findLocalizedStrings(i, line);

            if (decObj) {
                decObj.renderOptions.after.color = (config.decoratorColor as string);
                endDecoratorArray.push(decObj);
            }
        }

        editor.setDecorations(this.decorationType, endDecoratorArray);
    }

    findLocalizedStrings(i: number, line: vscode.TextLine) {
        // RegEx expressions
        const rMatch = new RegExp([
            "(?<=\\$LOCALIZE\\[)\\d+(?=\\])",               // Match digits inside $LOCALIZE[...]
            "(?<=<label>)[^<]*?\\d+[^<]*?(?=</label>)",     // Match digits inside <label>...</label>
            "(?<=<label2>)[^<]*?\\d+[^<]*?(?=</label2>)",   // Match digits inside <label2>...</label2>
            "\\$INFO\\[.*\\d+.*\\]",                        // Match digits inside $INFO[...]
            "(labelID|label|grouping)=\"\\d+\""             // Match digits inside labelID/label/grouping="..."
        ].join("|"), "ig");
        const rRemove = new RegExp([
            "(\\Property\\(.*)\\d+(.*\\))",                 // Remove digits inside Property(...)
            "(\\Control\\(.*)\\d+(.*\\))",                  // Remove digits inside Control(...)
            "(\\Container\\(.*)\\d+(.*\\))",                // Remove digits inside Container(...)
            "(\\ListItem\\(.*)\\d+(.*\\))"                  // Romove digits inside ListItem(...)
        ].join("|"), "ig");
        const rNumber = /\d+/g;                             // Match just numbers

        // Find matches in current line
        var matches = line.text.match(rMatch);
        if (!matches) { return undefined; }

        var decoratorText: string = '';
        matches.forEach((m) => {
            // Remove false positives
            const removals = m.match(rRemove);
            if (removals) {
                m = m.replace(removals[0], '');
            }

            // Just return the number portion of the match
            var matches = m.match(rNumber);
            if (matches) {
                // Check each number for a po string
                matches.forEach((m) => {
                    const stringId = `#${m}`;
                    // Check Skin strings
                    if (po.skinPO) {
                        const skinString = po.skinPO.items?.find(item => item.msgctxt === stringId)?.msgid;
                        if (skinString) { decoratorText = decoratorText.concat(' • ', skinString); }
                    }
                    // Check Kodi strings
                    if (po.kodiPO) {
                        const kodiString = po.kodiPO.items?.find(item => item.msgctxt === stringId)?.msgid;
                        if (kodiString) { decoratorText = decoratorText.concat(' • ', kodiString); }
                    }
                });
            }
        });

        return this.decoration(i, `${decoratorText}`);
    }
}

export const decorator = new Decorator();