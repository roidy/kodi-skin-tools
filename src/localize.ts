import * as vscode from 'vscode';
import { logger, LogLevel } from "./logging";
import { po } from "./po-file";
import { getWord } from './utils';

class Localize {

    constructor() { }

    public run() {
        logger.log('Localization.run - started.');

        // Check we have loaded po files and try to load them if not.
        if (!po.kodiPO) { po.loadKodiPO(); }
        if (!po.skinPO) { po.loadSkinPO(); }

        if (!po.kodiPO && !po.skinPO) {
            logger.log('No po files loaded.', LogLevel.Error);
            return;
        }

        const editor = vscode.window.activeTextEditor;
        const document = editor!.document;
        if (!editor || !document) {
            logger.log('Failed to get editor or document.', LogLevel.Error);
            return;
        }

        const [word, selection] = getWord();

        if (!word) {
            logger.log('No word selected.', LogLevel.Warning);
            return;
        }

        logger.log(`Found word: ${word}`);

        // Check if selection is a number and return early
        const result = this.isNumber(selection);
        if (result) {
            // Selction was a number or just swapped, exit early
            return;
        }

        // Check if the string exists in the po files
        const id = po.getID(word);
        if (id) {
            editor.edit(editBuilder => {
                editBuilder.replace(selection, id!);
            });
            return;
        }

        // If no string exists create a new one in the skin string file
        po.createEntry(word);
        const newId = po.getID(word);
        if (newId) {
            editor.edit(editBuilder => {
                editBuilder.replace(selection, id!);
            });
            return;
        }
    }


    private isNumber(selection: vscode.Selection) {
        const editor = vscode.window.activeTextEditor;
        const document = editor!.document;

        if (!editor || !document) {
            return true;
        }

        const value = document.getText(selection);
        const line = editor.document.lineAt(selection.active.line).text;

        const findNumbers = /\d+/g;
        const onlyNumbers = /^[0-9]*$/g;
        const localizeWithID = /(\$LOCALIZE\[)\d+(\])/ig;

        // if selection contains $LOCALIZE[xxxxxx]
        var matches = value.match(localizeWithID);
        if (matches) {
            var innerMatches = value.match(findNumbers);
            if (innerMatches) {
                editor.edit(editBuilder => {
                    editBuilder.replace(selection, innerMatches![0].toString());
                });
                return true;
            }
        }

        // if line contains $LOCALIZE[xxxxxx]
        var r = /(\$LOCALIZE\[)\d+(\])/ig;
        var matches = line.match(localizeWithID);
        if (matches) {
            const start = selection.start.translate(0, -10);
            const end = selection.end.translate(0, 1);
            const value = document.getText(selection);
            selection = new vscode.Selection(start, end);
            editor.edit(editBuilder => {
                editBuilder.replace(selection, value);
            });
            return true;
        }

        // if selection is anything other than number then exit
        var matches = value.match(onlyNumbers);
        if (!matches) {
            return false;
        }

        // find just ID number
        var matches = value.match(findNumbers);
        if (matches) {
            editor.edit(editBuilder => {
                editBuilder.replace(selection, `$LOCALIZE[${value}]`);
            });
            return true;
        }

        return false;
    }









}

export const localize = new Localize();