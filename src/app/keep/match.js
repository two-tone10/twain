// lipurposefe.com/keep/match?m=… opens here when Keep is installed; hand off to the match.
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function MatchLink() {
  const { m } = useLocalSearchParams();
  return <Redirect href={m ? `/match/${m}` : '/match'} />;
}
