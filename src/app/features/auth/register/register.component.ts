import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';

type Step = 'data' | 'code' | 'done';
type RegisterError = 'exists' | 'invalid' | 'tooMany' | 'unavailable' | 'badCode';

/** What each answer of the API means to the person while creating the account. */
export const registerErrorFor = (error: unknown): RegisterError => {
  const status = error instanceof HttpErrorResponse ? error.status : 0;
  if (status === 409) return 'exists';
  if (status === 400 || status === 422) return 'invalid';
  if (status === 429) return 'tooMany';
  return 'unavailable';
};

/** The guardian creates their own account, then confirms the e-mail with the six-digit code that arrives there. */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);

  protected readonly step = signal<Step>('data');
  protected readonly error = signal<RegisterError | null>(null);
  protected readonly resent = signal(false);
  protected readonly busy = signal(false);

  protected readonly data = inject(FormBuilder).nonNullable.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    alias: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9._-]{3,}$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
  protected readonly code = inject(FormBuilder).nonNullable.control('', [
    Validators.required,
    Validators.pattern(/^\d{6}$/),
  ]);

  private get language(): string {
    return this.translate.getCurrentLang() ?? 'es-VE';
  }

  protected async register(): Promise<void> {
    if (this.data.invalid) {
      this.data.markAllAsTouched();
      return;
    }
    const { firstName, lastName, alias, email, password } = this.data.getRawValue();
    await this.run(async () => {
      await this.auth.register({
        alias,
        email,
        password,
        displayName: `${firstName} ${lastName}`.trim(),
        language: this.language.split('-')[0],
        person: { firstName, lastName },
      });
      this.step.set('code');
    });
  }

  protected async verify(): Promise<void> {
    if (this.code.invalid) {
      this.code.markAsTouched();
      this.error.set('badCode');
      return;
    }
    await this.run(
      async () => {
        await this.auth.verifyEmail(this.data.getRawValue().alias, this.code.value);
        this.step.set('done');
      },
      (status) => (status === 400 || status === 422 ? 'badCode' : undefined),
    );
  }

  protected async resend(): Promise<void> {
    this.resent.set(false);
    await this.run(async () => {
      await this.auth.resendVerification(this.data.getRawValue().alias, this.language.split('-')[0]);
      this.resent.set(true);
    });
  }

  private async run(action: () => Promise<void>, special?: (status: number) => RegisterError | undefined): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await action();
    } catch (error) {
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      this.error.set(special?.(status) ?? registerErrorFor(error));
    } finally {
      this.busy.set(false);
    }
  }
}
