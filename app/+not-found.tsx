import { Link } from 'expo-router';

import { EmptyState } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';

export default function NotFoundScreen() {
  return (
    <Screen className='justify-center'>
      <EmptyState
        title='Essa tela não existe'
        description='O endereço aberto não corresponde a nenhuma tela do ACE.'
      >
        <Link href='/' replace asChild>
          <Button variant='ghost' label='Voltar ao início' />
        </Link>
      </EmptyState>
    </Screen>
  );
}
