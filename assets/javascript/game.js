"use strict"

// LOGIC

const { List, OrderedSet, Set } = Immutable

const words = [
    "alonzo church",
    "haskell curry",
    "john mccarthy",
    "lambda calculus",
    "function",
    "closure",
    "value",
    "immutable",
    "currying",
    "recursion",
    "fixed point",
    "combinator",
    "free variable",
    "lazy evaluation",
    "thunk",
    "memoization",
    "reduction",
    "redex",
    "tail call",
    "normal form",
    "applicative",
    "continuation",
    "domain",
    "category",
    "functor",
    "monoid",
    "monad",
    "lisp",
    "scheme",
    "racket",
    "clojure",
    "idris",
    "agda",
    "miranda",
    "haskell",
    "ocaml",
    "erlang",
].map(str => str.toUpperCase());

function randomWord() {
    return words[Math.floor(Math.random() * words.length)];
}

function isLetter(x) {
    return typeof x === "string" && /^[A-Z]$/i.test(x);
}

/*
 *  GameState has four base properties that are derived from the action history:
 *  
 *  word - the word to be guessed this round
 *  guessed - the set of letters the user has guessed so far this round
 *  previousWord - the word from last round, or null if this is the first round
 *  wins - the number of rounds won since the game began
 */

// GameState(obj1, obj2, ...) -> a new GameState object with the (right-biased) merged properties of the arguments
function GameState(...args) {
    if (new.target) {
        Object.assign(this, ...args);
    } else {
        return new GameState(...args);
    }
};

GameState.prototype = {
    // The number of guesses allowed before the end of the round.
    maxTurns: 12,

    // The number of guesses left before the end of the round.
    get turnsRemaining() {
        return this.maxTurns - this.guessed.size;
    },

    // isWon/isLost/isOver describe whether and how the round has finished
    get isWon() {
        return this.wordLettersRemaining.size === 0;
    },
    get isLost() {
        return this.turnsRemaining === 0 && !this.isWon;
    },
    get isOver() {
        return this.isWon || this.isLost;
    },

    // The set of distinct letters in this.word
    get wordLetters() {
        return Set(this.word.split('').filter(isLetter));
    },

    // The subset of this.wordLetters not yet guessed
    get wordLettersRemaining() {
        return this.wordLetters.filter(l => !this.guessed.includes(l));
    },
};

// State generators
const newRound = (previousWord, wins) =>
    GameState({ word: randomWord(), guessed: OrderedSet(), previousWord, wins });

const newGame = () => newRound(null, 0);


// store encapsulates the current state and enqueues actions
const store = function () {
    var state = newGame();

    return {
        getState: () => state,
        // Using a Promise delays action processing until after the current event loop cycle is finished
        dispatch: action => Promise.resolve().then(() => {
            state = reducer(state, action);
            subscriber(state);
            render(state);
        }),
    };
}();

// Actions/generators
const newRoundAction = { type: 'NEW_ROUND' };
const guessAction = (letter) => Object({ type: 'GUESS', letter });


function reducer(state = newGame(), action) {
    switch (action.type) {
        case 'NEW_ROUND':
            return newRound(state.word, state.isWon ? state.wins + 1 : state.wins);
        case 'GUESS':
            return GameState(state, { guessed: state.guessed.add(action.letter) });
        default:
            return state;
    }
}

// Listen for when the round is over, then start a new round after two seconds.
function subscriber(state) {
    if (state.isOver) {
        setTimeout(() => store.dispatch(newRoundAction), 2000);
    }
}

document.onkeyup = e => {
    // Dispatch a guess action only for letters that haven't been guessed before
    if (isLetter(e.key) && !(store.getState().guessed.includes(e.key.toUpperCase()))) {
        store.dispatch(guessAction(e.key.toUpperCase()));
    }
}



// PRESENTATION

function render(state) {
    document.body.innerHTML = renderBody(state);
}

function renderBody(state) {
    return (
        "Press any key to play\n" +
        renderGraphic(state) +
        `Previous word: ${state.previousWord || "(none)"}\n` +
        `Wins: ${state.wins}\n` +
        `Guesses remaining: ${state.turnsRemaining}\n` +
        ["&gt;", ...state.guessed].join(' ') + ' <span class="cursor">_</span>'
    );
}

