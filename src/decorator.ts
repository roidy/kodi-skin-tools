import * as vscode from 'vscode';
import { logger, LogLevel } from './logging';
import { config } from './configuration';
import { po } from './po-file';

/**
 * A Logger class that provides logging functionality to the output channel in Visual Studio Code.
 */
class Decorator {
    private decorationType: vscode.TextEditorDecorationType;
    public activeEditor: vscode.TextEditor | undefined;

    constructor() {
        this.decorationType = vscode.window.createTextEditorDecorationType({});
        this.activeEditor = vscode.window.activeTextEditor;
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

        if (!po.skinPO) { 
            logger.log('No skin po, attempting to reload po.', LogLevel.Warning);
            po.loadSkinPO(); 
        }

        const decoratorArray: vscode.DecorationOptions[] = [];
        // Clear current decorators
        editor.setDecorations(this.decorationType, []);

        for (let i = 0; i < document.lineCount; ++i) {
            const line = document.lineAt(i);
            var decObj = this.findLocalizedStrings(i, line);

            if (decObj) {
                decObj.renderOptions.after.color = (config.decoratorColor as string);
                decoratorArray.push(decObj);
            }
        }
        editor.setDecorations(this.decorationType, decoratorArray);
    }

    findLocalizedStrings(i: number, line: vscode.TextLine) {
        // var r= /\d+/g;
        // test for number in line, if no number then exit early
        var r = /(\$LOCALIZE\[)\d+(\])|(\<label\>)\d+(\<\/label\>)|(\<label2\>)\d+(\<\/label2\>)|(\$INFO\[.*)\d+(.*\])|(label=\")\d+(\")|(labelID=\")\d+(\")/ig;
        var matches = line.text.match(r);
        if (!matches) {
            return undefined;
        }
        var dtext: string = '';
        matches.forEach((m) => {
            // massive hack for my lack of regex knowlage
            // remove false positives for 'Property(xxxxx)', 'Control(xxxxx)' and 'Container(xxxxx)'
            var r = /(\Property\(.*)\d+(.*\))|(\Control\(.*)\d+(.*\))|(\Container\(.*)\d+(.*\))|(\ListItem\(.*)\d+(.*\))/ig;
            var pM = m.match(r);
            if (pM) {
                m = m.replace(pM[0], '');
            }

            var r = /\d+/g;
            var matches = m.match(r);
            if (matches) {
                matches.forEach((m) => {
                    const stringId = `#${m}`;

                    // Check Skin strings
                    if (po.skinPO) {
                        const skinString = po.skinPO.items?.find(item => item.msgctxt === stringId)?.msgid;
                        if (skinString) { dtext = dtext.concat(' • ', skinString); }
                    }

                    // Check Kodi strings
                    if (po.kodiPO) {
                        const kodiString = po.kodiPO.items?.find(item => item.msgctxt === stringId)?.msgid;
                        if (kodiString) { dtext = dtext.concat(' • ', kodiString); }
                    }
                });
            }
        });

        return this.decoration(i, `${dtext}`);
    }
}

export const decorator = new Decorator();