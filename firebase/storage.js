import { storage } from './firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadFile = async (fileUri, fileName, metadata = {}) => {
  try {
    // Create a reference to the storage location
    const storageRef = ref(storage, `therapy-sessions/${fileName}`);
    
    // Convert file URI to blob (for React Native)
    const response = await fetch(fileUri);
    const blob = await response.blob();
    
    // Upload the file
    const uploadTask = await uploadBytes(storageRef, blob, {
      contentType: blob.type,
      customMetadata: metadata
    });
    
    // Get the download URL
    const downloadURL = await getDownloadURL(uploadTask.ref);
    
    return {
      name: fileName,
      url: downloadURL,
      metadata: uploadTask.metadata
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};