// renderGraphic generates the partial hangman graphic. It does so by combining a complete hangman graphic with a mask that determines which character locations from the complete graphic are shown at each step. In addition, the mask marks a few special locations in the graphic that are drawn with different characters at different steps, and it also marks the sequence of characters where the puzzle word is shown.
function renderGraphic(state) {
    // The graphic is displayed in 13 steps, numbered 0 (blank) to 12 (complete). Each round begins at step 0 and increments with every (non-winning) guess. So the step number is just the number of guesses, or one less than that if the round has been won.
    const step = state.isWon ? state.guessed.size - 1 : state.guessed.size;

    // state.word with all non-guessed letters replaced by '_'
    const obfuscatedWord = state.word.replace(RegExp(`[${state.wordLettersRemaining}]`, 'g'), '_');

    const complete = [
        "┏━━━━━━━━━━━━━━━━┑               ",
        "┃                ╷               ",
        "┃                ╷               ",
        "┃                ╷               ",
        "┃            ╭───────╮           ",
        "┃            │  ╳ ╳  │           ",
        "┃            │       │           ",
        "┃            │ ╭───╮ │           ",
        "┃            ╰───┬───╯           ",
        "┃           ─────┼─────          ",
        "┃                │               ",
        "┃                │               ",
        "┃                │               ",
        "┃               ╱ ╲              ",
        "┃              ╱   ╲             ",
        "┃             ╱     ╲            ",
        "┃                                ",
        "┃                                ",
        "┃                                ",
        "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    ].join('\n') + '\n';

    // Mask character positions marked with 'a' are drawn for steps >= 1, those with 'b' for steps >= 2, and so on, otherwise they are replaced with spaces. Positions marked with a digit have more complex behavior, handled by renderDigit. The '*' sequence is replaced by the obfuscated word (plus padding).
    const mask = [
        "cccccccccccccccccd               ",
        "b                d               ",
        "b                d               ",
        "b                d               ",
        "b            eeeeeeeee           ",
        "b            e  l l  e           ",
        "b            e       e           ",
        "b            e kkkkk e           ",
        "b            eeee0eeee           ",
        "b           ggggg1hhhhh          ",
        "b                f               ",
        "b                f               ",
        "b                f               ",
        "b               i j              ",
        "b              i   j             ",
        "b             i     j            ",
        "b                                ",
        "b********************************",
        "b                                ",
        "baaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ].join('\n') + '\n';

    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    const shownMaskLetters = alphabet.slice(0, step);
    const hiddenMaskLetters = alphabet.slice(step);

    return mask
        // Locations to be drawn are replaced by the corresponding character in 'complete'
        .replace(RegExp(`[${shownMaskLetters}]`, 'g'),
            (_, offset) => complete.charAt(offset))
        // Locations to remain hidden are replaced by spaces
        .replace(RegExp(`[${hiddenMaskLetters}]`, 'g'), ' ')
        // Digits and the '*' sequence are handed off to 'renderDigit' and 'renderWord', respectively
        .replace(/\d/g, (match) => renderDigit(match, step))
        .replace(/\*+/, (match) => renderWord(state.word, state.wordLettersRemaining, match.length));
}

// Digits in the mask are drawn with different characters at different steps, as determined by the policies in 'drawnCharactersByDigit'
function renderDigit(digit, step) {
    const drawnCharactersByDigit = {
        '0': step < 5 ? ' ' :
             step < 6 ? '─' :
                        '┬',
        '1': step < 6 ? ' ' :
             step < 7 ? '│' :
             step < 8 ? '┤' :
                        '┼',
    };

    return drawnCharactersByDigit[digit];
}

// Given a word, a set of letters to hide, and a desired string length, renderWord returns the word with said letters replaced by underscores, with spaces inserted between each character, and with spaces padding them on the left and right to reach the specified length.
function renderWord(word, lettersToHide, length) {
    const obfuscatedWord = word
        .replace(RegExp(`[${lettersToHide.join()}]`, 'g'), '_')
        .split('').join(' ');

    const halfPaddingLength = (length - obfuscatedWord.length) / 2;
    const leftPadding = ' '.repeat(Math.floor(halfPaddingLength));
    const rightPadding = ' '.repeat(Math.ceil(halfPaddingLength));

    return leftPadding + obfuscatedWord + rightPadding;
}

render(store.getState());