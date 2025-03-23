/**
 * File: color.ts
 * Author: roidy
 * License: GPL v3 - https://www.gnu.org/licenses/gpl-3.0.html
 */

import * as vscode from 'vscode';
import { readFileSync, writeFileSync } from "fs";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import path from 'path';
import { logger } from './logging';

export class ColorProvider implements vscode.DocumentColorProvider {

    provideColorPresentations(color: vscode.Color, context: { readonly document: vscode.TextDocument; readonly range: vscode.Range; }, token: vscode.CancellationToken): vscode.ProviderResult<vscode.ColorPresentation[]> {
        const toHex = (value: number): string => Math.round(value * 255).toString(16).padStart(2, '0');
        const isValidHex = (input: string): boolean => /^[0-9a-fA-F]{8}$/.test(input);

        const hexColor = [toHex(color.alpha), toHex(color.red), toHex(color.green), toHex(color.blue)].join('');
        const colorPresentation = new vscode.ColorPresentation(hexColor);

        const { document, range } = context;
        const startOffset = document.offsetAt(range.start);
        const endOffset = document.offsetAt(range.end);
        const selectedText = document.getText().substring(startOffset, endOffset);

        if (token.isCancellationRequested) {
            return [];
        }

        if (isValidHex(selectedText)) {
            // Color is hex value so edit derectly in the document.
            colorPresentation.textEdit = new vscode.TextEdit(context.range, hexColor);
            return [colorPresentation];
        }
        else {
            // Color is a named value so update the value in colors/defaults.xml
            const editor = vscode.window.activeTextEditor;
            if (editor?.document.uri) {
                const folder = vscode.workspace.getWorkspaceFolder(editor!.document.uri);
                const colorFile = folder!.uri.fsPath + `${path.sep}colors${path.sep}defaults.xml`;
                const xml = readFileSync(colorFile, 'utf-8');
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xml, "application/xml");

                const elements = xmlDoc.getElementsByTagName('color');
                for (let i = 0; i < elements.length; i++) {
                    const element = elements[i];
                    if (element.getAttribute('name') === selectedText) {
                        element.textContent = hexColor; // Update the color value
                    }
                }
                // Serialize the modified XML back to a string
                const serializer = new XMLSerializer();
                const xmlOut = serializer.serializeToString(xmlDoc);

                // Save the modified XML to a file
                // writeFileSync(colorFile, xmlOut, 'utf-8');
            }
            // colorPresentation.label = hexColor;
            // colorPresentation.textEdit = new vscode.TextEdit(context.range, hexColor);
            colors.deferredColorEdit = { uri: context.document.uri, range: context.range, text: hexColor };
            return [];
        }
    }

    provideDocumentColors(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.ColorInformation[]> {
        const text = document.getText();
        const colorPattern = /[0-9a-fA-F]{8}/g;
        const nMatch = new RegExp([
            "<textcolor>(.*?)<\/textcolor>",
            "<selectedcolor>(.*?)<\/selectedcolor>",
            "<shadowcolor>(.*?)<\/shadowcolor>",
            "<focusedcolor>(.*?)<\/focusedcolor>",
            "<disabledcolor>(.*?)<\/disabledcolor>",
            "<colordiffuse>(.*?)<\/colordiffuse>",
            "colordiffuse=\"(.*?)\""
        ].join("|"), "ig");

        const namedMatches = text.matchAll(nMatch);
        const hexMatches = text.matchAll(colorPattern);

        const colorInformations: vscode.ColorInformation[] = [];

        for (const match of hexMatches) {
            if (match.index !== undefined) {
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                const range = new vscode.Range(startPos, endPos);
                const colorText = match[0];
                if (colorText) {
                    const a = parseInt(colorText.slice(0, 2), 16) / 255;
                    const r = parseInt(colorText.slice(2, 4), 16) / 255;
                    const g = parseInt(colorText.slice(4, 6), 16) / 255;
                    const b = parseInt(colorText.slice(6, 8), 16) / 255;
                    const color = new vscode.Color(r, g, b, a);
                    colorInformations.push(new vscode.ColorInformation(range, color));
                }
            }
        }

        for (const match of namedMatches) {
            const content = match.slice(1).find(group => group !== undefined);

            if (content && match.index !== undefined) {
                const startIndex = match.index + match[0].indexOf(content);
                const startPos = document.positionAt(startIndex);
                const endPos = document.positionAt(startIndex + content.length);
                const range = new vscode.Range(startPos, endPos);
                const c = colors.colors.find(c => c.name === content);
                if (c) {
                    const colorText = c!.value;
                    if (colorText) {
                        const a = parseInt(colorText.slice(0, 2), 16) / 255;
                        const r = parseInt(colorText.slice(2, 4), 16) / 255;
                        const g = parseInt(colorText.slice(4, 6), 16) / 255;
                        const b = parseInt(colorText.slice(6, 8), 16) / 255;
                        const color = new vscode.Color(r, g, b, a);
                        colorInformations.push(new vscode.ColorInformation(range, color));
                    }
                }
            }
        }

        return colorInformations;
    }
};

class Colors {
    public colors: { name: string; value: string | null }[] = [];
    public deferredColorEdit: { uri: vscode.Uri; range: vscode.Range; text: string } | null = null;
    public documentNamedColors = new Set<string>();

    constructor() {
        this.loadColorFile();
        this.documentsGetNamedColors();
    }

    public async documentsGetNamedColors() {
        const xmlFiles = await vscode.workspace.findFiles('**/*.xml');

        this.documentNamedColors.clear();

        for (const file of xmlFiles) {
            const document = await vscode.workspace.openTextDocument(file);
            const text = document.getText();

            const hexRegex = /^[0-9A-Fa-f]{8}$/;
            const nMatch = new RegExp([
                "<textcolor>(.*?)<\/textcolor>",
                "<selectedcolor>(.*?)<\/selectedcolor>",
                "<shadowcolor>(.*?)<\/shadowcolor>",
                "<focusedcolor>(.*?)<\/focusedcolor>",
                "<disabledcolor>(.*?)<\/disabledcolor>",
                "<colordiffuse>(.*?)<\/colordiffuse>",
                "colordiffuse=\"(.*?)\""
            ].join("|"), "ig");

            const namedMatches = text.matchAll(nMatch);
            for (const match of namedMatches) {
                const content = match.slice(1).find(group => group !== undefined);
                if (content && !hexRegex.test(content)) {
                    this.documentNamedColors.add(content);
                }
            }

        }
        return;
    }

    public loadColorFile() {
        const editor = vscode.window.activeTextEditor;
        if (editor?.document.uri) {
            const folder = vscode.workspace.getWorkspaceFolder(editor!.document.uri);
            const colorFile = folder!.uri.fsPath + `${path.sep}colors${path.sep}defaults.xml`;
            const xml = readFileSync(colorFile, 'utf-8');
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, "application/xml");
            const colorElements = xmlDoc.getElementsByTagName("color");

            this.colors = [];

            Array.from(colorElements).forEach(element => {
                const name = element.getAttribute("name");
                const value = element.textContent;
                if (name && value) {
                    this.colors.push({ name, value });
                }
            });
        }
    }
}

export const colors = new Colors();