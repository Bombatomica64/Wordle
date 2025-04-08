import { Component, signal, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { KeyboardComponent } from '../keyboard/keyboard.component';

/**
 * Selects a random word from the provided word list
 * @param words Array of words to choose from
 * @returns A randomly selected word or 'error' if the array is empty
 */
export function getRandomWord(words: string[]): string {
  if (!words || words.length === 0) {
    return 'error';
  }
  const randomIndex = Math.floor(Math.random() * words.length);
  return words[randomIndex];
}

export function getCharCountInWord(word: string, char: string): number {
  let count = 0;
  for (let i = 0; i < word.length; i++) {
    if (word[i] === char) {
      count++;
    }
  }
  return count;
}

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, KeyboardComponent],
  templateUrl: './homepage.component.html',
  styleUrl: './homepage.component.scss',
})
export class HomepageComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  isStarted = signal(false);
  wordList: string[] = [];
  wordSet = new Set<string>();
  secretWord = signal('');
  currentRow = signal(0);
  currentCol = signal(0);
  guessForm!: FormGroup;
  guessResults: string[][] = Array(6)
    .fill(null)
    .map(() => Array(5).fill(''));
  redobutton = false;

  keys = signal<string[]>([
    'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
    'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L',
    'Z', 'X', 'C', 'V', 'B', 'N', 'M',
  ]);
  removedKeys = signal<string[]>([]);
  presentKeys = signal<string[]>([]);
  correctKeys = signal<string[]>([]);
  /**
   * Returns the rows FormArray from the main form
   */
  get rowsFormArray(): FormArray {
    return this.guessForm.get('rows') as FormArray;
  }

  /**
   * Returns the letters FormArray for a specific row
   * @param rowIndex Index of the row to get letters from
   */
  getLettersFormArray(rowIndex: number): FormArray {
    return this.rowsFormArray.at(rowIndex).get('letters') as FormArray;
  }

  /**
   * Initializes the component, loads word list and creates form
   */
  ngOnInit() {
    this.loadWordList();
    this.initForm();
  }

  /**
   * Initializes the reactive form with a 6×5 grid
   */
  initForm() {
    this.guessForm = this.fb.group({
      rows: this.fb.array([]),
    });

    const rowsArray = this.guessForm.get('rows') as FormArray;

    for (let i = 0; i < 6; i++) {
      const row = this.fb.group({
        letters: this.fb.array([]),
      });

      const lettersArray = row.get('letters') as FormArray;

      for (let j = 0; j < 5; j++) {
        lettersArray.push(
          this.fb.control('', [
            Validators.required,
            Validators.maxLength(1),
            Validators.pattern('[a-zA-Z]'),
          ])
        );
      }
      rowsArray.push(row);
    }
  }

  /**
   * Loads the word list from the server
   */
  loadWordList() {
    this.http.get('assets/words.txt', { responseType: 'text' }).subscribe({
      next: (data) => {
        this.wordList = data
          .split('\n')
          .map((word) => word.trim().toLowerCase())
          .filter((word) => word.length === 5);

        this.wordSet = new Set(this.wordList);
      },
      error: (err) => {
        console.error('Failed to load word list:', err);
      },
    });
  }

  /**
   * Checks if a word exists in the loaded dictionary
   * @param word The word to validate
   * @returns True if the word is valid, false otherwise
   */
  isValidWord(word: string): boolean {
    if (word.length !== 5) return false;
    return this.wordSet.has(word.toLowerCase());
  }

  /**
   * Starts a new game with a randomly selected word
   */
  startGame() {
    this.secretWord.set(getRandomWord(this.wordList));
    console.log('Secret word:', this.secretWord());
    this.isStarted.set(true);
    this.currentRow.set(0);
    this.currentCol.set(0);
    this.guessResults = Array(6)
      .fill(null)
      .map(() => Array(5).fill(''));
    this.initForm();

    setTimeout(() => {
      this.focusInput(0, 0);
    }, 0);
  }

  /**
   * Handles keyboard navigation between cells
   * @param event Keyboard event
   * @param rowIndex Current row index
   * @param colIndex Current column index
   */
  onKeyDown(event: KeyboardEvent, rowIndex: number, colIndex: number) {
    if (rowIndex !== this.currentRow()) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      this.checkCurrentRow();
    } else if (event.key === 'Backspace') {
      const input = event.target as HTMLInputElement;
      if (colIndex > 0 && input.value === '') {
        event.preventDefault();
        this.focusInput(rowIndex, colIndex - 1);
      } else if (
        colIndex > 0 &&
        input.selectionStart === 0 &&
        input.selectionEnd === 0
      ) {
        event.preventDefault();
        this.focusInput(rowIndex, colIndex - 1);
      }
    } else if (event.key === 'ArrowLeft' && colIndex > 0) {
      event.preventDefault();
      this.focusInput(rowIndex, colIndex - 1);
    } else if (event.key === 'ArrowRight' && colIndex < 4) {
      event.preventDefault();
      this.focusInput(rowIndex, colIndex + 1);
    }
  }

  /**
   * Handles character input and auto-advances to the next cell
   * @param event Input event
   * @param rowIndex Current row index
   * @param colIndex Current column index
   */
  onInputChange(event: any, rowIndex: number, colIndex: number) {
    if (rowIndex !== this.currentRow()) return;

    const value = event.target.value;
    if (value) {
      const lettersArray = this.getLettersArrayForRow(rowIndex);
      lettersArray.at(colIndex).setValue(value.toUpperCase());

      if (colIndex < 4) {
        this.currentCol.set(colIndex + 1);
        this.focusInput(rowIndex, colIndex + 1);
      }
    }
  }

  /**
   * Focuses an input cell with the given coordinates
   * @param rowIndex Row to focus
   * @param colIndex Column to focus
   */
  focusInput(rowIndex: number, colIndex: number) {
    this.currentCol.set(colIndex);

    setTimeout(() => {
      const input = document.getElementById(`input-${rowIndex}-${colIndex}`);
      if (input) {
        (input as HTMLInputElement).focus();
      }
    }, 0);
  }

  /**
   * Helper to get the letters FormArray for a specific row
   * @param rowIndex Row index to get letters for
   * @returns FormArray containing the letters controls
   */
  getLettersArrayForRow(rowIndex: number): FormArray {
    const rowForm = (this.guessForm.get('rows') as FormArray).at(rowIndex);
    return rowForm.get('letters') as FormArray;
  }

  /**
   * Validates and checks the current row against the secret word
   */
  checkCurrentRow() {
    const row = this.currentRow();
    const lettersArray = this.getLettersArrayForRow(row);

    let isComplete = true;
    for (let i = 0; i < 5; i++) {
      if (!lettersArray.at(i).value) {
        isComplete = false;
        break;
      }
    }

    if (!isComplete) {
      alert('Please fill in all letters!');
      return;
    }

    let guess = '';
    for (let i = 0; i < 5; i++) {
      guess += lettersArray.at(i).value;
    }
    guess = guess.toLowerCase();

    if (!this.isValidWord(guess)) {
      alert('Not a valid 5-letter word!');
      return;
    }

    const secretWord = this.secretWord();
    for (let i = 0; i < 5; i++) {
      if (guess[i] === secretWord[i]) {
        this.guessResults[row][i] = 'correct';
        this.correctKeys.set([...this.correctKeys(), guess[i]]);
      } else if (secretWord.includes(guess[i])) {
        this.guessResults[row][i] = 'present';
      } else {
        this.guessResults[row][i] = 'absent';
        this.removedKeys.set([...this.removedKeys(), guess[i]]);
      }
    }
    for (let i = 0; i < 5; i++) {
      if (this.guessResults[row][i] === 'present') {
        let count = getCharCountInWord(secretWord, guess[i]);
        console.log('present', guess[i], 'count', count);
        for (let j = 0; j < 5; j++) {
          if (this.guessResults[row][j] === 'correct' && guess[i] === guess[j]) {
            count--;
          }
          if (this.guessResults[row][j] === 'present' && guess[i] === guess[j]) {
            count--;
          }
        }
        if (count  < 0) {
          this.guessResults[row][i] = 'absent';
          console.log('present', guess[i], 'count', count);
        }
      }
    }
    for (let i = 0; i < 5 ; i++) {
      if (this.guessResults[row][i] === 'present') {
        this.presentKeys.set([...this.presentKeys(), guess[i]]);
      }
    }
    if (guess === secretWord) {
      setTimeout(() => {
        alert('Congratulations! You found the word!');
      }, 100);
      this.redobutton = true;
      return;
    }

    if (row < 5) {
      this.currentRow.set(row + 1);
      this.currentCol.set(0);
      this.focusInput(row + 1, 0);
    } else {
      setTimeout(() => {
        alert(`Game Over! The word was: ${secretWord}`);
      }, 100);
    }
  }

  reDoGame() {
    this.isStarted.set(false);
    this.redobutton = false;
    this.guessResults = Array(6)
      .fill(null)
      .map(() => Array(5).fill(''));
    this.currentRow.set(0);
    this.currentCol.set(0);
    this.initForm();
    this.loadWordList();
    this.secretWord.set('');
    this.wordSet = new Set<string>();
    this.wordList = [];
    this.focusInput(0, 0);
  }
    onVirtualKeyPress(key: string) {
    const rowIndex = this.currentRow();
    const colIndex = this.currentCol();
    console.log('key', key, 'rowIndex', rowIndex, 'colIndex', colIndex);
    // Ensure the key is a single character and the current row is active
    if (key.length === 1 && rowIndex < 6 && colIndex < 5) {
      const lettersArray = this.getLettersArrayForRow(rowIndex);
  
      // Set the value of the current input box
      lettersArray.at(colIndex).setValue(key.toUpperCase());
  
      // Move to the next input box
      if (colIndex < 4) {
        this.currentCol.set(colIndex + 1);
        this.focusInput(rowIndex, colIndex + 1);
      }
    } else if (key === 'Backspace') {
      // Handle backspace logic
      if (colIndex > 0) {
        this.currentCol.set(colIndex - 1);
        this.focusInput(rowIndex, colIndex - 1);
        const lettersArray = this.getLettersArrayForRow(rowIndex);
        lettersArray.at(colIndex - 1).setValue('');
      }
    } else if (key === 'Enter') {
      // Handle enter key to submit the row
      this.checkCurrentRow();
    }
  }
}
