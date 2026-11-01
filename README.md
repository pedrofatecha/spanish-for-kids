# Colorín Colorado: Spanish for Kids
A web app that teaches kids to read and write in Spanish, with recorded audio for its words, syllables, vowels and sentences.

- **Alfabeto:** the 27 letters, each with its name and a word that uses it.
- **Aprender, Adivina and Memoria:** vocabulary cards, a listening game and a matching game by topic.
- **Sílabas:** vowels, syllables, words, reading before seeing the picture, sentences and a word-building game.
- **Escritura:** spelling with letter tiles, typing with accent keys, and tracing letters.

## Files
- `index.html`: page structure
- `styles.css`: colors and layout
- `app.js`: game logic
- `data.json`: letters, words, syllables, sentences and pictures
- `audio.json`: the recorded audio

## Run it locally
The page loads its data with `fetch`, so opening `index.html` directly won't work. Start a local server in this folder:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.
