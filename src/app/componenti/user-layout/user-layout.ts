import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { AuthServices } from '../../auth/auth-services';

@Component({
  selector: 'app-user-layout',
  imports: [
    RouterLink,
    RouterOutlet,
    MatIconModule,
    MatMenuModule,
    MatButtonModule
  ],
  templateUrl: './user-layout.html',
  styleUrl: './user-layout.css',
})
export class UserLayout {
  private router = inject(Router);
  authS = inject(AuthServices);

  esci(): void {
    this.authS.resetAll();
    this.router.navigate(['/login']);
  }
}