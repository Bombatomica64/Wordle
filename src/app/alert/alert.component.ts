import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="custom-alert {{ type }}" *ngIf="visible">
      <div class="alert-message">
        {{ message }}
        <button class="alert-close" *ngIf="dismissible" (click)="closeAlert()">×</button>
      </div>
    </div>
  `,
  styleUrls: ['./alert.component.scss']
  })
  export class AlertComponent {
    @Input() message: string = '';
    @Input() type: 'success' | 'error' = 'success';
    @Input() dismissible: boolean = true;
    @Input() visible: boolean = true;
    
    @Output() close = new EventEmitter<void>();
    
    closeAlert() {
      this.visible = false;
      this.close.emit();
    }
  }
  