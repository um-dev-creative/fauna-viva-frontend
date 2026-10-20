import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';

type LoginError = 'invalid' | 'tooMany' | 'unavailable';

/** What each answer of the BFF means to the person (an unknown user and a wrong password look the same on purpose). */
export const loginErrorFor = (error: unknown): LoginError => {
  const status = error instanceof HttpErrorResponse ? error.status : 0;
  if (status === 401 || status === 400) return 'invalid';
  if (status === 429) return 'tooMany';
  return 'unavailable';
};

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });
  protected readonly error = signal<LoginError | null>(null);
  protected readonly busy = signal(false);

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.login(this.form.getRawValue());
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.error.set(loginErrorFor(error));
      this.form.controls.password.reset('');
    } finally {
      this.busy.set(false);
    }
  }
}
