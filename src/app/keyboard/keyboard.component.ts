import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-keyboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './keyboard.component.html',
  styleUrl: './keyboard.component.scss'
})
export class KeyboardComponent {
  @Input() basicKeys: string[] = [];
  @Input() removedKeys: string[] = [];
  @Input() presentKeys: string[] = [];
  @Input() correctKeys: string[] = [];
  @Output() keyPressed = new EventEmitter<string>();

  get keyRows(): string[][] {
    return [
      this.basicKeys.slice(0, 10), // First row: 10 keys
      this.basicKeys.slice(10, 19), // Second row: 9 keys
      this.basicKeys.slice(19, 26), // Third row: 7 keys
    ];
  }

  onKeyClick(key: string): void {
    this.keyPressed.emit(key);
  }
  onEnterClick(): void {
    this.keyPressed.emit('Enter');
  }
  onBackspaceClick(): void {
    this.keyPressed.emit('Backspace');
  }
/*    ngOnChanges(changes: SimpleChanges): void {
    console.log('Removed Keys:', this.removedKeys);
    console.log('Present Keys:', this.presentKeys);
    console.log('Correct Keys:', this.correctKeys);
  }*/

  getKeyClass(key: string): string {
    key = key.toLowerCase();
    if (this.removedKeys.includes(key)) {
      return 'key absent';
    } else if (this.presentKeys.includes(key) && !this.correctKeys.includes(key)) {
      return 'key present';
    } else if (this.correctKeys.includes(key)) {
      console.log('Key is corr:', key);
      return 'key correct';
    }
    return 'key';
  }
}