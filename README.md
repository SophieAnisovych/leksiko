# Λέξεις: Greek flashcards

A small flashcard app for learning Greek. Each card shows the Greek word with its pronunciation in IPA; tap it to see the English. The app is plain HTML, CSS and JavaScript with no build step.

## Run it

- **On your computer:** open `index.html` in a browser.
- **Online with GitHub Pages:** in the repository, go to **Settings → Pages**, set **Source** to *Deploy from a branch*, pick `main` and `/ (root)`, and save. The app appears at `https://<your-username>.github.io/<repo-name>/` after a minute.

## Install it as an app

Once GitHub Pages is on, open the site in Safari on your iPad or iPhone, tap **Share → Add to Home Screen**, then **Add**. Λέξεις gets its own icon and opens full-screen like any other app. On Android, open it in Chrome and tap **Install app**.

It works offline after the first launch. Updates you push to GitHub reach the app the next time it's opened with internet.

The home-screen app keeps its own saved words, separate from the Safari page, so pick one and stick with it.

## What's inside

| File | What it is |
| --- | --- |
| `index.html` | The page |
| `styles.css` | Colours (Mediterranean Calm palette), fonts and layout |
| `app.js` | Cards, categories, editing, Add words and file import |
| `data/words.js` | The starting word list: 538 words in 19 categories |
| `manifest.json`, `icons/` | App name, colours and home-screen icon |
| `sw.js` | Keeps the app working offline |

## Using it

- **Cards:** tap to flip, swipe left or right for the next word.
- **Menu → Categories:** tap a category to see its words. The square pencil button turns on editing: on the Categories page you rename or add categories, inside a category you edit or delete words.
- **Menu → Add words:** type the Greek and the translation. The pronunciation fills in automatically from Greek spelling rules, and the category can be chosen for you.
- **Import a file:** `.txt`, `.csv`, `.xlsx`, `.pdf` or `.docx` with one word per line, such as `η πόλη = city` or `η πόλη<TAB>city<TAB>City & transport`. You review the list before anything is added.

## Where your changes are saved

Edits and new words are saved in the browser you use (localStorage), so they stay on that device. To keep them in the repository, open **Categories**, tap **Download word list (words.js)** at the bottom, and replace `data/words.js` in the repo with the downloaded file.

## Differences from the Claude version

In the Claude version, Claude picks categories, double-checks pronunciation and can read photos and messy worksheets. On GitHub those features fall back to built-in rules:

- Pronunciation comes from Greek spelling rules.
- Categories are guessed from the word's form: verbs, adjectives, nouns with an article, numbers.
- Imports need simple word lists.

## Word list format

`data/words.js` sets `window.LEXEIS_DATA`:

```js
{
  "cats":  [{ "id": "c1", "name": "Verbs" }],
  "words": [{ "id": "w1", "g": "είμαι", "p": "[ˈime]", "e": "to be", "c": "c1", "n": "optional note" }]
}
```

`g` is the Greek, `p` the pronunciation, `e` the English, `c` the category id and `n` an optional note.
