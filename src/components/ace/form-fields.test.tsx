import { fireEvent, render, screen } from '@testing-library/react-native';
import { FormProvider } from 'react-hook-form';
import { Pressable, Text } from 'react-native';
import { z } from 'zod';

import { useZodForm } from '@/hooks/use-zod-form';

import { FormPickerField, FormTextField } from './form-fields';

const schema = z.object({
  email: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .pipe(z.string().email('Email inválido')),
  state: z.string().min(1, 'Selecione seu estado'),
});

function Harness({ onValid }: { onValid: (values: unknown) => void }) {
  const form = useZodForm(schema, { email: '', state: '' });
  return (
    <FormProvider {...form}>
      <FormTextField name='email' label='E-mail' />
      <FormPickerField
        name='state'
        label='Estado'
        options={[{ value: 'SC', label: 'SC' }]}
      />
      <Pressable
        accessibilityRole='button'
        onPress={() => void form.handleSubmit(onValid)()}
      >
        <Text>Enviar</Text>
      </Pressable>
    </FormProvider>
  );
}

describe('form fields', () => {
  it('shows zod messages and submits normalized values', async () => {
    const onValid = jest.fn();
    render(<Harness onValid={onValid} />);
    fireEvent.press(screen.getByText('Enviar'));
    expect(await screen.findByText('Email inválido')).toBeTruthy();
    expect(screen.getByText('Selecione seu estado')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('E-mail'), '  Ana@Exemplo.com ');
    fireEvent.press(screen.getByRole('button', { name: 'Estado' }));
    fireEvent.press(screen.getByText('SC'));
    fireEvent.press(screen.getByText('Enviar'));
    await screen.findByText('Enviar');
    expect(onValid.mock.calls[0][0]).toEqual({
      email: 'ana@exemplo.com',
      state: 'SC',
    });
  });
});
