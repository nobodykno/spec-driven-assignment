import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema, type RegisterInput } from '@app/shared';
import { type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { FormField } from '../../../components/form-field.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { Card } from '../../../components/ui/card.tsx';
import { Input } from '../../../components/ui/input.tsx';
import { applyApiError } from '../../../lib/form-errors.ts';
import { useLoginMutation, useRegisterMutation } from '../api/auth-api.ts';

// FR-UI-001: register, then sign the new user in.
export function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const register = useRegisterMutation();
  const login = useLoginMutation();
  const form = useForm<RegisterInput>({ resolver: zodResolver(RegisterSchema) });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await register.mutateAsync(values);
      await login.mutateAsync({ email: values.email, password: values.password });
      await navigate('/projects');
    } catch (error) {
      applyApiError(error, form.setError);
    }
  });

  return (
    <Card className="mx-auto mt-12 max-w-sm">
      <h1 className="mb-4 text-xl font-semibold">Create an account</h1>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField id="name" label="Name" error={errors.name?.message}>
          <Input id="name" autoComplete="name" {...form.register('name')} />
        </FormField>
        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
        </FormField>
        <FormField id="password" label="Password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...form.register('password')}
          />
        </FormField>
        {errors.root ? (
          <p role="alert" className="text-sm text-red-700">
            {errors.root.message}
          </p>
        ) : null}
        <Button type="submit" disabled={register.isPending || login.isPending}>
          Register
        </Button>
      </form>
      <p className="mt-4 text-sm">
        Already registered?{' '}
        <Link className="text-sky-700 underline" to="/login">
          Log in
        </Link>
      </p>
    </Card>
  );
}
