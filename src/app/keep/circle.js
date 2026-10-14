// lipurposefe.com/keep/circle?c=… opens here when Keep is installed; hand off to the circle.
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CircleLink() {
  const { c } = useLocalSearchParams();
  return <Redirect href={c ? `/circle/${c}` : '/circles'} />;
}
