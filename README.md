```
██████╗ ██╗    ██╗███╗   ██╗██████╗  ██████╗  ██████╗
██╔══██╗██║    ██║████╗  ██║██╔══██╗██╔═══██╗██╔════╝
██████╔╝██║ █╗ ██║██╔██╗ ██║██║  ██║██║   ██║██║     
██╔═══╝ ██║███╗██║██║╚██╗██║██║  ██║██║   ██║██║     
██║     ╚███╔███╔╝██║ ╚████║██████╔╝╚██████╔╝╚██████╗
╚═╝      ╚══╝╚══╝ ╚═╝  ╚═══╝╚═════╝  ╚═════╝  ╚═════╝
        [ t a b l e - e n a b l e d   f o r k ]  ▓▓▒▒░░ >_
```

> **Fork personalizzato di PwnDoc con supporto TABELLE** — nell'editor WYSIWYG *e* nell'export DOCX.

## 🧩 Modifiche custom — Supporto tabelle

Questo fork parte da PwnDoc (`pwndoc/pwndoc`) e aggiunge **solo** la funzionalità tabelle, lasciando tutto il resto invariato. Due modifiche chirurgiche:

**Frontend — editor (TipTap 2)**
- `frontend/package.json`: aggiunte le estensioni `@tiptap/extension-table`, `-table-row`, `-table-header`, `-table-cell`.
- `frontend/src/components/editor/Editor.vue`: registrazione delle estensioni (`Table.configure({ resizable: true })`, `TableRow`, `TableHeader`, `TableCell`) e nuovi pulsanti in toolbar: **inserisci tabella (3×3)**, aggiungi/rimuovi riga e colonna, unisci celle, elimina tabella. Voce `table` attiva di default.

**Backend — export DOCX (`backend/src/lib/html2ooxml.js`)**
- Il convertitore HTML→OOXML ora gestisce `<table> / <tr> / <td> / <th>` e genera veri elementi Word `w:tbl / w:tr / w:tc` (con riga d'intestazione e bordi), così le tabelle **compaiono nel report `.docx` generato**. Prima venivano scartate.

> Verificato: le tabelle si creano nell'editor e vengono renderizzate correttamente nel DOCX (test sul convertitore con `docx` v9 → output `w:tbl` valido).

---

# PwnDoc

PwnDoc is a pentest reporting application making it simple and easy to write your findings and generate a customizable Docx report.  
The main goal is to have more time to **Pwn** and less time to **Doc** by mutualizing data like vulnerabilities between users.

# Documentation
- [Installation](https://pwndoc.github.io/pwndoc/#/installation)
- [Data](https://pwndoc.github.io/pwndoc/#/data)
- [Roles](https://pwndoc.github.io/pwndoc/#/roles)
- [Vulnerabilities](https://pwndoc.github.io/pwndoc/#/vulnerabilities)
- [Audits](https://pwndoc.github.io/pwndoc/#/audits)
- [Templating](https://pwndoc.github.io/pwndoc/#/docxtemplate)
- [Settings](https://pwndoc.github.io/pwndoc/#/settings)
- [Profile](https://pwndoc.github.io/pwndoc/#/profile)


# Features

- Multiple Language support
- Multiple Data support
- Great Customization
  - Manage reusable Audit and Vulnerability Data
  - Create Custom Sections
  - Add custom fields to Vulnerabilities
- Vulnerabilities Management with CVSS v3 and v4 scoring
- Multi-User reporting with real-time collaboration
- Retest and multi-audit workflows
- Automatic recovery for unsaved work
- Audit review and approval workflow
- Audit comments with threaded replies
- Docx Report Generation
- Docx Template customization
- Spellcheck and grammar check via LanguageTool (with custom rules)
- Backup and restore with encryption and selective restore
- Two-factor authentication (TOTP)
- Custom roles and granular permissions

# Demos

#### Audit workflow

![Audit workflow demo](demos/audit_authoring.gif)

#### Vulnerability workflow

![Vulnerability workflow demo](demos/vulnerability_workflow.gif)

#### Collaboration and review

![Collaboration and review demo](demos/collaboration_review.gif)

#### Retest and draft recovery

![Retest and draft recovery demo](demos/retest_draft_recovery.gif)

#### Customization and settings

![Customization and settings demo](demos/customization_operations.gif)

# Donate

If you would like to help me and sponsor this project

[:heart: Sponsor Me](https://github.com/sponsors/yeln4ts)

Or you can send me some crypto love

| Bitcoin | Ethereum |
|:----------------------------------------:|:--------:|
| <img src="https://user-images.githubusercontent.com/4255028/160478210-ddc3b0ec-6eeb-4112-b1f0-ff1a4ee7c074.png">| <img src="https://user-images.githubusercontent.com/4255028/160478210-ddc3b0ec-6eeb-4112-b1f0-ff1a4ee7c074.png"> |
| BTC address: `bc1q6z2n99effsmla5mj4ctk3ya6nd76truf6qfe7y` | ETH address: `0xB76cd48CD6C098DE85928e125b44057D3B372821` |
