import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/** Camera on native; library on web (Pages / desktop). */
export async function pickImage(fromCamera: boolean): Promise<string | null> {
  const useCamera = fromCamera && Platform.OS !== 'web';

  if (useCamera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera to photograph the service tag.');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]?.uri) return null;
    return result.assets[0].uri;
  }

  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library to attach images.');
      return null;
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (result.canceled || !result.assets[0]?.uri) return null;
  return result.assets[0].uri;
}
