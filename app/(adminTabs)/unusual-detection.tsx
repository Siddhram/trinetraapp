import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

interface AnalysisResult {
  frame: number;
  timestamp_sec: number;
  analysis: {
    status: 'normal' | 'anomaly' | 'critical' | 'error';
    summary: string;
    weapons: string[];
  };
}

interface ApiResponse {
  results: AnalysisResult[];
}

export default function UnusualDetectionScreen() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Backend API URL - Update this to match your server
  // For local development: 'http://localhost:5002'
  // For production: 'https://your-domain.com'
  const API_BASE_URL = 'http://192.168.1.3:5002';

  const pickVideo = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access media library is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0].fileName || 'selected_video.mp4');
        setSelectedFileUri(result.assets[0].uri);
        setError(null);
        setAnalysisResults([]);
      }
    } catch (err) {
      console.error('Error picking video:', err);
      setError('Failed to select video file');
    }
  };

  const analyzeVideo = async () => {
    if (!selectedFile || !selectedFileUri) {
      Alert.alert('No File Selected', 'Please select a video file first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setUploadProgress(0);

    try {
      const fileUri = selectedFileUri;
      const fileName = selectedFile;

      // Create FormData for file upload
      const formData = new FormData();
      
      // For React Native, we need to create a proper file object
      const file = {
        uri: fileUri,
        type: 'video/mp4', // You might want to detect the actual type
        name: fileName,
      } as any;

      formData.append('file', file);

      // Make API call to your Flask server
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      setAnalysisResults(data.results || []);
      
      if (data.results && data.results.length === 0) {
        setError('No analysis results returned from server');
      }

    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze video');
    } finally {
      setIsAnalyzing(false);
      setUploadProgress(0);
    }
  };

  const clearResults = () => {
    setAnalysisResults([]);
    setSelectedFile(null);
    setSelectedFileUri(null);
    setError(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return '#ff4444';
      case 'anomaly': return '#ff8800';
      case 'error': return '#666666';
      case 'normal': 
      default: return '#00aa00';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return 'warning';
      case 'anomaly': return 'alert-circle';
      case 'error': return 'close-circle';
      case 'normal':
      default: return 'checkmark-circle';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Unusual Detection Analysis</Text>
        <Text style={styles.subtitle}>
          Upload video files to detect anomalies and weapons using AI{'\n'}
          • Analyzes every 5 seconds of video{'\n'}
          • Uses Gemini AI for intelligent detection
        </Text>
      </View>

      {/* File Selection Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Video File</Text>
        <TouchableOpacity style={styles.fileButton} onPress={pickVideo}>
          <Ionicons name="videocam" size={24} color="#007AFF" />
          <Text style={styles.fileButtonText}>
            {selectedFile ? selectedFile : 'Choose Video File'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Analysis Controls */}
      <View style={styles.section}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.analyzeButton, isAnalyzing && styles.disabledButton]}
            onPress={analyzeVideo}
            disabled={isAnalyzing || !selectedFile}
          >
            {isAnalyzing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="analytics" size={20} color="#fff" />
            )}
            <Text style={styles.analyzeButtonText}>
              {isAnalyzing ? 'Analyzing...' : 'Analyze Video'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearButton} onPress={clearResults}>
            <Ionicons name="trash" size={20} color="#ff4444" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Indicator */}
      {isAnalyzing && (
        <View style={styles.progressSection}>
          <Text style={styles.progressText}>Processing video frames...</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
          </View>
        </View>
      )}

      {/* Error Display */}
      {error && (
        <View style={styles.errorSection}>
          <Ionicons name="alert-circle" size={24} color="#ff4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Results Section */}
      {analysisResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Analysis Results ({analysisResults.length} frames analyzed)
          </Text>
          
                     {analysisResults.map((result, index) => {
             const analysis = result.analysis;
             return (
               <View key={index} style={styles.resultCard}>
                 <View style={styles.resultHeader}>
                   <View style={styles.timestampContainer}>
                     <Ionicons name="time" size={16} color="#666" />
                     <Text style={styles.timestamp}>
                       {Math.floor(result.timestamp_sec / 60)}:{(result.timestamp_sec % 60).toFixed(0).padStart(2, '0')}
                     </Text>
                   </View>
                   <View style={styles.statusContainer}>
                     <Ionicons 
                       name={getStatusIcon(analysis.status)} 
                       size={16} 
                       color={getStatusColor(analysis.status)} 
                     />
                     <Text style={[styles.statusText, { color: getStatusColor(analysis.status) }]}>
                       {analysis.status.toUpperCase()}
                     </Text>
                   </View>
                 </View>
                 
                 <Text style={styles.summaryText}>
                   {analysis.summary}
                 </Text>
                 
                 {analysis.weapons && analysis.weapons.length > 0 && (
                   <View style={styles.weaponsContainer}>
                     <Text style={styles.weaponsLabel}>⚠️ Weapons Detected:</Text>
                     <View style={styles.weaponsList}>
                       {analysis.weapons.map((weapon: string, weaponIndex: number) => (
                         <View key={weaponIndex} style={styles.weaponTag}>
                           <Ionicons name="warning" size={12} color="#ff4444" />
                           <Text style={styles.weaponText}>{weapon}</Text>
                         </View>
                       ))}
                     </View>
                   </View>
                 )}
               </View>
             );
           })}
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructionsSection}>
        <Text style={styles.instructionsTitle}>Instructions:</Text>
                 <Text style={styles.instructionsText}>
           • Select a video file from your device{'\n'}
           • Click "Analyze Video" to process the footage{'\n'}
           • AI analyzes every 5 seconds of video for anomalies{'\n'}
           • Results show structured analysis with timestamps{'\n'}
           • 🚨 CRITICAL: Weapons or high-risk situations{'\n'}
           • ⚠️ ANOMALY: Unusual but non-lethal activities{'\n'}
           • ✅ NORMAL: No suspicious activity detected
         </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f8f9ff',
  },
  fileButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  analyzeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff4444',
    gap: 8,
  },
  clearButtonText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
  progressSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  errorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#ff4444',
    lineHeight: 20,
  },
  resultCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestamp: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  weaponsContainer: {
    marginTop: 8,
  },
  weaponsLabel: {
    fontSize: 12,
    color: '#ff4444',
    fontWeight: '600',
    marginBottom: 4,
  },
  weaponsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  weaponTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff4444',
    gap: 4,
  },
  weaponText: {
    fontSize: 12,
    color: '#ff4444',
    fontWeight: '500',
  },
  instructionsSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
