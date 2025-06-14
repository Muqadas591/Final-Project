import { uploadFile } from '../firebase/storage';

const handleUpload = async () => {
  const fileUri = 'https://youtu.be/7AkbUfZjS5k'; // Replace with file picker
  const fileName = 'meditation.mp3';

  const downloadURL = await uploadFile(fileUri, fileName);
  console.log('File uploaded:', downloadURL);
};
