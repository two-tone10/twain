// lipurposefe.com/keep/play?... opens here when Keep is installed (universal link); hand off to the challenge.
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function PlayLink() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/challenge', params }} />;
}
