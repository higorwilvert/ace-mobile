import { render, screen } from '@testing-library/react-native';

import { StepProgress } from './step-progress';

it('anuncia a etapa atual para leitores de tela', () => {
  render(<StepProgress current={3} total={5} />);
  expect(screen.getByLabelText('Etapa 3 de 5')).toBeOnTheScreen();
});
