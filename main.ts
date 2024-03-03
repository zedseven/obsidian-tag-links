import {
    App,
    Editor,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting
} from 'obsidian';

interface TagLinkSettings {
	tagLinkSubstitutions: Array<TagLinkSubstitution>;
}

interface TagLinkSubstitution {
    tagRegex: string;
    linkSubstitution: string;
}

const DEFAULT_SETTINGS: TagLinkSettings = {
    tagLinkSubstitutions: new Array<TagLinkSubstitution>(),
}

const DEFAULT_SUBSTITUTION: TagLinkSubstitution = {
    tagRegex: '',
    linkSubstitution: '',
}

export default class TagLink extends Plugin {
	settings: TagLinkSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'open-tag-as-link',
			name: 'Open tag as a link',
			editorCallback: async (editor, _) => {
                await this.openTagAsLinkAtCursor(this, editor);
            }
		});

		this.addSettingTab(new TagLinkSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

    async openTagAsLinkAtCursor(plugin: TagLink, editor: Editor) {
        // https://help.obsidian.md/Editing+and+formatting/Tags#Tag+format
        const findTagRegex = /#([\w\/\-_]+)/g;

        const cursorPosition = editor.getCursor();
        const currentLine = editor.getLine(cursorPosition.line);

        let searchResult;
        while ((searchResult = findTagRegex.exec(currentLine)) !== null) {
            if (findTagRegex.lastIndex < cursorPosition.ch) {
                continue;
            }
            if (searchResult.index > cursorPosition.ch) {
                break;
            }

            const selectedTag = searchResult[1];
            await plugin.openTagAsLink(selectedTag);

            break;
        }
    }

    async openTagAsLink(tag: string) {
        for (const tagLinkSubstitution of this.settings.tagLinkSubstitutions) {
            const MINIMUM_GROUP_LENGTH = 2;

            let tagRegex;
            try {
                tagRegex = new RegExp(tagLinkSubstitution.tagRegex);
            } catch (_) {
                continue;
            }

            let matchResult = tag.match(tagRegex);
            if (matchResult === null) {
                continue;
            }

            if (matchResult.length < MINIMUM_GROUP_LENGTH) {
                continue;
            }

            let finalLink = tagLinkSubstitution.linkSubstitution;
            for (let index = 1; index < matchResult.length; index++) {
                finalLink = finalLink.replace('$' + index, matchResult[index]);
            }

            window.open(finalLink);

            return;
        }

        new Notice('The selected tag doesn\'t match any configured tag link substitutions!');
    }
}

class TagLinkSettingTab extends PluginSettingTab {
	plugin: TagLink;

	constructor(app: App, plugin: TagLink) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

        containerEl.createEl('h2', { text: 'Tag Link Substitutions' });

        new Setting(containerEl)
            .setName('Add New')
            .addButton(button => button
                .setIcon('plus')
                .setTooltip('Add')
                .onClick(async () => {
                    this.plugin.settings.tagLinkSubstitutions.push({ ...DEFAULT_SUBSTITUTION });

                    await this.plugin.saveSettings();
                    this.display();
                }));

        for (let index = 0; index < this.plugin.settings.tagLinkSubstitutions.length; index++) {
            const tagLinkSubstitution = this.plugin.settings.tagLinkSubstitutions[index];

            const row = new Setting(containerEl)
                .addText(text => text
                    .setPlaceholder('Tag Regex')
                    .setValue(tagLinkSubstitution.tagRegex)
                    .onChange(async (newValue) => {
                        this.plugin.settings.tagLinkSubstitutions[index].tagRegex = newValue;

                        await this.plugin.saveSettings();
                    }));

            row.addText(text => text
                .setPlaceholder('Link Substitution')
                .setValue(tagLinkSubstitution.linkSubstitution)
                .onChange(async (newValue) => {
                    this.plugin.settings.tagLinkSubstitutions[index].linkSubstitution = newValue;

                    await this.plugin.saveSettings();
                }));

            row.addButton(button => button
                .setIcon('x')
                .setTooltip('Delete')
                .onClick(async () => {
                    this.plugin.settings.tagLinkSubstitutions.splice(index, 1);

                    await this.plugin.saveSettings();
                    this.display();
                }));
        }
	}
}
