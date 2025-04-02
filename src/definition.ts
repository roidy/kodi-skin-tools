/**
 * File: definition.ts
 * Author: roidy
 * License: GPL v3 - https://www.gnu.org/licenses/gpl-3.0.html
 */

import * as vscode from 'vscode';
import path = require('path');
import { findWordInFiles, getWord } from './utils';
import { logger } from './logging';


export class DefinitionProvider implements vscode.DefinitionProvider {

    async provideDefinition(document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken): Promise<vscode.Definition | undefined> {

        const editor = vscode.window.activeTextEditor;
        if (!editor!.document.uri) { return; }

        const [word, _] = getWord(true);
        if (!word) { return; }

        let workingDir = path.dirname(document.fileName);
        const isNum = /^\d+$/.test(word);
        const line = document.lineAt(position).text.toLowerCase();
        let matcher;


        // Choose definition matcher
        if (isNum) {
            workingDir = vscode.workspace.getWorkspaceFolder(editor!.document.uri)?.uri.fsPath + `${path.sep}language`;
            matcher = `msgctxt "#${word}"`;
        } else if (line.includes(`$exp[${word.toLowerCase()}`)) {
            matcher = `<expression name="${word}"`;
        } else if (line.includes(`$var[${word.toLowerCase()}`)) {
            matcher = `<variable name="${word}"`;
        } else if (line.includes(`include`)) {
            matcher = `<include name="${word}"`;
        } else if (line.includes(`font`)) {
            matcher = `<name>${word}</name>`;
        } else {
            matcher = `<constant name="${word}"`;
        }

        logger.log(`Matcher: ${matcher}`);
        const r = await findWordInFiles(matcher, false);
        return r[0];
    }

};