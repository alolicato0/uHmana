import { Redirect } from 'expo-router';

// Tab "fantasma" che esiste solo per visualizzare il FAB centrale;
// l'onPress reale apre /add-event come modal.
export default function AddPlaceholder() {
  return <Redirect href="/add-event" />;
}
