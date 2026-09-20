import { fireEvent, render, screen } from '@testing-library/react-native';

import { PickerField } from './picker-field';

const options = [
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
];

describe('PickerField', () => {
  it('opens the list, selects an option and closes', () => {
    const onChange = jest.fn();
    render(
      <PickerField
        label='Estado'
        value=''
        options={options}
        onChange={onChange}
      />,
    );
    expect(screen.getByText('Selecione')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Estado' }));
    fireEvent.press(screen.getByText('São Paulo'));
    expect(onChange).toHaveBeenCalledWith('SP');
    expect(screen.queryByText('Santa Catarina')).toBeNull();
  });
  it('filters options when searchable', () => {
    render(
      <PickerField
        label='Cidade'
        value=''
        options={options}
        onChange={jest.fn()}
        searchable
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Cidade' }));
    fireEvent.changeText(screen.getByLabelText('Buscar cidade'), 'são');
    expect(screen.getByText('São Paulo')).toBeTruthy();
    expect(screen.queryByText('Santa Catarina')).toBeNull();
    fireEvent.changeText(screen.getByLabelText('Buscar cidade'), 'zzz');
    expect(screen.getByText('Nenhuma opção encontrada')).toBeTruthy();
  });
  it('shows the selected label and stays closed when disabled', () => {
    render(
      <PickerField
        label='Estado'
        value='SC'
        options={options}
        onChange={jest.fn()}
        disabled
      />,
    );
    expect(screen.getByText('Santa Catarina')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Estado' }));
    expect(screen.queryByText('São Paulo')).toBeNull();
  });
});
