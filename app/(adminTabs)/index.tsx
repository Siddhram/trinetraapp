
import { useRouter } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function CCTVScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CCTV</Text>
      <View style={styles.buttonContainer}>
        <Button title="Crowd Detection" color="#FFA500" onPress={() => router.push('/crowdDetection')} />
        <Button title="Lost and Found" color="#FFA500" onPress={() => router.push('/lostAndFound')} />
        <Button title="Face Detection Analysis" color="#FFA500" onPress={() => router.push('/faceDetectionAnalysis')} />
        <Button title="Future Crowd Detection Alert" color="#FFA500" onPress={() => router.push('/futureCrowdAlert')} />
        <Button title="Traffic Level Detection" color="#FFA500" onPress={() => router.push('/trafficLevelDetection')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFA500', marginBottom: 32 },
  buttonContainer: { width: '80%', gap: 16 },
});
