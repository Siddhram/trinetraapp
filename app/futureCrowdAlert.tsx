import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { Camera, CameraView } from 'expo-camera';

type AnalysisResult = {
  crowd_level: string;
  estimated_people: number;
  police_required: boolean;
  police_count: number;
  medical_required: boolean;
  medical_staff_count: number;
  activities: string[];
  chokepoints_detected: boolean;
  emergency_access_clear: boolean;
  harm_likelihood: string;
  notes: string;
};

export default function FutureCrowdAlertScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Request camera permissions on mount
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      try { await Camera.requestMicrophonePermissionsAsync(); } catch {}
    })();
  }, []);

  const startAnalysis = async () => {
    if (!cameraRef.current || isRecording || isAnalyzing) return;
    
    setIsRecording(true);
    setError(null);
    
    try {
      console.log('[CrowdAnalysis] Starting 5s recording...');
      const video = await (cameraRef.current as any).recordAsync({
        maxDuration: 5, // 5 second recording
        mute: true,
        quality: '480p',
      });

      if (!video?.uri) throw new Error('Recording failed');
      console.log('[CrowdAnalysis] Recording finished, analyzing...');
      
      await uploadAndAnalyze(video.uri);
    } catch (err) {
      console.error('[CrowdAnalysis] Error:', err);
      setError('Failed to record video. Please try again.');
    } finally {
      setIsRecording(false);
    }
  };

  const uploadAndAnalyze = async (videoUri: string) => {
    setIsAnalyzing(true);
    
    const formData = new FormData();
    formData.append('file', {
      uri: videoUri,
      name: 'analysis.mp4',
      type: 'video/mp4',
    } as any);

    try {
      const response = await fetch('http://172.20.10.4:5000/analyze', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) throw new Error('Analysis failed');
      
      const data = await response.json();
      setResult(data);
      console.log('[CrowdAnalysis] Analysis result:', data);
    } catch (err) {
      console.error('[CrowdAnalysis] Upload/Analysis error:', err);
      setError('Failed to analyze video. Please check your connection and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setResult(null);
    setError(null);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Requesting camera access...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No access to camera</Text>
        <Text style={styles.helpText}>Please enable camera permissions in your device settings.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crowd Safety Analysis</Text>
      <Text style={styles.subtitle}>Record a 5-second video for analysis</Text>
      
      {!result ? (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            mode="video"
            onCameraReady={() => setCameraReady(true)}
          />
          
          {(isRecording || isAnalyzing) && (
            <View style={styles.overlay}>
              <View style={styles.statusBox}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.statusText}>
                  {isRecording ? 'Recording...' : 'Analyzing...'}
                </Text>
              </View>
            </View>
          )}
          
          <View style={styles.buttonContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.recordButton,
                (isRecording || isAnalyzing) && styles.recordButtonDisabled,
                pressed && styles.recordButtonPressed
              ]}
              onPress={startAnalysis}
              disabled={isRecording || isAnalyzing}
            >
              <Text style={styles.recordButtonText}>
                {isRecording ? 'Recording...' : 'Start Analysis'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.resultContainer}>
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Analysis Complete</Text>
            
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>Crowd Level:</Text>
              <Text style={[styles.resultValue, styles.crowdLevel]}>
                {result.crowd_level.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>Estimated People:</Text>
              <Text style={styles.resultValue}>{result.estimated_people}</Text>
            </View>
            
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>Police Required:</Text>
              <Text style={[
                styles.resultValue,
                result.police_required ? styles.warningText : styles.successText
              ]}>
                {result.police_required ? 'Yes' : 'No'}
                {result.police_required && ` (${result.police_count} recommended)`}
              </Text>
            </View>
            
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>Medical Support:</Text>
              <Text style={[
                styles.resultValue,
                result.medical_required ? styles.warningText : styles.successText
              ]}>
                {result.medical_required ? `Yes (${result.medical_staff_count} staff)` : 'Not required'}
              </Text>
            </View>
            
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>Activities:</Text>
              <View style={styles.activitiesContainer}>
                {result.activities.map((activity, index) => (
                  <View key={index} style={styles.activityTag}>
                    <Text style={styles.activityText}>{activity}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>Safety Assessment:</Text>
              <Text style={styles.resultValue}>{result.harm_likelihood}</Text>
              {result.notes && (
                <Text style={styles.notesText}>{result.notes}</Text>
              )}
            </View>
            
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>Chokepoints:</Text>
              <Text style={[
                styles.resultValue,
                result.chokepoints_detected ? styles.warningText : styles.successText
              ]}>
                {result.chokepoints_detected ? 'Detected' : 'None detected'}
              </Text>
            </View>
            
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>Emergency Access:</Text>
              <Text style={[
                styles.resultValue,
                result.emergency_access_clear ? styles.successText : styles.warningText
              ]}>
                {result.emergency_access_clear ? 'Clear' : 'Blocked'}
              </Text>
            </View>
            
            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryButtonPressed
              ]}
              onPress={resetAnalysis}
            >
              <Text style={styles.retryButtonText}>Analyze Another Video</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
      
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    fontWeight: '600',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  cameraContainer: {
    flex: 1,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 20,
  },
  camera: {
    flex: 1,
    aspectRatio: 3/4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    marginTop: 10,
    fontWeight: '600',
  },
  buttonContainer: {
    padding: 16,
    alignItems: 'center',
  },
  recordButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recordButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  recordButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  recordButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultContainer: {
    flex: 1,
    width: '100%',
  },
  resultCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  resultSection: {
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  crowdLevel: {
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'capitalize',
    color: '#3b82f6',
  },
  warningText: {
    color: '#ef4444',
  },
  successText: {
    color: '#10b981',
  },
  activitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  activityTag: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  activityText: {
    color: '#0369a1',
    fontSize: 12,
    fontWeight: '500',
  },
  notesText: {
    marginTop: 8,
    fontSize: 14,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#f1f5f9',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 15,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorBannerText: {
    color: '#b91c1c',
    fontSize: 14,
  },
});
