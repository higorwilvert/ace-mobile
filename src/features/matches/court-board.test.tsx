import { fireEvent, render, screen } from '@testing-library/react-native';

import { makeMatchDetail, otherPlayer } from '@/test/fixtures';

import { CourtBoard, FormatChoice } from './court-board';
import { matchPermissions } from './schemas';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

const outsider = makeMatchDetail({
  viewer: { isCreator: false, participation: null, invite: null },
});
const withGuest = makeMatchDetail({
  capacity: { teamSize: 2, total: 4, confirmed: 2, available: 2 },
  teams: [
    makeMatchDetail().teams[0],
    {
      ...makeMatchDetail().teams[1],
      participants: [
        {
          id: '99999999-9999-4999-8999-999999999999',
          user: otherPlayer,
          isCreator: false,
          joinedAt: '2026-09-12T13:00:00.000Z',
        },
      ],
    },
  ],
});

describe('CourtBoard', () => {
  it('oferece as vagas livres a quem pode se candidatar e mostra o resumo', () => {
    const onPickSlot = jest.fn();
    render(
      <CourtBoard
        match={outsider}
        permissions={matchPermissions(outsider)}
        onPickSlot={onPickSlot}
      />,
    );
    expect(screen.getByText('1 de 4 confirmados')).toBeOnTheScreen();
    expect(screen.getAllByText('Quero jogar aqui')).toHaveLength(3);
    fireEvent.press(screen.getAllByLabelText('Quero jogar no Time 2')[0]);
    expect(onPickSlot).toHaveBeenCalledWith(2);
  });

  it('mostra "Vaga" sem botão quando o visitante não pode se candidatar', () => {
    const cancelled = { ...outsider, status: 'CANCELLED' as const };
    render(
      <CourtBoard
        match={cancelled}
        permissions={matchPermissions(cancelled)}
        onPickSlot={jest.fn()}
      />,
    );
    expect(screen.queryByText('Quero jogar aqui')).not.toBeOnTheScreen();
    expect(screen.getAllByText('Vaga')).toHaveLength(3);
  });

  it('deixa o criador remover só quem não é criador e abre perfis', () => {
    const onRemove = jest.fn();
    render(
      <CourtBoard
        match={withGuest}
        permissions={matchPermissions(withGuest)}
        onRemove={onRemove}
      />,
    );
    expect(screen.queryByLabelText(/Remover Ana/)).not.toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Remover Bruno Lima'));
    expect(onRemove).toHaveBeenCalledWith(withGuest.teams[1].participants[0]);
    fireEvent.press(screen.getByLabelText('Ver perfil de Bruno Lima'));
    expect(mockPush).toHaveBeenCalledWith(`/players/${otherPlayer.id}`);
  });

  it('esconde o remover para quem não gerencia a partida', () => {
    const guestView = {
      ...withGuest,
      viewer: { isCreator: false, participation: null, invite: null },
    };
    render(
      <CourtBoard
        match={guestView}
        permissions={matchPermissions(guestView)}
        onRemove={jest.fn()}
      />,
    );
    expect(screen.queryByLabelText(/Remover/)).not.toBeOnTheScreen();
  });
});

describe('FormatChoice', () => {
  it('desabilita o formato que a modalidade não suporta', () => {
    const onChange = jest.fn();
    render(
      <FormatChoice sport={outsider.sport} value={2} onChange={onChange} />,
    );
    fireEvent.press(screen.getByLabelText('Formato 1v1'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Só em duplas nesta modalidade')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Formato 2v2'));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
